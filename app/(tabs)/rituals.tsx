import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { ActionCard } from '@/components/game/action-card';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { HubCard } from '@/components/game/hub-card';
import { InteractiveRitualPanel } from '@/components/rituals/interactive-ritual-panel';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  claimRitual,
  EchoApiError,
  EchoApiGameConfig,
  EchoApiRitual,
  fetchGameConfig,
  fetchRituals,
} from '@/services/echo-api';

const fallbackPrimaryRituals = [
  {
    detail: 'A daily claim with a reliable wallet payout. No puzzle. No spin. Just Echo paperwork.',
    id: 'daily',
    meta: 'id: daily | Sydney day reset',
    title: 'Daily Ritual',
  },
  {
    detail: 'A larger weekly claim. Reliable wallet payout, no puzzle, no spin.',
    id: 'weekly',
    meta: 'id: weekly | Sydney week reset',
    title: 'Weekly Ritual',
  },
  {
    detail: 'A long-cycle payout. Big recurring money, heavy paperwork energy.',
    id: 'monthly',
    meta: 'id: monthly | Sydney month reset',
    title: 'Monthly Ritual',
  },
];

const fallbackOtherRituals = [
  {
    detail: 'Pay wallet cash to spin a ritual outcome. Jackpot-looking trouble, but not casino.',
    id: 'echo_wheel',
    meta: 'id: echo_wheel | ritual earnings | blessings and curses',
    title: 'Echo Wheel',
  },
  {
    detail: 'Crack a five-digit Echo code. Earlier solves pay better; failure may bite.',
    id: 'echo_cipher',
    meta: 'id: echo_cipher | daily puzzle',
    title: 'Echo Cipher',
  },
  {
    detail: 'Place fractured numbers into order. Locked choices, scaled payout.',
    id: 'veil_sequence',
    meta: 'id: veil_sequence | daily puzzle',
    title: 'Veil Sequence',
  },
  {
    detail: 'Pick a square, survive the row and column strike, collect if Echo misses.',
    id: 'blade_grid',
    meta: 'id: blade_grid | daily risk rite',
    title: 'Blade Grid',
  },
  {
    detail: 'Arrange the names from too-meaningful clues. Mistakes reduce the payout.',
    id: 'echo_arrangement',
    meta: 'id: echo_arrangement | display: Echo Seating',
    title: 'Echo Seating',
  },
];

function getErrorMessage(error: unknown) {
  if (error instanceof EchoApiError) {
    return error.message;
  }

  return 'Railway did not answer the ritual room.';
}

function formatReset(value: string | null) {
  if (!value) {
    return 'Ready';
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return 'Cooling';
  }

  const seconds = Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
  const days = Math.ceil(seconds / 86400);

  if (seconds > 86400) {
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  return `${Math.max(1, minutes)}m`;
}

function stripDiscordFormatting(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^>\s?/gm, '')
    .trim();
}

function getRitualRewardText(config: EchoApiGameConfig | null, ritualId: string) {
  const rituals = config?.rituals;

  if (!rituals || typeof rituals !== 'object') {
    return null;
  }

  const entry = rituals[ritualId];

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const payout = record.payout ?? record.reward ?? record.rewards;

  if (Array.isArray(payout) && payout.length >= 2 && typeof payout[0] === 'number' && typeof payout[1] === 'number') {
    return `${formatMoney(payout[0])}-${formatMoney(payout[1])}`;
  }

  if (payout && typeof payout === 'object') {
    const payoutRecord = payout as Record<string, unknown>;
    const min = payoutRecord.min ?? payoutRecord.minimum;
    const max = payoutRecord.max ?? payoutRecord.maximum;

    if (typeof min === 'number' && typeof max === 'number') {
      return `${formatMoney(min)}-${formatMoney(max)}`;
    }
  }

  return null;
}

function ritualDescription(ritual: EchoApiRitual, config: EchoApiGameConfig | null) {
  const rewardText = getRitualRewardText(config, ritual.id);

  if (ritual.interactive) {
    return rewardText
      ? `${rewardText}. This one needs its own Echo screen before it can settle through Railway.`
      : 'This one needs its own Echo screen before it can settle through Railway.';
  }

  return rewardText
    ? `${rewardText}. Railway owns the claim, cooldown, payout, and transaction.`
    : 'Railway owns the claim, cooldown, payout, and transaction.';
}

