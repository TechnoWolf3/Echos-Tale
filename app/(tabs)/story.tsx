import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { LedgerWakeGame } from '@/components/story/ledger-wake-game';
import { MemoryMountGame } from '@/components/story/memory-mount-game';
import { SignalStartGame } from '@/components/story/signal-start-game';
import { prologueSystems, type StoryFlag, type StoryProgress, type StoryStatKey } from '@/data/story';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import { completeStoryStep, createEmptyStoryProgress, loadStoryProgress, saveStoryProgress } from '@/services/story-api';

const publicSignalRows = [
  ['Status', 'Story Mode is forming...'],
  ['Signal', 'Incomplete'],
  ['Bridge', 'Listening'],
  ['Fragments', 'Unknown'],
] as const;

type StoryProgressPatch = {
  counters?: StoryProgress['counters'];
  facts?: StoryProgress['facts'];
  flags?: StoryFlag[];
  stats?: Partial<Record<StoryStatKey, number>>;
};

type PrologueMissionId = 'signal-start' | 'memory-mount' | 'ledger-wake' | 'chance-ignition';

function applyProgressPatch(progress: StoryProgress, patch: StoryProgressPatch) {
  return {
    ...progress,
    counters: {
      ...progress.counters,
      ...patch.counters,
    },
    facts: {
      ...progress.facts,
      ...patch.facts,
    },
    flags: {
      ...progress.flags,
      ...Object.fromEntries((patch.flags ?? []).map((flag) => [flag, true])),
    },
    stats: Object.entries(patch.stats ?? {}).reduce<StoryProgress['stats']>(
      (nextStats, [key, value]) => ({
        ...nextStats,
        [key]: (nextStats[key as StoryStatKey] ?? 0) + (value ?? 0),
      }),
      { ...progress.stats }
    ),
  };
}

