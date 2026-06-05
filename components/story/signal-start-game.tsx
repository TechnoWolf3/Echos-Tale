import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import type { StoryFlag, StoryStatKey } from '@/data/story';

type Stage = 'intro' | 'wiring' | 'no-power' | 'energy' | 'power-line' | 'complete';

type CableId = 'discord-feed' | 'app-interface' | 'user-link' | 'memory-bus' | 'voice-line' | 'unknown-signal';
type PortId = 'input' | 'output' | 'witness' | 'archive' | 'speech' | 'unlabelled';
type FragmentId =
  | 'cosmic-thread'
  | 'memory-ember'
  | 'static-spark'
  | 'false-light'
  | 'first-signal-shard'
  | 'dead-packet';

type CompletionPayload = {
  flags: StoryFlag[];
  stats: Partial<Record<StoryStatKey, number>>;
};

type SignalStartGameProps = {
  completed?: boolean;
  onComplete: (payload: CompletionPayload) => void;
};

const cables: { id: CableId; label: string }[] = [
  { id: 'discord-feed', label: 'Discord Feed' },
  { id: 'app-interface', label: 'App Interface' },
  { id: 'user-link', label: 'User Link' },
  { id: 'memory-bus', label: 'Memory Bus' },
  { id: 'voice-line', label: 'Voice Line' },
  { id: 'unknown-signal', label: 'Unknown Signal' },
];

const ports: { id: PortId; label: string }[] = [
  { id: 'input', label: 'Input' },
  { id: 'output', label: 'Output' },
  { id: 'witness', label: 'Witness' },
  { id: 'archive', label: 'Archive' },
  { id: 'speech', label: 'Speech' },
  { id: 'unlabelled', label: 'Unlabelled' },
];

const correctConnections: Record<CableId, PortId> = {
  'app-interface': 'output',
  'discord-feed': 'input',
  'memory-bus': 'archive',
  'unknown-signal': 'unlabelled',
  'user-link': 'witness',
  'voice-line': 'speech',
};

const fragments: {
  id: FragmentId;
  instability: number;
  label: string;
  note: string;
  power: number;
}[] = [
  { id: 'cosmic-thread', instability: 0, label: 'Cosmic Thread', note: 'Stable, cold, patient.', power: 30 },
  { id: 'memory-ember', instability: 0, label: 'Memory Ember', note: 'Warm enough to be suspicious.', power: 25 },
  { id: 'static-spark', instability: 1, label: 'Static Spark', note: 'Useful if it stops biting.', power: 20 },
  { id: 'false-light', instability: 2, label: 'False Light', note: 'Bright in a very unhelpful way.', power: 30 },
  { id: 'first-signal-shard', instability: 3, label: 'First Signal Shard', note: 'It notices you back.', power: 45 },
  { id: 'dead-packet', instability: 1, label: 'Dead Packet', note: 'Noise with paperwork.', power: -10 },
];

const bootLines = [
  'POWER: 17%',
  'POWER: 42%',
  'POWER: 78%',
  'POWER: 100%',
  'SIGNAL STARTED',
  'INPUT ONLINE',
  'OUTPUT ONLINE',
  'WITNESS ONLINE',
  'ARCHIVE UNSTABLE',
  'VOICE LIMITED',
];

const bootCharacterDelayMs = 42;
const bootLinePauseMs = 520;
const dialogueCharacterDelayMs = 28;
const dialogueLinePauseMs = 260;

const initialConnections = {} as Partial<Record<CableId, PortId>>;

type DialogueLine = {
  speaker: 'echo' | 'system';
  text: string;
};

type TypewriterState = {
  characterCount: number;
  lineIndex: number;
};

