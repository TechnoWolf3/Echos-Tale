import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ProgressBar } from '@/components/game/progress-bar';
import { ResultCard } from '@/components/game/result-card';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import { applyShiftChoice, resolveShiftSession, ShiftResolution, ShiftSession, startShiftSession } from '@/services/job-service';

export function ShiftJob() {
  const game = useElsewhereGame();
  const [session, setSession] = useState<ShiftSession | null>(null);
  const [result, setResult] = useState<ShiftResolution | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const ready = game.canAct('shift');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  const start = () => {
    if (ready) {
      setResult(null);
      setSession(startShiftSession());
    }
  };

  const chooseEvent = (choiceIndex: number) => {
    if (!session || session.status !== 'working') {
      return;
    }

    const event = session.events[session.eventIndex];

    if (!event) {
      return;
    }

    setSession(applyShiftChoice(session, event.choices[choiceIndex]));
  };

  const collect = () => {
    if (!session || now < session.readyAt || session.status === 'resolved') {
      return;
    }

    const result = resolveShiftSession({ jobLevel: game.jobLevel, session });

    game.resolveJobReward({
      cooldownId: 'shift',
      cooldownSeconds: 360,
      message: result.message,
      payout: result.payout,
      xp: result.xp,
    });
    setResult(result);
    setSession({ ...session, status: 'resolved' });
  };

  const progress = session ? 1 - Math.max(0, session.readyAt - now) / 45_000 : 0;
  const currentEvent = session?.events[session.eventIndex];

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Shift</GameText>
        <GameText tone="muted">Clock on, handle tiny disasters, then collect pay.</GameText>
      </View>

      {!session || session.status === 'resolved' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {result ? (
            <ResultCard
              details={[{ label: 'Events', value: String(session?.eventIndex ?? 0) }]}
              payout={result.payout}
              summary={result.message}
              title="Shift Complete"
              tone="good"
              xp={result.xp}
            />
          ) : null}
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
              opacity: pressed ? 0.78 : ready ? 1 : 0.5,
              padding: GameTheme.spacing.md,
            })}>
            <GameText tone={ready ? 'echo' : 'faint'} variant="label">
              {ready ? 'Start Shift' : game.getCooldownLabel('shift')}
            </GameText>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: GameTheme.spacing.md }}>
          <ProgressBar progress={Math.max(0, Math.min(1, progress))} />
          <GameText tone="faint" variant="caption">
            Bonus ${session.bonusTotal.toLocaleString()} | {now >= session.readyAt ? 'ready to collect' : 'on shift'}
          </GameText>
          {currentEvent ? (
            <GameCard style={{ backgroundColor: GameTheme.colors.backgroundSoft }}>
              <GameText variant="title">{currentEvent.prompt}</GameText>
              {currentEvent.choices.map((choice, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={choice.label}
                  onPress={() => chooseEvent(index)}
                  style={({ pressed }) => ({
                    borderColor: GameTheme.colors.borderBright,
                    borderRadius: GameTheme.radius.sm,
                    borderWidth: 1,
                    opacity: pressed ? 0.76 : 1,
                    padding: GameTheme.spacing.md,
                  })}>
                  <GameText variant="label">{choice.label}</GameText>
                  <GameText tone="muted">{choice.note}</GameText>
                </Pressable>
              ))}
            </GameCard>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={now < session.readyAt}
              onPress={collect}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: now >= session.readyAt ? GameTheme.colors.success : GameTheme.colors.border,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                opacity: now >= session.readyAt ? (pressed ? 0.76 : 1) : 0.5,
                padding: GameTheme.spacing.md,
              })}>
              <GameText tone={now >= session.readyAt ? 'echo' : 'faint'} variant="label">
                Collect Pay
              </GameText>
            </Pressable>
          )}
        </View>
      )}

      <GameText tone="faint" variant="caption">
        job:95:shift | 45s shift | 6m cooldown
      </GameText>
    </GameCard>
  );
}
