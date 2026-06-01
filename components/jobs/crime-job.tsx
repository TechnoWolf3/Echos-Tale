import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ProgressBar } from '@/components/game/progress-bar';
import { GameTheme } from '@/constants/theme';
import { formatDuration, formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  EchoApiCrimeAction,
  EchoApiCrimeActionBody,
  EchoApiCrimeChoice,
  EchoApiCrimeDashboard,
  EchoApiCrimeId,
  EchoApiCrimeSession,
  EchoApiCrimeSessionResponse,
  EchoApiError,
  fetchCrimeDashboard,
  fetchCrimeSession,
  sendCrimeSessionAction,
  startCrimeSession,
} from '@/services/echo-api';

const crimeActions: {
  description: string;
  id: EchoApiCrimeId;
  meta: string;
  title: string;
  tone: 'danger' | 'ember';
}[] = [
  {
    description: 'A short interactive run with heat, evidence, choices, and a server-owned result.',
    id: 'store_robbery',
    meta: '15m global | 15m robbery',
    title: 'Store Robbery',
    tone: 'danger',
  },
  {
    description: 'Pressure a target through dialogue, then bail out or try to close before suspicion spikes.',
    id: 'scam_call',
    meta: '15m global | 45m scam',
    title: 'Scam Call',
    tone: 'danger',
  },
  {
    description: 'Scout, enter, crack, loot, escape, and clean up across a long server-run session.',
    id: 'heist',
    meta: '15m global | 12h heist',
    title: 'Heist',
    tone: 'danger',
  },
  {
    description: 'The larger version of a bad plan. Higher payout, harsher heat, longer cooldown.',
    id: 'major_heist',
    meta: '15m global | 24h major',
    title: 'Major Heist',
    tone: 'danger',
  },
  {
    description: 'Choose a contact and bribe tier. Money moves immediately on Railway.',
    id: 'bribe_officer',
    meta: '30m utility | skips global',
    title: 'Bribe Officer',
    tone: 'ember',
  },
  {
    description: 'Four quiet choices to reduce heat, or make the room worse by overthinking.',
    id: 'lay_low',
    meta: '30m utility | skips global',
    title: 'Lay Low',
    tone: 'ember',
  },
];