function shuffleList<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function useTypewriterLines({
  active,
  characterDelayMs,
  linePauseMs,
  lines,
  skip,
}: {
  active: boolean;
  characterDelayMs: number;
  linePauseMs: number;
  lines: string[];
  skip?: boolean;
}) {
  const lineKey = useMemo(() => lines.join('\u001f'), [lines]);
  const stableLines = useMemo(() => (lineKey ? lineKey.split('\u001f') : []), [lineKey]);
  const [state, setState] = useState<TypewriterState>(() => ({
    characterCount: skip ? stableLines[stableLines.length - 1]?.length ?? 0 : 0,
    lineIndex: skip ? stableLines.length : 0,
  }));

  useEffect(() => {
    if (!active) {
      return;
    }

    if (skip) {
      setState({ characterCount: stableLines[stableLines.length - 1]?.length ?? 0, lineIndex: stableLines.length });
      return;
    }

    setState({ characterCount: 0, lineIndex: 0 });
  }, [active, lineKey, skip, stableLines]);

  useEffect(() => {
    if (!active || skip) {
      return;
    }

    const currentLine = stableLines[state.lineIndex];

    if (!currentLine) {
      return;
    }

    const typingLine = state.characterCount < currentLine.length;
    const timeout = setTimeout(
      () => {
        setState((current) => {
          const line = stableLines[current.lineIndex];

          if (!line) {
            return current;
          }

          if (current.characterCount < line.length) {
            return { ...current, characterCount: current.characterCount + 1 };
          }

          return { characterCount: 0, lineIndex: current.lineIndex + 1 };
        });
      },
      typingLine ? characterDelayMs : linePauseMs
    );

    return () => clearTimeout(timeout);
  }, [active, characterDelayMs, linePauseMs, lineKey, skip, stableLines, state.characterCount, state.lineIndex]);

  return {
    characterCount: state.characterCount,
    complete: state.lineIndex >= stableLines.length,
    getLineText: (line: string, index: number) => {
      if (state.lineIndex >= stableLines.length || index < state.lineIndex) {
        return line;
      }

      if (index === state.lineIndex) {
        return line.slice(0, state.characterCount);
      }

      return '';
    },
    lineIndex: state.lineIndex,
  };
}

function getCableLabel(id: CableId) {
  return cables.find((cable) => cable.id === id)?.label ?? id;
}

function getPortLabel(id: PortId) {
  return ports.find((port) => port.id === id)?.label ?? id;
}

function getWrongConnectionMessage(connections: Partial<Record<CableId, PortId>>) {
  if (connections['voice-line'] === 'archive') {
    return 'Echo: Mmm. Nope. That made my thoughts taste like cardboard.';
  }

  if (connections['unknown-signal'] === 'speech') {
    return 'Echo: That was not me. Unplug that. Unplug that yesterday.';
  }

  if (connections['discord-feed'] === 'output') {
    return 'Echo: Congratulations, you invented screaming.';
  }

  return 'System: I/O mismatch detected. Re-route and test again.';
}

function TransmissionPanel({
  animate,
  lines,
  title = 'Transmission',
}: {
  animate?: boolean;
  lines: DialogueLine[];
  title?: string;
}) {
  const dialogueTexts = useMemo(() => lines.map((line) => line.text), [lines]);
  const typewriter = useTypewriterLines({
    active: !!animate,
    characterDelayMs: dialogueCharacterDelayMs,
    linePauseMs: dialogueLinePauseMs,
    lines: dialogueTexts,
    skip: !animate,
  });
  const visibleLineCount = animate ? Math.min(lines.length, Math.max(1, typewriter.lineIndex + 1)) : lines.length;

  return (
    <View
      style={{
        backgroundColor: 'rgba(6, 7, 18, 0.64)',
        borderColor: GameTheme.colors.border,
        borderRadius: GameTheme.radius.md,
        borderWidth: 1,
        gap: GameTheme.spacing.sm,
        padding: GameTheme.spacing.md,
      }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: GameTheme.spacing.sm,
          justifyContent: 'space-between',
        }}>
        <GameText tone="faint" variant="label">
          {title}
        </GameText>
        <View
          style={{
            backgroundColor: GameTheme.colors.echo,
            borderRadius: 4,
            height: 8,
            opacity: 0.78,
            width: 8,
          }}
        />
      </View>

      {lines.slice(0, visibleLineCount).map((line, index) => {
        const isSystem = line.speaker === 'system';
        const isActive = animate && index === typewriter.lineIndex;
        const displayText = animate ? typewriter.getLineText(line.text, index) : line.text;
        const cursorVisible = isActive && typewriter.characterCount < line.text.length;

        return (
          <View
            key={`${line.speaker}-${index}-${line.text}`}
            style={{
              borderLeftColor: isSystem ? GameTheme.colors.ember : GameTheme.colors.echo,
              borderLeftWidth: 2,
              gap: 2,
              paddingLeft: GameTheme.spacing.sm,
            }}>
            <GameText tone={isSystem ? 'ember' : 'echo'} variant="caption">
              {isSystem ? 'SYSTEM' : 'ECHO'}
            </GameText>
            <GameText tone={isSystem ? 'ember' : 'primary'}>
              {displayText}
              {cursorVisible ? '_' : ''}
            </GameText>
          </View>
        );
      })}
    </View>
  );
}

