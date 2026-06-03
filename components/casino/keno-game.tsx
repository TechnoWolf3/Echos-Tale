import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { BetPicker } from '@/components/casino/bet-picker';
import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import { KenoBetType, KenoResult, playKeno } from '@/services/casino-service';
import { EchoApiError, EchoApiKenoBetType, playKenoDraw } from '@/services/echo-api';

const BOARD_NUMBERS = Array.from({ length: 80 }, (_, index) => index + 1);
const CALL_DELAY_MIN_MS = 3_000;
const CALL_DELAY_MAX_MS = 5_000;
const BOARD_COLUMNS = 10;
const CALL_BALL_SIZE = 72;
const modes: { label: string; type: KenoBetType }[] = [
  { label: 'Heads', type: 'heads' },
  { label: 'Tails', type: 'tails' },
  { label: 'Draw', type: 'draw' },
  { label: 'Quick Pick', type: 'quickpick' },
];

function getErrorMessage(error: unknown) {
  if (error instanceof EchoApiError) {
    return error.message;
  }

  return 'Keno could not reach the draw desk.';
}

function createQuickPick() {
  const pool = [...BOARD_NUMBERS];
  const ticket: number[] = [];

  while (ticket.length < 10) {
    const index = Math.floor(Math.random() * pool.length);
    const [number] = pool.splice(index, 1);
    ticket.push(number);
  }

  return ticket.sort((a, b) => a - b);
}

