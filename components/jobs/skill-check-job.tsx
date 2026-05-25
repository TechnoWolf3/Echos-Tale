import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ProgressBar } from '@/components/game/progress-bar';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  resolveSkillCheckSession,
  SkillCheckSession,
  SkillColor,
  startSkillCheckSession,
} from '@/services/job-service';

const colorStyles: Record<SkillColor, string> = {
  Blue: '#4EA1FF',
  Green: '#83F3B5',
  Red: '#FF6B8A',
  Yellow: '#F4D35E',
};

export function SkillCheckJob() {
  const game = useElsewhereGame();
  const [session, setSession] = useState<SkillCheckSession | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const ready = game.canAct('skillCheck');
  const cooldownLabel = game.getCooldownLabel('skillCheck');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);

    return () => clearInterval(interval);
  }, []);

  const phase = session && session.status !== 'resolved' && now >= session.revealUntil ? 'repeat' : 'memorise';
  const expired = Boolean(session && session.status !== 'resolved' && now >= session.expiresAt);

  const progress = useMemo(() => {
    if (!session) {
      return 0;
    }

    if (session.status === 'memorise') {
      return 1 - (session.revealUntil - now) / 3_500;
    }

    return 1 - (session.expiresAt - now) / 18_000;
  }, [now, session]);

  const start = () => {
    if (!ready) {
      return;
    }

    setSession(startSkillCheckSession(game.jobLevel));
  };

  const finishSession = useCallback((input: SkillColor[], allowSuccess: boolean) => {
    if (!session || session.status === 'resolved') {
      return;
    }

    const result = allowSuccess
      ? resolveSkillCheckSession({ input, jobLevel: game.jobLevel, pattern: session.pattern })
      : {
          message: 'Skill Check expired. The colours have unionised.',
          payout: 0,
          success: false,
          xp: 3,
        };

    game.resolveJobReward({
      cooldownId: 'skillCheck',
      cooldownSeconds: 300,
      message: result.message,
      payout: result.payout,
      tone: result.success ? 'good' : 'bad',
      xp: result.xp,
    });
    setSession({ ...session, input, status: 'resolved' });
  }, [game, session]);

  const pressColor = (color: SkillColor) => {
    if (!session || phase !== 'repeat' || expired) {
      return;
    }

    const nextInput = [...session.input, color];
    const expected = session.pattern[nextInput.length - 1];

    if (color !== expected) {
      finishSession(nextInput, true);
      return;
    }

    if (nextInput.length === session.pattern.length) {
      finishSession(nextInput, true);
      return;
    }

    setSession({ ...session, input: nextInput });
  };

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Skill Check</GameText>
        <GameText tone="muted">
          Memorise the colours, then repeat them before the office lights remember you.
        </GameText>
      </View>

      {!session || session.status === 'resolved' ? (
        <Pressable
          accessibilityRole="button"
          disabled={!ready}
          onPress={start}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: ready ? GameTheme.colors.backgroundSoft : GameTheme.colors.panel,
            borderColor: ready ? GameTheme.colors.success : GameTheme.colors.border,
            borderRadius: GameTheme.radius.sm,
            borderWidth: 1,
            opacity: pressed ? 0.78 : ready ? 1 : 0.52,
            padding: GameTheme.spacing.md,
          })}>
          <GameText tone={ready ? 'echo' : 'faint'} variant="label">
            {ready ? 'Start Check' : cooldownLabel}
          </GameText>
        </Pressable>
      ) : (
        <View style={{ gap: GameTheme.spacing.md }}>
          <View style={{ flexDirection: 'row', gap: GameTheme.spacing.sm }}>
            {session.pattern.map((color, index) => (
              <View
                key={`${color}-${index}`}
                style={{
                  backgroundColor:
                    phase === 'memorise' ? colorStyles[color] : GameTheme.colors.backgroundSoft,
                  borderColor: colorStyles[color],
                  borderRadius: GameTheme.radius.sm,
                  borderWidth: 1,
                  flex: 1,
                  height: 48,
                }}
              />
            ))}
          </View>

          <ProgressBar progress={Math.max(0, Math.min(1, progress))} />
          <GameText tone="faint" variant="caption">
            {expired
              ? 'Time expired. Resolve the shift before starting another.'
              : phase === 'memorise'
                ? 'Memorise the pattern.'
                : `${session.input.length}/${session.pattern.length} colours entered`}
          </GameText>

          {expired ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => finishSession(session.input, false)}
              style={({ pressed }) => ({
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: GameTheme.colors.danger,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                opacity: pressed ? 0.76 : 1,
                padding: GameTheme.spacing.md,
              })}>
              <GameText tone="ember" variant="label">
                Resolve Expired Check
              </GameText>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              {(Object.keys(colorStyles) as SkillColor[]).map((color) => (
              <Pressable
                accessibilityRole="button"
                disabled={phase !== 'repeat'}
                key={color}
                onPress={() => pressColor(color)}
                style={({ pressed }) => ({
                  backgroundColor: colorStyles[color],
                  borderRadius: GameTheme.radius.sm,
                  minWidth: 112,
                  opacity: phase !== 'repeat' ? 0.35 : pressed ? 0.72 : 1,
                  padding: GameTheme.spacing.md,
                })}>
                <GameText style={{ color: GameTheme.colors.background, textAlign: 'center' }} variant="label">
                  {color}
                </GameText>
              </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <GameText tone="faint" variant="caption">
        job:95:skill | server-owned payout later | 5m cooldown
      </GameText>
    </GameCard>
  );
}
