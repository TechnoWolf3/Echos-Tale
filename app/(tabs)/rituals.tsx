import { useEffect } from 'react';
import { View } from 'react-native';

import { ActionCard } from '@/components/game/action-card';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { HubCard } from '@/components/game/hub-card';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';

const primaryRituals = [
  {
    detail: 'A larger weekly claim. Reliable wallet payout, no puzzle, no spin.',
    meta: 'id: weekly | Sydney week reset',
    title: 'Weekly Ritual',
  },
  {
    detail: 'A long-cycle payout. Big recurring money, heavy paperwork energy.',
    meta: 'id: monthly | Sydney month reset',
    title: 'Monthly Ritual',
  },
];

const otherRituals = [
  {
    detail: 'Crack a five-digit Echo code. Earlier solves pay better; failure may bite.',
    meta: 'id: echo_cipher | daily puzzle',
    title: 'Echo Cipher',
  },
  {
    detail: 'Place fractured numbers into order. Locked choices, scaled payout.',
    meta: 'id: veil_sequence | daily puzzle',
    title: 'Veil Sequence',
  },
  {
    detail: 'Pick a square, survive the row and column strike, collect if Echo misses.',
    meta: 'id: blade_grid | daily risk rite',
    title: 'Blade Grid',
  },
  {
    detail: 'Arrange the names from too-meaningful clues. Mistakes reduce the payout.',
    meta: 'id: echo_arrangement | display: Echo Seating',
    title: 'Echo Seating',
  },
];

export default function RitualsScreen() {
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
    <GameScreen>
      <View style={{ gap: GameTheme.spacing.sm }}>
        <GameText tone="faint" variant="label">
          Cursed paperwork, paid offerings
        </GameText>
        <GameText variant="display">Rituals</GameText>
        <GameText tone="muted">
          Sydney resets, Echo consequences, puzzle rites, blessings, curses, and very strange
          accounting.
        </GameText>
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Primary Rituals</GameText>
        <ActionCard
          description="A daily claim with a reliable wallet payout. No puzzle. No spin. Just Echo paperwork."
          disabled={!!game.sessionToken || !game.canAct('dailyRitual')}
          label={game.sessionToken ? 'Server Soon' : game.getCooldownLabel('dailyRitual')}
          meta="id: daily | Sydney day reset"
          onPress={game.runDailyRitual}
          title="Daily Ritual"
          tone="echo"
        />
        {primaryRituals.map((ritual) => (
          <HubCard
            key={ritual.title}
            detail={ritual.detail}
            meta={ritual.meta}
            status="Later"
            title={ritual.title}
            tone="echo"
          />
        ))}
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Other Rituals</GameText>
        <ActionCard
          description="Pay wallet cash to spin a ritual outcome. Jackpot-looking trouble, but not casino."
          disabled={!!game.sessionToken || !game.canAct('echoWheel') || game.wallet < 10_000}
          label={game.sessionToken ? 'Server Soon' : game.wallet < 10_000 ? 'Need $10k' : game.getCooldownLabel('echoWheel')}
          meta="id: echo_wheel | ritual earnings | blessings and curses"
          onPress={game.playEchoWheel}
          title="Echo Wheel"
          tone="echo"
        />
        {otherRituals.map((ritual) => (
          <HubCard
            key={ritual.title}
            detail={ritual.detail}
            meta={ritual.meta}
            status="Later"
            title={ritual.title}
            tone="echo"
          />
        ))}
      </View>

      <GameCard>
        <GameText variant="title">Ritual Rule</GameText>
        <GameText tone="muted">
          Spins, chance, cash, and jackpot-style outcomes can still be rituals when Echo owns the
          cooldown, the tracking, and the consequences.
        </GameText>
      </GameCard>
    </GameScreen>
  );
}