function KenoBulb({
  drawn,
  hit,
  marked,
  number,
  onPress,
}: {
  drawn: boolean;
  hit: boolean;
  marked: boolean;
  number: number;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const isHeads = number <= 40;

  useEffect(() => {
    if (!drawn) {
      pulse.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(pulse, { duration: 140, toValue: 1, useNativeDriver: true }),
      Animated.timing(pulse, { duration: 180, toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [drawn, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });

  return (
    <Animated.View style={[styles.bulbFrame, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityLabel={`Keno number ${number}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.bulb,
          isHeads ? styles.headsBulb : styles.tailsBulb,
          marked ? styles.markedBulb : null,
          drawn ? (isHeads ? styles.drawnHeadsBulb : styles.drawnTailsBulb) : null,
          hit ? styles.hitBulb : null,
          pressed ? styles.pressedBulb : null,
        ]}>
        <GameText style={styles.bulbText} tone={drawn || hit || marked ? 'primary' : 'faint'} variant="caption">
          {number}
        </GameText>
      </Pressable>
    </Animated.View>
  );
}

export function KenoGame() {
  const game = useElsewhereGame();
  const [amount, setAmount] = useState(500);
  const [mode, setMode] = useState<KenoBetType>('quickpick');
  const [result, setResult] = useState<KenoResult | null>(null);
  const [markedTicket, setMarkedTicket] = useState<number[]>([]);
  const [revealCount, setRevealCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<number | null>(null);
  const [boardSize, setBoardSize] = useState({ height: 0, width: 0 });
  const callMotion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!result) {
      setActiveCall(null);
      return;
    }

    setRevealCount(0);
  }, [result]);

  useEffect(() => {
    if (!result || revealCount >= result.drawn.length || activeCall !== null) {
      return;
    }

    const delay =
      revealCount === 0
        ? 650
        : CALL_DELAY_MIN_MS + Math.floor(Math.random() * (CALL_DELAY_MAX_MS - CALL_DELAY_MIN_MS + 1));
    const timer = setTimeout(() => {
      const nextNumber = result.drawn[revealCount];

      setActiveCall(nextNumber);
      callMotion.setValue(0);
      Animated.sequence([
        Animated.timing(callMotion, { duration: 420, toValue: 1, useNativeDriver: true }),
        Animated.delay(650),
        Animated.timing(callMotion, { duration: 520, toValue: 2, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (!finished) {
          return;
        }

        setRevealCount((current) => current + 1);
        setActiveCall(null);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [activeCall, callMotion, result, revealCount]);

  const revealedDraws = useMemo(() => result?.drawn.slice(0, revealCount) ?? [], [result, revealCount]);
  const drawnNumbers = useMemo(() => new Set(revealedDraws), [revealedDraws]);
  const ticketNumbers = useMemo(() => new Set(markedTicket), [markedTicket]);
  const visibleHits = markedTicket.filter((number) => drawnNumbers.has(number)).length;
  const latestNumbers = revealedDraws.slice(-5);
  const revealedHeads = revealedDraws.filter((number) => number <= 40).length;
  const revealedTails = revealedDraws.length - revealedHeads;
  const calling = !!result && revealCount < result.drawn.length;
  const controlsLocked = busy || calling || activeCall !== null;

  const toggleTicketNumber = (number: number) => {
    if (controlsLocked) {
      return;
    }

    setMode('quickpick');
    setResult(null);
    setError(null);
    setActiveCall(null);
    setMarkedTicket((current) => {
      if (current.includes(number)) {
        return current.filter((entry) => entry !== number);
      }

      if (current.length >= 10) {
        setError('Keno tickets can hold up to 10 numbers.');
        return current;
      }

      return [...current, number].sort((a, b) => a - b);
    });
  };

  const draw = async () => {
    if (controlsLocked) {
      return;
    }

    setError(null);
    setActiveCall(null);

    if (mode === 'quickpick' && markedTicket.length === 0) {
      setError('Pick 1-10 numbers or use Mark 10 before drawing.');
      return;
    }

    if (game.sessionToken) {
      setBusy(true);

      try {
        const ticket = mode === 'quickpick' ? markedTicket : undefined;
        const nextResult = await playKenoDraw(game.sessionToken, {
          amount,
          ticket,
          type: mode as EchoApiKenoBetType,
        });

        if (nextResult.profile) {
          game.applyRemoteProfile(nextResult.profile, { announce: false });
        }

        setMarkedTicket(nextResult.ticket);
        setResult(nextResult);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setBusy(false);
      }

      return;
    }

    const ticket = mode === 'quickpick' ? markedTicket : undefined;
    const nextResult = playKeno(amount, mode, ticket);
    const settled = game.resolveCasinoPlay({ cost: amount, message: nextResult.message, payout: nextResult.payout });

    if (settled) {
      setMarkedTicket(nextResult.ticket);
      setResult(nextResult);
    }
  };

  const pickRandomTicket = () => {
    if (controlsLocked) {
      return;
    }

    setMode('quickpick');
    setResult(null);
    setError(null);
    setActiveCall(null);
    setMarkedTicket(createQuickPick());
  };

  const clearTicket = () => {
    if (controlsLocked) {
      return;
    }

    setResult(null);
    setError(null);
    setActiveCall(null);
    setMarkedTicket([]);
  };

  const callStartX = boardSize.width / 2 - CALL_BALL_SIZE / 2;
  const callStartY = boardSize.height / 2 - CALL_BALL_SIZE / 2;
  const calledIndex = activeCall ? activeCall - 1 : 0;
  const calledColumn = calledIndex % BOARD_COLUMNS;
  const calledRow = Math.floor(calledIndex / BOARD_COLUMNS);
  const boardInnerWidth = Math.max(0, boardSize.width - GameTheme.spacing.sm * 2);
  const boardCellSize = boardInnerWidth / BOARD_COLUMNS;
  const callTargetX = GameTheme.spacing.sm + calledColumn * boardCellSize + boardCellSize / 2 - CALL_BALL_SIZE / 2;
  const callTargetY = GameTheme.spacing.sm + calledRow * boardCellSize + boardCellSize / 2 - CALL_BALL_SIZE / 2;
  const callTranslateX = callMotion.interpolate({ inputRange: [0, 1, 2], outputRange: [callStartX, callStartX, callTargetX] });
  const callTranslateY = callMotion.interpolate({ inputRange: [0, 1, 2], outputRange: [callStartY + 22, callStartY, callTargetY] });
  const callScale = callMotion.interpolate({ inputRange: [0, 1, 2], outputRange: [0.65, 2.85, Math.max(0.32, boardCellSize / CALL_BALL_SIZE)] });
  const callOpacity = callMotion.interpolate({ inputRange: [0, 0.1, 1.75, 2], outputRange: [0, 1, 1, 0] });

  return (
    <GameCard elevated style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: GameTheme.spacing.xs }}>
          <GameText variant="title">Keno</GameText>
          <GameText tone="muted">
            Pick 1-10 spots or back the heads/tails board, then watch the twenty-number draw light up.
          </GameText>
        </View>
        <View style={styles.drawMeter}>
          <GameText tone="faint" variant="caption">
            Draw
          </GameText>
          <GameText style={styles.drawMeterValue} tone="ember" variant="title">
            {revealCount.toString().padStart(2, '0')}/20
          </GameText>
        </View>
      </View>

      <View style={styles.resultRail}>
        {latestNumbers.length > 0 ? (
          latestNumbers.map((number) => (
            <View key={`${result?.message}-${number}`} style={[styles.calledBall, number <= 40 ? styles.calledHeadsBall : styles.calledTailsBall]}>
              <GameText style={styles.calledBallText} variant="label">
                {number}
              </GameText>
            </View>
          ))
        ) : (
          <GameText tone="faint" variant="caption">
            Called numbers will roll across here.
          </GameText>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPanel}>
          <GameText tone="faint" variant="caption">
            Ticket
          </GameText>
          <GameText tone="ember" variant="label">
            {markedTicket.length}/10 spots
          </GameText>
        </View>
        <View style={styles.statPanel}>
          <GameText tone="faint" variant="caption">
            Hits
          </GameText>
          <GameText tone={visibleHits > 0 ? 'echo' : 'muted'} variant="label">
            {visibleHits}
            {result && revealCount >= result.drawn.length ? `/${result.hits}` : ''}
          </GameText>
        </View>
        <View style={styles.statPanel}>
          <GameText tone="faint" variant="caption">
            Split
          </GameText>
          <GameText tone="muted" variant="label">
            {result ? `${revealedHeads}H ${revealedTails}T` : '--'}
          </GameText>
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.headsSwatch]} />
          <GameText tone="muted" variant="caption">
            Heads 1-40
          </GameText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.tailsSwatch]} />
          <GameText tone="muted" variant="caption">
            Tails 41-80
          </GameText>
        </View>
      </View>

      <View
        onLayout={(event) => {
          const { height, width } = event.nativeEvent.layout;
          setBoardSize({ height, width });
        }}
        style={styles.board}>
        {BOARD_NUMBERS.map((number) => {
          const drawn = drawnNumbers.has(number);
          const marked = ticketNumbers.has(number);

          return (
            <KenoBulb
              drawn={drawn}
              hit={drawn && marked}
              key={number}
              marked={marked}
              number={number}
              onPress={() => toggleTicketNumber(number)}
            />
          );
        })}
        {activeCall !== null ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.callOverlay,
              activeCall <= 40 ? styles.calledHeadsBall : styles.calledTailsBall,
              {
                opacity: callOpacity,
                transform: [{ translateX: callTranslateX }, { translateY: callTranslateY }, { scale: callScale }],
              },
            ]}>
            <GameText style={styles.callOverlayText} variant="title">
              {activeCall}
            </GameText>
          </Animated.View>
        ) : null}
      </View>

      <BetPicker amount={amount} disabled={controlsLocked} onChange={setAmount} />

      <View style={styles.modeRow}>
        {modes.map((entry) => (
          <CasinoButton disabled={controlsLocked} key={entry.type} onPress={() => setMode(entry.type)} tone={mode === entry.type ? 'ember' : 'plain'}>
            {entry.label}
          </CasinoButton>
        ))}
      </View>

      <View style={styles.actionRow}>
        <CasinoButton disabled={controlsLocked} onPress={pickRandomTicket} tone="echo">
          Mark 10
        </CasinoButton>
        <CasinoButton disabled={controlsLocked || markedTicket.length === 0} onPress={clearTicket} tone="plain">
          Clear
        </CasinoButton>
        <CasinoButton disabled={controlsLocked} onPress={() => void draw()} tone="ember">
          {busy ? 'Drawing' : calling ? 'Calling' : 'Draw'}
        </CasinoButton>
      </View>

      {error ? (
        <View style={styles.messagePanel}>
          <GameText tone="ember">{error}</GameText>
        </View>
      ) : result ? (
        <View style={styles.messagePanel}>
          <GameText tone={result.won ? 'echo' : 'muted'}>{result.message}</GameText>
          {result.ticket.length > 0 ? (
            <GameText tone="faint" variant="caption">
              Ticket: {result.ticket.join(' - ')}
            </GameText>
          ) : null}
        </View>
      ) : null}
    </GameCard>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GameTheme.spacing.sm,
  },
  board: {
    backgroundColor: '#071018',
    borderColor: '#304463',
    borderRadius: GameTheme.radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: GameTheme.spacing.sm,
  },
  bulb: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    width: '100%',
  },
  bulbFrame: {
    width: '10%',
  },
  bulbText: {
    fontWeight: '800',
    lineHeight: 15,
  },
  calledBall: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  calledBallText: {
    color: '#1A1006',
  },
  card: {
    gap: GameTheme.spacing.md,
  },
  calledHeadsBall: {
    backgroundColor: '#D83D4D',
    borderColor: '#FFC5CB',
  },
  calledTailsBall: {
    backgroundColor: '#3F7EEA',
    borderColor: '#C7DCFF',
  },
  callOverlay: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    boxShadow: '0 18px 42px rgba(0, 0, 0, 0.45)',
    height: CALL_BALL_SIZE,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 0,
    width: CALL_BALL_SIZE,
    zIndex: 3,
  },
  callOverlayText: {
    color: '#FFFFFF',
    fontWeight: '900',
    lineHeight: 32,
  },
  drawnHeadsBulb: {
    backgroundColor: '#B73543',
    borderColor: '#FFC5CB',
    boxShadow: '0 0 12px rgba(216, 61, 77, 0.52)',
  },
  drawnTailsBulb: {
    backgroundColor: '#2E64C8',
    borderColor: '#C7DCFF',
    boxShadow: '0 0 12px rgba(63, 126, 234, 0.52)',
  },
  drawMeter: {
    alignItems: 'flex-end',
    backgroundColor: '#0B101A',
    borderColor: GameTheme.colors.border,
    borderRadius: GameTheme.radius.sm,
    borderWidth: 1,
    minWidth: 90,
    paddingHorizontal: GameTheme.spacing.sm,
    paddingVertical: GameTheme.spacing.xs,
  },
  drawMeterValue: {
    lineHeight: 26,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GameTheme.spacing.md,
  },
  headsBulb: {
    backgroundColor: '#351116',
    borderColor: '#8F303C',
  },
  headsSwatch: {
    backgroundColor: '#B73543',
  },
  hitBulb: {
    borderColor: '#E8FFF4',
    borderWidth: 2,
    boxShadow: '0 0 14px rgba(131, 243, 181, 0.7)',
  },
  markedBulb: {
    borderColor: '#FFE2A8',
    borderWidth: 2,
  },
  messagePanel: {
    backgroundColor: GameTheme.colors.backgroundSoft,
    borderColor: GameTheme.colors.border,
    borderRadius: GameTheme.radius.sm,
    borderWidth: 1,
    gap: GameTheme.spacing.xs,
    padding: GameTheme.spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GameTheme.spacing.sm,
  },
  pressedBulb: {
    opacity: 0.7,
  },
  resultRail: {
    alignItems: 'center',
    backgroundColor: '#05080E',
    borderColor: GameTheme.colors.border,
    borderRadius: GameTheme.radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: GameTheme.spacing.sm,
    minHeight: 50,
    paddingHorizontal: GameTheme.spacing.md,
    paddingVertical: GameTheme.spacing.xs,
  },
  statPanel: {
    backgroundColor: GameTheme.colors.backgroundSoft,
    borderColor: GameTheme.colors.border,
    borderRadius: GameTheme.radius.sm,
    borderWidth: 1,
    flex: 1,
    minWidth: 86,
    paddingHorizontal: GameTheme.spacing.sm,
    paddingVertical: GameTheme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GameTheme.spacing.sm,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: GameTheme.spacing.xs,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GameTheme.spacing.md,
  },
  legendSwatch: {
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 3,
    borderWidth: 1,
    height: 12,
    width: 18,
  },
  tailsBulb: {
    backgroundColor: '#0D1D3D',
    borderColor: '#315DA3',
  },
  tailsSwatch: {
    backgroundColor: '#2E64C8',
  },
});
