import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { BetPicker } from '@/components/casino/bet-picker';
import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import { createInsideTrackRace, runInsideTrack, TrackBetType, TrackRace, TrackResult } from '@/services/casino-service';
import {
  EchoApiError,
  EchoApiInsideTrackBetType,
  EchoApiInsideTrackHorse,
  EchoApiInsideTrackRace,
  EchoApiInsideTrackTicket,
  fetchInsideTrackCurrent,
  placeInsideTrackBet,
} from '@/services/echo-api';

const betTypes: EchoApiInsideTrackBetType[] = ['win', 'place', 'show'];
const localBetTypes: TrackBetType[] = ['win', 'place', 'show'];

function formatClock(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
}

function getConditionName(condition: EchoApiInsideTrackRace['trackCondition']) {
  return typeof condition === 'string' ? condition : condition.name;
}

function getHorseForm(horse: EchoApiInsideTrackHorse) {
  if (Array.isArray(horse.form)) {
    return horse.form.join('. ');
  }

  return horse.form ?? 'The rail is quiet around this one.';
}

function getOddsForBet(horse: EchoApiInsideTrackHorse, betType: EchoApiInsideTrackBetType) {
  if (betType === 'place') {
    return horse.placeOdds ?? Number((horse.odds * 0.45).toFixed(2));
  }

  if (betType === 'show') {
    return horse.showOdds ?? Number((horse.odds * 0.25).toFixed(2));
  }

  return horse.odds;
}

function getRaceTargetTime(race: EchoApiInsideTrackRace) {
  if (race.phase === 'betting') {
    return new Date(race.bettingClosesAt).getTime();
  }

  if (race.phase === 'racing') {
    return new Date(race.raceEndsAt).getTime();
  }

  return race.nextRaceAt ? new Date(race.nextRaceAt).getTime() : new Date(race.raceStartsAt).getTime();
}

function getPhaseLabel(race: EchoApiInsideTrackRace, now: number) {
  const remaining = formatClock(getRaceTargetTime(race) - now);

  if (race.phase === 'betting') {
    return `Betting closes in ${remaining}`;
  }

  if (race.phase === 'racing') {
    return `Race ends in ${remaining}`;
  }

  return `Next race in ${remaining}`;
}

function ticketLabel(ticket: EchoApiInsideTrackTicket) {
  const multiplier = ticket.potentialMultiplier ?? ticket.payoutMultiplier ?? ticket.odds ?? 0;
  const payout = ticket.potentialPayout ?? ticket.payout ?? Math.floor(ticket.amount * multiplier);

  return `#${ticket.horseNumber} ${ticket.horseName} | ${ticket.betType.toUpperCase()} ${formatMoney(ticket.amount)} | ${multiplier.toFixed(2)}x | ${formatMoney(payout)}`;
}

function TrackLane({
  horse,
  isLeader,
  isTicket,
}: {
  horse: EchoApiInsideTrackHorse;
  isLeader: boolean;
  isTicket: boolean;
}) {
  const progress = useRef(new Animated.Value(Math.max(0, Math.min(1, (horse.progress ?? 0) / 1000)))).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: 900,
      toValue: Math.max(0, Math.min(1, (horse.progress ?? 0) / 1000)),
      useNativeDriver: false,
    }).start();
  }, [horse.progress, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={{ gap: GameTheme.spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: GameTheme.spacing.sm }}>
        <GameText tone={isTicket ? 'echo' : isLeader ? 'ember' : 'primary'} variant="caption">
          #{horse.number} {horse.name}
        </GameText>
        <GameText tone="faint" variant="caption">
          {Math.round(horse.progress ?? 0)}/1000
        </GameText>
      </View>
      <View
        style={{
          backgroundColor: GameTheme.colors.backgroundSoft,
          borderColor: isTicket ? GameTheme.colors.echo : GameTheme.colors.border,
          borderRadius: 999,
          borderWidth: 1,
          height: 22,
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
        <Animated.View
          style={{
            backgroundColor: isLeader ? GameTheme.colors.ember : isTicket ? GameTheme.colors.echo : GameTheme.colors.violet,
            height: '100%',
            opacity: 0.72,
            width,
          }}
        />
        <View
          style={{
            alignItems: 'center',
            backgroundColor: isLeader ? GameTheme.colors.ember : GameTheme.colors.panelRaised,
            borderColor: GameTheme.colors.background,
            borderRadius: 999,
            borderWidth: 2,
            height: 30,
            justifyContent: 'center',
            left: 0,
            position: 'absolute',
            top: -5,
            transform: [{ translateX: Math.max(4, Math.min(250, ((horse.progress ?? 0) / 1000) * 250)) }],
            width: 30,
          }}>
          <GameText tone={isLeader ? 'primary' : 'echo'} variant="caption">
            {horse.number}
          </GameText>
        </View>
      </View>
    </View>
  );
}

function HorseRow({
  betType,
  horse,
  isSelected,
  onPress,
}: {
  betType: EchoApiInsideTrackBetType;
  horse: EchoApiInsideTrackHorse;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: isSelected ? 'rgba(169, 243, 255, 0.08)' : GameTheme.colors.backgroundSoft,
        borderColor: isSelected ? GameTheme.colors.echo : GameTheme.colors.border,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        gap: GameTheme.spacing.xs,
        opacity: pressed ? 0.75 : 1,
        padding: GameTheme.spacing.sm,
      })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: GameTheme.spacing.sm }}>
        <GameText tone={isSelected ? 'echo' : 'primary'} variant="label">
          #{horse.number} {horse.name}
        </GameText>
        <GameText tone="ember" variant="label">
          {getOddsForBet(horse, betType).toFixed(2)}x
        </GameText>
      </View>
      <GameText tone="muted" variant="caption">
        Win {horse.odds.toFixed(2)}x | Place {getOddsForBet(horse, 'place').toFixed(2)}x | Show {getOddsForBet(horse, 'show').toFixed(2)}x
      </GameText>
      <GameText tone="faint" variant="caption">
        {getHorseForm(horse)}
      </GameText>
    </Pressable>
  );
}

