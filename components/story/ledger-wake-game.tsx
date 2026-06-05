import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ArchivedDocument } from '@/components/story/archived-document';
import { GameTheme } from '@/constants/theme';
import {
  ledgerCompletionLines,
  ledgerDrawerLines,
  ledgerFinalChoices,
  ledgerIntroLines,
  ledgerNormalFeedback,
  ledgerRecords,
  type LedgerDialogueLine,
  type LedgerRecordSection,
  type StoryFactValue,
  type StoryFlag,
  type StoryProgress,
  type StoryStatKey,
} from '@/data/story';

type Stage = 'intro' | 'records' | 'final-choice' | 'complete';

type ProgressPatch = {
  counters?: StoryProgress['counters'];
  facts?: StoryProgress['facts'];
  flags?: StoryFlag[];
  stats?: Partial<Record<StoryStatKey, number>>;
};

type LedgerWakeGameProps = {
  completed?: boolean;
  onComplete: (patch: ProgressPatch) => void;
  onProgress: (patch: ProgressPatch) => void;
  progress: StoryProgress;
};

function TransmissionPanel({ lines, title }: { lines: LedgerDialogueLine[]; title: string }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(6, 7, 18, 0.66)',
        borderColor: GameTheme.colors.border,
        borderRadius: GameTheme.radius.md,
        borderWidth: 1,
        gap: GameTheme.spacing.sm,
        padding: GameTheme.spacing.md,
      }}>
      <GameText tone="faint" variant="label">
        {title}
      </GameText>
      {lines.map((line, index) => {
        const system = line.speaker === 'system';
        const unknown = line.speaker === 'unknown';

        return (
          <View
            key={`${line.speaker}-${index}-${line.text}`}
            style={{
              borderLeftColor: unknown ? GameTheme.colors.danger : system ? GameTheme.colors.ember : GameTheme.colors.echo,
              borderLeftWidth: 2,
              gap: 2,
              paddingLeft: GameTheme.spacing.sm,
            }}>
            <GameText tone={unknown || system ? 'ember' : 'echo'} variant="caption">
              {unknown ? 'UNKNOWN' : system ? 'SYSTEM' : 'ECHO'}
            </GameText>
            <GameText tone={unknown || system ? 'ember' : 'primary'}>{line.text}</GameText>
          </View>
        );
      })}
    </View>
  );
}

function StatusPanel({
  currentIndex,
  normalClicks,
  recordComplete,
  recordFound,
  recordTotal,
}: {
  currentIndex: number;
  normalClicks: number;
  recordComplete: boolean;
  recordFound: number;
  recordTotal: number;
}) {
  const noise = normalClicks >= 7 ? 'High' : normalClicks >= 3 ? 'Rising' : 'Low';
  const rows = [
    ['Signal', 'Online'],
    ['Memory', 'Partial'],
    ['Ledger', recordComplete ? 'Correcting' : 'Awake'],
    ['Archive Noise', noise],
  ] as const;

  return (
    <GameCard style={{ padding: GameTheme.spacing.md }}>
      <View style={{ gap: GameTheme.spacing.xs }}>
        {rows.map(([label, value]) => (
          <View
            key={label}
            style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
            <GameText tone="faint" variant="label">
              {label}
            </GameText>
            <GameText tone={value === 'High' || value === 'Rising' ? 'ember' : 'echo'}>{value}</GameText>
          </View>
        ))}
        <View style={{ borderTopColor: GameTheme.colors.border, borderTopWidth: 1, paddingTop: GameTheme.spacing.sm }}>
          <GameText tone="muted">Record: {currentIndex + 1} / {ledgerRecords.length}</GameText>
          <GameText tone="echo">Anomalies Found: {recordFound} / {recordTotal}</GameText>
        </View>
      </View>
    </GameCard>
  );
}