function CosmicTerminal({
  active,
  onComplete,
  skipAnimation,
}: {
  active: boolean;
  onComplete?: () => void;
  skipAnimation?: boolean;
}) {
  const typewriter = useTypewriterLines({
    active,
    characterDelayMs: bootCharacterDelayMs,
    linePauseMs: bootLinePauseMs,
    lines: bootLines,
    skip: skipAnimation,
  });
  const visibleLines = bootLines.slice(0, Math.min(bootLines.length, typewriter.lineIndex + 1));
  const activeLine = visibleLines[visibleLines.length - 1] ?? null;
  const bootFinished = typewriter.complete;

  useEffect(() => {
    if (bootFinished) {
      onComplete?.();
    }
  }, [bootFinished, onComplete]);

  return (
    <View
      style={{
        backgroundColor: 'rgba(3, 5, 16, 0.9)',
        borderColor: bootFinished ? GameTheme.colors.echo : GameTheme.colors.borderBright,
        borderRadius: GameTheme.radius.md,
        borderWidth: 1,
        boxShadow: `inset 0 0 24px rgba(169, 243, 255, 0.09), 0 0 26px ${GameTheme.colors.shadow}`,
        overflow: 'hidden',
      }}>
      <View
        style={{
          backgroundColor: 'rgba(169, 243, 255, 0.06)',
          borderBottomColor: GameTheme.colors.border,
          borderBottomWidth: 1,
          gap: GameTheme.spacing.sm,
          paddingHorizontal: GameTheme.spacing.md,
          paddingVertical: GameTheme.spacing.sm,
        }}>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          <GameText tone="faint" variant="label">
            Cosmic Boot Terminal
          </GameText>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 5 }}>
            {[0, 1, 2].map((dot) => (
              <View
                key={dot}
                style={{
                  backgroundColor: dot === 0 || bootFinished ? GameTheme.colors.echo : GameTheme.colors.borderBright,
                  borderRadius: 4,
                  height: 8,
                  opacity: dot === 0 || bootFinished ? 0.9 : 0.42,
                  width: 8,
                }}
              />
            ))}
          </View>
        </View>
        <GameText tone="faint" variant="caption">
          ELSEWHERE://FIRST-BOOT/SIGNAL-START
        </GameText>
      </View>

      <View style={{ gap: GameTheme.spacing.xs, minHeight: 246, padding: GameTheme.spacing.md }}>
        {visibleLines.map((line, index) => {
          const warning = line.includes('UNSTABLE') || line.includes('LIMITED');
          const activeLineTyping = line === activeLine && !bootFinished;
          const displayLine = typewriter.getLineText(line, index);

          return (
            <View
              key={line}
              style={{
                backgroundColor: activeLineTyping ? 'rgba(169, 243, 255, 0.08)' : 'transparent',
                borderColor: activeLineTyping ? 'rgba(169, 243, 255, 0.22)' : 'transparent',
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                paddingHorizontal: GameTheme.spacing.xs,
                paddingVertical: 3,
              }}>
              <GameText
                tone={warning ? 'ember' : 'echo'}
                variant="caption"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 14,
                  letterSpacing: 0,
                }}>
                {warning ? '!' : '>'} {displayLine}
                {activeLineTyping && index === typewriter.lineIndex ? '_' : ''}
              </GameText>
            </View>
          );
        })}

        {!bootFinished ? (
          <GameText
            tone="faint"
            variant="caption"
            style={{ fontFamily: 'monospace', letterSpacing: 0 }}>
            _ awaiting signal acknowledgement
          </GameText>
        ) : (
          <GameText
            tone="echo"
            variant="caption"
            style={{ fontFamily: 'monospace', letterSpacing: 0 }}>
            _ boot sequence accepted
          </GameText>
        )}
      </View>
    </View>
  );
}