function RemoteInsideTrack() {
  const game = useElsewhereGame();
  const { applyRemoteProfile, now, sessionToken } = game;
  const [race, setRace] = useState<EchoApiInsideTrackRace | null>(null);
  const [amount, setAmount] = useState(500);
  const [betType, setBetType] = useState<EchoApiInsideTrackBetType>('win');
  const [horseNumber, setHorseNumber] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('Loading the rail...');
  const [loading, setLoading] = useState(false);

  const loadRace = useCallback(
    async (signal?: AbortSignal) => {
      if (!sessionToken) {
        return;
      }

      try {
        const nextRace = await fetchInsideTrackCurrent(sessionToken, signal);
        setRace(nextRace);
        setHorseNumber((current) => current ?? nextRace.myTicket?.horseNumber ?? nextRace.horses[0]?.number ?? null);
        setMessage(nextRace.phase === 'racing' ? 'They are running. Echo has opinions on stride length.' : 'Railway is calling the race.');

        if (nextRace.profile) {
          applyRemoteProfile(nextRace.profile, { announce: false });
        }
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        setMessage(error instanceof EchoApiError ? error.message : 'Inside Track could not reach Railway.');
      }
    },
    [applyRemoteProfile, sessionToken]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadRace(controller.signal);

    return () => controller.abort();
  }, [loadRace]);

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    const pollMs = race?.phase === 'racing' ? 1200 : 5000;
    const interval = setInterval(() => {
      void loadRace();
    }, pollMs);

    return () => clearInterval(interval);
  }, [loadRace, race?.phase, sessionToken]);

  const selectedHorse = useMemo(
    () => race?.horses.find((horse) => horse.number === horseNumber) ?? race?.horses[0] ?? null,
    [horseNumber, race?.horses]
  );

  const leaderNumber = race?.leader?.number ?? [...(race?.horses ?? [])].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0]?.number;

  const placeBet = async () => {
    if (!sessionToken || !race || !selectedHorse || race.phase !== 'betting') {
      return;
    }

    setLoading(true);
    setMessage('Ticket is sliding under the rail...');

    try {
      const response = await placeInsideTrackBet(sessionToken, {
        amount,
        betType,
        horseNumber: selectedHorse.number,
        raceId: race.raceId,
      });

      applyRemoteProfile(response.profile, { announce: false });
      setRace(response.race ?? { ...race, myTicket: response.ticket });
      setHorseNumber(response.ticket.horseNumber);
      setMessage(`Ticket locked: ${ticketLabel(response.ticket)}`);
    } catch (error) {
      setMessage(error instanceof EchoApiError ? error.message : 'The betting window ate the ticket.');
    } finally {
      setLoading(false);
    }
  };

  if (!race) {
    return (
      <GameCard elevated>
        <GameText variant="title">Inside Track</GameText>
        <GameText tone="muted">{message}</GameText>
        <CasinoButton onPress={() => void loadRace()} tone="echo">
          Refresh Rail
        </CasinoButton>
      </GameCard>
    );
  }

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Inside Track</GameText>
        <GameText tone="muted">
          {race.raceName} #{race.raceNumber} | {getConditionName(race.trackCondition)} track | {race.isMajor ? 'Major race' : 'Standard race'}
        </GameText>
        <GameText tone={race.phase === 'racing' ? 'ember' : 'echo'} variant="label">
          {race.phase.toUpperCase()} | {getPhaseLabel(race, now)}
        </GameText>
      </View>

      {race.phase === 'racing' || race.phase === 'results' ? (
        <View style={{ gap: GameTheme.spacing.sm }}>
          {race.horses.map((horse) => (
            <TrackLane
              horse={horse}
              isLeader={horse.number === leaderNumber}
              isTicket={race.myTicket?.horseNumber === horse.number}
              key={horse.number}
            />
          ))}
        </View>
      ) : null}

      {race.myTicket ? (
        <View
          style={{
            backgroundColor: GameTheme.colors.backgroundSoft,
            borderColor: race.myTicket.status === 'won' ? GameTheme.colors.success : GameTheme.colors.echo,
            borderRadius: GameTheme.radius.sm,
            borderWidth: 1,
            gap: GameTheme.spacing.xs,
            padding: GameTheme.spacing.sm,
          }}>
          <GameText tone="echo" variant="label">
            Locked Ticket
          </GameText>
          <GameText tone="muted">{ticketLabel(race.myTicket)}</GameText>
          {race.myTicket.status && race.myTicket.status !== 'active' ? (
            <GameText tone={race.myTicket.status === 'won' ? 'echo' : 'faint'} variant="caption">
              Result: {race.myTicket.status.toUpperCase()}
              {race.myTicket.payout ? ` | Paid ${formatMoney(race.myTicket.payout)}` : ''}
            </GameText>
          ) : null}
        </View>
      ) : race.phase === 'betting' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
            {betTypes.map((type) => (
              <CasinoButton key={type} onPress={() => setBetType(type)} tone={betType === type ? 'ember' : 'plain'}>
                {type}
              </CasinoButton>
            ))}
          </View>
          <View style={{ gap: GameTheme.spacing.sm }}>
            {race.horses.map((horse) => (
              <HorseRow
                betType={betType}
                horse={horse}
                isSelected={selectedHorse?.number === horse.number}
                key={horse.number}
                onPress={() => setHorseNumber(horse.number)}
              />
            ))}
          </View>
          <BetPicker amount={amount} min={100} onChange={setAmount} quickBets={[100, 500, 1_500, 5_000, 10_000]} />
          <CasinoButton disabled={loading || !selectedHorse} onPress={placeBet} tone="ember">
            {loading ? 'Placing...' : `Place ${betType}`}
          </CasinoButton>
        </View>
      ) : (
        <GameText tone="muted">Betting is closed. The rail is already making noise.</GameText>
      )}

      {race.phase === 'results' && race.finalOrder?.length ? (
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText variant="label">Final Order</GameText>
          <GameText tone="muted">
            {race.finalOrder.map((horse, index) => `${index + 1}. #${horse.number} ${horse.name}`).join(' | ')}
          </GameText>
        </View>
      ) : null}

      {race.commentary?.length ? (
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText variant="label">Race Caller</GameText>
          {race.commentary.slice(-3).map((line) => (
            <GameText key={line} tone="faint" variant="caption">
              {line}
            </GameText>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        <CasinoButton onPress={() => void loadRace()} tone="echo">
          Refresh Rail
        </CasinoButton>
      </View>
      <GameText tone="faint" variant="caption">
        {message}
      </GameText>
    </GameCard>
  );
}

function LocalInsideTrack() {
  const game = useElsewhereGame();
  const [race, setRace] = useState<TrackRace>(() => createInsideTrackRace());
  const [amount, setAmount] = useState(500);
  const [horseNumber, setHorseNumber] = useState(1);
  const [betType, setBetType] = useState<TrackBetType>('win');
  const [result, setResult] = useState<TrackResult | null>(null);

  const runRace = () => {
    const nextResult = runInsideTrack(race, amount, horseNumber, betType);
    const settled = game.resolveCasinoPlay({ cost: amount, message: nextResult.message, payout: nextResult.payout });

    if (settled) {
      setResult(nextResult);
    }
  };

  const newRace = () => {
    setRace(createInsideTrackRace());
    setHorseNumber(1);
    setResult(null);
  };

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Inside Track</GameText>
        <GameText tone="muted">
          {race.name} | {race.condition}. Practice rail. Railway owns the real tickets once Discord is linked.
        </GameText>
      </View>
      <View style={{ gap: GameTheme.spacing.xs }}>
        {race.horses.map((horse) => (
          <CasinoButton
            key={horse.number}
            onPress={() => setHorseNumber(horse.number)}
            tone={horseNumber === horse.number ? 'echo' : 'plain'}>
            #{horse.number} {horse.name} {horse.odds}x
          </CasinoButton>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {localBetTypes.map((type) => (
          <CasinoButton key={type} onPress={() => setBetType(type)} tone={betType === type ? 'ember' : 'plain'}>
            {type}
          </CasinoButton>
        ))}
      </View>
      <BetPicker amount={amount} min={100} onChange={setAmount} quickBets={[100, 500, 1_500, 5_000, 10_000]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        <CasinoButton onPress={runRace} tone="ember">
          Run Race
        </CasinoButton>
        <CasinoButton onPress={newRace}>New Card</CasinoButton>
      </View>
      {result ? <GameText tone={result.won ? 'echo' : 'muted'}>{result.message}</GameText> : null}
    </GameCard>
  );
}

export function InsideTrackGame() {
  const game = useElsewhereGame();

  if (game.sessionToken) {
    return <RemoteInsideTrack />;
  }

  return <LocalInsideTrack />;
}
