import { useEffect } from 'react';
import { View } from 'react-native';
import type { Href } from 'expo-router';

import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { HubCard } from '@/components/game/hub-card';
import { StatPill } from '@/components/game/stat-pill';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';

export default function CityScreen() {
  const game = useElsewhereGame();
  const { refreshRemoteProfileIfStale } = game;

  useEffect(() => {
    const interval = setInterval(game.tick, 1000);

    return () => clearInterval(interval);
  }, [game.tick]);

  useEffect(() => {
    void refreshRemoteProfileIfStale(8_000);
  }, [refreshRemoteProfileIfStale]);

  return (
    <GameScreen backgroundAsset="echo" backgroundOpacity={0.24}>
      <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
        <GameText tone="faint" variant="label">
          Echo of Elsewhere
        </GameText>
        <GameText variant="display">Elsewhere</GameText>
        <GameText tone="muted">
          A crooked little city where every button has receipts.
        </GameText>
      </View>

      <GameCard elevated>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: GameTheme.spacing.sm,
          }}>
          <StatPill label="Wallet" value={formatMoney(game.wallet)} />
          <StatPill label="Bank" value={formatMoney(game.bank)} />
          <StatPill label="Heat" value={`${game.heat}/100`} />
        </View>
      </GameCard>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Tonight&apos;s Doors</GameText>
        <HubCard
          detail={
            game.linkedProfile
              ? `Linked as ${game.linkedProfile.displayName}. The city ledger is reading Railway.`
              : 'Connect the phone app to the Discord bot ledger through Railway.'
          }
          href="/link-discord"
          meta={game.sessionToken ? 'Discord identity | auto-refresh ready | Railway API' : 'Discord identity | shared balances | Railway API'}
          status={game.sessionToken ? 'Linked' : game.linkStatus === 'loading' ? 'Syncing' : 'Link'}
          title="Discord Bridge"
          tone="echo"
        />
        <HubCard
          detail="Stability. Security. Silence. Store clean money, move funds, track account history."
          href={'/bank' as Href}
          meta="Deposits, withdrawals, transfers, loans, statements"
          status="Open"
          title="The Echo Reserve"
          tone="echo"
        />
        <HubCard
          detail="Low lights, loud tables, bad odds, and choices that probably need a receipt."
          href="/games"
          meta="Blackjack, Roulette, Keno, Scratch Cards, Inside Track"
          status="Enter"
          title="Casino"
          tone="ember"
        />
        <HubCard
          detail="Clock in, make change, sort nonsense, drive too far, or take a shift that feels suspicious."
          href="/jobs"
          meta="Work a 9-5, The Grind, Night Walker, Enterprises"
          status="Browse"
          title="Job Board"
          tone="success"
        />
        <HubCard
          detail="Offerings, puzzle locks, bad luck with paperwork, and Echo answering in fees."
          href="/rituals"
          meta="Daily Ritual, Echo Wheel, Echo Cipher, Veil Sequence"
          status="Begin"
          title="Ritual Room"
          tone="echo"
        />
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Latest Feed</GameText>
        {game.events.slice(0, 3).map((event) => (
          <GameCard key={event.id} style={{ padding: GameTheme.spacing.md }}>
            <GameText tone="muted">{event.message}</GameText>
          </GameCard>
        ))}
      </View>
    </GameScreen>
  );
}
