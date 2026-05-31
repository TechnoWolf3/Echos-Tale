import { AppState } from 'react-native';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { EchoApiError, EchoApiProfile, EchoApiProfileIllusion, fetchEchoProfile, isEchoApiConfigured } from '@/services/echo-api';
import {
  clearStoredSessionToken,
  getStoredLinkedProfile,
  getStoredSessionToken,
  setStoredLinkedProfile,
  setStoredSessionToken,
} from '@/services/session-storage';

type CooldownId =
  | 'emailSorter'
  | 'shift'
  | 'skillCheck'
  | 'storeClerk'
  | 'storeRobbery'
  | 'transportContract'
  | 'trucker'
  | 'dailyRitual'
  | 'echoWheel';

type EventTone = 'good' | 'bad' | 'neutral' | 'echo';

type GameEvent = {
  id: number;
  message: string;
  tone: EventTone;
};

type Cooldowns = Partial<Record<CooldownId, number>>;

type ElsewhereGame = {
  accountNumber: string | null;
  bank: number;
  cooldowns: Cooldowns;
  events: GameEvent[];
  heat: number;
  illusion: EchoApiProfileIllusion | null;
  isBridgeReady: boolean;
  jailUntil: number | null;
  jobLevel: number;
  jobXp: number;
  linkedProfile: EchoApiProfile | null;
  linkStatus: 'local' | 'loading' | 'linked' | 'error';
  lastSyncedAt: number | null;
  now: number;
  serverBank: number;
  sessionToken: string | null;
  wallet: number;
  applyRemoteProfile: (profile: EchoApiProfile, options?: { announce?: boolean }) => void;
  bribeOfficer: () => void;
  canAct: (id: CooldownId) => boolean;
  clearJail: () => void;
  clearLinkedSession: () => Promise<void>;
  getCooldownLabel: (id: CooldownId) => string;
  playEchoWheel: () => void;
  refreshRemoteProfile: () => Promise<void>;
  refreshRemoteProfileIfStale: (minimumAgeMs?: number) => Promise<void>;
  resolveCasinoPlay: (result: { cost: number; message: string; payout: number }) => boolean;
  resolveJobReward: (result: { cooldownId: CooldownId; cooldownSeconds: number; message: string; payout: number; tone?: EventTone; xp: number }) => void;
  runDailyRitual: () => void;
  runStoreClerk: () => void;
  runStoreRobbery: () => void;
  setLinkedSession: (token: string, profile: EchoApiProfile) => Promise<void>;
  tick: () => void;
};

const ElsewhereGameContext = createContext<ElsewhereGame | null>(null);

const jobXpToNext = (level: number) => 100 + (level - 1) * 60;

const formatDuration = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};

function rollBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function getAccountNumber(profile: EchoApiProfile) {
  return profile.accountNumber ?? profile.account_number ?? null;
}

function getIllusionExpiresAt(illusion?: EchoApiProfileIllusion | null) {
  const rawExpiry = illusion?.expiresAt ?? illusion?.endsAt ?? null;
  const expiry = rawExpiry ? new Date(rawExpiry).getTime() : null;

  return expiry && Number.isFinite(expiry) ? expiry : null;
}

function isIllusionActive(illusion?: EchoApiProfileIllusion | null) {
  if (!illusion?.active) {
    return false;
  }

  const expiresAt = getIllusionExpiresAt(illusion);
  return !expiresAt || expiresAt > Date.now();
}

function getDisplayProfile(profile: EchoApiProfile) {
  const illusion = isIllusionActive(profile.illusion) ? profile.illusion : null;
  const display = illusion?.display;

  return {
    accountNumber: display?.accountNumber ?? display?.account_number ?? (illusion ? null : getAccountNumber(profile)),
    bankBalance: display?.bankBalance ?? (illusion ? 0 : profile.bankBalance),
    heat: display?.heat ?? (illusion ? 0 : profile.heat),
    jailedUntil: display?.jailedUntil ?? (illusion ? null : profile.jailedUntil),
    jobLevel: display?.jobLevel ?? (illusion ? 0 : profile.jobLevel),
    jobXp: display?.jobXp ?? (illusion ? 0 : profile.jobXp),
    serverBankBalance: display?.serverBankBalance ?? (illusion ? 0 : profile.serverBankBalance),
    walletBalance: display?.walletBalance ?? (illusion ? 0 : profile.walletBalance),
  };
}

