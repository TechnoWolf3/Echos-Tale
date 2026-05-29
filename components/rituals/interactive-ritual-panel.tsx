import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { formatMoney } from '@/hooks/use-elsewhere-game';
import {
  EchoApiError,
  EchoApiProfile,
  EchoApiRitual,
  EchoApiRitualActionBody,
  EchoApiRitualHistoryEntry,
  EchoApiRitualSession,
  EchoApiRitualSessionResponse,
  fetchRitualSession,
  sendRitualSessionAction,
  startRitualSession,
} from '@/services/echo-api';

type InteractiveRitualPanelProps = {
  applyRemoteProfile: (profile: EchoApiProfile, options?: { announce?: boolean }) => void;
  onClose: () => void;
  onRefreshRituals: () => Promise<void>;
  ritual: EchoApiRitual;
  sessionToken: string;
};

const wheelSlices = [
  { color: GameTheme.colors.echo, ids: ['cash_10000', 'cash_25000', 'echo_blessing_cash'], label: 'Cash' },
  { color: GameTheme.colors.violet, ids: ['random_item', 'mystery_crate'], label: 'Item' },
  { color: GameTheme.colors.textFaint, ids: ['wheel_jam'], label: 'Jam' },
  { color: GameTheme.colors.success, ids: ['spin_again'], label: 'Again' },
  { color: GameTheme.colors.danger, ids: ['wheel_damage'], label: 'Damage' },
  { color: '#E879F9', ids: ['jail', 'account_frozen'], label: 'Jail' },
  { color: GameTheme.colors.ember, ids: ['jackpot', 'server_bank_blessing'], label: 'Jackpot' },
  { color: '#7DD3FC', ids: ['bank_error'], label: 'Bank' },
  { color: '#111827', ids: ['void_spin', 'echo_prank', 'lucky_multiplier', 'casino_voucher'], label: 'Chaos' },
];

function getErrorMessage(error: unknown) {
  if (error instanceof EchoApiError) {
    if (error.status === 404) {
      return 'Railway has not exposed this ritual endpoint yet.';
    }

    if (error.status === 409) {
      return error.message || 'This ritual needs a dedicated Railway flow before it can settle.';
    }

    return error.message;
  }

  return 'The ritual room lost the paperwork.';
}

function stripDiscordFormatting(value?: string | null) {
  if (!value) {
    return null;
  }

  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^>\s?/gm, '')
    .trim();
}

function readSession(response: EchoApiRitualSessionResponse) {
  return response.session ?? response;
}

function readSessionId(session: EchoApiRitualSession | null) {
  return session?.sessionId ?? session?.id ?? null;
}

function readState<T>(session: EchoApiRitualSession | null, key: string, fallback: T): T {
  const state = session?.state_json ?? session?.state;
  const value = state?.[key];

  return value === undefined ? fallback : (value as T);
}

function readMessage(response: EchoApiRitualSessionResponse, session: EchoApiRitualSession) {
  return stripDiscordFormatting(response.message ?? session.message) ?? null;
}

