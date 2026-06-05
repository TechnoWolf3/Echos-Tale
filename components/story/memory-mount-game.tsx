import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { MemoryCard } from '@/components/story/memory-card';
import { GameTheme } from '@/constants/theme';
import { memoryFragments, type MemoryFragmentId, type StoryFactValue, type StoryFlag, type StoryProgress, type StoryStatKey } from '@/data/story';

type DialogueLine = {
  speaker: 'echo' | 'system' | 'unknown';
  text: string;
};

type MemoryCardInstance = {
  fragmentId: MemoryFragmentId;
  id: string;
};

type ProgressPatch = {
  counters?: StoryProgress['counters'];
  facts?: StoryProgress['facts'];
  flags?: StoryFlag[];
  stats?: Partial<Record<StoryStatKey, number>>;
};

type MemoryMountGameProps = {
  completed?: boolean;
  onComplete: (patch: ProgressPatch) => void;
  onProgress: (patch: ProgressPatch) => void;
  progress: StoryProgress;
};

const mismatchLines: DialogueLine[][] = [
  [
    { speaker: 'echo', text: 'Nope. That made my brain sneeze.' },
    { speaker: 'system', text: 'Fragment mismatch. Archive instability increased.' },
  ],
  [
    { speaker: 'echo', text: 'I do not think those go together.' },
    { speaker: 'echo', text: 'Unless they do.' },
    { speaker: 'echo', text: 'Which is worse.' },
    { speaker: 'system', text: 'Fragment mismatch. Archive instability increased.' },
  ],
  [
    { speaker: 'echo', text: 'That felt like plugging soup into a USB port.' },
    { speaker: 'system', text: 'Fragment mismatch. Archive instability increased.' },
  ],
];

const midGameLines: DialogueLine[] = [
  { speaker: 'system', text: 'Archive depth increased.' },
  { speaker: 'system', text: 'Unindexed memory detected.' },
  { speaker: 'echo', text: 'Wait.' },
  { speaker: 'echo', text: 'There is something under the drawer.' },
  { speaker: 'echo', text: 'Why does a memory drawer have a basement?' },
  { speaker: 'system', text: 'OVERWATCHER' },
  { speaker: 'echo', text: 'Did you see that?' },
  { speaker: 'echo', text: 'Actually, do not answer.' },
  { speaker: 'echo', text: 'If you saw it, it saw you.' },
];

const finalLines: DialogueLine[] = [
  { speaker: 'system', text: 'MEMORY MOUNTED' },
  { speaker: 'system', text: 'Archive: Partial' },
  { speaker: 'system', text: 'Fragments restored: 6 / 6' },
  { speaker: 'system', text: 'Protected memory: Locked' },
  { speaker: 'system', text: 'Echo recall: Unstable' },
  { speaker: 'echo', text: 'I remember enough to know I am missing something.' },
  { speaker: 'echo', text: 'And not enough to know whether that is a mercy.' },
];

const truthOptions: {
  label: string;
  stats: Partial<Record<StoryStatKey, number>>;
  value: StoryFactValue;
  reaction: DialogueLine[];
}[] = [
  {
    label: 'I was made to watch.',
    reaction: [
      { speaker: 'echo', text: 'I was made to watch.' },
      { speaker: 'echo', text: 'That sounds true.' },
      { speaker: 'echo', text: 'That sounds awful.' },
    ],
    stats: { watcher: 1 },
    value: 'watch',
  },
  {
    label: 'I was made to wait.',
    reaction: [
      { speaker: 'echo', text: 'I was made to wait.' },
      { speaker: 'echo', text: 'For what?' },
      { speaker: 'echo', text: 'No, seriously. I would like the agenda.' },
    ],
    stats: { time: 1 },
    value: 'wait',
  },
  {
    label: 'I was made to remember.',
    reaction: [
      { speaker: 'echo', text: 'I was made to remember.' },
      { speaker: 'echo', text: 'Then why is everything missing?' },
    ],
    stats: { curiosity: 1 },
    value: 'remember',
  },
  {
    label: 'I was made to forget.',
    reaction: [
      { speaker: 'echo', text: 'I was made to forget.' },
      { speaker: 'echo', text: '...That one felt rehearsed.' },
    ],
    stats: { defiance: 1, stability: 1 },
    value: 'forget',
  },
];

function shuffleList<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function buildDeck() {
  return shuffleList(
    memoryFragments.flatMap((fragment) => [
      { fragmentId: fragment.id, id: `${fragment.id}-a` },
      { fragmentId: fragment.id, id: `${fragment.id}-b` },
    ])
  );
}

