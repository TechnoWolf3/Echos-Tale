import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ProgressBar } from '@/components/game/progress-bar';
import { ResultCard } from '@/components/game/result-card';
import { GameTheme } from '@/constants/theme';
import { formatDuration, formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  EchoApiError,
  EchoApiNightWalkerChoice,
  EchoApiNightWalkerDashboard,
  EchoApiNightWalkerJob,
  EchoApiNightWalkerJobId,
  EchoApiNightWalkerSession,
  EchoApiNightWalkerSessionResponse,
  fetchNightWalkerDashboard,
  fetchNightWalkerSession,
  sendNightWalkerSessionAction,
  startNightWalkerSession,
} from '@/services/echo-api';

const fallbackJobs: EchoApiNightWalkerJob[] = [
  {
    cooldownSeconds: 300,
    id: 'flirt',
    payoutRange: [2_000, 3_000],
    rounds: 5,
    title: 'Flirt',
    xp: { success: 14 },
  },
  {
    cooldownSeconds: 420,
    id: 'lapDance',
    payoutRange: [4_000, 5_000],
    rounds: 5,
    title: 'Lap Dance',
    xp: { success: 16 },
  },
  {
    cooldownSeconds: 600,
    id: 'prostitute',
    payoutRange: [4_000, 6_000],
    rounds: 4,
    title: 'Prostitute',
    xp: { success: 18 },
  },
];

const jobDetails: Record<string, string> = {
  flirt: 'Read the room across five quick choices. Charm helps; oversharing usually files a complaint.',
  lapDance: 'Keep timing, confidence, and control steady while the room keeps changing around you.',
  prostitute: 'Navigate boundaries, safety, discretion, and risk while Railway owns every payout roll.',
};

const cooldownKeys: Record<string, string> = {
  flirt: 'flirt',
  lapDance: 'lapDance',
  prostitute: 'prostitute',
};

function unwrapSession(response: EchoApiNightWalkerSessionResponse | null): EchoApiNightWalkerSession | null {
  const session = response?.session ?? response;
  return session?.status ? (session as EchoApiNightWalkerSession) : null;
}

function getSessionId(response: EchoApiNightWalkerSessionResponse | null) {
  return response?.session?.id ?? response?.session?.sessionId ?? response?.id ?? response?.sessionId ?? null;
}

function formatPayoutRange(range?: number[]) {
  if (!range || range.length < 2) {
    return 'Server rolled';
  }

  return `${formatMoney(range[0])}-${formatMoney(range[1])}`;
}

function formatCooldown(seconds?: number) {
  return seconds ? formatDuration(seconds * 1000) : 'Cooldown';
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return null;
  }

  const millis = Date.parse(value);

  if (!Number.isFinite(millis)) {
    return null;
  }

  if (millis > Date.now()) {
    return formatDuration(millis - Date.now());
  }

  return 'Ready';
}

function getCooldownLabel(dashboard: EchoApiNightWalkerDashboard | null, job: EchoApiNightWalkerJob) {
  if (job.disabledReason) {
    return job.disabledReason;
  }

  const key = cooldownKeys[job.id] ?? job.id;
  const until = dashboard?.cooldowns?.[key] ?? dashboard?.cooldowns?.[job.id] ?? null;
  const label = formatDateLabel(until);

  if (label && label !== 'Ready') {
    return label;
  }

  if (job.available === false) {
    return 'Locked';
  }

  return 'Start';
}

function getMeter(session: EchoApiNightWalkerSession | null) {
  const state = session?.state;

  if (!session || !state) {
    return null;
  }

  if (session.jobId === 'flirt' || state.wrongLimit !== undefined) {
    const count = state.wrongCount ?? 0;
    const limit = state.wrongLimit ?? 2;

    return {
      color: count >= limit - 1 ? GameTheme.colors.ember : GameTheme.colors.echo,
      label: `Wrong ${count}/${limit}`,
      progress: limit > 0 ? count / limit : 0,
    };
  }

  if (session.jobId === 'lapDance' || state.mistakeLimit !== undefined) {
    const count = state.mistakes ?? 0;
    const limit = state.mistakeLimit ?? 3;

    return {
      color: count >= limit - 1 ? GameTheme.colors.ember : GameTheme.colors.echo,
      label: `Mistakes ${count}/${limit}`,
      progress: limit > 0 ? count / limit : 0,
    };
  }

  const risk = state.risk ?? 0;
  const limit = state.riskLimit ?? 100;

  return {
    color: risk >= 70 ? GameTheme.colors.ember : GameTheme.colors.violet,
    label: state.riskLimit ? `Risk ${risk}/${state.riskLimit}` : `Risk ${risk}`,
    progress: Math.min(1, risk / limit),
  };
}