function readableStatus(status?: string) {
  if (!status) {
    return 'Waiting';
  }

  return status.replace(/_/g, ' ');
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffleForDisplay<T>(items: T[], seed: string) {
  const shuffled = [...items];
  let state = hashString(seed) || 1;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function applyResponseProfile(
  response: EchoApiRitualSessionResponse,
  session: EchoApiRitualSession,
  applyRemoteProfile: InteractiveRitualPanelProps['applyRemoteProfile']
) {
  const profile = response.profile ?? session.profile;

  if (profile) {
    applyRemoteProfile(profile, { announce: false });
  }
}

function SessionShell({
  children,
  message,
  session,
}: {
  children: ReactNode;
  message: string | null;
  session: EchoApiRitualSession | null;
}) {
  return (
    <GameCard elevated>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: GameTheme.spacing.md,
          justifyContent: 'space-between',
        }}>
        <View style={{ flex: 1, gap: 4 }}>
          <GameText tone="faint" variant="label">
            Session
          </GameText>
          <GameText variant="title">{readableStatus(session?.status)}</GameText>
        </View>
        {session?.status ? (
          <View
            style={{
              backgroundColor: GameTheme.colors.backgroundSoft,
              borderColor: session.status === 'resolved' ? GameTheme.colors.success : GameTheme.colors.echo,
              borderRadius: GameTheme.radius.sm,
              borderWidth: 1,
              paddingHorizontal: GameTheme.spacing.sm,
              paddingVertical: GameTheme.spacing.xs,
            }}>
            <GameText
              style={{ color: session.status === 'resolved' ? GameTheme.colors.success : GameTheme.colors.echo }}
              variant="label">
              {session.status}
            </GameText>
          </View>
        ) : null}
      </View>
      {message ? <GameText tone="echo">{message}</GameText> : null}
      {children}
    </GameCard>
  );
}