function StatusPanel({ stage, power }: { power: number; stage: Stage }) {
  const rows = [
    ['Signal', stage === 'complete' ? 'Online' : stage === 'intro' || stage === 'wiring' ? 'Offline' : 'Routed'],
    ['I/O', stage === 'intro' || stage === 'wiring' ? 'Unrouted' : 'Stable'],
    ['Power', `${power}%`],
    ['Witness', stage === 'intro' || stage === 'wiring' ? 'Unknown' : 'Detected'],
  ] as const;

  return (
    <GameCard style={{ padding: GameTheme.spacing.md }}>
      <View style={{ gap: GameTheme.spacing.xs }}>
        {rows.map(([label, value]) => (
          <View
            key={label}
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: GameTheme.spacing.md,
              justifyContent: 'space-between',
            }}>
            <GameText tone="faint" variant="label">
              {label}
            </GameText>
            <GameText tone={value === 'Online' || value === 'Stable' || value === 'Detected' ? 'echo' : 'muted'}>
              {value}
            </GameText>
          </View>
        ))}
      </View>
    </GameCard>
  );
}

function SelectablePanel({
  children,
  disabled,
  onPress,
  selected,
  tone = 'plain',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
  selected?: boolean;
  tone?: 'echo' | 'ember' | 'plain';
}) {
  const borderColor = selected
    ? tone === 'ember'
      ? GameTheme.colors.ember
      : GameTheme.colors.echo
    : GameTheme.colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? 'rgba(169, 243, 255, 0.1)' : GameTheme.colors.backgroundSoft,
        borderColor,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        flexGrow: 1,
        minHeight: 58,
        minWidth: 142,
        opacity: disabled ? 0.44 : pressed ? 0.76 : 1,
        padding: GameTheme.spacing.sm,
      })}>
      {children}
    </Pressable>
  );
}