export default function StoryScreen() {
  const game = useElsewhereGame();
  const profileId = game.linkedProfile?.profileId ?? null;
  const [progress, setProgress] = useState<StoryProgress>(() => createEmptyStoryProgress(profileId));
  const [selectedMissionId, setSelectedMissionId] = useState<PrologueMissionId>('signal-start');
  const [replayToken, setReplayToken] = useState(0);
  const signalStartComplete = !!progress.flags.signal_started || progress.completedStepIds.includes('signal-start-dead-rack');
  const memoryMountComplete =
    !!progress.flags.memory_mount_completed || progress.completedStepIds.includes('memory-mount-fragment-drawer');
  const ledgerWakeComplete =
    !!progress.flags.ledger_wake_completed || progress.completedStepIds.includes('ledger-wake-unpaid-record');

  const selectedMissionTitle =
    selectedMissionId === 'signal-start'
      ? 'Signal Start: The Dead Rack'
      : selectedMissionId === 'memory-mount'
        ? 'Memory Mount: The Fragment Drawer'
        : selectedMissionId === 'ledger-wake'
          ? 'Ledger Wake: The Unpaid Record'
          : 'Chance Ignition: Locked';

  useEffect(() => {
    let mounted = true;

    if (!game.isDevToolsUnlocked) {
      return () => {
        mounted = false;
      };
    }

    const restoreProgress = async () => {
      const storedProgress = await loadStoryProgress(profileId);

      if (mounted) {
        setProgress(storedProgress);
      }
    };

    void restoreProgress();

    return () => {
      mounted = false;
    };
  }, [game.isDevToolsUnlocked, profileId]);

  useEffect(() => {
    if (selectedMissionId === 'memory-mount' && !signalStartComplete) {
      setSelectedMissionId('signal-start');
    }
    if (selectedMissionId === 'ledger-wake' && !memoryMountComplete) {
      setSelectedMissionId(signalStartComplete ? 'memory-mount' : 'signal-start');
    }
  }, [memoryMountComplete, selectedMissionId, signalStartComplete]);

  const completeSignalStart = useCallback(
    async ({
      flags,
      stats,
    }: {
      flags: Parameters<typeof completeStoryStep>[2];
      stats: Partial<Record<StoryStatKey, number>>;
    }) => {
      const nextProgress = await completeStoryStep(progress, 'signal-start-dead-rack', flags, stats);
      setProgress(nextProgress);
    },
    [progress]
  );

  const selectMission = (missionId: PrologueMissionId, locked: boolean) => {
    if (locked) {
      return;
    }

    setSelectedMissionId(missionId);
    setReplayToken((current) => current + 1);
  };

  const updateMemoryMountProgress = useCallback(
    async (patch: StoryProgressPatch) => {
      const nextProgress = await saveStoryProgress(applyProgressPatch(progress, patch));
      setProgress(nextProgress);
    },
    [progress]
  );

  const completeMemoryMount = useCallback(
    async (patch: StoryProgressPatch) => {
      const flags: StoryFlag[] = ['memory_mount_completed', ...(patch.flags ?? [])];
      const nextProgress = await completeStoryStep(progress, 'memory-mount-fragment-drawer', flags, patch.stats, {
        activeSceneId: 'ledger-wake-locked',
        counters: patch.counters,
        facts: patch.facts,
      });
      setProgress(nextProgress);
    },
    [progress]
  );

  const completeLedgerWake = useCallback(
    async (patch: StoryProgressPatch) => {
      const flags: StoryFlag[] = ['ledger_wake_completed', ...(patch.flags ?? [])];
      const nextProgress = await completeStoryStep(progress, 'ledger-wake-unpaid-record', flags, patch.stats, {
        activeSceneId: 'chance-ignition-locked',
        counters: patch.counters,
        facts: patch.facts,
      });
      setProgress(nextProgress);
    },
    [progress]
  );

  if (!game.isDevToolsUnlocked) {
    return (
      <GameScreen backgroundAsset="echo" backgroundOpacity={0.24}>
        <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
          <GameText tone="faint" variant="label">
            Echo&apos;s Tale
          </GameText>
          <GameText variant="display">Echo&apos;s Tale</GameText>
        </View>

        <GameCard elevated>
          <View style={{ gap: GameTheme.spacing.md }}>
            <GameText>Echo has gone quiet here.</GameText>
            <View style={{ gap: 2 }}>
              <GameText tone="muted">Not absent.</GameText>
              <GameText tone="muted">Not broken.</GameText>
            </View>
            <GameText tone="echo" variant="title">
              Thinking.
            </GameText>
            <GameText tone="muted">
              Somewhere behind this screen, something is being assembled piece by piece - a memory, a door,
              a mistake, or maybe the first page of a story that was never supposed to be opened.
            </GameText>
            <GameText tone="muted">For now, the signal is incomplete.</GameText>
            <GameText tone="echo">But Echo is still listening.</GameText>
          </View>
        </GameCard>

        <GameCard>
          <View style={{ gap: GameTheme.spacing.sm }}>
            {publicSignalRows.map(([label, value]) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  gap: GameTheme.spacing.md,
                  justifyContent: 'space-between',
                }}>
                <GameText tone="faint" variant="label">
                  {label}
                </GameText>
                <GameText tone={label === 'Status' || label === 'Bridge' ? 'echo' : 'muted'}>
                  {value}
                </GameText>
              </View>
            ))}
          </View>
        </GameCard>

        <CasinoButton disabled onPress={() => undefined} tone="plain">
          The signal is not ready
        </CasinoButton>

        <GameText style={{ textAlign: 'center' }} tone="faint">
          Check back later. The page may remember you.
        </GameText>
      </GameScreen>
    );
  }

  return (
    <GameScreen backgroundAsset="echo" backgroundOpacity={0.2}>
      <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
        <GameText tone="faint" variant="label">
          Story Mode
        </GameText>
        <GameText variant="display">Prologue: The First Boot</GameText>
        <GameText tone="muted">
          Signal Start is visible because the existing dev password unlock is active for this app session.
        </GameText>
      </View>

      <GameCard elevated>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText tone="faint" variant="label">
            Prologue Systems
          </GameText>
          <GameText variant="title">{selectedMissionTitle}</GameText>
          <GameText tone="muted">
            Profile: {progress.profileId ?? 'local preview'} | Progress saved locally
          </GameText>
        </View>

        <View style={{ gap: GameTheme.spacing.sm }}>
          {prologueSystems.map((system) => {
            const missionId = system.id as PrologueMissionId;
            const complete =
              (system.id === 'signal-start' && signalStartComplete) ||
              (system.id === 'memory-mount' && memoryMountComplete) ||
              (system.id === 'ledger-wake' && ledgerWakeComplete);
            const active =
              (system.id === 'signal-start' && !signalStartComplete) ||
              (system.id === 'memory-mount' && signalStartComplete && !memoryMountComplete) ||
              (system.id === 'ledger-wake' && memoryMountComplete && !ledgerWakeComplete);
            const locked =
              (system.id === 'memory-mount' && !signalStartComplete) ||
              (system.id === 'ledger-wake' && !memoryMountComplete) ||
              system.id === 'chance-ignition' ||
              (!['signal-start', 'memory-mount', 'ledger-wake', 'chance-ignition'].includes(system.id) && true);
            const selected = selectedMissionId === system.id;
            const tone = complete || active ? 'echo' : 'faint';
            const status = complete ? 'replay' : active ? 'current' : locked ? 'locked' : system.status;

            return (
              <Pressable
                accessibilityRole="button"
                disabled={locked}
                key={system.id}
                onPress={() => selectMission(missionId, locked)}
                style={{
                  alignItems: 'center',
                  backgroundColor: selected
                    ? 'rgba(169, 243, 255, 0.12)'
                    : active
                      ? 'rgba(169, 243, 255, 0.08)'
                      : GameTheme.colors.backgroundSoft,
                  borderColor: selected || complete || active ? GameTheme.colors.echo : GameTheme.colors.border,
                  borderRadius: GameTheme.radius.sm,
                  borderWidth: selected ? 2 : 1,
                  flexDirection: 'row',
                  gap: GameTheme.spacing.sm,
                  justifyContent: 'space-between',
                  opacity: locked ? 0.58 : 1,
                  padding: GameTheme.spacing.sm,
                }}>
                <GameText tone={tone}>{system.label}</GameText>
                <GameText tone={tone} variant="caption">
                  {status}
                </GameText>
              </Pressable>
            );
          })}
        </View>
      </GameCard>

      {selectedMissionId === 'signal-start' ? (
        <SignalStartGame key={`signal-start-${replayToken}`} completed={false} onComplete={completeSignalStart} />
      ) : selectedMissionId === 'memory-mount' && signalStartComplete ? (
        <MemoryMountGame
          completed={false}
          key={`memory-mount-${replayToken}`}
          onComplete={completeMemoryMount}
          onProgress={updateMemoryMountProgress}
          progress={progress}
        />
      ) : selectedMissionId === 'ledger-wake' && memoryMountComplete ? (
        <LedgerWakeGame
          completed={false}
          key={`ledger-wake-${replayToken}`}
          onComplete={completeLedgerWake}
          onProgress={updateMemoryMountProgress}
          progress={progress}
        />
      ) : (
        <GameCard elevated>
          <GameText tone="faint" variant="label">
            Next System
          </GameText>
          <GameText variant="title">Chance Ignition</GameText>
          <GameText tone="muted">
            Locked for now. Complete the available systems, then this slot will be ready when Chance Ignition is built.
          </GameText>
        </GameCard>
      )}

      <GameCard style={{ padding: GameTheme.spacing.md }}>
        <GameText tone="faint" variant="label">
          Story Flags
        </GameText>
        <GameText tone="muted">
          {Object.keys(progress.flags).length ? Object.keys(progress.flags).join(', ') : 'No story flags set yet.'}
        </GameText>
        {Object.keys(progress.facts).length ? (
          <GameText tone="faint">Facts: {JSON.stringify(progress.facts)}</GameText>
        ) : null}
        {Object.keys(progress.counters).length ? (
          <GameText tone="faint">Counters: {JSON.stringify(progress.counters)}</GameText>
        ) : null}
      </GameCard>
    </GameScreen>
  );
}