export function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export function ElsewhereGameProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState(7_500);
  const [bank, setBank] = useState(25_000);
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [serverBank, setServerBank] = useState(500_000);
  const [heat, setHeat] = useState(12);
  const [jobLevel, setJobLevel] = useState(1);
  const [jobXp, setJobXp] = useState(0);
  const [illusion, setIllusion] = useState<EchoApiProfileIllusion | null>(null);
  const [cooldowns, setCooldowns] = useState<Cooldowns>({});
  const [jailUntil, setJailUntil] = useState<number | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [linkedProfile, setLinkedProfile] = useState<EchoApiProfile | null>(null);
  const [linkStatus, setLinkStatus] = useState<'local' | 'loading' | 'linked' | 'error'>('loading');
  const [isBridgeReady, setIsBridgeReady] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const refreshInFlight = useRef(false);
  const [events, setEvents] = useState<GameEvent[]>([
    {
      id: 1,
      message: 'Echo opened the ledger. The house is watching.',
      tone: 'echo',
    },
    {
      id: 2,
      message: 'Wallet funded with street cash. Bank balance remains clean enough.',
      tone: 'neutral',
    },
  ]);

  const pushEvent = useCallback((message: string, tone: EventTone = 'neutral') => {
    setEvents((current) => [{ id: Date.now(), message, tone }, ...current].slice(0, 8));
  }, []);

  const applyRemoteProfile = useCallback(
    (profile: EchoApiProfile, options: { announce?: boolean } = {}) => {
      const displayProfile = getDisplayProfile(profile);
      const nextIllusion = isIllusionActive(profile.illusion) ? profile.illusion ?? null : null;

      setWallet(displayProfile.walletBalance);
      setBank(displayProfile.bankBalance);
      setAccountNumber(displayProfile.accountNumber);
      setServerBank(displayProfile.serverBankBalance);
      setHeat(displayProfile.heat);
      setJobLevel(displayProfile.jobLevel);
      setJobXp(displayProfile.jobXp);
      setJailUntil(displayProfile.jailedUntil ? new Date(displayProfile.jailedUntil).getTime() : null);
      setIllusion(nextIllusion);
      setLinkedProfile(profile);
      setLinkStatus('linked');
      setLastSyncedAt(Date.now());

      if (options.announce ?? true) {
        pushEvent(`Linked ${profile.displayName}. The app ledger now follows Railway.`, 'echo');
      }
    },
    [pushEvent]
  );

  const setLinkedSession = useCallback(
    async (token: string, profile: EchoApiProfile) => {
      await setStoredSessionToken(token);
      await setStoredLinkedProfile(profile);
      setSessionToken(token);
      applyRemoteProfile(profile);
    },
    [applyRemoteProfile]
  );

  const clearLinkedSession = useCallback(async () => {
    await clearStoredSessionToken();
    setSessionToken(null);
    setLinkedProfile(null);
    setLinkStatus('local');
    pushEvent('Discord bridge disconnected. Local testing ledger is back in charge.', 'neutral');
  }, [pushEvent]);

  const refreshRemoteProfile = useCallback(async () => {
    if (!sessionToken || refreshInFlight.current) {
      return;
    }

    refreshInFlight.current = true;

    try {
      const profile = await fetchEchoProfile(sessionToken);
      applyRemoteProfile(profile, { announce: false });
    } catch (error) {
      setLinkStatus('error');

      if (error instanceof EchoApiError && error.status === 401) {
        await clearStoredSessionToken();
        setSessionToken(null);
        setLinkedProfile(null);
        pushEvent('Railway session expired. Link Discord again when you are ready.', 'bad');
        return;
      }

      pushEvent('Railway profile refresh failed. The local ledger is showing the last known numbers.', 'bad');
    } finally {
      refreshInFlight.current = false;
    }
  }, [applyRemoteProfile, pushEvent, sessionToken]);

  const refreshRemoteProfileIfStale = useCallback(
    async (minimumAgeMs = 10_000) => {
      if (!sessionToken) {
        return;
      }

      if (lastSyncedAt && Date.now() - lastSyncedAt < minimumAgeMs) {
        return;
      }

      await refreshRemoteProfile();
    },
    [lastSyncedAt, refreshRemoteProfile, sessionToken]
  );

  useEffect(() => {
    if (!illusion) {
      return;
    }

    const expiresAt = getIllusionExpiresAt(illusion);

    if (!expiresAt) {
      return;
    }

    const clearIllusion = () => {
      setIllusion(null);

      if (linkedProfile) {
        setWallet(linkedProfile.walletBalance);
        setBank(linkedProfile.bankBalance);
        setAccountNumber(getAccountNumber(linkedProfile));
        setServerBank(linkedProfile.serverBankBalance);
        setHeat(linkedProfile.heat);
        setJobLevel(linkedProfile.jobLevel);
        setJobXp(linkedProfile.jobXp);
        setJailUntil(linkedProfile.jailedUntil ? new Date(linkedProfile.jailedUntil).getTime() : null);
      }

      void refreshRemoteProfile();
    };

    const delay = Math.max(0, expiresAt - Date.now() + 500);
    const timeout = setTimeout(clearIllusion, delay);

    return () => clearTimeout(timeout);
  }, [illusion, linkedProfile, refreshRemoteProfile]);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      if (!isEchoApiConfigured) {
        setLinkStatus('local');
        setIsBridgeReady(true);
        return;
      }

      const storedToken = await getStoredSessionToken();

      if (!mounted) {
        return;
      }

      if (!storedToken) {
        setLinkStatus('local');
        setIsBridgeReady(true);
        return;
      }

      setSessionToken(storedToken);

      const cachedProfile = await getStoredLinkedProfile();

      if (cachedProfile && mounted) {
        applyRemoteProfile(cachedProfile, { announce: false });
      }

      try {
        const profile = await fetchEchoProfile(storedToken);

        if (!mounted) {
          return;
        }

        applyRemoteProfile(profile, { announce: false });
        await setStoredLinkedProfile(profile);
        pushEvent(`Railway ledger restored for ${profile.displayName}.`, 'echo');
        setIsBridgeReady(true);
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error instanceof EchoApiError && error.status === 401) {
          await clearStoredSessionToken();
          setSessionToken(null);
          setLinkedProfile(null);
          setLinkStatus('local');
          pushEvent('Saved Railway session expired. Link Discord again when ready.', 'bad');
          setIsBridgeReady(true);
          return;
        }

        setLinkStatus(cachedProfile ? 'linked' : 'error');
        pushEvent(
          cachedProfile
            ? 'Railway sync failed, but your saved Discord bridge stayed linked. Try again in a moment.'
            : 'Saved Railway session could not sync yet. The bridge token is still stored.',
          'bad'
        );
        setIsBridgeReady(true);
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [applyRemoteProfile, pushEvent]);

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshRemoteProfileIfStale(5_000);
      }
    });

    return () => subscription.remove();
  }, [refreshRemoteProfileIfStale, sessionToken]);

  const setCooldown = useCallback((id: CooldownId, seconds: number) => {
    setCooldowns((current) => ({
      ...current,
      [id]: Date.now() + seconds * 1000,
    }));
  }, []);

  const addJobXp = useCallback(
    (amount: number) => {
      setJobXp((current) => {
        const next = current + amount;
        const needed = jobXpToNext(jobLevel);

        if (next >= needed) {
          setJobLevel((level) => level + 1);
          pushEvent('Job level increased. Honest-ish work pays a little better now.', 'good');
          return next - needed;
        }

        return next;
      });
    },
    [jobLevel, pushEvent]
  );

  const isJailed = jailUntil !== null && jailUntil > now;

  const canAct = useCallback(
    (id: CooldownId) => {
      const cooldownUntil = cooldowns[id] ?? 0;
      return !isJailed && cooldownUntil <= now;
    },
    [cooldowns, isJailed, now]
  );

  const getCooldownLabel = useCallback(
    (id: CooldownId) => {
      if (isJailed && jailUntil) {
        return `Jailed ${formatDuration(jailUntil - now)}`;
      }

      const cooldownUntil = cooldowns[id] ?? 0;

      if (cooldownUntil <= now) {
        return 'Ready';
      }

      return formatDuration(cooldownUntil - now);
    },
    [cooldowns, isJailed, jailUntil, now]
  );

  const runStoreClerk = useCallback(() => {
    if (!canAct('storeClerk')) {
      return;
    }

    const basePay = rollBetween(480, 920);
    const streakBonus = Math.random() > 0.7 ? 180 : 0;
    const total = basePay + streakBonus;

    setWallet((current) => current + total);
    addJobXp(14);
    setCooldown('storeClerk', 45);
    pushEvent(`Store Clerk shift paid ${formatMoney(total)}. Change drawer survived.`, 'good');
  }, [addJobXp, canAct, pushEvent, setCooldown]);

  const resolveJobReward = useCallback(
    ({
      cooldownId,
      cooldownSeconds,
      message,
      payout,
      tone = 'good',
      xp,
    }: {
      cooldownId: CooldownId;
      cooldownSeconds: number;
      message: string;
      payout: number;
      tone?: EventTone;
      xp: number;
    }) => {
      setWallet((current) => current + payout);
      addJobXp(xp);
      setCooldown(cooldownId, cooldownSeconds);
      pushEvent(message, tone);
    },
    [addJobXp, pushEvent, setCooldown]
  );

  const runStoreRobbery = useCallback(() => {
    if (!canAct('storeRobbery')) {
      return;
    }

    const clean = Math.random() > heat / 120;
    const heatGain = rollBetween(8, 18);

    setHeat((current) => Math.min(100, current + heatGain));
    setCooldown('storeRobbery', 120);

    if (clean) {
      const payout = rollBetween(5_500, 12_500);
      setWallet((current) => current + payout);
      pushEvent(`Store Robbery cleared ${formatMoney(payout)}. Cameras blinked at the right time.`, 'good');
      return;
    }

    const fine = rollBetween(1_800, 5_500);
    const jailRoll = Math.random() > 0.58;

    setWallet((current) => Math.max(0, current - fine));
    setServerBank((current) => current + fine);

    if (jailRoll) {
      const until = Date.now() + rollBetween(90, 180) * 1000;
      setJailUntil(until);
      pushEvent(`Busted hard. ${formatMoney(fine)} fine paid into the house, and jail is locked.`, 'bad');
      return;
    }

    pushEvent(`Robbery got messy. Paid ${formatMoney(fine)} in fines, heat climbed.`, 'bad');
  }, [canAct, heat, pushEvent, setCooldown]);

  const runDailyRitual = useCallback(() => {
    if (!canAct('dailyRitual')) {
      return;
    }

    const payout = rollBetween(20_000, 35_000);
    const blessing = Math.random() < 0.25;

    setBank((current) => current + payout);
    setCooldown('dailyRitual', 180);
    pushEvent(
      blessing
        ? `Daily Ritual paid ${formatMoney(payout)} to the bank. Echo also left a warm mark.`
        : `Daily Ritual paid ${formatMoney(payout)} to the bank. The room went quiet after.`,
      blessing ? 'echo' : 'good'
    );
  }, [canAct, pushEvent, setCooldown]);

  const playEchoWheel = useCallback(() => {
    if (!canAct('echoWheel') || wallet < 10_000) {
      return;
    }

    setWallet((current) => current - 10_000);
    setServerBank((current) => current + 10_000);
    setCooldown('echoWheel', 150);

    const roll = Math.random();

    if (roll < 0.2) {
      const payout = 25_000;
      setWallet((current) => current + payout);
      setServerBank((current) => Math.max(0, current - payout));
      pushEvent(`Echo Wheel paid ${formatMoney(payout)}. The machine smiled with too many teeth.`, 'echo');
      return;
    }

    if (roll < 0.38) {
      const deposit = 75_000;
      setBank((current) => current + deposit);
      pushEvent(`Bank Error. ${formatMoney(deposit)} appeared safely in storage.`, 'echo');
      return;
    }

    if (roll < 0.58) {
      const repair = 8_500;
      setWallet((current) => Math.max(0, current - repair));
      setServerBank((current) => current + repair);
      pushEvent(`Wheel jam. Repair bill took ${formatMoney(repair)} and fed the house.`, 'bad');
      return;
    }

    if (roll < 0.72) {
      setJailUntil(Date.now() + 90 * 1000);
      pushEvent('Echo Wheel landed on Jail. Nobody explained why.', 'bad');
      return;
    }

    pushEvent('Wheel jammed, coughed, and granted nothing except suspicion.', 'neutral');
  }, [canAct, pushEvent, setCooldown, wallet]);

  const resolveCasinoPlay = useCallback(
    ({ cost, message, payout }: { cost: number; message: string; payout: number }) => {
      if (wallet < cost) {
        pushEvent('Wallet declined the casino receipt. Not enough cash on hand.', 'bad');
        return false;
      }

      const paidFromHouse = Math.min(payout, serverBank + cost);

      setWallet((current) => current - cost + paidFromHouse);
      setServerBank((current) => Math.max(0, current + cost - paidFromHouse));
      pushEvent(message, paidFromHouse > cost ? 'good' : payout > 0 ? 'neutral' : 'bad');
      return true;
    },
    [pushEvent, serverBank, wallet]
  );

  const bribeOfficer = useCallback(() => {
    const cost = 5_000;

    if (wallet < cost) {
      pushEvent('Patrol officer refused pocket lint as a bribe.', 'bad');
      return;
    }

    setWallet((current) => current - cost);
    setServerBank((current) => current + cost);

    if (Math.random() > 0.28) {
      const heatDrop = rollBetween(10, 22);
      setHeat((current) => Math.max(0, current - heatDrop));
      pushEvent(`Bribe landed. Heat dropped by ${heatDrop}.`, 'good');
      return;
    }

    setHeat((current) => Math.min(100, current + 8));
    pushEvent('Bribe failed. Heat rose and the officer kept the money.', 'bad');
  }, [pushEvent, wallet]);

  const clearJail = useCallback(() => {
    setJailUntil(null);
    pushEvent('Jail timer cleared for testing the flow. Echo pretends not to notice.', 'neutral');
  }, [pushEvent]);

  const tick = useCallback(() => {
    setNow(Date.now());
  }, []);

  const value = useMemo(
    () => ({
      accountNumber,
      bank,
      applyRemoteProfile,
      bribeOfficer,
      canAct,
      clearJail,
      clearLinkedSession,
      cooldowns,
      events,
      getCooldownLabel,
      heat,
      illusion,
      isBridgeReady,
      jailUntil,
      jobLevel,
      jobXp,
      linkedProfile,
      linkStatus,
      lastSyncedAt,
      now,
      playEchoWheel,
      refreshRemoteProfile,
      refreshRemoteProfileIfStale,
      resolveCasinoPlay,
      resolveJobReward,
      runDailyRitual,
      runStoreClerk,
      runStoreRobbery,
      serverBank,
      sessionToken,
      setLinkedSession,
      tick,
      wallet,
    }),
    [
      accountNumber,
      bank,
      applyRemoteProfile,
      bribeOfficer,
      canAct,
      clearJail,
      clearLinkedSession,
      cooldowns,
      events,
      getCooldownLabel,
      heat,
      illusion,
      isBridgeReady,
      jailUntil,
      jobLevel,
      jobXp,
      linkedProfile,
      linkStatus,
      lastSyncedAt,
      now,
      playEchoWheel,
      refreshRemoteProfile,
      refreshRemoteProfileIfStale,
      resolveCasinoPlay,
      resolveJobReward,
      runDailyRitual,
      runStoreClerk,
      runStoreRobbery,
      serverBank,
      sessionToken,
      setLinkedSession,
      tick,
      wallet,
    ]
  );

  return <ElsewhereGameContext.Provider value={value}>{children}</ElsewhereGameContext.Provider>;
}

export function useElsewhereGame() {
  const value = useContext(ElsewhereGameContext);

  if (!value) {
    throw new Error('useElsewhereGame must be used inside ElsewhereGameProvider');
  }

  return value;
}