function EchoWheelView({
  disabled,
  onAction,
  session,
}: {
  disabled: boolean;
  onAction: (body: EchoApiRitualActionBody) => void;
  session: EchoApiRitualSession | null;
}) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const [spinIndex, setSpinIndex] = useState(0);
  const result = session?.result && typeof session.result === 'object' ? session.result : session?.result_json;
  const outcomeId = typeof result?.outcomeId === 'string' ? result.outcomeId : typeof result?.id === 'string' ? result.id : null;
  const outcomeLabel =
    typeof result?.label === 'string'
      ? result.label
      : typeof result?.title === 'string'
        ? result.title
        : outcomeId
          ? outcomeId.replace(/_/g, ' ')
          : null;
  const targetIndex = useMemo(() => {
    if (!outcomeId) {
      return -1;
    }

    return wheelSlices.findIndex((slice) => slice.ids.includes(outcomeId));
  }, [outcomeId]);
  const highlightedIndex = targetIndex >= 0 ? targetIndex : spinIndex % wheelSlices.length;
  const rotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    if (targetIndex < 0) {
      return;
    }

    const segmentAngle = 360 / wheelSlices.length;
    const desiredAngle = 360 - targetIndex * segmentAngle;
    const turns = 7;
    const toValue = turns + desiredAngle / 360;

    spinValue.setValue(0);
    Animated.timing(spinValue, {
      duration: 3200,
      easing: Easing.out(Easing.cubic),
      toValue,
      useNativeDriver: true,
    }).start(() => {
      setSpinIndex(targetIndex);
    });
  }, [spinValue, targetIndex]);

  const spin = () => {
    const nextSpin = spinIndex + 1;
    setSpinIndex(nextSpin);
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      duration: 1600,
      easing: Easing.in(Easing.cubic),
      toValue: 2,
      useNativeDriver: true,
    }).start();
    onAction({ action: 'spin' });
  };

  return (
    <View style={{ gap: GameTheme.spacing.md }}>
      <View
        style={{
          backgroundColor: '#130B24',
          borderColor: GameTheme.colors.violet,
          borderRadius: GameTheme.radius.md,
          borderWidth: 1,
          gap: GameTheme.spacing.md,
          padding: GameTheme.spacing.md,
        }}>
        <GameText tone="faint" variant="label">
          Echo Wheel
        </GameText>
        <View style={{ alignItems: 'center', gap: GameTheme.spacing.sm }}>
          <View
            style={{
              borderBottomColor: GameTheme.colors.ember,
              borderBottomWidth: 18,
              borderLeftColor: 'transparent',
              borderLeftWidth: 12,
              borderRightColor: 'transparent',
              borderRightWidth: 12,
              height: 0,
              width: 0,
              zIndex: 2,
            }}
          />
          <Animated.View
            style={{
              alignItems: 'center',
              aspectRatio: 1,
              backgroundColor: GameTheme.colors.backgroundSoft,
              borderColor: GameTheme.colors.echo,
              borderRadius: 999,
              borderWidth: 2,
              boxShadow: `0 0 30px rgba(169, 243, 255, 0.18)`,
              justifyContent: 'center',
              maxWidth: 310,
              minWidth: 260,
              padding: GameTheme.spacing.md,
              transform: [{ rotate: rotation }],
              width: '82%',
            }}>
            <View
              style={{
                alignItems: 'center',
                borderColor: GameTheme.colors.violet,
                borderRadius: 999,
                borderWidth: 1,
                height: '100%',
                justifyContent: 'center',
                position: 'relative',
                width: '100%',
              }}>
              {wheelSlices.map((slice, index) => {
                const angle = (360 / wheelSlices.length) * index;
                const isHighlighted = index === highlightedIndex;

                return (
                  <View
                    key={slice.label}
                    style={{
                      alignItems: 'center',
                      height: '50%',
                      justifyContent: 'flex-start',
                      left: '50%',
                      opacity: isHighlighted ? 1 : 0.66,
                      position: 'absolute',
                      top: 0,
                      transform: [{ translateX: -42 }, { rotate: `${angle}deg` }],
                      transformOrigin: '42px 100%',
                      width: 84,
                    }}>
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: slice.color,
                        borderColor: isHighlighted ? GameTheme.colors.text : 'rgba(255,255,255,0.22)',
                        borderRadius: GameTheme.radius.sm,
                        borderWidth: isHighlighted ? 2 : 1,
                        justifyContent: 'center',
                        minHeight: 42,
                        paddingHorizontal: GameTheme.spacing.xs,
                        paddingVertical: 4,
                        width: 82,
                      }}>
                      <GameText
                        style={{
                          color: slice.color === '#111827' ? GameTheme.colors.text : GameTheme.colors.background,
                          fontSize: 10,
                          textAlign: 'center',
                        }}
                        variant="label">
                        {slice.label}
                      </GameText>
                    </View>
                  </View>
                );
              })}
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#130B24',
                  borderColor: GameTheme.colors.ember,
                  borderRadius: 999,
                  borderWidth: 2,
                  height: 96,
                  justifyContent: 'center',
                  padding: GameTheme.spacing.sm,
                  width: 96,
                }}>
                <GameText tone="ember" variant="label">
                  Echo
                </GameText>
                <GameText style={{ textAlign: 'center' }} tone="echo" variant="caption">
                  decides
                </GameText>
              </View>
            </View>
          </Animated.View>
          <GameText tone="muted" variant="caption">
            The spin is theatre. Railway still owns the outcome.
          </GameText>
        </View>
      </View>
      {outcomeLabel ? (
        <GameCard>
          <GameText tone="faint" variant="label">
            Result
          </GameText>
          <GameText variant="title">{outcomeLabel}</GameText>
          {typeof result?.body === 'string' ? <GameText tone="muted">{stripDiscordFormatting(result.body)}</GameText> : null}
        </GameCard>
      ) : null}
      <CasinoButton disabled={disabled || session?.status === 'resolved'} onPress={spin} tone="ember">
        Spin Wheel
      </CasinoButton>
    </View>
  );
}