export function LedgerWakeGame({ completed, onComplete, onProgress, progress }: LedgerWakeGameProps) {
  const [stage, setStage] = useState<Stage>(completed ? 'complete' : 'intro');
  const [recordIndex, setRecordIndex] = useState(0);
  const [foundByRecord, setFoundByRecord] = useState<Record<string, string[]>>({});
  const [normalClicks, setNormalClicks] = useState(progress.counters.ledger_normal_clicks ?? 0);
  const [dialogue, setDialogue] = useState<LedgerDialogueLine[]>(completed ? ledgerCompletionLines : ledgerIntroLines);
  const [dialogueTitle, setDialogueTitle] = useState(completed ? 'Ledger Online' : 'Sealed Drawer');
  const [completionShownByRecord, setCompletionShownByRecord] = useState<Record<string, boolean>>({});
  const record = ledgerRecords[recordIndex];
  const foundSectionIds = foundByRecord[record.id] ?? [];
  const anomalySections = useMemo(() => record.sections.filter((section) => section.isAnomaly), [record.sections]);
  const recordComplete = anomalySections.every((section) => foundSectionIds.includes(section.id));

  useEffect(() => {
    if (!completed && !progress.flags.ledger_wake_started) {
      onProgress({
        counters: { current_ledger_record_index: recordIndex, ledger_anomalies_found: 0, ledger_normal_clicks: normalClicks },
        flags: ['ledger_wake_started'],
      });
    }
  }, [completed, normalClicks, onProgress, progress.flags.ledger_wake_started, recordIndex]);

  useEffect(() => {
    if (!recordComplete || completionShownByRecord[record.id]) {
      return;
    }

    setCompletionShownByRecord((current) => ({ ...current, [record.id]: true }));
    setDialogue(record.completionDialogue);
    setDialogueTitle('Record Stabilised');
    onProgress({
      counters: {
        current_ledger_record_index: recordIndex,
        ledger_anomalies_found: Object.values(foundByRecord).reduce((total, ids) => total + ids.length, 0),
        ledger_normal_clicks: normalClicks,
      },
      flags: record.completionFlags,
    });
  }, [completionShownByRecord, foundByRecord, normalClicks, onProgress, record, recordComplete, recordIndex]);

  const openDrawer = () => {
    setStage('records');
    setDialogue(ledgerDrawerLines);
    setDialogueTitle('External Auditor');
  };

  const handleSectionPress = (section: LedgerRecordSection) => {
    if (foundSectionIds.includes(section.id)) {
      setDialogue(section.feedback ?? [{ speaker: 'system', text: 'Section already corrected.' }]);
      setDialogueTitle('Corrected Field');
      return;
    }

    if (section.isAnomaly) {
      const nextFound = [...foundSectionIds, section.id];
      setFoundByRecord((current) => ({ ...current, [record.id]: nextFound }));
      setDialogue(section.feedback ?? [{ speaker: 'system', text: 'Anomaly corrected.' }]);
      setDialogueTitle(section.special === 'missing-approval-glitch' ? 'Approval Glitch' : 'Anomaly Corrected');
      onProgress({
        counters: {
          current_ledger_record_index: recordIndex,
          ledger_anomalies_found: Object.values({ ...foundByRecord, [record.id]: nextFound }).reduce(
            (total, ids) => total + ids.length,
            0
          ),
          ledger_normal_clicks: normalClicks,
        },
        flags: section.flags,
        stats: section.statChanges,
      });
      return;
    }

    if (section.special === 'authority-lore') {
      setFoundByRecord((current) => ({
        ...current,
        [record.id]: current[record.id]?.includes(section.id)
          ? current[record.id]
          : [...(current[record.id] ?? []), section.id],
      }));
      setDialogue(section.feedback ?? []);
      setDialogueTitle('Authority Entry');
      onProgress({ flags: section.flags });
      return;
    }

    const nextNormalClicks = normalClicks + 1;
    setNormalClicks(nextNormalClicks);
    setDialogue(section.normalFeedback ?? ledgerNormalFeedback[normalClicks % ledgerNormalFeedback.length]);
    setDialogueTitle('Nothing Wrong Here');
    onProgress({
      counters: {
        current_ledger_record_index: recordIndex,
        ledger_anomalies_found: Object.values(foundByRecord).reduce((total, ids) => total + ids.length, 0),
        ledger_normal_clicks: nextNormalClicks,
      },
      stats: nextNormalClicks >= 8 ? { corruption: 1 } : {},
    });
  };

  const goToNextRecord = () => {
    if (recordIndex >= ledgerRecords.length - 1) {
      setStage('final-choice');
      setDialogue([
        { speaker: 'system', text: 'Record partially corrected.' },
        { speaker: 'system', text: 'House approval required.' },
      ]);
      setDialogueTitle('Final Ledger Action');
      return;
    }

    const nextIndex = recordIndex + 1;
    setRecordIndex(nextIndex);
    setDialogue([{ speaker: 'system', text: `Record opened: ${ledgerRecords[nextIndex].title}` }]);
    setDialogueTitle('Archive Drawer');
    onProgress({ counters: { current_ledger_record_index: nextIndex, ledger_normal_clicks: normalClicks } });
  };

  const chooseFinalAction = (value: StoryFactValue) => {
    const choice = ledgerFinalChoices.find((ledgerChoice) => ledgerChoice.value === value) ?? ledgerFinalChoices[0];
    setStage('complete');
    setDialogue([
      ...choice.dialogue,
      ...choice.system,
      { speaker: 'unknown', text: 'Debts remain until collected.' },
      { speaker: 'echo', text: 'Cool.' },
      { speaker: 'echo', text: 'Haunted invoice.' },
      { speaker: 'echo', text: 'Love that for us.' },
      ...ledgerCompletionLines,
    ]);
    setDialogueTitle('Ledger Online');
    onComplete({
      counters: {
        current_ledger_record_index: ledgerRecords.length - 1,
        ledger_anomalies_found: ledgerRecords.reduce(
          (total, ledgerRecord) => total + ledgerRecord.sections.filter((section) => section.isAnomaly).length,
          0
        ),
        ledger_normal_clicks: normalClicks,
      },
      facts: { ledger_final_choice: value },
      flags: [
        'ledger_wake_completed',
        'overwatcher_account_seen',
        'overwatcher_protocol_seen',
        'containment_purpose_seen',
        'overwatcher_account_partially_corrected',
      ],
      stats: choice.stats,
    });
  };

  return (
    <View style={{ gap: GameTheme.spacing.lg }}>
      <StatusPanel
        currentIndex={recordIndex}
        normalClicks={normalClicks}
        recordComplete={recordComplete}
        recordFound={foundSectionIds.filter((id) => anomalySections.some((section) => section.id === id)).length}
        recordTotal={anomalySections.length}
      />

      <GameCard elevated>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText tone="faint" variant="label">
            Prologue: The First Boot
          </GameText>
          <GameText variant="title">Ledger Wake: The Unpaid Record</GameText>
          <GameText tone="muted">
            Tap sections that do not belong. Correct the record before the archive notices you reading it.
          </GameText>
        </View>

        {stage === 'intro' ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            <TransmissionPanel lines={dialogue} title={dialogueTitle} />
            <CasinoButton onPress={openDrawer} tone="echo">
              Open the Archive Drawer
            </CasinoButton>
          </View>
        ) : null}

        {stage === 'records' ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            <ArchivedDocument foundSectionIds={foundSectionIds} onSectionPress={handleSectionPress} record={record} />
            <TransmissionPanel lines={dialogue} title={dialogueTitle} />
            {recordComplete ? (
              <CasinoButton onPress={goToNextRecord} tone="echo">
                {recordIndex >= ledgerRecords.length - 1 ? 'Resolve Protected Account' : 'Continue to Next Record'}
              </CasinoButton>
            ) : null}
          </View>
        ) : null}

        {stage === 'final-choice' ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            <TransmissionPanel lines={dialogue} title={dialogueTitle} />
            <View style={{ gap: GameTheme.spacing.sm }}>
              {ledgerFinalChoices.map((choice) => (
                <CasinoButton key={choice.value} onPress={() => chooseFinalAction(choice.value)} tone="ember">
                  {choice.label}
                </CasinoButton>
              ))}
            </View>
          </View>
        ) : null}

        {stage === 'complete' ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            <TransmissionPanel lines={dialogue} title={dialogueTitle} />
            <GameCard style={{ padding: GameTheme.spacing.md }}>
              <GameText tone="faint" variant="label">
                Next System Available
              </GameText>
              <GameText variant="title">Chance Ignition</GameText>
              <GameText tone="muted">
                Locked for now. The ledger has started counting odds, which is probably rude.
              </GameText>
            </GameCard>
          </View>
        ) : null}
      </GameCard>
    </View>
  );
}
