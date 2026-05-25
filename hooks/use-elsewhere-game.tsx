import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

type CooldownId =
  | 'emailSorter'
  | 'skillCheck'
  | 'storeClerk'
  | 'storeRobbery'
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
  bank: number;
  cooldowns: Cooldowns;
  events: GameEvent[];
  heat: number;
  jailUntil: number | null;
  jobLevel: number;
  jobXp: number;
  now: number;
  serverBank: number;
  wallet: number;
  bribeOfficer: () => void;
  canAct: (id: CooldownId) => boolean;
  clearJail: () => void;
  getCooldownLabel: (id: CooldownId) => string;
  playEchoWheel: () => void;
  resolveJobReward: (result: { cooldownId: CooldownId; cooldownSeconds: number; message: string; payout: number; tone?: EventTone; xp: number }) => void;
  runDailyRitual: () => void;
  runStoreClerk: () => void;
  runStoreRobbery: () => void;
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

export function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export function ElsewhereGameProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState(7_500);
  const [bank, setBank] = useState(25_000);
  const [serverBank, setServerBank] = useState(500_000);
  const [heat, setHeat] = useState(12);
  const [jobLevel, setJobLevel] = useState(1);
  const [jobXp, setJobXp] = useState(0);
  const [cooldowns, setCooldowns] = useState<Cooldowns>({});
  const [jailUntil, setJailUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
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
      bank,
      bribeOfficer,
      canAct,
      clearJail,
      cooldowns,
      events,
      getCooldownLabel,
      heat,
      jailUntil,
      jobLevel,
      jobXp,
      now,
      playEchoWheel,
      resolveJobReward,
      runDailyRitual,
      runStoreClerk,
      runStoreRobbery,
      serverBank,
      tick,
      wallet,
    }),
    [
      bank,
      bribeOfficer,
      canAct,
      clearJail,
      cooldowns,
      events,
      getCooldownLabel,
      heat,
      jailUntil,
      jobLevel,
      jobXp,
      now,
      playEchoWheel,
      resolveJobReward,
      runDailyRitual,
      runStoreClerk,
      runStoreRobbery,
      serverBank,
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
