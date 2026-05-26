import { useEffect } from 'react';
import { View } from 'react-native';

import { BlackjackGame } from '@/components/casino/blackjack-game';
import { BullshitGame } from '@/components/casino/bullshit-game';
import { HigherLowerGame } from '@/components/casino/higher-lower-game';
import { InsideTrackGame } from '@/components/casino/inside-track-game';
import { KenoGame } from '@/components/casino/keno-game';
import { RouletteGame } from '@/components/casino/roulette-game';
import { ScratchCardsGame } from '@/components/casino/scratch-cards-game';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';

export default function GamesScreen() {
  const game = useElsewhereGame();
  const { refreshRemoteProfileIfStale } = game;

  useEffect(() => {
    void refreshRemoteProfileIfStale(8_000);
  }, [refreshRemoteProfileIfStale]);

  return (
    <GameScreen backgroundAsset="casino" backgroundOpacity={0.19}>
      <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
        <GameText tone="faint" variant="label">
          Echo&apos;s Gambit
        </GameText>
        <GameText variant="display">Casino</GameText>
        <GameText tone="muted">
          The house keeps receipts. The tables pretend that is normal.
        </GameText>
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Quick Tables</GameText>
        {game.sessionToken ? (
          <GameCard>
            <GameText variant="title">Linked Ledger Guard</GameText>
            <GameText tone="muted">
              Linked tables use Railway for bets, results, and payouts where endpoints exist. Any remaining practice tables stay local until the house signs the paperwork.
            </GameText>
          </GameCard>
        ) : null}
        <HigherLowerGame />
        <RouletteGame />
        <ScratchCardsGame />
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">House Tables</GameText>
        <BlackjackGame />
        <KenoGame />
        <InsideTrackGame />
        <BullshitGame />
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Backend Note</GameText>
        <GameCard>
          <GameText tone="muted">
            Blackjack, Higher or Lower, and Inside Track can follow the Railway ledger when linked.
            Remaining tables should move rolls, payouts, fees, and multiplayer state into the backend before real money play.
          </GameText>
        </GameCard>
      </View>
    </GameScreen>
  );
}
