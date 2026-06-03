import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ProgressBar } from '@/components/game/progress-bar';
import { ResultCard } from '@/components/game/result-card';
import { GameTheme } from '@/constants/theme';
import { formatDuration, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  generateTruckerManifest,
  resolveTruckerRun,
  ShiftResolution,
  startTruckerRun,
  TruckerManifest,
  TruckerSession,
} from '@/services/job-service';

export function TruckerJob() {
  const game = useElsewhereGame();
  const [manifest, setManifest] = useState<TruckerManifest>(() => generateTruckerManifest());
  const [refreshCount, setRefreshCount] = useState(0);
  const [session, setSession] = useState<TruckerSession | null>(null);
  const [result, setResult] = useState<ShiftResolution | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const jailed = game.jailUntil !== null && game.jailUntil > game.now;
  const jailLabel = jailed ? `Jailed ${formatDuration((game.jailUntil ?? game.now) - game.now)}` : null;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  const refreshManifest = () => {
    if (jailed || refreshCount >= 5 || session?.status === 'active') {
      return;
    }

    setManifest(generateTruckerManifest());
    setRefreshCount((current) => current + 1);
  };

  const startRun = () => {
    if (!jailed && (!session || session.status === 'paid')) {
      setResult(null);
      setSession(startTruckerRun(manifest));
    }
  };

  const collect = () => {
    if (jailed || !session || session.status !== 'active' || now < session.readyAt) {
      return;
    }

    const result = resolveTruckerRun({ jobLevel: game.jobLevel, session });

    game.resolveJobReward({
      cooldownId: 'trucker',
      cooldownSeconds: 0,
      message: result.message,
      payout: result.payout,
      xp: result.xp,
    });
    setResult(result);
    setSession({ ...session, paidAt: now, status: 'paid' });
    setManifest(generateTruckerManifest());
    setRefreshCount(0);
  };

  const progress = session
    ? 1 - Math.max(0, session.readyAt - now) / Math.max(1, session.readyAt - session.startedAt)
    : 0;

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Trucker</GameText>
        <GameText tone="muted">Pick a manifest, start the route, then collect when the kilometres settle.</GameText>
      </View>

      <GameCard style={{ backgroundColor: GameTheme.colors.backgroundSoft }}>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText tone="faint" variant="caption">
            Cargo
          </GameText>
          <GameText variant="title">{manifest.freight}</GameText>
        </View>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText tone="faint" variant="caption">
            Type
          </GameText>
          <GameText tone="echo" variant="label">
            {manifest.cargoType}
          </GameText>
        </View>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText tone="faint" variant="caption">
            Route
          </GameText>
          <GameText tone="muted">{manifest.route}</GameText>
        </View>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText tone="faint" variant="caption">
            Trailer
          </GameText>
          <GameText tone="muted">{manifest.trailer}</GameText>
        </View>
        <GameText tone="echo" variant="label">
          {manifest.distanceKm.toLocaleString()} km | ${manifest.payout.toLocaleString()}
        </GameText>
        <GameText tone="faint" variant="caption">
          {manifest.flavor}
        </GameText>
      </GameCard>

      {session?.status === 'active' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <ProgressBar progress={Math.max(0, Math.min(1, progress))} />
          <GameText tone="faint" variant="caption">
            {now >= session.readyAt ? 'Arrived. Collect the cheque.' : 'Route active. Keep the coffee legal.'}
          </GameText>
          <Pressable
            accessibilityRole="button"
            disabled={jailed || now < session.readyAt}
            onPress={collect}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: GameTheme.colors.backgroundSoft,
              borderColor: !jailed && now >= session.readyAt ? GameTheme.colors.success : GameTheme.colors.border,
              borderRadius: GameTheme.radius.sm,
              borderWidth: 1,
              opacity: !jailed && now >= session.readyAt ? (pressed ? 0.76 : 1) : 0.5,
              padding: GameTheme.spacing.md,
            })}>
            <GameText tone={!jailed && now >= session.readyAt ? 'echo' : 'faint'} variant="label">
              {jailLabel ?? 'Collect Pay'}
            </GameText>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: GameTheme.spacing.md }}>
          {result ? (
            <ResultCard
              details={[{ label: 'Route', value: manifest.route }, { label: 'Distance', value: `${manifest.distanceKm.toLocaleString()} km` }]}
              payout={result.payout}
              summary={result.message}
              title="Freight Delivered"
              tone="good"
              xp={result.xp}
            />
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
            <Pressable
              accessibilityRole="button"
              disabled={jailed}
              onPress={startRun}
              style={({ pressed }) => ({
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: jailed ? GameTheme.colors.border : GameTheme.colors.success,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                opacity: jailed ? 0.5 : pressed ? 0.76 : 1,
                padding: GameTheme.spacing.md,
              })}>
              <GameText tone={jailed ? 'faint' : 'echo'} variant="label">
                {jailLabel ?? 'Start Job'}
              </GameText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={jailed || refreshCount >= 5}
              onPress={refreshManifest}
              style={({ pressed }) => ({
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: GameTheme.colors.borderBright,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                opacity: jailed || refreshCount >= 5 ? 0.5 : pressed ? 0.76 : 1,
                padding: GameTheme.spacing.md,
              })}>
              <GameText tone={jailed ? 'faint' : 'echo'} variant="label">
                {jailed ? 'Locked' : `New Manifest (${5 - refreshCount})`}
              </GameText>
            </Pressable>
          </View>
        </View>
      )}

      <GameText tone="faint" variant="caption">
        job:95:trucker | persistent route | no standard cooldown
      </GameText>
    </GameCard>
  );
}
