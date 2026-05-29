import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BlackjackGame } from '@/components/casino/blackjack-game';
import { BlackjackTableGame } from '@/components/casino/blackjack-table-game';
import { BullshitGame } from '@/components/casino/bullshit-game';
import { HigherLowerTableGame } from '@/components/casino/higher-lower-table-game';
import { InsideTrackGame } from '@/components/casino/inside-track-game';
import { KenoGame } from '@/components/casino/keno-game';
import { RouletteGame } from '@/components/casino/roulette-game';
import { ScratchCardsGame } from '@/components/casino/scratch-cards-game';
import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { HubCard } from '@/components/game/hub-card';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';

type GamesHub = 'casino' | 'drinking' | 'fun' | null;
type CasinoGame = 'blackjack' | 'bullshit' | 'higherLower' | 'insideTrack' | 'keno' | 'roulette' | 'scratchCards' | null;

export default function GamesScreen() {
  const game = useElsewhereGame();
  const { refreshRemoteProfileIfStale } = game;
  const [activeHub, setActiveHub] = useState<GamesHub>(null);
  const [activeCasinoGame, setActiveCasinoGame] = useState<CasinoGame>(null);

  useEffect(() => {
    void refreshRemoteProfileIfStale(8_000);
  }, [refreshRemoteProfileIfStale]);

  return (
    <GameScreen backgroundAsset={activeHub === 'casino' ? 'casino' : 'echo'} backgroundOpacity={activeHub === 'casino' ? 0.19 : 0.14}>
      <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
        <GameText tone="faint" variant="label">
          Games
        </GameText>
        <GameText variant="display">{activeHub === 'casino' ? 'Casino' : 'Game Halls'}</GameText>
        <GameText tone="muted">
          {activeHub === 'casino'
            ? 'The house keeps receipts. The tables pretend that is normal.'
            : 'Pick the kind of trouble first. The city dislikes clutter almost as much as it likes wagers.'}
        </GameText>
      </View>

      {!activeHub ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <HubCard
            detail="Low lights, sharp tables, bad odds, and Railway-owned money where the house has signed."
            meta="Blackjack, Higher or Lower, Roulette, Scratch Cards, Keno, Inside Track"
            onPress={() => setActiveHub('casino')}
            status="Enter"
            title="Casino"
            tone="ember"
          />
          <HubCard
            detail="Social chaos games for bad decisions with friends. No accountancy degree required."
            meta="Drinking games | party rules | future hub"
            onPress={() => setActiveHub('drinking')}
            status="Soon"
            title="Drinking Games"
            tone="success"
          />
          <HubCard
            detail="Low-stakes nonsense, quick distractions, and buttons that probably should not matter."
            meta="Just for fun | toys | casual games"
            onPress={() => setActiveHub('fun')}
            status="Soon"
            title="Just For Fun"
            tone="echo"
          />
        </View>
      ) : null}

      {activeHub ? (
        <View style={{ alignItems: 'flex-start' }}>
          <CasinoButton
            onPress={() => {
              if (activeHub === 'casino' && activeCasinoGame) {
                setActiveCasinoGame(null);
                return;
              }

              setActiveHub(null);
            }}
            tone="echo">
            {activeHub === 'casino' && activeCasinoGame ? 'Back To Casino' : 'Back To Games'}
          </CasinoButton>
        </View>
      ) : null}

      {activeHub === 'casino' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {game.sessionToken && !activeCasinoGame ? (
            <GameCard>
              <GameText variant="title">Linked Ledger Guard</GameText>
              <GameText tone="muted">
                Live casino tables use Railway as the shared source of truth. App-started tables can announce into Discord for join-in play.
              </GameText>
            </GameCard>
          ) : null}
          {!activeCasinoGame ? (
            <View style={{ gap: GameTheme.spacing.md }}>
              <HubCard
                detail="Chase the next card and guard your streak. Opens a live table for app and Discord."
                meta="Shared table | 1-10 players | Higher, lower, or same"
                onPress={() => setActiveCasinoGame('higherLower')}
                status="Play"
                title="Higher or Lower"
                tone="echo"
              />
              <HubCard
                detail="Beat the dealer before the table eats you. Opens a shared table for app and Discord."
                meta="Shared table | dealer | split and double"
                onPress={() => setActiveCasinoGame('blackjack')}
                status="Open"
                title="Blackjack"
                tone="ember"
              />
              <HubCard
                detail="Pick your colour, number, or nerve."
                meta="Red, black, odds, evens, number bets"
                onPress={() => setActiveCasinoGame('roulette')}
                status="Open"
                title="Roulette"
                tone="ember"
              />
              <HubCard
                detail="Mark the board and hope the draw listens."
                meta="Heads, tails, draw, quick pick"
                onPress={() => setActiveCasinoGame('keno')}
                status="Open"
                title="Keno"
                tone="echo"
              />
              <HubCard
                detail="Bet the rail and watch Echo Downs run live."
                meta="Win, place, show | server-owned races"
                onPress={() => setActiveCasinoGame('insideTrack')}
                status="Open"
                title="Inside Track"
                tone="success"
              />
              <HubCard
                detail="Scratch fast and let the prize breathe."
                meta="Pocket Scratch, Lucky Lines, Cursed Card"
                onPress={() => setActiveCasinoGame('scratchCards')}
                status="Open"
                title="Scratch Cards"
                tone="ember"
              />
              <HubCard
                detail="Play the rank. Sell the lie."
                meta="Liar card table | multiplayer later"
                onPress={() => setActiveCasinoGame('bullshit')}
                status="Open"
                title="Bullshit"
                tone="success"
              />
            </View>
          ) : null}
          {activeCasinoGame === 'higherLower' ? <HigherLowerTableGame autoCreate /> : null}
          {activeCasinoGame === 'blackjack' ? game.sessionToken ? <BlackjackTableGame autoCreate /> : <BlackjackGame /> : null}
          {activeCasinoGame === 'insideTrack' ? <InsideTrackGame /> : null}
          {activeCasinoGame === 'roulette' ? <RouletteGame /> : null}
          {activeCasinoGame === 'scratchCards' ? <ScratchCardsGame /> : null}
          {activeCasinoGame === 'keno' ? <KenoGame /> : null}
          {activeCasinoGame === 'bullshit' ? <BullshitGame /> : null}
        </View>
      ) : null}

      {activeHub === 'drinking' ? (
        <GameCard>
          <GameText variant="title">Drinking Games</GameText>
          <GameText tone="muted">
            This hub is ready for rules, rounds, dares, bluffing, and social damage once we port those bot games.
          </GameText>
        </GameCard>
      ) : null}

      {activeHub === 'fun' ? (
        <GameCard>
          <GameText variant="title">Just For Fun</GameText>
          <GameText tone="muted">
            Casual games will live here so the casino does not have to share a couch with every weird button.
          </GameText>
        </GameCard>
      ) : null}
    </GameScreen>
  );
}
