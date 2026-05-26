import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

import { BetPicker } from '@/components/casino/bet-picker';
import { CasinoButton } from '@/components/casino/casino-button';
import { PlayingCard } from '@/components/casino/playing-card';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  BlackjackSession,
  formatCard,
  getBlackjackValue,
  hitBlackjack,
  standBlackjack,
  startBlackjack,
} from '@/services/casino-service';
import {
  EchoApiBlackjackRound,
  EchoApiCard,
  EchoApiError,
  doubleBlackjackRound,
  hitBlackjackRound,
  splitBlackjackRound,
  standBlackjackRound,
  startBlackjackRound,
} from '@/services/echo-api';

function cardKey(card: EchoApiCard, index: number) {
  return `${card.rank}-${card.suit}-${index}`;
}

function remoteResultTone(round: EchoApiBlackjackRound) {
  if ((round.payout ?? 0) > round.bet) {
    return 'echo';
  }

  if ((round.payout ?? 0) > 0) {
    return 'muted';
  }

  return 'ember';
}

function getErrorMessage(error: unknown) {
  if (error instanceof EchoApiError) {
    return error.message;
  }

  return 'The dealer could not reach Railway.';
}

export function BlackjackGame() {
  const game = useElsewhereGame();
  const [bet, setBet] = useState(500);
  const [localSession, setLocalSession] = useState<BlackjackSession | null>(null);
  const [remoteRound, setRemoteRound] = useState<EchoApiBlackjackRound | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableMotion] = useState(() => new Animated.Value(1));
  const remoteHands = remoteRound?.hands && remoteRound.hands.length > 0 ? remoteRound.hands : remoteRound ? [remoteRound.player] : [];
  const activeHandIndex = remoteRound?.activeHandIndex ?? 0;
  const activeRemoteHand = remoteHands[activeHandIndex] ?? remoteHands[0] ?? null;
  const animationKey = remoteRound
    ? `${remoteRound.gameId}-${remoteHands.map((hand) => hand.cards?.length ?? 0).join('-')}-${remoteRound.dealer.visibleCards?.length ?? 0}-${remoteRound.status}`
    : localSession
      ? `${localSession.dealer.length}-${localSession.player.length}-${localSession.status}`
      : 'idle';

  useEffect(() => {
    if (animationKey === 'idle') {
      return;
    }

    tableMotion.setValue(0);
    Animated.spring(tableMotion, {
      friction: 7,
      tension: 95,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [animationKey, tableMotion]);

  const applyRemoteRound = (round: EchoApiBlackjackRound) => {
    setRemoteRound(round);
    setLocalSession(null);
    game.applyRemoteProfile(round.profile, { announce: false });
    setError(null);
  };

  const deal = async () => {
    if (game.sessionToken) {
      setBusy(true);
      setError(null);

      try {
        applyRemoteRound(await startBlackjackRound(game.sessionToken, bet));
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setBusy(false);
      }

      return;
    }

    if (!game.resolveCasinoPlay({ cost: bet, message: `Blackjack stake ${formatMoney(bet)} slid under the dealer's hand.`, payout: 0 })) {
      return;
    }

    setRemoteRound(null);
    setLocalSession(startBlackjack(bet));
  };

  const hit = async () => {
    if (game.sessionToken && remoteRound) {
      setBusy(true);
      setError(null);

      try {
        applyRemoteRound(await hitBlackjackRound(game.sessionToken, remoteRound.gameId));
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setBusy(false);
      }

      return;
    }

    if (localSession) {
      const nextSession = hitBlackjack(localSession);
      setLocalSession(nextSession);

      if (nextSession.status === 'resolved') {
        game.resolveCasinoPlay({ cost: 0, message: nextSession.message, payout: nextSession.payout });
      }
    }
  };

  const stand = async () => {
    if (game.sessionToken && remoteRound) {
      setBusy(true);
      setError(null);

      try {
        applyRemoteRound(await standBlackjackRound(game.sessionToken, remoteRound.gameId));
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setBusy(false);
      }

      return;
    }

    if (localSession) {
      const nextSession = standBlackjack(localSession);
      setLocalSession(nextSession);
      game.resolveCasinoPlay({ cost: 0, message: nextSession.message, payout: nextSession.payout });
    }
  };

  const doubleDown = async () => {
    if (!game.sessionToken || !remoteRound) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      applyRemoteRound(await doubleBlackjackRound(game.sessionToken, remoteRound.gameId));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const split = async () => {
    if (!game.sessionToken || !remoteRound) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      applyRemoteRound(await splitBlackjackRound(game.sessionToken, remoteRound.gameId));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const linked = !!game.sessionToken;
  const resolved = remoteRound?.status === 'resolved' || localSession?.status === 'resolved';
  const playing = remoteRound?.status === 'playing' || localSession?.status === 'playing';
  const dealerCards = remoteRound
    ? (remoteRound.dealer.visibleCards ?? [])
    : localSession?.status === 'resolved'
      ? localSession.dealer
      : (localSession?.dealer.slice(0, 1) ?? []);
  const hiddenCount = remoteRound ? (remoteRound.dealer.hiddenCount ?? 0) : localSession && localSession.status !== 'resolved' ? 1 : 0;
  const playerCards = remoteRound ? (activeRemoteHand?.cards ?? []) : (localSession?.player ?? []);
  const dealerValue = remoteRound ? remoteRound.dealer.value : localSession?.status === 'resolved' ? getBlackjackValue(localSession.dealer) : null;
  const playerValue = remoteRound ? activeRemoteHand?.value : localSession ? getBlackjackValue(localSession.player) : null;
  const remoteBet = remoteRound?.bet ?? bet;
  const message = remoteRound?.message ?? localSession?.message ?? 'Dealer is ready. The shoe is full and the room is pretending to be fair.';
  const dealerLine =
    remoteRound || localSession
      ? resolved
        ? `Dealer shows ${dealerValue}. ${message}`
        : linked
          ? 'Railway has the shoe. The app is only watching the table now.'
          : 'Dealer waits behind the felt. One card face down, one eyebrow raised.'
      : linked
        ? 'Linked table ready. Railway will own the deck, stake, and payout.'
        : message;

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Blackjack</GameText>
        <GameText tone="muted">
          {linked
            ? 'Server-owned table. Railway owns the deck, wallet debit, and payout.'
            : 'Local practice table. Link Discord to play against the shared ledger.'}
        </GameText>
      </View>

      <View
        style={{
          backgroundColor: '#0A301F',
          borderColor: linked ? GameTheme.colors.echo : GameTheme.colors.borderBright,
          borderRadius: GameTheme.radius.md,
          borderWidth: 1,
          gap: GameTheme.spacing.md,
          overflow: 'hidden',
          padding: GameTheme.spacing.md,
        }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.18)',
            borderColor: GameTheme.colors.border,
            borderRadius: GameTheme.radius.sm,
            borderWidth: 1,
            flexDirection: 'row',
            gap: GameTheme.spacing.sm,
            padding: GameTheme.spacing.sm,
          }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: GameTheme.colors.backgroundSoft,
              borderColor: GameTheme.colors.ember,
              borderRadius: 999,
              borderWidth: 1,
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}>
            <GameText tone="ember" variant="label">
              D
            </GameText>
          </View>
          <View style={{ flex: 1 }}>
            <GameText variant="label">{linked ? 'Railway Dealer' : 'House Dealer'}</GameText>
            <GameText tone="muted">{dealerLine}</GameText>
          </View>
        </View>

        <Animated.View
          style={{
            gap: GameTheme.spacing.md,
            opacity: tableMotion.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
            transform: [
              {
                translateY: tableMotion.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
              },
              {
                scale: tableMotion.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }),
              },
            ],
          }}>
          <View style={{ gap: GameTheme.spacing.sm }}>
            <GameText tone="faint" variant="label">
              Dealer Hand {dealerValue !== null ? `| ${dealerValue}` : ''}
            </GameText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              {dealerCards.map((card, index) => (
                <PlayingCard card={card} key={cardKey(card, index)} />
              ))}
              {Array.from({ length: hiddenCount }).map((_, index) => (
                <PlayingCard hidden key={`hidden-${index}`} />
              ))}
              {!remoteRound && !localSession ? (
                <>
                  <PlayingCard hidden />
                  <PlayingCard hidden />
                </>
              ) : null}
            </View>
          </View>

          <View
            style={{
              borderColor: 'rgba(169, 243, 255, 0.22)',
              borderTopWidth: 1,
              gap: GameTheme.spacing.sm,
              paddingTop: GameTheme.spacing.md,
            }}>
            <GameText tone="faint" variant="label">
              Your Hand {playerValue !== null ? `| ${playerValue}` : ''}
            </GameText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              {playerCards.map((card, index) => (
                <PlayingCard card={card} key={cardKey(card, index)} />
              ))}
              {!remoteRound && !localSession ? (
                <>
                  <PlayingCard hidden />
                  <PlayingCard hidden />
                </>
              ) : null}
            </View>
          </View>

          {remoteHands.length > 1 ? (
            <View style={{ gap: GameTheme.spacing.sm }}>
              <GameText tone="faint" variant="label">
                Split Hands
              </GameText>
              {remoteHands.map((hand, index) => (
                <View
                  key={hand.id ?? index}
                  style={{
                    backgroundColor: index === activeHandIndex && remoteRound?.status === 'playing' ? 'rgba(169, 243, 255, 0.1)' : 'rgba(0, 0, 0, 0.16)',
                    borderColor: index === activeHandIndex && remoteRound?.status === 'playing' ? GameTheme.colors.echo : GameTheme.colors.border,
                    borderRadius: GameTheme.radius.sm,
                    borderWidth: 1,
                    gap: GameTheme.spacing.xs,
                    padding: GameTheme.spacing.sm,
                  }}>
                  <GameText tone={index === activeHandIndex ? 'echo' : 'muted'} variant="label">
                    Hand {index + 1} | {hand.value ?? 0} | Bet {formatMoney(hand.bet ?? remoteBet)}
                  </GameText>
                  {hand.result ? (
                    <GameText tone={hand.payout && hand.payout > 0 ? 'echo' : 'ember'} variant="caption">
                      {hand.result} | Paid {formatMoney(hand.payout ?? 0)}
                    </GameText>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>
      </View>

      {error ? <GameText tone="ember">{error}</GameText> : null}

      {!playing ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {resolved ? (
            <GameText tone={remoteRound ? remoteResultTone(remoteRound) : localSession && localSession.payout > localSession.bet ? 'echo' : 'ember'}>
              {message}
            </GameText>
          ) : null}
          <BetPicker amount={bet} disabled={busy} onChange={setBet} />
          <CasinoButton disabled={busy} onPress={deal} tone="ember">
            {busy ? 'Dealing...' : resolved ? 'Deal Again' : 'Deal'}
          </CasinoButton>
        </View>
      ) : (
        <View style={{ gap: GameTheme.spacing.md }}>
          {playerCards.length > 0 ? (
            <GameText tone="echo">
              Your cards: {playerCards.map(formatCard).join(', ')}
            </GameText>
          ) : null}
          <GameText variant="label">Value {playerValue ?? 0}</GameText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
            <CasinoButton disabled={busy} onPress={hit} tone="echo">
              {busy ? 'Waiting...' : 'Hit'}
            </CasinoButton>
            <CasinoButton disabled={busy} onPress={stand} tone="ember">
              {busy ? 'Waiting...' : 'Stand'}
            </CasinoButton>
            {remoteRound?.allowedActions.includes('double') ? (
              <CasinoButton disabled={busy} onPress={doubleDown} tone="ember">
                Double
              </CasinoButton>
            ) : null}
            {remoteRound?.allowedActions.includes('split') ? (
              <CasinoButton disabled={busy} onPress={split} tone="echo">
                Split
              </CasinoButton>
            ) : null}
          </View>
        </View>
      )}
    </GameCard>
  );
}