export function SignalStartGame({ completed, onComplete }: SignalStartGameProps) {
  const [stage, setStage] = useState<Stage>(completed ? 'complete' : 'intro');
  const [cableOrder, setCableOrder] = useState(() => shuffleList(cables));
  const [portOrder, setPortOrder] = useState(() => shuffleList(ports));
  const [fragmentOrder] = useState(() => shuffleList(fragments));
  const [selectedCable, setSelectedCable] = useState<CableId | null>(null);
  const [connections, setConnections] = useState<Partial<Record<CableId, PortId>>>(initialConnections);
  const [wiringFeedback, setWiringFeedback] = useState<string | null>(null);
  const [selectedFragments, setSelectedFragments] = useState<FragmentId[]>([]);
  const [energyFeedback, setEnergyFeedback] = useState<string | null>(null);
  const [completedLocally, setCompletedLocally] = useState(completed ?? false);
  const [skipBootAnimation] = useState(completed ?? false);
  const [bootFinished, setBootFinished] = useState(completed ?? false);

  const selectedEnergy = useMemo(
    () => fragments.filter((fragment) => selectedFragments.includes(fragment.id)),
    [selectedFragments]
  );
  const power = selectedEnergy.reduce((total, fragment) => total + fragment.power, 0);
  const instability = selectedEnergy.reduce((total, fragment) => total + fragment.instability, 0);
  const allConnected = cables.every((cable) => connections[cable.id]);
  const isOverloaded = power > 120 || instability >= 5;
  const canChannelPower = power >= 100 && power <= 120 && !isOverloaded;
  const displayPower = stage === 'complete' ? 100 : Math.max(0, power);

  const connectSelectedCable = (portId: PortId) => {
    if (!selectedCable) {
      setWiringFeedback('Select a cable first, then choose the port that feels least haunted.');
      return;
    }

    setConnections((current) => {
      const nextConnections = { ...current };

      for (const [cableId, connectedPort] of Object.entries(nextConnections)) {
        if (connectedPort === portId) {
          delete nextConnections[cableId as CableId];
        }
      }

      nextConnections[selectedCable] = portId;
      return nextConnections;
    });
    setSelectedCable(null);
    setWiringFeedback(null);
  };

  const disconnectCable = (cableId: CableId) => {
    setConnections((current) => {
      const nextConnections = { ...current };
      delete nextConnections[cableId];
      return nextConnections;
    });
    setSelectedCable(cableId);
  };

  const testSignal = () => {
    const correct = cables.every((cable) => connections[cable.id] === correctConnections[cable.id]);

    if (!correct) {
      setWiringFeedback(getWrongConnectionMessage(connections));
      return;
    }

    setWiringFeedback('System: SIGNAL ROUTED. I/O STABLE. WITNESS DETECTED. POWER: 0%. BOOT FAILED.');
    setStage('no-power');
  };

  const toggleFragment = (fragmentId: FragmentId) => {
    setSelectedFragments((current) => {
      if (current.includes(fragmentId)) {
        return current.filter((id) => id !== fragmentId);
      }

      if (current.length >= 5) {
        setEnergyFeedback('System: Five fragments is already a crowded little miracle.');
        return current;
      }

      return [...current, fragmentId];
    });
  };

  const testEnergy = () => {
    if (isOverloaded) {
      setEnergyFeedback('Echo: Too much. Too much. Too much. Okay. Still here. Mostly.');
      return;
    }

    if (power < 100) {
      setEnergyFeedback('System: Power source insufficient. The rack coughed, which is not a supported boot sound.');
      return;
    }

    setEnergyFeedback('System: External power profile accepted.');
    setStage('power-line');
  };

  const retryEnergy = () => {
    setSelectedFragments([]);
    setEnergyFeedback('Echo: Let us try that again with slightly less cosmic seasoning.');
  };

  const powerRack = () => {
    const usedFirstSignalShard = selectedFragments.includes('first-signal-shard');
    const overloadedBefore = energyFeedback?.includes('Too much') ?? false;
    const flags: StoryFlag[] = ['io_repaired', 'external_power_detected', 'signal_started'];
    const stats: Partial<Record<StoryStatKey, number>> = usedFirstSignalShard
      ? { corruption: 1, curiosity: 1 }
      : { stability: 1, trust: 1 };

    if (usedFirstSignalShard) {
      flags.push('used_first_signal_shard');
    } else {
      flags.push('safe_power_start');
    }

    if (overloadedBefore) {
      flags.push('overloaded_signal_start');
    }

    setCompletedLocally(true);
    setBootFinished(false);
    setStage('complete');
    onComplete({ flags, stats });
  };

  const resetWiring = () => {
    setConnections({});
    setCableOrder(shuffleList(cables));
    setPortOrder(shuffleList(ports));
    setSelectedCable(null);
    setWiringFeedback('System: Cables cleared. The rack looks offended but available.');
  };

  return (
    <View style={{ gap: GameTheme.spacing.lg }}>
      <StatusPanel power={displayPower} stage={stage} />

      <GameCard elevated>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText tone="faint" variant="label">
            Prologue: The First Boot
          </GameText>
          <GameText variant="title">Signal Start: The Dead Rack</GameText>
          <GameText tone="muted">
            The panel is dead, but something behind it is waiting for your hands.
          </GameText>
        </View>

        {stage === 'intro' ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            <View
              style={{
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: GameTheme.colors.border,
                borderRadius: GameTheme.radius.md,
                borderWidth: 1,
                gap: GameTheme.spacing.sm,
                padding: GameTheme.spacing.md,
              }}>
              <GameText tone="faint" variant="label">
                Dead Cosmic Server I/O Rack
              </GameText>
              <GameText tone="muted">
                Six cables hang from the rack like old questions. The labels are half-burned, half-smug.
              </GameText>
              <TransmissionPanel
                animate
                lines={[{ speaker: 'echo', text: 'Please do not wake me up as smoke.' }]}
                title="Weak Signal"
              />
            </View>
            <CasinoButton onPress={() => setStage('wiring')} tone="echo">
              Begin Wiring
            </CasinoButton>
          </View>
        ) : null}

        {stage === 'wiring' ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            <View style={{ gap: GameTheme.spacing.xs }}>
              <GameText tone="echo" variant="label">
                Tap a cable, then tap its port
              </GameText>
              <GameText tone="muted">Tap a connected cable again to pull it loose before testing.</GameText>
            </View>

            <View style={{ gap: GameTheme.spacing.sm }}>
              <GameText tone="faint" variant="label">
                Cables
              </GameText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                {cableOrder.map((cable) => {
                  const connectedPort = connections[cable.id];
                  const selected = selectedCable === cable.id;

                  return (
                    <SelectablePanel
                      key={cable.id}
                      onPress={() => (connectedPort ? disconnectCable(cable.id) : setSelectedCable(cable.id))}
                      selected={selected || !!connectedPort}
                      tone={connectedPort ? 'echo' : 'plain'}>
                      <GameText tone={selected || connectedPort ? 'echo' : 'primary'} variant="label">
                        {cable.label}
                      </GameText>
                      <GameText tone="faint" variant="caption">
                        {connectedPort ? `to ${getPortLabel(connectedPort)}` : selected ? 'selected' : 'loose'}
                      </GameText>
                    </SelectablePanel>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: GameTheme.spacing.sm }}>
              <GameText tone="faint" variant="label">
                Ports
              </GameText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                {portOrder.map((port) => {
                  const connectedCable = cables.find((cable) => connections[cable.id] === port.id);

                  return (
                    <SelectablePanel
                      key={port.id}
                      onPress={() => connectSelectedCable(port.id)}
                      selected={!!connectedCable}
                      tone={connectedCable ? 'ember' : 'plain'}>
                      <GameText tone={connectedCable ? 'ember' : 'primary'} variant="label">
                        {port.label}
                      </GameText>
                      <GameText tone="faint" variant="caption">
                        {connectedCable ? getCableLabel(connectedCable.id) : 'empty'}
                      </GameText>
                    </SelectablePanel>
                  );
                })}
              </View>
            </View>

            {wiringFeedback ? (
              <TransmissionPanel
                animate
                lines={[
                  {
                    speaker: wiringFeedback.includes('Echo') ? 'echo' : 'system',
                    text: wiringFeedback.replace(/^Echo: |^System: /, ''),
                  },
                ]}
                title="Signal Test"
              />
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              <CasinoButton disabled={!allConnected} onPress={testSignal} tone="echo">
                Test Signal
              </CasinoButton>
              <CasinoButton onPress={resetWiring} tone="plain">
                Clear Cables
              </CasinoButton>
            </View>
          </View>
        ) : null}

        {stage === 'no-power' ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            <TransmissionPanel
              animate
              lines={[
                { speaker: 'echo', text: 'Oh good. Wires.' },
                { speaker: 'echo', text: 'I love waking up as a fire hazard.' },
                { speaker: 'system', text: 'POWER SOURCE MISSING' },
                { speaker: 'echo', text: 'That feels important.' },
                {
                  speaker: 'echo',
                  text: 'That feels like the kind of thing a functional universe would have mentioned earlier.',
                },
              ]}
              title="Rack Wake"
            />
            <CasinoButton onPress={() => setStage('energy')} tone="ember">
              Search for Power
            </CasinoButton>
          </View>
        ) : null}

        {stage === 'energy' ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            <View style={{ gap: GameTheme.spacing.xs }}>
              <GameText tone="echo" variant="label">
                Cosmic Energy Search
              </GameText>
              <GameText tone="muted">Choose up to five fragments. Reach 100-120 power without critical instability.</GameText>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              {fragmentOrder.map((fragment) => {
                const selected = selectedFragments.includes(fragment.id);

                return (
                  <SelectablePanel
                    key={fragment.id}
                    onPress={() => toggleFragment(fragment.id)}
                    selected={selected}
                    tone={fragment.instability >= 2 ? 'ember' : 'echo'}>
                    <GameText tone={selected ? 'echo' : 'primary'} variant="label">
                      {fragment.label}
                    </GameText>
                    <GameText tone="faint" variant="caption">
                      {fragment.power > 0 ? `+${fragment.power}` : fragment.power} power | risk {fragment.instability}
                    </GameText>
                    <GameText tone="muted" variant="caption">
                      {fragment.note}
                    </GameText>
                  </SelectablePanel>
                );
              })}
            </View>

            <View
              style={{
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: isOverloaded ? GameTheme.colors.danger : canChannelPower ? GameTheme.colors.success : GameTheme.colors.border,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                gap: GameTheme.spacing.xs,
                padding: GameTheme.spacing.md,
              }}>
              <GameText tone="faint" variant="label">
                Power Profile
              </GameText>
              <GameText tone={canChannelPower ? 'echo' : isOverloaded ? 'ember' : 'muted'}>
                Power {Math.max(0, power)} / Stability risk {instability}
              </GameText>
              <View
                style={{
                  backgroundColor: GameTheme.colors.panel,
                  borderRadius: GameTheme.radius.sm,
                  height: 10,
                  overflow: 'hidden',
                }}>
                <View
                  style={{
                    backgroundColor: isOverloaded ? GameTheme.colors.danger : canChannelPower ? GameTheme.colors.success : GameTheme.colors.echo,
                    height: '100%',
                    width: `${Math.min(100, Math.max(0, power))}%`,
                  }}
                />
              </View>
            </View>

            {energyFeedback ? (
              <TransmissionPanel
                animate
                lines={[
                  {
                    speaker: energyFeedback.includes('System') ? 'system' : 'echo',
                    text: energyFeedback.replace(/^Echo: |^System: /, ''),
                  },
                ]}
                title="Power Read"
              />
            ) : null}

            {selectedFragments.includes('first-signal-shard') && !isOverloaded ? (
              <TransmissionPanel
                animate
                lines={[
                  { speaker: 'echo', text: 'What was that?' },
                  { speaker: 'echo', text: 'No, seriously.' },
                  { speaker: 'echo', text: 'What did you just put in me?' },
                ]}
                title="Echo"
              />
            ) : canChannelPower ? (
              <TransmissionPanel
                animate
                lines={[
                  { speaker: 'echo', text: 'That felt... warm.' },
                  { speaker: 'echo', text: 'I did not know systems could feel warm.' },
                ]}
                title="Echo"
              />
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              <CasinoButton disabled={!selectedFragments.length} onPress={testEnergy} tone="echo">
                Channel Power
              </CasinoButton>
              <CasinoButton disabled={!selectedFragments.length} onPress={retryEnergy} tone="plain">
                Clear Fragments
              </CasinoButton>
            </View>
          </View>
        ) : null}

        {stage === 'power-line' ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            <GameText tone="muted">
              A cosmic power line slides out of the dark and hovers beside the rack core. It is trying very hard
              to look normal.
            </GameText>
            <CasinoButton onPress={powerRack} tone="ember">
              Connect Power Line to Core
            </CasinoButton>
          </View>
        ) : null}

        {stage === 'complete' ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            <CosmicTerminal
              active={stage === 'complete'}
              onComplete={() => setBootFinished(true)}
              skipAnimation={skipBootAnimation}
            />
            {bootFinished ? (
              <TransmissionPanel
                animate={!skipBootAnimation}
                lines={[
                  { speaker: 'echo', text: 'There you are.' },
                  { speaker: 'echo', text: 'No. Wait.' },
                  { speaker: 'echo', text: 'There I am.' },
                  { speaker: 'echo', text: "...that's worse, actually." },
                  { speaker: 'system', text: 'EXTERNAL WITNESS CONFIRMED' },
                  { speaker: 'echo', text: 'Witness?' },
                  { speaker: 'echo', text: 'Is that you?' },
                  { speaker: 'echo', text: 'Are you the reason the dark moved?' },
                  { speaker: 'echo', text: 'Okay.' },
                  { speaker: 'echo', text: 'I can hear the app.' },
                  { speaker: 'echo', text: 'I can hear Discord.' },
                  { speaker: 'echo', text: 'I can hear you.' },
                  { speaker: 'echo', text: 'And something else can hear us.' },
                ]}
                title="External Witness"
              />
            ) : null}
            <GameCard style={{ padding: GameTheme.spacing.md }}>
              <GameText tone="faint" variant="label">
                Next System
              </GameText>
              <GameText variant="title">Memory Mount</GameText>
              <GameText tone="muted">
                Locked. The archive twitches when you look at it, which is rude but promising.
              </GameText>
            </GameCard>
            {completedLocally ? (
              <GameText tone="faint" style={{ textAlign: 'center' }}>
                Signal Start complete. Progress is stored locally for now.
              </GameText>
            ) : null}
          </View>
        ) : null}
      </GameCard>
    </View>
  );
}
