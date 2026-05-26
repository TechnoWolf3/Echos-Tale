import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ProgressBar } from '@/components/game/progress-bar';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  resolveTransportSession,
  selectTransportChoice,
  startTransportSession,
  TransportSession,
  transportSteps,
} from '@/services/job-service';

export function TransportContractJob() {
  const game = useElsewhereGame();
  const [session, setSession] = useState<TransportSession | null>(null);
  const ready = game.canAct('transportContract');

  const start = () => {
    if (ready) {
      setSession(startTransportSession());
    }
  };

  const finish = (nextSession: TransportSession) => {
    const result = resolveTransportSession({ jobLevel: game.jobLevel, session: nextSession });

    game.resolveJobReward({
      cooldownId: 'transportContract',
      cooldownSeconds: 600,
      message: result.message,
      payout: result.payout,
      tone: result.failed ? 'bad' : 'good',
      xp: result.xp,
    });
    setSession({ ...nextSession, status: 'resolved' });
  };

  const choose = (choiceIndex: number) => {
    if (!session || session.status !== 'choosing') {
      return;
    }

    const step = transportSteps[session.stepIndex];
    const choice = step.choices.filter((item) => !item.unlockLevel || item.unlockLevel <= game.jobLevel)[choiceIndex];
    const nextSession = selectTransportChoice(session, choice);

    if (nextSession.stepIndex >= transportSteps.length) {
      finish(nextSession);
      return;
    }

    setSession(nextSession);
  };

  const activeStep = session?.status === 'choosing' ? transportSteps[session.stepIndex] : null;
  const visibleChoices = activeStep?.choices.filter((choice) => !choice.unlockLevel || choice.unlockLevel <= game.jobLevel) ?? [];
  const risk = session?.selections.reduce((total, choice) => total + choice.risk, 0) ?? 0;
  const bonus = session?.selections.reduce((total, choice) => total + choice.bonus, 0) ?? 0;

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Transport Contract</GameText>
        <GameText tone="muted">Pick route, handling, and finish. Bigger pay brings uglier odds.</GameText>
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
            opacity: pressed ? 0.78 : ready ? 1 : 0.5,
            padding: GameTheme.spacing.md,
          })}>
          <GameText tone={ready ? 'echo' : 'faint'} variant="label">
            {ready ? 'Start Contract' : game.getCooldownLabel('transportContract')}
          </GameText>
        </Pressable>
      ) : activeStep ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <ProgressBar progress={session.stepIndex / transportSteps.length} />
          <GameText tone="faint" variant="caption">
            Base ${session.basePay.toLocaleString()} | bonus ${bonus.toLocaleString()} | risk {risk}%
          </GameText>
          <GameText variant="title">{activeStep.title}</GameText>
          {visibleChoices.map((choice, index) => (
            <Pressable
              accessibilityRole="button"
              key={choice.label}
              onPress={() => choose(index)}
              style={({ pressed }) => ({
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: GameTheme.colors.borderBright,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                opacity: pressed ? 0.76 : 1,
                padding: GameTheme.spacing.md,
              })}>
              <GameText variant="label">{choice.label}</GameText>
              <GameText tone="muted">
                ${choice.bonusMin.toLocaleString()}-${choice.bonusMax.toLocaleString()} | +{choice.risk}% risk
              </GameText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <GameText tone="faint" variant="caption">
        job:95:contract | 10m cooldown
      </GameText>
    </GameCard>
  );
}