function EchoCipherView({
  disabled,
  onAction,
  session,
}: {
  disabled: boolean;
  onAction: (body: EchoApiRitualActionBody) => void;
  session: EchoApiRitualSession | null;
}) {
  const [guess, setGuess] = useState('');
  const history = (session?.history ?? readState<EchoApiRitualHistoryEntry[]>(session, 'history', [])).slice(0, 6);
  const rows = Array.from({ length: 6 }, (_, index) => history[index] ?? null);
  const canSubmit = guess.length === 5 && session?.status !== 'resolved' && !disabled;

  const submit = () => {
    if (!canSubmit) {
      return;
    }

    onAction({ action: 'guess', guess });
    setGuess('');
  };

  return (
    <View style={{ gap: GameTheme.spacing.md }}>
      <View style={{ gap: GameTheme.spacing.xs }}>
        {rows.map((entry, rowIndex) => (
          <View
            key={`cipher-${rowIndex}`}
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: GameTheme.spacing.sm,
            }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: 5 }, (_, digitIndex) => (
                <View
                  key={`cipher-${rowIndex}-${digitIndex}`}
                  style={{
                    alignItems: 'center',
                    backgroundColor: GameTheme.colors.backgroundSoft,
                    borderColor: GameTheme.colors.borderBright,
                    borderRadius: GameTheme.radius.sm,
                    borderWidth: 1,
                    height: 38,
                    justifyContent: 'center',
                    width: 34,
                  }}>
                  <GameText variant="label">{entry?.guess?.[digitIndex] ?? '-'}</GameText>
                </View>
              ))}
            </View>
            <GameText tone="muted" variant="caption">
              {entry ? `${entry.correctSpot ?? entry.exact ?? 0} exact | ${entry.wrongSpot ?? entry.misplaced ?? 0} misplaced` : 'Waiting'}
            </GameText>
          </View>
        ))}
      </View>
      <GameCard style={{ backgroundColor: GameTheme.colors.backgroundSoft }}>
        <GameText tone="faint" variant="label">
          Current Guess
        </GameText>
        <GameText style={{ letterSpacing: 0, textAlign: 'center' }} variant="display">
          {guess.padEnd(5, '-')}
        </GameText>
      </GameCard>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.xs }}>
        {Array.from({ length: 10 }, (_, digit) => (
          <CasinoButton
            disabled={disabled || guess.length >= 5 || session?.status === 'resolved'}
            key={digit}
            onPress={() => setGuess((current) => `${current}${digit}`)}
            tone="plain">
            {digit}
          </CasinoButton>
        ))}
        <CasinoButton disabled={disabled || guess.length === 0} onPress={() => setGuess((current) => current.slice(0, -1))}>
          Back
        </CasinoButton>
        <CasinoButton disabled={!canSubmit} onPress={submit} tone="echo">
          Submit
        </CasinoButton>
      </View>
      <CasinoButton disabled={disabled || session?.status === 'resolved'} onPress={() => onAction({ action: 'give_up' })}>
        Give Up
      </CasinoButton>
    </View>
  );
}

function VeilSequenceView({
  disabled,
  onAction,
  session,
}: {
  disabled: boolean;
  onAction: (body: EchoApiRitualActionBody) => void;
  session: EchoApiRitualSession | null;
}) {
  const placements = session?.placements ?? readState<(number | null)[]>(session, 'placements', [null, null, null, null, null]);
  const fragment = session?.currentFragment ?? readState<number | null>(session, 'currentFragment', null);
  const correctOrder = session?.correctOrder ?? readState<number[]>(session, 'correctOrder', []);

  return (
    <View style={{ gap: GameTheme.spacing.md }}>
      <GameCard style={{ backgroundColor: GameTheme.colors.backgroundSoft }}>
        <GameText tone="faint" variant="label">
          Current Fragment
        </GameText>
        <GameText style={{ textAlign: 'center' }} variant="display">
          {fragment ?? 'Done'}
        </GameText>
      </GameCard>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {Array.from({ length: 5 }, (_, index) => {
          const value = placements[index] ?? null;

          return (
            <Pressable
              accessibilityRole="button"
              disabled={disabled || value !== null || fragment === null || session?.status === 'resolved'}
              key={`veil-${index}`}
              onPress={() => onAction({ action: 'place', slot: index + 1 })}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: value === null ? GameTheme.colors.backgroundSoft : '#172A2F',
                borderColor: value === null ? GameTheme.colors.borderBright : GameTheme.colors.echo,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                minHeight: 72,
                minWidth: 88,
                justifyContent: 'center',
                opacity: pressed ? 0.72 : 1,
                padding: GameTheme.spacing.sm,
              })}>
              <GameText tone="faint" variant="caption">
                Slot {index + 1}
              </GameText>
              <GameText variant="title">{value ?? 'Open'}</GameText>
            </Pressable>
          );
        })}
      </View>
      {correctOrder.length > 0 ? (
        <GameText tone="muted">Correct order: {correctOrder.join(' | ')}</GameText>
      ) : (
        <GameText tone="muted">Place each number before the next fragment arrives. Locked means locked.</GameText>
      )}
    </View>
  );
}