function ChoiceButton({
  choice,
  disabled,
  onPress,
}: {
  choice: EchoApiNightWalkerChoice;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: GameTheme.colors.backgroundSoft,
        borderColor: GameTheme.colors.borderBright,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        opacity: disabled ? 0.42 : pressed ? 0.76 : 1,
        padding: GameTheme.spacing.md,
      })}>
      <GameText variant="label">{choice.label}</GameText>
    </Pressable>
  );
}

export function NightWalkerJob() {
  const game = useElsewhereGame();
  const { applyRemoteProfile, sessionToken } = game;
  const [dashboard, setDashboard] = useState<EchoApiNightWalkerDashboard | null>(null);
  const [sessionResponse, setSessionResponse] = useState<EchoApiNightWalkerSessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const session = useMemo(() => unwrapSession(sessionResponse), [sessionResponse]);
  const sessionId = getSessionId(sessionResponse);
  const jobs = dashboard?.jobs?.length ? dashboard.jobs : fallbackJobs;
  const meter = getMeter(session);

  const mergeResponse = useCallback(
    (response: EchoApiNightWalkerSessionResponse) => {
      setSessionResponse(response);

      const profile = response.profile ?? response.session?.profile;

      if (profile) {
        applyRemoteProfile(profile, { announce: false });
      }
    },
    [applyRemoteProfile]
  );

  const loadDashboard = useCallback(
    async (signal?: AbortSignal) => {
      if (!sessionToken) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextDashboard = await fetchNightWalkerDashboard(sessionToken, signal);
        setDashboard(nextDashboard);

        if (nextDashboard.profile) {
          applyRemoteProfile(nextDashboard.profile, { announce: false });
        }
      } catch (loadError) {
        if (signal?.aborted) {
          return;
        }

        setError(loadError instanceof EchoApiError ? loadError.message : 'Night Walker failed to load.');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [applyRemoteProfile, sessionToken]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);

    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    if (!sessionToken || !sessionId || session?.status !== 'active' || busy) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        mergeResponse(await fetchNightWalkerSession(sessionToken, sessionId));
      } catch {
        // Player actions surface errors; passive refresh stays quiet.
      }
    }, 8_000);

    return () => clearInterval(interval);
  }, [busy, mergeResponse, session?.status, sessionId, sessionToken]);

  const beginJob = useCallback(
    async (jobId: EchoApiNightWalkerJobId) => {
      if (!sessionToken) {
        setError('Link Discord before running server-owned Night Walker jobs.');
        return;
      }

      setBusy(jobId);
      setError(null);
      setNotice(null);

      try {
        const response = await startNightWalkerSession(sessionToken, jobId);
        mergeResponse(response);
        setNotice(response.message ?? response.session?.message ?? null);
      } catch (startError) {
        setError(startError instanceof EchoApiError ? startError.message : 'Night Walker session failed to start.');
      } finally {
        setBusy(null);
      }
    },
    [mergeResponse, sessionToken]
  );

  const choose = useCallback(
    async (choiceIndex: number) => {
      if (!sessionToken || !sessionId) {
        return;
      }

      setBusy('session');
      setError(null);
      setNotice(null);

      try {
        const response = await sendNightWalkerSessionAction(sessionToken, sessionId, choiceIndex);
        mergeResponse(response);
        setNotice(response.message ?? response.session?.message ?? null);
      } catch (choiceError) {
        setError(choiceError instanceof EchoApiError ? choiceError.message : 'Night Walker choice failed.');
      } finally {
        setBusy(null);
      }
    },
    [mergeResponse, sessionId, sessionToken]
  );

  if (!sessionToken) {
    return (
      <GameCard elevated>
        <GameText variant="title">Night Walker</GameText>
        <GameText tone="muted">
          Night Walker needs the Discord ledger. Link Discord first so Railway owns sessions, choices, payout, XP, cooldowns, and wallet updates.
        </GameText>
      </GameCard>
    );
  }

  return (
    <View style={{ gap: GameTheme.spacing.md }}>
      <GameCard elevated>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText variant="title">Night Walker Status</GameText>
          <GameText tone="muted">The app sends choices only. Railway keeps the hidden reads, risk math, session state, and settlement.</GameText>
        </View>
        <ProgressBar progress={(dashboard?.progress?.xp ?? game.jobXp) / (dashboard?.progress?.xpToNext ?? 100 + (game.jobLevel - 1) * 60)} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          <GameText tone="faint" variant="caption">
            Level {dashboard?.progress?.level ?? game.jobLevel}
          </GameText>
          <GameText tone="faint" variant="caption">
            XP {dashboard?.progress?.xp ?? game.jobXp}/{dashboard?.progress?.xpToNext ?? 100 + (game.jobLevel - 1) * 60}
          </GameText>
          <GameText tone="faint" variant="caption">
            Bonus +{dashboard?.progress?.levelBonusPct ?? Math.round((Math.min(1.6, 1 + 0.02 * (game.jobLevel - 1)) - 1) * 100)}%
          </GameText>
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
              Back To Night Jobs
            </CasinoButton>
          ) : null}
        </View>
        {error ? <GameText tone="ember">{error}</GameText> : null}
        {notice ? <GameText tone="echo">{notice}</GameText> : null}
      </GameCard>

      {session ? (
        <GameCard>
          <View style={{ gap: GameTheme.spacing.xs }}>
            <GameText variant="title">{session.title ?? 'Night Walker'}</GameText>
            <GameText tone="faint" variant="caption">
              Round {session.round ?? 1}/{session.rounds ?? 1} | {session.status}
            </GameText>
          </View>

          {meter ? (
            <View style={{ gap: GameTheme.spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: GameTheme.spacing.md }}>
                <GameText tone="faint" variant="caption">
                  Meter
                </GameText>
                <GameText style={{ color: meter.color }} variant="label">
                  {meter.label}
                </GameText>
              </View>
              <ProgressBar color={meter.color} progress={meter.progress} />
            </View>
          ) : null}

          {session.status === 'active' ? (
            <View style={{ gap: GameTheme.spacing.md }}>
              {session.feedback ? <GameText tone="echo">{session.feedback}</GameText> : null}
              <GameText>{session.prompt ?? session.message ?? 'Railway is holding the next move.'}</GameText>
              {busy === 'session' ? <GameText tone="echo">Railway is reading that move...</GameText> : null}
              {session.choices?.length ? (
                session.choices.map((choice) => (
                  <ChoiceButton choice={choice} disabled={busy !== null} key={`${choice.index}-${choice.label}`} onPress={() => void choose(choice.index)} />
                ))
              ) : (
                <GameText tone="muted">No choices returned yet. Refreshing will ask Railway for the current session state.</GameText>
              )}
            </View>
          ) : (
            <View style={{ gap: GameTheme.spacing.md }}>
              <ResultCard
                details={[
                  sessionResponse?.result?.basePayout !== undefined
                    ? { label: 'Base', value: formatMoney(sessionResponse.result.basePayout) }
                    : null,
                  sessionResponse?.result?.cooldownUntil
                    ? { label: 'Cooldown', value: formatDateLabel(sessionResponse.result.cooldownUntil) ?? 'Started' }
                    : null,
                ].filter((detail): detail is { label: string; value: string } => detail !== null)}
                payout={sessionResponse?.result?.finalPayout ?? sessionResponse?.result?.payout}
                summary={session.message ?? sessionResponse?.message ?? 'Night Walker session resolved.'}
                title={session.result === 'failed' || sessionResponse?.result?.status === 'failed' ? 'Job Failed' : 'Job Complete'}
                tone={session.result === 'failed' || sessionResponse?.result?.status === 'failed' ? 'bad' : 'good'}
                xp={sessionResponse?.result?.xpGained}
              />
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
          {jobs.map((job) => {
            const ready = job.available !== false && !job.disabledReason;

            return (
              <GameCard key={job.id} style={{ padding: 0 }}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!ready || busy !== null}
                  onPress={() => void beginJob(job.id)}
                  style={({ pressed }) => ({
                    gap: GameTheme.spacing.md,
                    opacity: !ready || busy !== null ? 0.48 : pressed ? 0.78 : 1,
                    padding: GameTheme.spacing.lg,
                  })}>
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: GameTheme.spacing.md, justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <GameText variant="title">{job.title ?? job.id}</GameText>
                      <GameText tone="muted">{jobDetails[job.id] ?? 'A server-owned Night Walker scenario chain.'}</GameText>
                    </View>
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: GameTheme.colors.backgroundSoft,
                        borderColor: GameTheme.colors.ember,
                        borderRadius: GameTheme.radius.sm,
                        borderWidth: 1,
                        justifyContent: 'center',
                        minHeight: 46,
                        minWidth: 86,
                        padding: GameTheme.spacing.sm,
                      }}>
                      <GameText style={{ color: GameTheme.colors.ember, textAlign: 'center' }} variant="label">
                        {busy === job.id ? 'Starting' : getCooldownLabel(dashboard, job)}
                      </GameText>
                    </View>
                  </View>
                  <GameText tone="faint" variant="caption">
                    {job.rounds ?? '?'} rounds | {formatPayoutRange(job.payoutRange)} | {formatCooldown(job.cooldownSeconds)} cooldown | +{job.xp?.success ?? '?'} XP
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
