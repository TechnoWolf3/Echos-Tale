import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { HubCard } from '@/components/game/hub-card';
import { StatPill } from '@/components/game/stat-pill';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GameTheme } from '@/constants/theme';
import { formatDuration, formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';

export default function CityScreen() {
  const game = useElsewhereGame();
  const { refreshRemoteProfileIfStale } = game;
  const jailed = game.jailUntil !== null && game.jailUntil > game.now;

  useEffect(() => {
    const interval = setInterval(game.tick, 1000);

    return () => clearInterval(interval);
  }, [game.tick]);

  useEffect(() => {
    void refreshRemoteProfileIfStale(8_000);
  }, [refreshRemoteProfileIfStale]);

  return (
    <GameScreen backgroundAsset="echo" backgroundOpacity={0.24}>
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: GameTheme.spacing.md,
          justifyContent: 'space-between',
          paddingTop: GameTheme.spacing.xl,
        }}>
        <View style={{ flex: 1, gap: GameTheme.spacing.sm }}>
          <GameText tone="faint" variant="label">
            Echo&apos;s Tale
          </GameText>
          <GameText variant="display">Echo&apos;s Tale</GameText>
          <GameText tone="muted">
            A crooked little city where every button has receipts.
          </GameText>
        </View>
        <Pressable
          accessibilityLabel="Open settings"
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: GameTheme.colors.backgroundSoft,
            borderColor: GameTheme.colors.borderBright,
            borderRadius: GameTheme.radius.sm,
            borderWidth: 1,
            height: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.72 : 1,
            width: 44,
          })}>
          <IconSymbol color={GameTheme.colors.echo} name="gearshape.fill" size={24} />
        </Pressable>
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
          <StatPill
            label={jailed ? 'Jail' : 'Heat'}
            value={jailed ? formatDuration((game.jailUntil ?? game.now) - game.now) : `${game.heat}/100`}
          />
        </View>
      </GameCard>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Tonight&apos;s Doors</GameText>
        {!game.sessionToken ? (
          <HubCard
            detail="Connect the phone app to the Discord bot ledger."
            href="/link-discord"
            meta="Discord identity | shared balances | linked ledger"
            status={game.linkStatus === 'loading' ? 'Syncing' : 'Link'}
            title="Discord Bridge"
            tone="echo"
          />
        ) : null}
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
          detail="Echo has gone quiet here. Not absent, not broken; something is being assembled behind the screen."
          href="/story"
          meta="Story Mode | signal incomplete | bridge listening"
          status={game.isDevToolsUnlocked ? 'Dev Preview' : 'Forming'}
          title="Echo's Tale"
          tone="echo"
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
