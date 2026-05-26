import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

import { BetPicker } from '@/components/casino/bet-picker';
import { CasinoButton } from '@/components/casino/casino-button';
import { PlayingCard } from '@/components/casino/playing-card';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ProgressBar } from '@/components/game/progress-bar';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  cashOutHigherLower,
  formatCard,
  HigherLowerSession,
  pickHigherLower,
  startHigherLower,
} from '@/services/casino-service';
import {
  cashOutHigherLowerRound,
  EchoApiError,
  EchoApiHigherLowerRound,
  guessHigherLowerRound,
  startHigherLowerRound,
} from '@/services/echo-api';

function getErrorMessage(error: unknown) {
  if (error instanceof EchoApiError) {
    return error.message;
  }

  return 'The table could not reach Railway.';
}

function localCashout(session: HigherLowerSession | null) {
  return session ? cashOutHigherLower(session).payout : 0;
}

function resultTone(remoteRound: EchoApiHigherLowerRound | null, localSession: HigherLowerSession | null) {
  if (remoteRound?.result === 'cashout' || localSession?.status === 'cashed') {
    return 'echo';
  }

  if (remoteRound?.result === 'bust' || localSession?.status === 'busted') {
    return 'ember';
  }

  return 'muted';
}

export function HigherLowerGame() {
  const game = useElsewhereGame();
  const [bet, setBet] = useState(500);
  const [localSession, setLocalSession] = useState<HigherLowerSession | null>(null);
  const [remoteRound, setRemoteRound] = useState<EchoApiHigherLowerRound | null>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardMotion] = useState(() => new Animated.Value(1));
  const animationKey = remoteRound
    ? `${remoteRound.gameId}-${remoteRound.currentCard.rank}-${remoteRound.currentCard.suit}-${remoteRound.streak}-${remoteRound.status}`
    : localSession
      ? `${localSession.currentCard.rank}-${localSession.currentCard.suit}-${localSession.streak}-${localSession.status}`
      : 'idle';

  useEffect(() => {
    if (animationKey === 'idle') {
      return;
    }

    cardMotion.setValue(0);
    Animated.spring(cardMotion, {
      friction: 7,
      tension: 100,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [animationKey, cardMotion]);

  const applyRemoteRound = (round: EchoApiHigherLowerRound) => {
    setRemoteRound(round);
    setLocalSession(null);
    game.applyRemoteProfile(round.profile, { announce: false });
    setError(null);
  };

  const start = async () => {
    if (game.sessionToken) {
      setBusy(true);
      setError(null);

      try {
        applyRemoteRound(await startHigherLowerRound(game.sessionToken, bet));
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setBusy(false);
      }

      return;
    }

    if (!game.resolveCasinoPlay({ cost: bet, message: `Higher or Lower buy-in fed ${formatMoney(bet)} to the house.`, payout: 0 })) {
      return;
    }

    setPaid(false);
    setRemoteRound(null);
    setLocalSession(startHigherLower(bet));
  };

  const guess = async (pick: 'higher' | 'lower' | 'same') => {
    if (game.sessionToken && remoteRound) {
      setBusy(true);
      setError(null);

      try {
        applyRemoteRound(await guessHigherLowerRound(game.sessionToken, remoteRound.gameId, pick));
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setBusy(false);
      }

      return;
    }

    if (!localSession) {
      return;
    }

    const nextSession = pickHigherLower(localSession, pick);
    setLocalSession(nextSession);

    if (nextSession.status === 'busted') {
      setPaid(true);
      game.resolveCasinoPlay({
        cost: 0,
        message: `${formatCard(localSession.currentCard)} into ${formatCard(nextSession.lastCard ?? localSession.currentCard)}. Wrong call. The streak died.`,
        payout: 0,
      });
    }
  };

  const cashOut = async () => {
    if (game.sessionToken && remoteRound) {
      setBusy(true);
      setError(null);

      try {
        applyRemoteRound(await cashOutHigherLowerRound(game.sessionToken, remoteRound.gameId));
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setBusy(false);
      }

      return;
    }

    if (!localSession || paid) {
      return;
    }

    const nextSession = cashOutHigherLower(localSession);
    setLocalSession(nextSession);
    setPaid(true);
    game.resolveCasinoPlay({
      cost: 0,
      message: `Higher or Lower cashed out at streak ${nextSession.streak} for ${formatMoney(nextSession.payout)}.`,
      payout: nextSession.payout,
    });
  };

  const linked = !!game.sessionToken;
  const playing = remoteRound?.status === 'playing' || localSession?.status === 'playing';
  const currentCard = remoteRound?.currentCard ?? localSession?.currentCard ?? null;
  const previousCard = remoteRound?.previousCard ?? localSession?.lastCard ?? null;
  const streak = remoteRound?.streak ?? localSession?.streak ?? 0;
  const cashoutValue = remoteRound?.cashoutValue ?? localCashout(localSession);
  const message = remoteRound?.message ?? (localSession?.status === 'busted' ? 'Busted. Equal cards count as betrayal here.' : localSession?.status === 'cashed' ? 'Cashed out clean. Suspiciously mature.' : null);
  const progress = Math.min(1, streak / 10);

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Higher or Lower</GameText>
        <GameText tone="muted">
          {linked
            ? 'Server-owned streak table. Railway owns the card, the cashout, and the consequences.'
            : 'Local practice table. Link Discord to put real wallet cash on the line.'}
        </GameText>
      </View>

      <View
        style={{
          backgroundColor: '#151029',
          borderColor: linked ? GameTheme.colors.echo : GameTheme.colors.borderBright,
          borderRadius: GameTheme.radius.md,
          borderWidth: 1,
          gap: GameTheme.spacing.md,
          overflow: 'hidden',
          padding: GameTheme.spacing.md,
        }}>
        <View style={{ flexDirection: 'row', gap: GameTheme.spacing.md, justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: GameTheme.spacing.xs }}>
            <GameText tone="faint" variant="label">
              Streak
            </GameText>
            <GameText tone="echo" variant="title">
              {streak}
            </GameText>
          </View>
          <View style={{ flex: 1, gap: GameTheme.spacing.xs }}>
            <GameText style={{ textAlign: 'right' }} tone="faint" variant="label">
              Cash Out
            </GameText>
            <GameText style={{ textAlign: 'right' }} tone="ember" variant="title">
              {formatMoney(cashoutValue)}
            </GameText>
          </View>
        </View>

        <ProgressBar progress={progress} />

        <Animated.View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: GameTheme.spacing.lg,
            justifyContent: 'center',
            opacity: cardMotion.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
            transform: [
              {
                translateY: cardMotion.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
              },
              {
                scale: cardMotion.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
              },
            ],
          }}>
          <View style={{ alignItems: 'center', gap: GameTheme.spacing.xs }}>
            <GameText tone="faint" variant="caption">
              Previous
            </GameText>
            <PlayingCard card={previousCard ?? undefined} hidden={!previousCard} />
          </View>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: 'rgba(169, 243, 255, 0.08)',
              borderColor: GameTheme.colors.echo,
              borderRadius: GameTheme.radius.md,
              borderWidth: 1,
              gap: GameTheme.spacing.xs,
              padding: GameTheme.spacing.md,
            }}>
            <GameText tone="faint" variant="caption">
              Current
            </GameText>
            <PlayingCard card={currentCard ?? undefined} hidden={!currentCard} />
          </View>
        </Animated.View>
      </View>

      {error ? <GameText tone="ember">{error}</GameText> : null}
      {message ? <GameText tone={resultTone(remoteRound, localSession)}>{message}</GameText> : null}

      {!playing ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <BetPicker amount={bet} disabled={busy} onChange={setBet} />
          <CasinoButton disabled={busy} onPress={start} tone="ember">
            {busy ? 'Buying In...' : 'Buy In'}
          </CasinoButton>
        </View>
      ) : (
        <View style={{ gap: GameTheme.spacing.md }}>
          {currentCard ? (
            <GameText tone="echo">
              Current card: {formatCard(currentCard)}
            </GameText>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
            <CasinoButton disabled={busy} onPress={() => guess('higher')} tone="echo">
              Higher
            </CasinoButton>
            <CasinoButton disabled={busy} onPress={() => guess('lower')} tone="echo">
              Lower
            </CasinoButton>
            <CasinoButton disabled={busy} onPress={() => guess('same')} tone="echo">
              Same
            </CasinoButton>
            <CasinoButton disabled={busy} onPress={cashOut} tone="ember">
              Cash Out
            </CasinoButton>
          </View>
        </View>
      )}
    </GameCard>
  );
}