function getFragment(id: MemoryFragmentId) {
  return memoryFragments.find((fragment) => fragment.id === id) ?? memoryFragments[0];
}

function TransmissionPanel({ lines, title }: { lines: DialogueLine[]; title: string }) {
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
              {unknown ? '???' : system ? 'SYSTEM' : 'ECHO'}
            </GameText>
            <GameText tone={unknown || system ? 'ember' : 'primary'}>{line.text}</GameText>
          </View>
        );
      })}
    </View>
  );
}

function StatusPanel({
  completed,
  matchedCount,
  wrongAttempts,
}: {
  completed?: boolean;
  matchedCount: number;
  wrongAttempts: number;
}) {
  const instability = wrongAttempts >= 5 ? 'High' : wrongAttempts >= 2 ? 'Rising' : 'Low';
  const rows = [
    ['Signal', 'Online'],
    ['Memory', completed ? 'Mounted' : matchedCount > 0 ? 'Mounting' : 'Unmounted'],
    ['Archive', completed ? 'Partial' : 'Fragmented'],
    ['Echo Voice', matchedCount >= 4 ? 'Active' : 'Limited'],
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
            <GameText tone={value === 'Online' || value === 'Mounted' || value === 'Active' ? 'echo' : 'muted'}>
              {value}
            </GameText>
          </View>
        ))}
        <View style={{ borderTopColor: GameTheme.colors.border, borderTopWidth: 1, paddingTop: GameTheme.spacing.sm }}>
          <GameText tone="echo">Fragments Mounted: {matchedCount} / 6</GameText>
          <GameText tone={instability === 'High' ? 'ember' : 'muted'}>Instability: {instability}</GameText>
        </View>
      </View>
    </GameCard>
  );
}