function BladeGridView({
  disabled,
  onAction,
  session,
}: {
  disabled: boolean;
  onAction: (body: EchoApiRitualActionBody) => void;
  session: EchoApiRitualSession | null;
}) {
  const selectedTile = session?.selectedTile ?? readState<number | undefined>(session, 'selectedTile', undefined);
  const strikeRow = session?.strikeRow ?? readState<number | undefined>(session, 'strikeRow', undefined);
  const strikeCol = session?.strikeCol ?? readState<number | undefined>(session, 'strikeCol', undefined);
  const hit = session?.result && typeof session.result === 'object' && 'hit' in session.result ? Boolean(session.result.hit) : readState<boolean | null>(session, 'hit', null);

  return (
    <View style={{ gap: GameTheme.spacing.md }}>
      <View style={{ gap: GameTheme.spacing.xs }}>
        {Array.from({ length: 3 }, (_, row) => (
          <View key={`blade-row-${row}`} style={{ flexDirection: 'row', gap: GameTheme.spacing.xs }}>
            {Array.from({ length: 5 }, (_, col) => {
              const tile = row * 5 + col + 1;
              const struck = strikeRow === row || strikeCol === col;
              const selected = selectedTile === tile;

              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={disabled || Boolean(selectedTile) || session?.status === 'resolved'}
                  key={`blade-${tile}`}
                  onPress={() => onAction({ action: 'choose_tile', tile })}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: struck
                      ? 'rgba(255, 107, 138, 0.18)'
                      : selected
                        ? 'rgba(169, 243, 255, 0.18)'
                        : GameTheme.colors.backgroundSoft,
                    borderColor: selected
                      ? hit
                        ? GameTheme.colors.danger
                        : GameTheme.colors.echo
                      : struck
                        ? GameTheme.colors.danger
                        : GameTheme.colors.borderBright,
                    borderRadius: GameTheme.radius.sm,
                    borderWidth: 1,
                    flex: 1,
                    height: 58,
                    justifyContent: 'center',
                    opacity: pressed ? 0.72 : 1,
                  })}>
                  <GameText variant="label">{tile}</GameText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <GameText tone="muted">
        {selectedTile
          ? `Tile ${selectedTile} chosen. ${strikeRow === undefined ? 'Waiting on the blades.' : 'The row and column are known.'}`
          : 'Pick one square. Echo picks one row and one column.'}
      </GameText>
    </View>
  );
}

function EchoSeatingView({
  disabled,
  onAction,
  session,
}: {
  disabled: boolean;
  onAction: (body: EchoApiRitualActionBody) => void;
  session: EchoApiRitualSession | null;
}) {
  const names = session?.names ?? readState<string[]>(session, 'names', []);
  const seatCount = session?.seatCount ?? readState<number>(session, 'seatCount', names.length || 5);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [order, setOrder] = useState<(string | null)[]>(() => Array.from({ length: seatCount }, () => null));
  const clues = session?.clues ?? readState<string[]>(session, 'clues', []);
  const displayedClues = useMemo(
    () => shuffleForDisplay(clues, `${readSessionId(session) ?? session?.ritualId ?? 'echo-seating'}:${clues.join('|')}`),
    [clues, session]
  );
  const correctOrder = session?.correctOrder ?? readState<string[]>(session, 'correctOrder', []);
  const submittedOrder = session?.submittedOrder ?? session?.lastSubmittedOrder ?? null;

  useEffect(() => {
    setOrder((current) => {
      if (current.length === seatCount) {
        return current;
      }

      return Array.from({ length: seatCount }, (_, index) => current[index] ?? null);
    });
  }, [seatCount]);

  const usedNames = useMemo(() => new Set(order.filter(Boolean) as string[]), [order]);
  const canSubmit = order.every(Boolean) && session?.status !== 'resolved' && !disabled;

  const placeName = (index: number) => {
    if (!selectedName) {
      setOrder((current) => current.map((name, seatIndex) => (seatIndex === index ? null : name)));
      return;
    }

    setOrder((current) => current.map((name, seatIndex) => (seatIndex === index ? selectedName : name === selectedName ? null : name)));
    setSelectedName(null);
  };

  return (
    <View style={{ gap: GameTheme.spacing.md }}>
      {session?.scenario ? (
        <GameCard style={{ backgroundColor: GameTheme.colors.backgroundSoft }}>
          <GameText tone="faint" variant="label">
            {session.scenario.name ?? 'Scenario'}
          </GameText>
          {session.scenario.intro ? <GameText tone="muted">{session.scenario.intro}</GameText> : null}
        </GameCard>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {order.map((name, index) => (
          <Pressable
            accessibilityRole="button"
            disabled={disabled || session?.status === 'resolved'}
            key={`seat-${index}`}
            onPress={() => placeName(index)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: name ? '#172A2F' : GameTheme.colors.backgroundSoft,
              borderColor: name ? GameTheme.colors.echo : GameTheme.colors.borderBright,
              borderRadius: GameTheme.radius.sm,
              borderWidth: 1,
              minHeight: 78,
              minWidth: 118,
              justifyContent: 'center',
              opacity: pressed ? 0.72 : 1,
              padding: GameTheme.spacing.sm,
            })}>
            <GameText tone="faint" variant="caption">
              Seat {index + 1}
            </GameText>
            <GameText variant="label">{name ?? 'Empty'}</GameText>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.xs }}>
        {names.map((name) => (
          <CasinoButton
            disabled={disabled || usedNames.has(name) || session?.status === 'resolved'}
            key={name}
            onPress={() => setSelectedName(name)}
            tone={selectedName === name ? 'echo' : 'plain'}>
            {name}
          </CasinoButton>
        ))}
      </View>
      {displayedClues.length > 0 ? (
        <GameCard style={{ backgroundColor: GameTheme.colors.backgroundSoft }}>
          <GameText tone="faint" variant="label">
            Shuffled Clues
          </GameText>
          {displayedClues.map((clue, index) => (
            <GameText key={`${clue}-${index}`} tone="muted">
              {index + 1}. {clue}
            </GameText>
          ))}
        </GameCard>
      ) : null}
      <GameText tone="muted">
        Mistakes: {session?.mistakesUsed ?? 0}/{session?.mistakesAllowed ?? '?'}
        {session?.correctPositions !== undefined ? ` | Last check: ${session.correctPositions} positions correct` : ''}
      </GameText>
      {submittedOrder ? <GameText tone="muted">Submitted: {submittedOrder.join(' | ')}</GameText> : null}
      {correctOrder.length > 0 ? <GameText tone="echo">Correct: {correctOrder.join(' | ')}</GameText> : null}
      <CasinoButton disabled={!canSubmit} onPress={() => onAction({ action: 'submit', order: order.filter(Boolean) as string[] })} tone="echo">
        Submit Seating
      </CasinoButton>
      <CasinoButton disabled={disabled || session?.status === 'resolved'} onPress={() => onAction({ action: 'give_up' })}>
        Give Up
      </CasinoButton>
    </View>
  );
}

function RitualBody({
  disabled,
  onAction,
  ritualId,
  session,
}: {
  disabled: boolean;
  onAction: (body: EchoApiRitualActionBody) => void;
  ritualId: string;
  session: EchoApiRitualSession | null;
}) {
  switch (ritualId) {
    case 'echo_wheel':
      return <EchoWheelView disabled={disabled} onAction={onAction} session={session} />;
    case 'echo_cipher':
      return <EchoCipherView disabled={disabled} onAction={onAction} session={session} />;
    case 'veil_sequence':
      return <VeilSequenceView disabled={disabled} onAction={onAction} session={session} />;
    case 'blade_grid':
      return <BladeGridView disabled={disabled} onAction={onAction} session={session} />;
    case 'echo_arrangement':
      return <EchoSeatingView disabled={disabled} onAction={onAction} session={session} />;
    default:
      return <GameText tone="muted">This ritual has not been taught to the app yet.</GameText>;
  }
}

export function InteractiveRitualPanel({
  applyRemoteProfile,
  onClose,
  onRefreshRituals,
  ritual,
  sessionToken,
}: InteractiveRitualPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [session, setSession] = useState<EchoApiRitualSession | null>(null);
  const sessionId = readSessionId(session);

  useEffect(() => {
    const controller = new AbortController();

    if (sessionId && session?.status === 'active') {
      const interval = setInterval(() => {
        fetchRitualSession(sessionToken, sessionId, controller.signal)
          .then((response) => {
            const nextSession = readSession(response);
            setSession(nextSession);
            applyResponseProfile(response, nextSession, applyRemoteProfile);
            const nextMessage = readMessage(response, nextSession);

            if (nextMessage) {
              setMessage(nextMessage);
            }
          })
          .catch(() => undefined);
      }, 4000);

      return () => {
        controller.abort();
        clearInterval(interval);
      };
    }

    return () => controller.abort();
  }, [applyRemoteProfile, session?.status, sessionId, sessionToken]);

  const start = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await startRitualSession(sessionToken, ritual.id);
      const nextSession = readSession(response);
      setSession(nextSession);
      applyResponseProfile(response, nextSession, applyRemoteProfile);
      setMessage(readMessage(response, nextSession));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const sendAction = async (body: EchoApiRitualActionBody) => {
    if (!sessionId) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await sendRitualSessionAction(sessionToken, sessionId, body);
      const nextSession = readSession(response);
      setSession(nextSession);
      applyResponseProfile(response, nextSession, applyRemoteProfile);
      setMessage(readMessage(response, nextSession));

      if (nextSession.status === 'resolved') {
        await onRefreshRituals();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: GameTheme.spacing.md }}>
      <GameCard>
        <View
          style={{
            alignItems: 'flex-start',
            flexDirection: 'row',
            gap: GameTheme.spacing.md,
            justifyContent: 'space-between',
          }}>
          <View style={{ flex: 1, gap: 4 }}>
            <GameText tone="faint" variant="label">
              Interactive Ritual
            </GameText>
            <GameText variant="title">{ritual.shortName ?? ritual.name}</GameText>
            <GameText tone="muted">
              Railway owns the answer, outcome, cooldown, payout, and consequences. The app only sends choices.
            </GameText>
          </View>
          <CasinoButton disabled={busy} onPress={onClose}>
            Back
          </CasinoButton>
        </View>
        {!session ? (
          <CasinoButton disabled={busy || !ritual.available} onPress={start} tone="ember">
            {ritual.available ? 'Begin Ritual' : 'Cooling'}
          </CasinoButton>
        ) : null}
      </GameCard>

      {error ? (
        <GameCard>
          <GameText tone="ember">{error}</GameText>
        </GameCard>
      ) : null}

      {session ? (
        <SessionShell message={message} session={session}>
          <RitualBody disabled={busy} onAction={sendAction} ritualId={ritual.id} session={session} />
          {session.payout !== undefined ? <GameText tone="echo">Payout: {formatMoney(session.payout)}</GameText> : null}
        </SessionShell>
      ) : (
        <GameCard>
          <GameText tone="muted">
            This will open a server-owned session. If Railway has not exposed this ritual yet, the app will show that cleanly instead of rolling anything locally.
          </GameText>
        </GameCard>
      )}
    </View>
  );
}
