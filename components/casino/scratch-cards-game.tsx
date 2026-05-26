import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  revealAllScratchTiles,
  revealScratchTile,
  ScratchCardConfig,
  ScratchCardSession,
  scratchCardConfigs,
  startScratchCard,
} from '@/services/casino-service';

const symbolLabels = {
  cash: 'Cash',
  clover: 'Clover',
  diamond: 'Diamond',
  eye: 'Eye',
  fire: 'Fire',
  skull: 'Skull',
  star: 'Star',
};

export function ScratchCardsGame() {
  const game = useElsewhereGame();
  const [session, setSession] = useState<ScratchCardSession | null>(null);

  const buyCard = (config: ScratchCardConfig) => {
    if (game.sessionToken) {
      return;
    }

    if (game.wallet < config.cost) {
      game.resolveCasinoPlay({
        cost: config.cost,
        message: 'Scratch card counter rejected your wallet with impressive speed.',
        payout: 0,
      });
      return;
    }

    setSession(startScratchCard(config));
  };

  const settleIfResolved = (nextSession: ScratchCardSession) => {
    setSession(nextSession);

    if (nextSession.status !== 'resolved' || !nextSession.result) {
      return;
    }

    game.resolveCasinoPlay({
      cost: nextSession.config.cost,
      message: nextSession.result.message,
      payout: nextSession.result.payout,
    });
  };

  const revealTile = (index: number) => {
    if (!session) {
      return;
    }

    settleIfResolved(revealScratchTile(session, index));
  };

  const revealAll = () => {
    if (!session) {
      return;
    }

    settleIfResolved(revealAllScratchTiles(session));
  };

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Scratch Cards</GameText>
        <GameText tone="muted">
          {game.sessionToken
            ? 'Linked play is locked until Railway owns card buys and reveals.'
            : 'Buy a 3x3 card, reveal tiles, and let the cheap prophecy breathe.'}
        </GameText>
      </View>

      {!session || session.status === 'resolved' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {scratchCardConfigs.map((config) => (
            <Pressable
              accessibilityRole="button"
              disabled={!!game.sessionToken}
              key={config.id}
              onPress={() => buyCard(config)}
              style={({ pressed }) => ({
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: GameTheme.colors.borderBright,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                opacity: game.sessionToken ? 0.42 : pressed ? 0.76 : 1,
                padding: GameTheme.spacing.md,
              })}>
              <GameText variant="label">
                {config.name} | {formatMoney(config.cost)}
              </GameText>
              <GameText tone="muted">{config.style}</GameText>
            </Pressable>
          ))}
          {session?.result ? (
            <GameText tone={session.result.payout > 0 ? 'echo' : 'ember'}>
              {session.result.message}
            </GameText>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: GameTheme.spacing.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
            {session.board.map((symbol, index) => {
              const revealed = session.revealed.includes(index);

              return (
                <Pressable
                  accessibilityRole="button"
                  key={`${symbol}-${index}`}
                  onPress={() => revealTile(index)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    aspectRatio: 1,
                    backgroundColor: revealed ? GameTheme.colors.panelRaised : GameTheme.colors.backgroundSoft,
                    borderColor: revealed ? GameTheme.colors.echo : GameTheme.colors.border,
                    borderRadius: GameTheme.radius.sm,
                    borderWidth: 1,
                    justifyContent: 'center',
                    opacity: pressed ? 0.76 : 1,
                    width: '30%',
                  })}>
                  <GameText tone={revealed ? 'echo' : 'faint'} variant="label">
                    {revealed ? symbolLabels[symbol] : 'Scratch'}
                  </GameText>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={revealAll}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: GameTheme.colors.backgroundSoft,
              borderColor: GameTheme.colors.ember,
              borderRadius: GameTheme.radius.sm,
              borderWidth: 1,
              opacity: pressed ? 0.76 : 1,
              padding: GameTheme.spacing.md,
            })}>
            <GameText tone="ember" variant="label">
              Reveal All
            </GameText>
          </Pressable>
        </View>
      )}

      <GameText tone="faint" variant="caption">
        scratchcard_buy | scratchcard_payout | Wallet to Server Bank
      </GameText>
    </GameCard>
  );
}