const playableCrimeIds = new Set(crimeActions.map((action) => action.id));

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function titleCase(value: string | null | undefined) {
  if (!value) {
    return 'Crime';
  }

  return value
    .replace(/[_-]/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function getSessionId(response: EchoApiCrimeSessionResponse | EchoApiCrimeSession | null) {
  return response?.session?.id ?? response?.session?.sessionId ?? response?.id ?? response?.sessionId ?? null;
}

function unwrapSession(response: EchoApiCrimeSessionResponse | null): EchoApiCrimeSession | null {
  const session = response?.session ?? response;
  return session?.status ? (session as EchoApiCrimeSession) : null;
}

function getCrimeId(session: EchoApiCrimeSession | null) {
  return session?.crimeId ?? session?.crime_id ?? null;
}

function getStateRecord(session: EchoApiCrimeSession | null) {
  return asRecord(session?.state) ?? asRecord(session?.state_json);
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getSessionTitle(session: EchoApiCrimeSession | null) {
  const crimeId = getCrimeId(session);
  return session?.title ?? titleCase(crimeId);
}

function getSessionPrompt(session: EchoApiCrimeSession | null) {
  const state = getStateRecord(session);
  const visiblePrompt = asRecord(state?.visiblePrompt);

  return (
    session?.prompt ??
    getString(state?.prompt) ??
    getString(state?.scenarioText) ??
    getString(visiblePrompt?.text) ??
    session?.message ??
    'Railway is holding the next move.'
  );
}

function getSessionChoices(session: EchoApiCrimeSession | null): EchoApiCrimeChoice[] {
  const state = getStateRecord(session);
  const choices = session?.choices ?? state?.choices ?? state?.visibleChoices ?? state?.options;
  return Array.isArray(choices) ? (choices.filter((choice) => asRecord(choice)) as EchoApiCrimeChoice[]) : [];
}

function getActionIds(session: EchoApiCrimeSession | null) {
  const state = getStateRecord(session);
  const rawActions = session?.availableActions ?? state?.availableActions ?? state?.actions;
  return Array.isArray(rawActions) ? rawActions.filter((action): action is string => typeof action === 'string') : [];
}

function getSessionHeat(session: EchoApiCrimeSession | null) {
  const state = getStateRecord(session);
  return session?.currentHeat ?? session?.heat ?? getNumber(state?.currentHeat) ?? getNumber(state?.heat) ?? null;
}

function getSessionStep(session: EchoApiCrimeSession | null) {
  const state = getStateRecord(session);
  return session?.phase ?? getString(state?.phase) ?? getString(state?.stepLabel) ?? (typeof session?.step === 'number' ? `Step ${session.step + 1}` : null);
}

function getResultText(session: EchoApiCrimeSession | null, response: EchoApiCrimeSessionResponse | null) {
  const result = response?.result ?? session?.result ?? session?.result_json;

  if (typeof result === 'string') {
    return result;
  }

  const record = asRecord(result);

  return (
    getString(record?.message) ??
    getString(record?.summary) ??
    getString(record?.outcome) ??
    response?.message ??
    session?.message ??
    'Crime session resolved.'
  );
}

function getResultDetails(session: EchoApiCrimeSession | null, response: EchoApiCrimeSessionResponse | null) {
  const result = asRecord(response?.result) ?? asRecord(session?.result) ?? asRecord(session?.result_json);

  if (!result) {
    return [];
  }

  const payout = getNumber(result.payout) ?? getNumber(result.paid) ?? getNumber(result.walletDelta);
  const fine = getNumber(result.fine) ?? getNumber(result.loss) ?? getNumber(result.debited);
  const heat = getNumber(result.heat) ?? getNumber(result.addedHeat) ?? getNumber(result.finalHeat);
  const details: string[] = [];

  if (payout !== null) {
    details.push(`Payout ${formatMoney(payout)}`);
  }

  if (fine !== null) {
    details.push(`Cost ${formatMoney(fine)}`);
  }

  if (heat !== null) {
    details.push(`Heat ${Math.round(heat)}`);
  }

  return details;
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const millis = Date.parse(value);

  if (!Number.isFinite(millis)) {
    return null;
  }

  return new Date(millis).toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

function cooldownLabel(value: unknown) {
  if (typeof value === 'number') {
    return value > Date.now() ? formatDuration(value - Date.now()) : 'Ready';
  }

  if (typeof value === 'string') {
    const millis = Date.parse(value);
    return Number.isFinite(millis) && millis > Date.now() ? formatDuration(millis - Date.now()) : value;
  }

  const record = asRecord(value);

  if (!record) {
    return null;
  }

  if (record.ready === true) {
    return 'Ready';
  }

  const remainingMs = getNumber(record.remainingMs);
  const remainingSeconds = getNumber(record.remainingSeconds);

  if (remainingMs !== null) {
    return formatDuration(remainingMs);
  }

  if (remainingSeconds !== null) {
    return formatDuration(remainingSeconds * 1000);
  }

  const until = getString(record.until) ?? getString(record.nextAvailableAt);
  const untilMillis = until ? Date.parse(until) : null;

  if (untilMillis && Number.isFinite(untilMillis) && untilMillis > Date.now()) {
    return formatDuration(untilMillis - Date.now());
  }

  return getString(record.label);
}

function getDashboardAction(dashboard: EchoApiCrimeDashboard | null, id: EchoApiCrimeId) {
  const actions = dashboard?.actions ?? dashboard?.availableActions ?? [];
  return actions.find((action) => action.id === id);
}

function getActionReady(dashboard: EchoApiCrimeDashboard | null, action: EchoApiCrimeAction | undefined) {
  if (dashboard?.jailed) {
    return false;
  }

  if (!action) {
    return true;
  }

  if (action.available === false || action.playable === false || action.disabledReason) {
    return false;
  }

  return true;
}

function getActionLabel(dashboard: EchoApiCrimeDashboard | null, action: EchoApiCrimeAction | undefined, id: EchoApiCrimeId) {
  if (dashboard?.jailed) {
    return 'Jailed';
  }

  if (action?.disabledReason) {
    return action.disabledReason;
  }

  if (action?.available === false || action?.playable === false) {
    return action?.status ?? 'Locked';
  }

  const cooldowns = dashboard?.cooldowns;
  const fallbackCooldownKey =
    id === 'store_robbery'
      ? 'crime_store'
      : id === 'scam_call'
        ? 'crime_scam'
        : id === 'major_heist'
          ? 'crime_heist_major'
          : `crime_${id}`;
  const cooldownValue = Array.isArray(cooldowns)
    ? cooldowns.find((cooldown) => cooldown.key === id || cooldown.key === action?.cooldownKey)
    : cooldowns?.[action?.cooldownKey ?? id] ?? cooldowns?.[fallbackCooldownKey];
  const label = cooldownLabel(cooldownValue);

  return label && label !== 'Ready' ? label : 'Start';
}

function buildActionBody(session: EchoApiCrimeSession | null, choice: EchoApiCrimeChoice | null, index: number, action?: 'go' | 'hangup'): EchoApiCrimeActionBody {
  if (action) {
    return { action };
  }

  const crimeId = getCrimeId(session);
  const choiceId = choice?.id;
  const phase = (getSessionStep(session) ?? '').toLowerCase();
  const isBribeTier = choiceId === 'low' || choiceId === 'medium' || choiceId === 'high' || phase.includes('tier');

  if (crimeId === 'scam_call') {
    return choiceId ? { optionId: choiceId } : { optionIndex: index };
  }

  if (crimeId === 'bribe_officer') {
    return isBribeTier && choiceId ? { tierId: choiceId } : choiceId ? { targetId: choiceId } : { optionIndex: index };
  }

  if (crimeId === 'lay_low') {
    return { optionIndex: index };
  }

  return { choiceIndex: index };
}

function ChoiceButton({
  choice,
  disabled,
  index,
  onPress,
}: {
  choice: EchoApiCrimeChoice;
  disabled?: boolean;
  index: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || choice.disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: GameTheme.colors.backgroundSoft,
        borderColor: GameTheme.colors.borderBright,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        gap: GameTheme.spacing.xs,
        opacity: disabled || choice.disabled ? 0.42 : pressed ? 0.76 : 1,
        padding: GameTheme.spacing.md,
      })}>
      <GameText variant="label">{choice.label ?? choice.title ?? choice.text ?? `Option ${index + 1}`}</GameText>
      {choice.description && choice.description !== choice.label ? <GameText tone="muted">{choice.description}</GameText> : null}
    </Pressable>
  );
}

export function CrimeJob() {
  const game = useElsewhereGame();
  const { applyRemoteProfile, sessionToken } = game;
  const [dashboard, setDashboard] = useState<EchoApiCrimeDashboard | null>(null);
  const [sessionResponse, setSessionResponse] = useState<EchoApiCrimeSessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const session = useMemo(() => unwrapSession(sessionResponse), [sessionResponse]);
  const sessionId = getSessionId(sessionResponse);
  const choices = useMemo(() => getSessionChoices(session), [session]);
  const actionIds = useMemo(() => getActionIds(session), [session]);
  const heat = dashboard?.heatInfo?.displayHeat ?? dashboard?.heatInfo?.heat ?? dashboard?.heatInfo?.rawHeat ?? game.heat;
  const heatProgress = Math.max(0, Math.min(1, heat / 100));

  const loadDashboard = useCallback(
    async (signal?: AbortSignal) => {
      if (!sessionToken) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextDashboard = await fetchCrimeDashboard(sessionToken, signal);
        setDashboard(nextDashboard);

        if (nextDashboard.profile) {
          applyRemoteProfile(nextDashboard.profile, { announce: false });
        }
      } catch (loadError) {
        if (signal?.aborted) {
          return;
        }

        setError(loadError instanceof EchoApiError ? loadError.message : 'Crime dashboard failed to load.');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [applyRemoteProfile, sessionToken]
  );

  const mergeResponse = useCallback(
    (response: EchoApiCrimeSessionResponse) => {
      setSessionResponse(response);

      const profile = response.profile ?? response.session?.profile;

      if (profile) {
        applyRemoteProfile(profile, { announce: false });
      }

      if (response.heatInfo || response.cooldowns) {
        setDashboard((current) => ({
          ...(current ?? {}),
          cooldowns: response.cooldowns ?? current?.cooldowns,
          heatInfo: response.heatInfo ?? current?.heatInfo,
          profile: profile ?? current?.profile,
        }));
      }
    },
    [applyRemoteProfile]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);

    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    if (!sessionToken || !sessionId || session?.status !== 'active') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        mergeResponse(await fetchCrimeSession(sessionToken, sessionId));
      } catch {
        // User-initiated actions surface errors; polling stays quiet.
      }
    }, 8_000);

    return () => clearInterval(interval);
  }, [mergeResponse, session?.status, sessionId, sessionToken]);

  const beginCrime = useCallback(
    async (crimeId: EchoApiCrimeId) => {
      if (!sessionToken) {
        setError('Link Discord before running server-owned Crime.');
        return;
      }

      setBusy(crimeId);
      setError(null);
      setNotice(null);

      try {
        const response = await startCrimeSession(sessionToken, crimeId);
        mergeResponse(response);
        setNotice(response.message ?? `${titleCase(crimeId)} started.`);
      } catch (startError) {
        setError(startError instanceof EchoApiError ? startError.message : 'Crime session failed to start.');
      } finally {
        setBusy(null);
      }
    },
    [mergeResponse, sessionToken]
  );

  const sendAction = useCallback(
    async (body: EchoApiCrimeActionBody) => {
      if (!sessionToken || !sessionId) {
        return;
      }

      setBusy('session');
      setError(null);
      setNotice(null);

      try {
        const response = await sendCrimeSessionAction(sessionToken, sessionId, body);
        mergeResponse(response);
        setNotice(response.message ?? null);
      } catch (actionError) {
        setError(actionError instanceof EchoApiError ? actionError.message : 'Crime action failed.');
      } finally {
        setBusy(null);
      }
    },
    [mergeResponse, sessionId, sessionToken]
  );

  if (!sessionToken) {
    return (
      <GameCard elevated>
        <GameText variant="title">Crime</GameText>
        <GameText tone="muted">
          Crime is Railway-owned. Link Discord first so payouts, heat, jail, cooldowns, fines, and inventory all resolve on the server ledger.
        </GameText>
      </GameCard>
    );
  }

  return (
    <View style={{ gap: GameTheme.spacing.md }}>
      <GameCard elevated>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText variant="title">Crime Status</GameText>
          <GameText tone="muted">The app sends choices only. Railway owns every roll, transfer, cooldown, and jail check.</GameText>
        </View>
        <ProgressBar progress={heatProgress} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          <GameText tone="faint" variant="caption">
            Heat {Math.round(heat)}/100
          </GameText>
          {dashboard?.heatInfo?.expiresAt ? (
            <GameText tone="faint" variant="caption">
              Expires {formatDateLabel(dashboard.heatInfo.expiresAt)}
            </GameText>
          ) : null}
          {dashboard?.jailedUntil ? (
            <GameText tone="ember" variant="caption">
              Jailed until {formatDateLabel(dashboard.jailedUntil)}
            </GameText>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          <CasinoButton disabled={loading || busy !== null} onPress={() => void loadDashboard()} tone="echo">
            Refresh
          </CasinoButton>
          {sessionId ? (
            <CasinoButton
              disabled={busy !== null}
              onPress={() => {
                setSessionResponse(null);
                void loadDashboard();
              }}>
              Back To Crime List
            </CasinoButton>
          ) : null}
        </View>
        {error ? <GameText tone="ember">{error}</GameText> : null}
        {notice ? <GameText tone="echo">{notice}</GameText> : null}
      </GameCard>

      {session ? (
        <GameCard>
          <View style={{ gap: GameTheme.spacing.xs }}>
            <GameText variant="title">{getSessionTitle(session)}</GameText>
            <GameText tone="faint" variant="caption">
              {session.status}
              {getSessionStep(session) ? ` | ${titleCase(getSessionStep(session))}` : ''}
              {getSessionHeat(session) !== null ? ` | heat ${Math.round(getSessionHeat(session)!)} ` : ''}
            </GameText>
          </View>

          {session.status === 'active' ? (
            <View style={{ gap: GameTheme.spacing.md }}>
              <GameText>{getSessionPrompt(session)}</GameText>
              {choices.length > 0 ? (
                choices.map((choice, index) => (
                  <ChoiceButton
                    choice={choice}
                    disabled={busy !== null}
                    index={index}
                    key={choice.id ?? choice.label ?? choice.text ?? `choice-${index}`}
                    onPress={() => void sendAction(buildActionBody(session, choice, index))}
                  />
                ))
              ) : (
                <GameText tone="muted">No choices returned yet. Refreshing will ask Railway for the current session state.</GameText>
              )}
              {actionIds.includes('go') || actionIds.includes('hangup') ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  {actionIds.includes('go') ? (
                    <CasinoButton disabled={busy !== null} onPress={() => void sendAction(buildActionBody(session, null, 0, 'go'))} tone="echo">
                      Go In
                    </CasinoButton>
                  ) : null}
                  {actionIds.includes('hangup') ? (
                    <CasinoButton disabled={busy !== null} onPress={() => void sendAction(buildActionBody(session, null, 0, 'hangup'))} tone="ember">
                      Hang Up
                    </CasinoButton>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: GameTheme.spacing.sm }}>
              <GameText>{getResultText(session, sessionResponse)}</GameText>
              {getResultDetails(session, sessionResponse).map((detail) => (
                <GameText key={detail} tone="faint" variant="caption">
                  {detail}
                </GameText>
              ))}
              <View style={{ alignItems: 'flex-start' }}>
                <CasinoButton
                  onPress={() => {
                    setSessionResponse(null);
                    void loadDashboard();
                  }}
                  tone="echo">
                  Done
                </CasinoButton>
              </View>
            </View>
          )}
        </GameCard>
      ) : (
        <View style={{ gap: GameTheme.spacing.md }}>
          {crimeActions.map((crime) => {
            const action = getDashboardAction(dashboard, crime.id);
            const playable = playableCrimeIds.has(crime.id);
            const ready = playable && getActionReady(dashboard, action);

            return (
              <GameCard key={crime.id} style={{ padding: 0 }}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!ready || busy !== null}
                  onPress={() => void beginCrime(crime.id)}
                  style={({ pressed }) => ({
                    gap: GameTheme.spacing.md,
                    opacity: !ready || busy !== null ? 0.48 : pressed ? 0.78 : 1,
                    padding: GameTheme.spacing.lg,
                  })}>
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: GameTheme.spacing.md, justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <GameText variant="title">{action?.name ?? action?.label ?? crime.title}</GameText>
                      <GameText tone="muted">{action?.description ?? crime.description}</GameText>
                    </View>
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: GameTheme.colors.backgroundSoft,
                        borderColor: crime.tone === 'danger' ? GameTheme.colors.danger : GameTheme.colors.ember,
                        borderRadius: GameTheme.radius.sm,
                        borderWidth: 1,
                        justifyContent: 'center',
                        minHeight: 46,
                        minWidth: 86,
                        padding: GameTheme.spacing.sm,
                      }}>
                      <GameText style={{ color: crime.tone === 'danger' ? GameTheme.colors.danger : GameTheme.colors.ember, textAlign: 'center' }} variant="label">
                        {busy === crime.id ? 'Starting' : getActionLabel(dashboard, action, crime.id)}
                      </GameText>
                    </View>
                  </View>
                  <GameText tone="faint" variant="caption">
                    {crime.meta}
                  </GameText>
                </Pressable>
              </GameCard>
            );
          })}
        </View>
      )}
    </View>
  );
}
