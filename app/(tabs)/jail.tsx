import { useCallback, useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { StatPill } from '@/components/game/stat-pill';
import { GameTheme } from '@/constants/theme';
import { formatDuration, formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  attemptJailEscape,
  buyJailShopItem,
  EchoApiJailActionResponse,
  EchoApiJailEscapeRoute,
  EchoApiJailGambleAvailability,
  EchoApiJailResponse,
  EchoApiJailSession,
  EchoApiJailShopItem,
  EchoApiJailShopResponse,
  EchoApiJailWorkSession,
  EchoApiJailWorkTaskId,
  EchoApiProfile,
  fetchJailGamble,
  fetchJailSession,
  fetchJailShop,
  gambleInJail,
  payJailBail,
  runJailWork,
  sendJailWorkSessionAction,
  activateJailShopItem,
} from '@/services/echo-api';

const workTasks: { id: EchoApiJailWorkTaskId; meta: string; name: string }[] = [
  { id: 'kitchen', meta: 'Prison money | sentence reduction | server cooldown', name: 'Kitchen Duty' },
  { id: 'laundry', meta: 'Prison money | sentence reduction | server cooldown', name: 'Laundry Sorting' },
  { id: 'cells', meta: 'Prison money | sentence reduction | server cooldown', name: 'Cleaning Cells' },
  { id: 'supply', meta: 'Prison money | sentence reduction | server cooldown', name: 'Supply Run' },
  { id: 'workshop', meta: 'Prison money | sentence reduction | server cooldown', name: 'Workshop Duty' },
  { id: 'yard', meta: 'Prison money | sentence reduction | server cooldown', name: 'Yard Work' },
];

const escapeRoutes: { id: EchoApiJailEscapeRoute; meta: string; name: string }[] = [
  { id: 'quiet', meta: 'Safer route | lower failure penalty', name: 'Quiet Route' },
  { id: 'quick', meta: 'Standard risk | standard penalty', name: 'Quick Route' },
  { id: 'reckless', meta: 'Higher chance | harsher failure', name: 'Reckless Route' },
];

function hasFullProfile(profile: EchoApiJailActionResponse['profile']): profile is EchoApiProfile {
  return !!profile && typeof profile === 'object' && 'profileId' in profile && 'walletBalance' in profile;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'None';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeJailSession(session: EchoApiJailSession | null): EchoApiJailSession | null {
  if (!session) {
    return null;
  }

  const raw = session as EchoApiJailSession &
    Record<string, unknown> & {
      bail_cost?: number;
      created_at?: string;
      escape_attempts?: number;
      guild_id?: string;
      jailed_until?: string;
      max_reducible_remaining?: number;
      original_sentence_seconds?: number;
      prison_money?: number;
      reduction_cap_seconds?: number;
      remaining_seconds?: number;
      sentence_reduced_seconds?: number;
      user_id?: string;
      work_count?: number;
    };

  return {
    ...session,
    bailCost: session.bailCost ?? raw.bail_cost,
    createdAt: session.createdAt ?? raw.created_at,
    escapeAttempts: session.escapeAttempts ?? raw.escape_attempts,
    guildId: session.guildId ?? raw.guild_id,
    jailedUntil: session.jailedUntil ?? raw.jailed_until ?? '',
    maxReducibleRemaining: session.maxReducibleRemaining ?? raw.max_reducible_remaining,
    originalSentenceSeconds: session.originalSentenceSeconds ?? raw.original_sentence_seconds,
    prisonMoney: session.prisonMoney ?? raw.prison_money,
    reductionCapSeconds: session.reductionCapSeconds ?? raw.reduction_cap_seconds,
    remainingSeconds: session.remainingSeconds ?? raw.remaining_seconds,
    sentenceReducedSeconds: session.sentenceReducedSeconds ?? raw.sentence_reduced_seconds,
    userId: session.userId ?? raw.user_id,
    workCount: session.workCount ?? raw.work_count,
  };
}

function isWorkSession(session: unknown): session is EchoApiJailWorkSession {
  return !!session && typeof session === 'object' && 'id' in session && ('taskId' in session || 'task_id' in session) && !('jailedUntil' in session);
}

function normalizeWorkSession(session: EchoApiJailWorkSession): EchoApiJailWorkSession {
  const raw = session as EchoApiJailWorkSession & {
    expires_at?: string | null;
    task_id?: EchoApiJailWorkTaskId | string;
  };

  return {
    ...session,
    expiresAt: session.expiresAt ?? raw.expires_at,
    taskId: session.taskId ?? raw.task_id ?? 'kitchen',
  };
}

function getResultNumber(result: Record<string, unknown> | undefined, key: string, snakeKey: string) {
  const value = result?.[key] ?? result?.[snakeKey];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getResultBoolean(result: Record<string, unknown> | undefined, key: string, snakeKey: string) {
  const value = result?.[key] ?? result?.[snakeKey];
  return typeof value === 'boolean' ? value : null;
}

function normalizeShopResponse(response: EchoApiJailShopResponse): EchoApiJailShopResponse {
  const raw = response as EchoApiJailShopResponse & {
    owned_items?: Record<string, number>;
    prison_money?: number;
  };

  return {
    ...response,
    ownedItems: response.ownedItems ?? raw.owned_items,
    prisonMoney: response.prisonMoney ?? raw.prison_money,
    session: normalizeJailSession(response.session ?? null),
  };
}

function normalizeGambleAvailability(response: EchoApiJailGambleAvailability): EchoApiJailGambleAvailability {
  const raw = response as EchoApiJailGambleAvailability & {
    enabled_by?: EchoApiJailGambleAvailability['enabledBy'];
    enabled_by_display_name?: string;
    enabled_by_user_id?: string;
    max_bet?: number;
    min_bet?: number;
  };

  return {
    ...response,
    enabledBy: response.enabledBy ?? raw.enabled_by,
    enabledByDisplayName: response.enabledByDisplayName ?? raw.enabled_by_display_name,
    enabledByUserId: response.enabledByUserId ?? raw.enabled_by_user_id,
    maxBet: response.maxBet ?? raw.max_bet,
    minBet: response.minBet ?? raw.min_bet,
  };
}

function getOwnedCount(item: EchoApiJailShopItem, ownedItems?: Record<string, number>) {
  return ownedItems?.[item.id] ?? (item.owned ? 1 : 0);
}

function getGambleEnabledName(gamble: EchoApiJailGambleAvailability | null) {
  return gamble?.enabledBy?.displayName ?? gamble?.enabledByDisplayName ?? null;
}

function StatGrid({ session }: { session: EchoApiJailSession | null }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
      <StatPill label="Original" value={session?.originalSentenceSeconds ? formatDuration(session.originalSentenceSeconds * 1000) : 'Unknown'} />
      <StatPill label="Prison Money" value={formatMoney(session?.prisonMoney ?? 0)} />
      <StatPill label="Bail" value={session?.bailCost ? formatMoney(session.bailCost) : 'Server'} />
      <StatPill label="Work Count" value={String(session?.workCount ?? 0)} />
      <StatPill label="Reduction Used" value={formatDuration((session?.sentenceReducedSeconds ?? 0) * 1000)} />
      <StatPill label="Cap Left" value={formatDuration((session?.maxReducibleRemaining ?? 0) * 1000)} />
      <StatPill label="Escapes" value={String(session?.escapeAttempts ?? 0)} />
    </View>
  );
}

export default function JailScreen() {
  const game = useElsewhereGame();
  const {
    applyRemoteProfile,
    isDevToolsUnlocked,
    isJailed,
    jailUntil,
    now,
    releaseFromJail,
    sessionToken,
    showJailDevTools,
    syncJailUntil,
    tick,
  } = game;
  const [session, setSession] = useState<EchoApiJailSession | null>(null);
  const [message, setMessage] = useState('Jail mode is active. Railway owns every release, work, bail, escape, and gambling result.');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [bet, setBet] = useState('100');
  const [escapeNotice, setEscapeNotice] = useState<string | null>(null);
  const [gambleNotice, setGambleNotice] = useState<string | null>(null);
  const [gambleResult, setGambleResult] = useState<Record<string, unknown> | null>(null);
  const [gambleState, setGambleState] = useState<EchoApiJailGambleAvailability | null>(null);
  const [selectedGambleGame, setSelectedGambleGame] = useState('high_card');
  const [selectedGambleNpc, setSelectedGambleNpc] = useState('cellblock_table');
  const [shopNotice, setShopNotice] = useState<string | null>(null);
  const [shopState, setShopState] = useState<EchoApiJailShopResponse | null>(null);
  const [workCooldownUntil, setWorkCooldownUntil] = useState<number | null>(null);
  const [workNotice, setWorkNotice] = useState<string | null>(null);
  const [workResult, setWorkResult] = useState<Record<string, unknown> | null>(null);
  const [workSession, setWorkSession] = useState<EchoApiJailWorkSession | null>(null);

  const remainingMs = useMemo(() => {
    const profileRemaining = jailUntil ? jailUntil - now : null;
    const sessionUntil = session?.jailedUntil ? new Date(session.jailedUntil).getTime() : null;
    const sessionRemaining = sessionUntil && Number.isFinite(sessionUntil) ? sessionUntil - now : null;
    const fallbackRemaining = typeof session?.remainingSeconds === 'number' ? session.remainingSeconds * 1000 : null;

    return Math.max(0, profileRemaining ?? sessionRemaining ?? fallbackRemaining ?? 0);
  }, [jailUntil, now, session?.jailedUntil, session?.remainingSeconds]);

  const applyJailResponse = useCallback(
    (response: EchoApiJailResponse | EchoApiJailActionResponse, options: { captureWorkResult?: boolean } = {}) => {
      const normalizedSession = normalizeJailSession(response.session);

      if (hasFullProfile(response.profile)) {
        applyRemoteProfile(response.profile, { announce: false });
      } else if (normalizedSession?.jailedUntil) {
        syncJailUntil(normalizedSession.jailedUntil);
      }

      setSession(normalizedSession);

      if (options.captureWorkResult && 'result' in response) {
        const cooldownSeconds = getResultNumber(response.result, 'cooldownSeconds', 'cooldown_seconds');
        setWorkResult(response.result ?? null);

        if (cooldownSeconds !== null) {
          setWorkCooldownUntil(Date.now() + cooldownSeconds * 1000);
        }
      }

      if ('jailed' in response && !response.jailed) {
        releaseFromJail(response.message ?? 'Railway says the cell is empty. Normal city access is restored.');
        router.replace('/');
        return;
      }

      if (response.session === null && 'status' in response && (response.status === 'released' || response.status === 'escaped')) {
        releaseFromJail(response.message);
        router.replace('/');
      }
    },
    [applyRemoteProfile, releaseFromJail, syncJailUntil]
  );

  const refreshJail = useCallback(
    async (quiet = false) => {
      if (!sessionToken) {
        return;
      }

      setBusy(quiet ? null : 'refresh');
      setError(null);

      try {
        const response = await fetchJailSession(sessionToken);
        applyJailResponse(response);
        if (response.message) {
          setMessage(response.message);
        } else if (response.jailed) {
          setMessage('Jail session refreshed from Railway.');
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : 'Jail refresh failed.');
      } finally {
        setBusy(null);
      }
    },
    [applyJailResponse, sessionToken]
  );

  const refreshJailPanels = useCallback(
    async (quiet = false) => {
      if (!sessionToken) {
        return;
      }

      if (!quiet) {
        setBusy('panels');
      }

      try {
        const [shopResponse, gambleResponse] = await Promise.allSettled([
          fetchJailShop(sessionToken),
          fetchJailGamble(sessionToken),
        ]);

        if (shopResponse.status === 'fulfilled') {
          const normalizedShop = normalizeShopResponse(shopResponse.value);
          setShopState(normalizedShop);
          setShopNotice(null);

          if (normalizedShop.session) {
            setSession(normalizedShop.session);
          }
        } else {
          setShopState(null);
          setShopNotice(shopResponse.reason instanceof Error ? shopResponse.reason.message : 'Jail shop endpoint did not respond.');
        }

        if (gambleResponse.status === 'fulfilled') {
          const normalizedGamble = normalizeGambleAvailability(gambleResponse.value);
          setGambleState(normalizedGamble);
          setGambleNotice(null);
          setSelectedGambleGame(normalizedGamble.games?.[0]?.id ?? 'high_card');
          setSelectedGambleNpc(normalizedGamble.npcs?.[0]?.id ?? 'cellblock_table');
          setBet(String(normalizedGamble.minBet ?? 100));
        } else {
          setGambleState(null);
          setGambleNotice(gambleResponse.reason instanceof Error ? gambleResponse.reason.message : 'Jail gamble endpoint did not respond.');
        }
      } finally {
        if (!quiet) {
          setBusy(null);
        }
      }
    },
    [sessionToken]
  );

  const runAction = useCallback(
    async (id: string, action: () => Promise<EchoApiJailActionResponse>) => {
      setBusy(id);
      setError(null);

      try {
        const response = await action();
        applyJailResponse(response);
        if (id === 'gamble') {
          setGambleResult(response.result ?? null);
          setGambleNotice(response.message);
        } else if (id.startsWith('escape-')) {
          setEscapeNotice(response.message);
        } else if (id.startsWith('buy-') || id.startsWith('use-')) {
          setShopNotice(response.message);
        }
        setMessage(response.message);
        void refreshJailPanels(true);
      } catch (nextError) {
        const nextMessage = nextError instanceof Error ? nextError.message : 'Jail action failed.';
        setError(nextMessage);
        if (id === 'gamble') {
          setGambleNotice(nextMessage);
        } else if (id.startsWith('escape-')) {
          setEscapeNotice(nextMessage);
        } else if (id.startsWith('buy-') || id.startsWith('use-')) {
          setShopNotice(nextMessage);
        }
      } finally {
        setBusy(null);
      }
    },
    [applyJailResponse, refreshJailPanels]
  );

  const beginJailWork = useCallback(
    async (taskId: EchoApiJailWorkTaskId) => {
      if (!sessionToken) {
        return;
      }

      setBusy(`work-${taskId}`);
      setError(null);
      setWorkNotice(null);
      setWorkResult(null);

      try {
        const response = await runJailWork(sessionToken, taskId);

        if (isWorkSession(response.session)) {
          const normalizedWorkSession = normalizeWorkSession(response.session);
          setWorkSession(normalizedWorkSession);
          setMessage(response.message ?? normalizedWorkSession.prompt ?? `${normalizedWorkSession.title ?? titleCase(taskId)} started.`);
          return;
        }

        applyJailResponse({
          message: response.message,
          profile: response.profile,
          result: response.result,
          session: response.session,
          status: response.status,
        }, { captureWorkResult: true });
        setWorkNotice(response.message);
        setMessage(response.message);
        void refreshJailPanels(true);
      } catch (nextError) {
        const nextMessage = nextError instanceof Error ? nextError.message : 'Jail work failed.';
        setError(nextMessage);
        setWorkNotice(nextMessage);
      } finally {
        setBusy(null);
      }
    },
    [applyJailResponse, refreshJailPanels, sessionToken]
  );

  const submitWorkChoice = useCallback(
    async (choiceId: string) => {
      if (!sessionToken || !workSession) {
        return;
      }

      setBusy(`work-choice-${choiceId}`);
      setError(null);

      try {
        const response = await sendJailWorkSessionAction(sessionToken, workSession.id, choiceId);
        setWorkSession(null);
        applyJailResponse(response, { captureWorkResult: true });
        setWorkNotice(response.message);
        setMessage(response.message);
        void refreshJailPanels(true);
      } catch (nextError) {
        const nextMessage = nextError instanceof Error ? nextError.message : 'Jail work choice failed.';
        setError(nextMessage);
        setWorkNotice(nextMessage);
      } finally {
        setBusy(null);
      }
    },
    [applyJailResponse, refreshJailPanels, sessionToken, workSession]
  );

  useEffect(() => {
    if (!isJailed && (!isDevToolsUnlocked || !showJailDevTools)) {
      router.replace('/');
    }
  }, [isDevToolsUnlocked, isJailed, showJailDevTools]);

  useEffect(() => {
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    void refreshJail(true);
    void refreshJailPanels(true);
  }, [refreshJail, refreshJailPanels]);

  useEffect(() => {
    if (sessionToken && isJailed && remainingMs === 0) {
      void refreshJail(true);
    }
  }, [isJailed, refreshJail, remainingMs, sessionToken]);

  const linked = !!sessionToken;
  const workCooldownRemaining = workCooldownUntil ? Math.max(0, workCooldownUntil - now) : 0;
  const workOnCooldown = workCooldownRemaining > 0;
  const disabled = !linked || !!busy;
  const workDisabled = disabled || workOnCooldown || !!workSession;
  const workCooldownLabel = workOnCooldown ? formatDuration(workCooldownRemaining) : 'Ready';
  const workSuccess = getResultBoolean(workResult ?? undefined, 'success', 'success');
  const workPayout = getResultNumber(workResult ?? undefined, 'payout', 'payout');
  const workReduction = getResultNumber(workResult ?? undefined, 'appliedReductionSeconds', 'applied_reduction_seconds');
  const workReductionCapped = getResultBoolean(workResult ?? undefined, 'reductionCapped', 'reduction_capped');
  const contrabandItems = shopState?.items ?? [];
  const displayedPrisonMoney = shopState?.prisonMoney ?? session?.prisonMoney ?? 0;
  const gambleAvailable = !!gambleState?.available;
  const gambleEnabledName = getGambleEnabledName(gambleState);
  const gambleMinBet = gambleState?.minBet ?? 25;
  const gambleMaxBet = gambleState?.maxBet ?? 500;
  const betButtons = [25, 50, 100, 250, 500].filter((amount) => amount >= gambleMinBet && amount <= gambleMaxBet);

  return (
    <GameScreen backgroundAsset="echo" backgroundOpacity={0.18}>
      <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
        <GameText tone="faint" variant="label">
          Locked Down
        </GameText>
        <GameText variant="display">Jail</GameText>
        <GameText tone="muted">
          While jailed, normal progression tabs stay closed. The app sends jail actions to Railway and displays the returned session.
        </GameText>
      </View>

      <GameCard elevated>
        <GameText variant="title">Sentence</GameText>
        <GameText style={{ fontVariant: ['tabular-nums'] }} tone="ember" variant="display">
          {formatDuration(remainingMs)}
        </GameText>
        <StatGrid session={session} />
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          <CasinoButton disabled={disabled || busy === 'bail'} onPress={() => sessionToken && runAction('bail', () => payJailBail(sessionToken))} tone="echo">
            Pay Bail
          </CasinoButton>
          <CasinoButton disabled={disabled || busy === 'refresh'} onPress={() => void refreshJail()} tone="plain">
            Refresh
          </CasinoButton>
          {!linked ? (
            <CasinoButton onPress={() => router.push('/link-discord')} tone="ember">
              Link Discord
            </CasinoButton>
          ) : null}
        </View>
      </GameCard>

      <GameCard>
        <GameText variant="title">Work Detail</GameText>
        <GameText tone="muted">
          Prison work pays prison money and may reduce sentence time. Railway resolves success, payout, cooldown, reductions, and caps.
        </GameText>
        <GameText tone={workOnCooldown ? 'ember' : 'echo'} variant="caption">
          Work cooldown: {workCooldownLabel}
        </GameText>
        {workNotice ? <GameText tone={workNotice.toLowerCase().includes('failed') || workNotice.toLowerCase().includes('not') ? 'ember' : 'echo'}>{workNotice}</GameText> : null}
        {workSession ? (
          <View
            style={{
              backgroundColor: GameTheme.colors.backgroundSoft,
              borderColor: GameTheme.colors.border,
              borderRadius: GameTheme.radius.sm,
              borderWidth: 1,
              gap: GameTheme.spacing.md,
              padding: GameTheme.spacing.md,
            }}>
            <GameText variant="title">{workSession.title ?? titleCase(workSession.taskId)}</GameText>
            {workSession.prompt ? <GameText tone="muted">{workSession.prompt}</GameText> : null}
            {workSession.expiresAt ? (
              <GameText tone="faint" variant="caption">
                Expires {new Date(workSession.expiresAt).toLocaleTimeString()}
              </GameText>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              {(workSession.choices ?? []).map((choice) => (
                <CasinoButton
                  disabled={disabled}
                  key={choice.id}
                  onPress={() => void submitWorkChoice(choice.id)}
                  tone="echo">
                  {choice.label}
                </CasinoButton>
              ))}
            </View>
          </View>
        ) : null}
        {workResult ? (
          <View
            style={{
              backgroundColor: GameTheme.colors.backgroundSoft,
              borderColor: GameTheme.colors.border,
              borderRadius: GameTheme.radius.sm,
              borderWidth: 1,
              gap: GameTheme.spacing.xs,
              padding: GameTheme.spacing.md,
            }}>
            <GameText tone={workSuccess === false ? 'ember' : 'echo'} variant="label">
              {workSuccess === false ? 'Work Failed' : workSuccess === true ? 'Work Completed' : 'Work Result'}
            </GameText>
            <GameText tone="muted">
              Payout: {workPayout === null ? 'Server' : formatMoney(workPayout)} | Reduction:{' '}
              {workReduction === null ? 'Server' : formatDuration(workReduction * 1000)}
              {workReductionCapped ? ' | Reduction cap reached' : ''}
            </GameText>
          </View>
        ) : null}
        <View style={{ gap: GameTheme.spacing.sm }}>
          {workTasks.map((task) => (
            <View
              key={task.id}
              style={{
                alignItems: 'center',
                borderBottomColor: GameTheme.colors.border,
                borderBottomWidth: 1,
                flexDirection: 'row',
                gap: GameTheme.spacing.md,
                justifyContent: 'space-between',
                paddingBottom: GameTheme.spacing.sm,
              }}>
              <View style={{ flex: 1, gap: 3 }}>
                <GameText variant="label">{task.name}</GameText>
                <GameText tone="faint" variant="caption">
                  {task.meta}
                </GameText>
              </View>
              <CasinoButton disabled={workDisabled} onPress={() => void beginJailWork(task.id)} tone="echo">
                {workOnCooldown ? workCooldownLabel : 'Work'}
              </CasinoButton>
            </View>
          ))}
        </View>
      </GameCard>

      <GameCard>
        <GameText variant="title">Contraband Shop</GameText>
        <GameText tone="muted">Prison Money: {formatMoney(displayedPrisonMoney)}</GameText>
        {shopNotice ? <GameText tone={shopNotice.toLowerCase().includes('failed') || shopNotice.toLowerCase().includes('not') ? 'ember' : 'echo'}>{shopNotice}</GameText> : null}
        <View style={{ gap: GameTheme.spacing.sm }}>
          {contrabandItems.length ? (
            contrabandItems.map((item) => {
              const ownedCount = getOwnedCount(item, shopState?.ownedItems);
              const canUse = !!item.usable && ownedCount > 0;

              return (
                <View
                  key={item.id}
                  style={{
                    borderBottomColor: GameTheme.colors.border,
                    borderBottomWidth: 1,
                    gap: GameTheme.spacing.sm,
                    paddingBottom: GameTheme.spacing.sm,
                  }}>
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: GameTheme.spacing.md, justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <GameText variant="label">{item.name}</GameText>
                      {item.description ? <GameText tone="muted">{item.description}</GameText> : null}
                      <GameText tone="faint" variant="caption">
                        {item.price === undefined ? 'Price returned by Railway' : `${formatMoney(item.price)} prison money`} | Owned {ownedCount} |{' '}
                        {item.passive ? 'Passive' : item.usable ? 'Usable' : item.type ?? 'Contraband'}
                      </GameText>
                      {item.disabledReason ? (
                        <GameText tone="ember" variant="caption">
                          {item.disabledReason}
                        </GameText>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: GameTheme.spacing.sm }}>
                      <CasinoButton
                        disabled={disabled || item.affordable === false}
                        onPress={() => sessionToken && runAction(`buy-${item.id}`, () => buyJailShopItem(sessionToken, item.id))}
                        tone="echo">
                        Buy
                      </CasinoButton>
                      {canUse ? (
                        <CasinoButton
                          disabled={disabled}
                          onPress={() => sessionToken && runAction(`use-${item.id}`, () => activateJailShopItem(sessionToken, item.id))}
                          tone="plain">
                          Use
                        </CasinoButton>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={{ gap: GameTheme.spacing.sm }}>
              <GameText tone="muted">Waiting for Railway shop config from GET /v1/jail/shop.</GameText>
              <CasinoButton disabled={disabled || busy === 'panels'} onPress={() => void refreshJailPanels()} tone="plain">
                Refresh Shop
              </CasinoButton>
            </View>
          )}
        </View>
      </GameCard>

      <GameCard>
        <GameText variant="title">Escape</GameText>
        {escapeNotice ? <GameText tone={escapeNotice.toLowerCase().includes('failed') || escapeNotice.toLowerCase().includes('not') ? 'ember' : 'echo'}>{escapeNotice}</GameText> : null}
        <View style={{ gap: GameTheme.spacing.sm }}>
          {escapeRoutes.map((route) => (
            <View key={route.id} style={{ alignItems: 'center', flexDirection: 'row', gap: GameTheme.spacing.md, justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <GameText variant="label">{route.name}</GameText>
                <GameText tone="faint" variant="caption">
                  {route.meta}
                </GameText>
              </View>
              <CasinoButton disabled={disabled} onPress={() => sessionToken && runAction(`escape-${route.id}`, () => attemptJailEscape(sessionToken, route.id))} tone="ember">
                Try
              </CasinoButton>
            </View>
          ))}
        </View>
      </GameCard>

      <GameCard>
        <GameText variant="title">Card Table</GameText>
        <GameText tone={gambleAvailable ? 'echo' : 'muted'}>
          {gambleAvailable
            ? `Unlocked${gambleEnabledName ? ` by ${gambleEnabledName}` : ''}. Uses Prison Money only.`
            : gambleState?.reason ?? 'Locked until Railway says a deck of cards is available.'}
        </GameText>
        <GameText tone="faint" variant="caption">
          Prison Money: {formatMoney(displayedPrisonMoney)} | Bet range {formatMoney(gambleMinBet)}-{formatMoney(gambleMaxBet)}
        </GameText>
        {gambleNotice ? <GameText tone={gambleNotice.toLowerCase().includes('failed') || gambleNotice.toLowerCase().includes('not') ? 'ember' : 'echo'}>{gambleNotice}</GameText> : null}
        {gambleAvailable ? (
          <View style={{ gap: GameTheme.spacing.md }}>
            {gambleState?.games?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                {gambleState.games.map((gameOption) => (
                  <CasinoButton
                    key={gameOption.id}
                    onPress={() => setSelectedGambleGame(gameOption.id)}
                    tone={selectedGambleGame === gameOption.id ? 'echo' : 'plain'}>
                    {gameOption.name}
                  </CasinoButton>
                ))}
              </View>
            ) : null}
            {gambleState?.npcs?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                {gambleState.npcs.map((npc) => (
                  <CasinoButton
                    key={npc.id}
                    onPress={() => setSelectedGambleNpc(npc.id)}
                    tone={selectedGambleNpc === npc.id ? 'echo' : 'plain'}>
                    {npc.name ?? npc.displayName ?? npc.id}
                  </CasinoButton>
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              {betButtons.map((amount) => (
                <CasinoButton key={amount} onPress={() => setBet(String(amount))} tone={bet === String(amount) ? 'echo' : 'plain'}>
                  {formatMoney(amount)}
                </CasinoButton>
              ))}
            </View>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: GameTheme.spacing.sm }}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setBet}
                placeholder={String(gambleMinBet)}
                placeholderTextColor={GameTheme.colors.textFaint}
                style={{
                  backgroundColor: GameTheme.colors.backgroundSoft,
                  borderColor: GameTheme.colors.borderBright,
                  borderRadius: GameTheme.radius.sm,
                  borderWidth: 1,
                  color: GameTheme.colors.text,
                  flex: 1,
                  fontSize: 16,
                  minHeight: 44,
                  paddingHorizontal: GameTheme.spacing.md,
                }}
                value={bet}
              />
              <CasinoButton
                disabled={disabled || !gambleAvailable}
                onPress={() =>
                  sessionToken &&
                  runAction('gamble', () =>
                    gambleInJail(sessionToken, {
                      bet: Number.parseInt(bet, 10) || 0,
                      game: selectedGambleGame,
                      npcId: selectedGambleNpc,
                    })
                  )
                }
                tone="echo">
                Play
              </CasinoButton>
            </View>
            {gambleResult ? (
              <View
                style={{
                  backgroundColor: GameTheme.colors.backgroundSoft,
                  borderColor: GameTheme.colors.border,
                  borderRadius: GameTheme.radius.sm,
                  borderWidth: 1,
                  gap: GameTheme.spacing.xs,
                  padding: GameTheme.spacing.md,
                }}>
                <GameText variant="label">Last Hand</GameText>
                <GameText tone="muted">
                  Outcome: {formatValue(gambleResult.outcome)} | Player: {formatValue(gambleResult.playerRoll ?? gambleResult.player_roll)} | NPC:{' '}
                  {formatValue(gambleResult.npcRoll ?? gambleResult.npc_roll)} | Delta: {formatMoney(Number(gambleResult.delta ?? 0))}
                </GameText>
              </View>
            ) : null}
          </View>
        ) : (
          <CasinoButton disabled={disabled || busy === 'panels'} onPress={() => void refreshJailPanels()} tone="plain">
            Refresh Table
          </CasinoButton>
        )}
      </GameCard>

      <GameCard>
        <GameText variant="title">Items And Effects</GameText>
        <GameText tone="faint" variant="caption">
          Items
        </GameText>
        {Object.entries(session?.items ?? {}).length ? (
          Object.entries(session?.items ?? {}).map(([itemId, qty]) => (
            <GameText key={itemId} tone="muted">
              {titleCase(itemId)} x{qty}
            </GameText>
          ))
        ) : (
          <GameText tone="muted">No jail items returned.</GameText>
        )}
        <GameText tone="faint" variant="caption">
          Effects
        </GameText>
        {Object.entries(session?.effects ?? {}).length ? (
          Object.entries(session?.effects ?? {}).map(([effectId, value]) => (
            <GameText key={effectId} tone="muted">
              {titleCase(effectId)}: {formatValue(value)}
            </GameText>
          ))
        ) : (
          <GameText tone="muted">No active effects returned.</GameText>
        )}
      </GameCard>

      <GameCard style={{ padding: GameTheme.spacing.md }}>
        <GameText tone={error ? 'ember' : 'echo'}>{error ?? message}</GameText>
        {busy ? (
          <GameText tone="faint" variant="caption">
            Waiting for Railway: {busy}
          </GameText>
        ) : null}
      </GameCard>
    </GameScreen>
  );
}