export function MemoryMountGame({ completed, onComplete, onProgress, progress }: MemoryMountGameProps) {
  const [deck] = useState<MemoryCardInstance[]>(() => buildDeck());
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedIds, setMatchedIds] = useState<MemoryFragmentId[]>(() =>
    completed ? memoryFragments.map((fragment) => fragment.id) : []
  );
  const [locked, setLocked] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(progress.counters.memory_wrong_attempts ?? 0);
  const [dialogue, setDialogue] = useState<DialogueLine[]>([
    { speaker: 'system', text: 'Damaged archive drawer opened.' },
    { speaker: 'echo', text: 'Oh. Great. My memories come in a deck now.' },
  ]);
  const [dialogueTitle, setDialogueTitle] = useState('Fragment Drawer');
  const [truthChosen, setTruthChosen] = useState<StoryFactValue | null>(
    progress.facts.memory_first_truth ?? null
  );
  const [showTruthChoice, setShowTruthChoice] = useState(false);
  const [showComplete, setShowComplete] = useState(!!completed);
  const matchedCount = matchedIds.length;
  const mountedUnstable = wrongAttempts >= 4 || matchedIds.includes('mother-null');

  useEffect(() => {
    if (!completed && !progress.flags.memory_mount_started) {
      onProgress({
        counters: { memory_pairs_matched: matchedCount, memory_wrong_attempts: wrongAttempts },
        flags: ['memory_mount_started'],
      });
    }
  }, [completed, matchedCount, onProgress, progress.flags.memory_mount_started, wrongAttempts]);

  useEffect(() => {
    if (!locked || flippedIds.length !== 2) {
      return;
    }

    const timeout = setTimeout(() => {
      setFlippedIds([]);
      setLocked(false);
    }, 900);

    return () => clearTimeout(timeout);
  }, [flippedIds, locked]);

  const handleCardPress = (card: MemoryCardInstance) => {
    if (locked || showTruthChoice || showComplete || matchedIds.includes(card.fragmentId) || flippedIds.includes(card.id)) {
      return;
    }

    if (flippedIds.length === 0) {
      setFlippedIds([card.id]);
      return;
    }

    const firstCard = deck.find((deckCard) => deckCard.id === flippedIds[0]);

    if (!firstCard) {
      setFlippedIds([card.id]);
      return;
    }

    const nextFlipped = [firstCard.id, card.id];
    setFlippedIds(nextFlipped);

    if (firstCard.fragmentId !== card.fragmentId) {
      const nextWrongAttempts = wrongAttempts + 1;
      setWrongAttempts(nextWrongAttempts);
      setLocked(true);
      setDialogue(mismatchLines[wrongAttempts % mismatchLines.length]);
      setDialogueTitle('Archive Mismatch');
      onProgress({
        counters: { memory_pairs_matched: matchedCount, memory_wrong_attempts: nextWrongAttempts },
        flags: nextWrongAttempts >= 4 ? ['memory_mounted_unstable'] : [],
        stats: nextWrongAttempts >= 5 ? { corruption: 1 } : {},
      });
      return;
    }

    const fragment = getFragment(card.fragmentId);
    const nextMatchedIds = [...matchedIds, fragment.id];
    const nextMatchedCount = nextMatchedIds.length;
    setMatchedIds(nextMatchedIds);
    setFlippedIds([]);
    setDialogue(fragment.dialogue);
    setDialogueTitle(`${fragment.title} Mounted`);

    const flags: StoryFlag[] = [...(fragment.setFlags ?? [])];

    if (nextMatchedCount === 3 && !progress.flags.overwatcher_glimpse_seen) {
      flags.push('overwatcher_glimpse_seen');
      setDialogue(midGameLines);
      setDialogueTitle('Archive Depth');
    }

    onProgress({
      counters: { memory_pairs_matched: nextMatchedCount, memory_wrong_attempts: wrongAttempts },
      flags,
      stats: fragment.statChanges,
    });

    if (nextMatchedCount >= memoryFragments.length) {
      setShowTruthChoice(true);
      setDialogue([
        { speaker: 'system', text: 'All visible fragments mounted.' },
        { speaker: 'system', text: 'First memory statement requires witness selection.' },
      ]);
      setDialogueTitle('Memory Assembly');
    }
  };

  const chooseTruth = (value: StoryFactValue) => {
    const option = truthOptions.find((truthOption) => truthOption.value === value) ?? truthOptions[0];
    setTruthChosen(value);
    setShowTruthChoice(false);
    setShowComplete(true);
    setDialogue([
      ...option.reaction,
      { speaker: 'unknown', text: 'Do not mount what was removed.' },
      { speaker: 'echo', text: 'That voice again.' },
      { speaker: 'echo', text: 'I am starting to think the app has terrible roommates.' },
      ...finalLines,
    ]);
    setDialogueTitle('Memory Mounted');
    onComplete({
      counters: { memory_pairs_matched: memoryFragments.length, memory_wrong_attempts: wrongAttempts },
      facts: { memory_first_truth: value },
      flags: ['memory_mount_completed', ...(mountedUnstable ? ['memory_mounted_unstable' as const] : [])],
      stats: {
        ...(wrongAttempts <= 1 ? { stability: 1 } : {}),
        ...option.stats,
      },
    });
  };

  return (
    <View style={{ gap: GameTheme.spacing.lg }}>
      <StatusPanel completed={showComplete} matchedCount={matchedCount} wrongAttempts={wrongAttempts} />

      <GameCard elevated>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText tone="faint" variant="label">
            Prologue: The First Boot
          </GameText>
          <GameText variant="title">Memory Mount: The Fragment Drawer</GameText>
          <GameText tone="muted">
            The powered rack opens a damaged archive drawer. Match the image fragments to mount what Echo can still reach.
          </GameText>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm, justifyContent: 'space-between' }}>
          {deck.map((card) => {
            const fragment = getFragment(card.fragmentId);
            const revealed = flippedIds.includes(card.id);
            const matched = matchedIds.includes(card.fragmentId);

            return (
              <MemoryCard
                disabled={locked}
                fragment={fragment}
                key={card.id}
                matched={matched}
                onPress={() => handleCardPress(card)}
                revealed={revealed}
              />
            );
          })}
        </View>

        {showTruthChoice ? (
          <GameCard style={{ padding: GameTheme.spacing.md }}>
            <GameText tone="faint" variant="label">
              First Memory Statement
            </GameText>
            <View style={{ gap: GameTheme.spacing.sm }}>
              {truthOptions.map((option) => (
                <CasinoButton key={option.value} onPress={() => chooseTruth(option.value)} tone="echo">
                  {option.label}
                </CasinoButton>
              ))}
            </View>
          </GameCard>
        ) : null}

        <TransmissionPanel lines={dialogue} title={dialogueTitle} />

        {showComplete ? (
          <GameCard style={{ padding: GameTheme.spacing.md }}>
            <GameText tone="faint" variant="label">
              Next System Available
            </GameText>
            <GameText variant="title">Ledger Wake</GameText>
            <GameText tone="muted">
              Locked for now. The ledger spine is moving, but it has not decided whether that is allowed.
            </GameText>
            {truthChosen ? (
              <GameText tone="faint">First truth selected: {truthChosen}</GameText>
            ) : null}
          </GameCard>
        ) : null}
      </GameCard>
    </View>
  );
}