function normalizeRituals(value: unknown) {
  if (Array.isArray(value)) {
    return value as EchoApiRitual[];
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;

  if (Array.isArray(record.primary) || Array.isArray(record.other)) {
    return [...(Array.isArray(record.primary) ? record.primary : []), ...(Array.isArray(record.other) ? record.other : [])] as EchoApiRitual[];
  }

  return Object.values(record).filter((entry) => entry && typeof entry === 'object' && 'id' in entry) as EchoApiRitual[];
}

export default function RitualsScreen() {
  const game = useElsewhereGame();
  const { applyRemoteProfile, refreshRemoteProfileIfStale, sessionToken } = game;
  const [rituals, setRituals] = useState<EchoApiRitual[]>([]);
  const [gameConfig, setGameConfig] = useState<EchoApiGameConfig | null>(null);
  const [busyRitual, setBusyRitual] = useState<string | null>(null);
  const [loadingRituals, setLoadingRituals] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRitual, setSelectedRitual] = useState<EchoApiRitual | null>(null);

  const primaryRituals = useMemo(() => rituals.filter((ritual) => ritual.placement === 'primary'), [rituals]);
  const otherRituals = useMemo(() => rituals.filter((ritual) => ritual.placement !== 'primary'), [rituals]);

  const loadRailwayRituals = useCallback(
    async (signal?: AbortSignal) => {
      if (!sessionToken) {
        return;
      }

      setLoadingRituals(true);

      const [config, ritualResponse] = await Promise.all([
        fetchGameConfig(sessionToken, signal),
        fetchRituals(sessionToken, signal),
      ]);

      setGameConfig(config);
      setRituals(normalizeRituals(ritualResponse.rituals));
      applyRemoteProfile(ritualResponse.profile, { announce: false });
      console.log('Echo config version', config.configVersion);
      setError(null);
      setLoadingRituals(false);
    },
    [applyRemoteProfile, sessionToken]
  );

  useEffect(() => {
    const interval = setInterval(game.tick, 1000);

    return () => clearInterval(interval);
  }, [game.tick]);

  useEffect(() => {
    void refreshRemoteProfileIfStale(8_000);
  }, [refreshRemoteProfileIfStale]);

  useEffect(() => {
    const controller = new AbortController();

    if (sessionToken) {
      loadRailwayRituals(controller.signal).catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(requestError));
          setLoadingRituals(false);
        }
      });
    }

    return () => controller.abort();
  }, [loadRailwayRituals, sessionToken]);

  const claimRailwayRitual = async (ritual: EchoApiRitual) => {
    if (!sessionToken || ritual.interactive) {
      return;
    }

    setBusyRitual(ritual.id);
    setError(null);
    setMessage(null);

    try {
      const result = await claimRitual(sessionToken, ritual.id);
      applyRemoteProfile(result.profile, { announce: false });
      setMessage(`${stripDiscordFormatting(result.message)} Credited ${formatMoney(result.payout?.creditedAmount ?? 0)}.`);
      await loadRailwayRituals();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyRitual(null);
    }
  };

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

      {sessionToken ? (
        <GameCard>
          <GameText variant="title">Railway Ritual Ledger</GameText>
          <GameText tone="muted">
            Claims and interactive rites route through Railway where endpoints exist. The app renders the room; Railway keeps the receipts.
          </GameText>
          <GameText tone="faint" variant="caption">
            Config {gameConfig?.configVersion ?? 'loading'}
          </GameText>
        </GameCard>
      ) : null}

      {error ? (
        <GameCard>
          <GameText tone="ember">{error}</GameText>
        </GameCard>
      ) : null}

      {message ? (
        <GameCard>
          <GameText tone="echo">{message}</GameText>
        </GameCard>
      ) : null}

      {selectedRitual && sessionToken ? (
        <InteractiveRitualPanel
          applyRemoteProfile={applyRemoteProfile}
          onClose={() => setSelectedRitual(null)}
          onRefreshRituals={() => loadRailwayRituals()}
          ritual={selectedRitual}
          sessionToken={sessionToken}
        />
      ) : null}

      {!selectedRitual ? (
        <>
      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Primary Rituals</GameText>
        {sessionToken && loadingRituals ? <GameText tone="muted">Loading Railway rituals...</GameText> : null}
        {sessionToken && primaryRituals.length > 0 ? (
          primaryRituals.map((ritual) => (
            <ActionCard
              description={ritualDescription(ritual, gameConfig)}
              disabled={busyRitual !== null || !ritual.available || ritual.interactive}
              key={ritual.id}
              label={ritual.interactive ? 'Needs Flow' : ritual.available ? 'Claim' : formatReset(ritual.nextClaimAt)}
              meta={`id: ${ritual.id} | Railway config ${gameConfig?.configVersion ?? '...'}`}
              onPress={() => claimRailwayRitual(ritual)}
              title={ritual.name}
              tone="echo"
            />
          ))
        ) : !sessionToken ? (
          <>
            <ActionCard
              description="A daily claim with a reliable wallet payout. No puzzle. No spin. Just Echo paperwork."
              disabled={!game.canAct('dailyRitual')}
              label={game.getCooldownLabel('dailyRitual')}
              meta="id: daily | local test mode"
              onPress={game.runDailyRitual}
              title="Daily Ritual"
              tone="echo"
            />
            {fallbackPrimaryRituals.map((ritual) => (
              <HubCard
                key={ritual.title}
                detail={ritual.detail}
                meta={ritual.meta}
                status="Later"
                title={ritual.title}
                tone="echo"
              />
            ))}
          </>
        ) : (
          fallbackPrimaryRituals.map((ritual) => (
            <HubCard
              key={ritual.id}
              detail={`${ritual.detail} Railway did not return this ritual in the list yet.`}
              meta={ritual.meta}
              status="Waiting"
              title={ritual.title}
              tone="echo"
            />
          ))
        )}
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Other Rituals</GameText>
        {sessionToken && otherRituals.length > 0 ? (
          otherRituals.map((ritual) => (
            <ActionCard
              description={ritualDescription(ritual, gameConfig)}
              disabled={busyRitual !== null || !ritual.available}
              key={ritual.id}
              label={ritual.available ? (ritual.interactive ? 'Open' : 'Claim') : formatReset(ritual.nextClaimAt)}
              meta={`id: ${ritual.id} | ${ritual.available ? 'ready' : `resets in ${formatReset(ritual.nextClaimAt)}`}`}
              onPress={() => {
                if (ritual.interactive) {
                  setSelectedRitual(ritual);
                  setMessage(null);
                  setError(null);
                  return;
                }

                void claimRailwayRitual(ritual);
              }}
              title={ritual.shortName ?? ritual.name}
              tone={ritual.interactive ? 'ember' : 'echo'}
            />
          ))
        ) : !sessionToken ? (
          <>
            <ActionCard
              description="Pay wallet cash to spin a ritual outcome. Jackpot-looking trouble, but not casino."
              disabled={!game.canAct('echoWheel') || game.wallet < 10_000}
              label={game.wallet < 10_000 ? 'Need $10k' : game.getCooldownLabel('echoWheel')}
              meta="id: echo_wheel | local test mode"
              onPress={game.playEchoWheel}
              title="Echo Wheel"
              tone="echo"
            />
            {fallbackOtherRituals.map((ritual) => (
              <HubCard
                key={ritual.title}
                detail={ritual.detail}
                meta={ritual.meta}
                status="Later"
                title={ritual.title}
                tone="echo"
              />
            ))}
          </>
        ) : (
          fallbackOtherRituals.map((ritual) => (
            <HubCard
              key={ritual.id}
              detail={`${ritual.detail} Railway did not return this ritual in the list yet.`}
              meta={ritual.meta}
              status="Waiting"
              title={ritual.title}
              tone="echo"
            />
          ))
        )}
      </View>

      <GameCard>
        <GameText variant="title">Ritual Rule</GameText>
        <GameText tone="muted">
          Spins, chance, cash, and jackpot-style outcomes can still be rituals when Echo owns the
          cooldown, the tracking, and the consequences.
        </GameText>
      </GameCard>
        </>
      ) : null}
    </GameScreen>
  );
}
