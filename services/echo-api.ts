import { Platform } from 'react-native';

export type EchoApiProfile = {
  account_number?: string | null;
  accountNumber?: string | null;
  bankBalance: number;
  discordUserId: string | null;
  displayName: string;
  heat: number;
  jailedUntil: string | null;
  jobLevel: number;
  jobXp: number;
  profileId: string;
  serverBankBalance: number;
  walletBalance: number;
};

export type EchoApiCard = {
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  suit: 'Clubs' | 'Diamonds' | 'Hearts' | 'Spades';
};

export type EchoApiBlackjackHand = {
  bet?: number;
  cards?: EchoApiCard[];
  doubled?: boolean;
  hiddenCount?: number;
  id?: string;
  payout?: number;
  result?: 'blackjack' | 'loss' | 'push' | 'win' | null;
  status?: 'busted' | 'playing' | 'resolved' | 'stood';
  value: number | null;
  visibleCards?: EchoApiCard[];
};

export type EchoApiBlackjackRound = {
  activeHandIndex?: number | null;
  allowedActions: ('double' | 'hit' | 'split' | 'stand')[];
  bet: number;
  dealer: EchoApiBlackjackHand;
  gameId: string;
  hands?: EchoApiBlackjackHand[];
  message: string;
  payout?: number;
  player: EchoApiBlackjackHand;
  profile: EchoApiProfile;
  profit?: number;
  result?: 'blackjack' | 'loss' | 'push' | 'win';
  status: 'playing' | 'resolved';
};

export type EchoApiBlackjackTableStatus = 'closed' | 'expired' | 'lobby' | 'playing' | 'resolved' | string;

export type EchoApiBlackjackTablePlayer = {
  activeHand?: number;
  bet?: number | null;
  displayName?: string;
  feeAmount?: number;
  hands?: EchoApiBlackjackHand[];
  paid?: boolean;
  payout?: number;
  profit?: number;
  profileId?: string;
  result?: string | null;
  seatIndex?: number;
  status?: string;
  userId?: string;
};

export type EchoApiBlackjackTable = {
  allowedActions?: ('double' | 'hit' | 'split' | 'stand')[];
  currentPlayerId?: string | null;
  currentProfileId?: string | null;
  dealer?: EchoApiBlackjackHand;
  dealerHand?: EchoApiBlackjackHand;
  gameType?: 'blackjack';
  hostDisplayName?: string;
  hostProfileId?: string;
  hostUserId?: string;
  id?: string;
  lastResult?: {
    message?: string;
    players?: EchoApiBlackjackTablePlayer[];
  } | null;
  maxPlayers?: number;
  message?: string;
  players: EchoApiBlackjackTablePlayer[];
  profile?: EchoApiProfile;
  status: EchoApiBlackjackTableStatus;
  tableId: string;
  timestamps?: {
    createdAt?: string;
    expiresAt?: string;
    updatedAt?: string;
  };
  turnIndex?: number;
};

export type EchoApiBlackjackTablesResponse = {
  tables: EchoApiBlackjackTable[];
};

export type EchoApiBlackjackTableResponse = {
  profile?: EchoApiProfile;
  status?: string;
  table?: EchoApiBlackjackTable;
};

export type EchoApiHigherLowerRound = {
  allowedActions: ('cashout' | 'higher' | 'lower' | 'same')[];
  bet: number;
  cashoutValue: number;
  currentCard: EchoApiCard;
  gameId: string;
  lastPick: 'higher' | 'lower' | 'same' | null;
  message: string;
  payout?: number;
  previousCard: EchoApiCard | null;
  profile: EchoApiProfile;
  profit?: number;
  result?: 'bust' | 'cashout' | null;
  status: 'playing' | 'resolved';
  streak: number;
};

export type EchoApiHigherLowerTableStatus = 'closed' | 'expired' | 'lobby' | 'playing' | 'resolved';

export type EchoApiHigherLowerTablePlayer = {
  alive?: boolean;
  bet?: number | null;
  displayName?: string;
  feeAmount?: number;
  paid?: boolean;
  payout?: number;
  pick?: 'higher' | 'lower' | 'same' | null;
  profit?: number;
  profileId?: string;
  result?: string | null;
  seatIndex?: number;
  status?: string;
  streak?: number;
  userId?: string;
};

export type EchoApiHigherLowerTableResult = {
  fromCard?: EchoApiCard | null;
  message?: string;
  resolvedPlayers?: EchoApiHigherLowerTablePlayer[];
  toCard?: EchoApiCard | null;
};

export type EchoApiHigherLowerTable = {
  allPicked?: boolean;
  currentCard?: EchoApiCard | null;
  gameType?: 'higher_lower';
  hostDisplayName?: string;
  hostProfileId?: string;
  hostUserId?: string;
  id?: string;
  lastResult?: EchoApiHigherLowerTableResult | null;
  maxPlayers?: number;
  players: EchoApiHigherLowerTablePlayer[];
  previousCard?: EchoApiCard | null;
  profile?: EchoApiProfile;
  status: EchoApiHigherLowerTableStatus;
  tableId: string;
  timestamps?: {
    createdAt?: string;
    expiresAt?: string;
    updatedAt?: string;
  };
};

export type EchoApiHigherLowerTablesResponse = {
  tables: EchoApiHigherLowerTable[];
};

export type EchoApiHigherLowerTableResponse = {
  profile?: EchoApiProfile;
  status?: string;
  table?: EchoApiHigherLowerTable;
};

export type EchoApiInsideTrackPhase = 'betting' | 'racing' | 'results';

export type EchoApiInsideTrackBetType = 'place' | 'show' | 'win';

export type EchoApiInsideTrackCondition = {
  name: string;
  preference?: string;
  speedBias?: number;
  staminaBias?: number;
};

export type EchoApiInsideTrackHorse = {
  form?: string | string[];
  name: string;
  number: number;
  odds: number;
  placeOdds?: number;
  progress?: number;
  showOdds?: number;
  velocity?: number;
};

export type EchoApiInsideTrackTicket = {
  amount: number;
  betType: EchoApiInsideTrackBetType;
  feeAmount?: number;
  horseName: string;
  horseNumber: number;
  odds?: number;
  payout?: number;
  payoutMultiplier?: number;
  potentialMultiplier?: number;
  potentialPayout?: number;
  profit?: number;
  raceId: string;
  status?: 'active' | 'lost' | 'payout_failed' | 'refunded' | 'won';
  userDisplayName?: string;
  userId?: string;
};

export type EchoApiInsideTrackRace = {
  bettingClosesAt: string;
  commentary?: string[];
  finalOrder?: EchoApiInsideTrackHorse[];
  horses: EchoApiInsideTrackHorse[];
  isMajor?: boolean;
  leader?: EchoApiInsideTrackHorse | null;
  myTicket?: EchoApiInsideTrackTicket | null;
  nextRaceAt?: string;
  phase: EchoApiInsideTrackPhase;
  profile?: EchoApiProfile;
  raceEndsAt: string;
  raceId: string;
  raceName: string;
  raceNumber: number;
  raceStartsAt: string;
  tickets?: EchoApiInsideTrackTicket[];
  trackCondition: EchoApiInsideTrackCondition | string;
  type?: 'major' | 'standard';
};

export type EchoApiInsideTrackBetResponse = {
  profile: EchoApiProfile;
  race?: EchoApiInsideTrackRace;
  status: 'accepted';
  ticket: EchoApiInsideTrackTicket;
};

export type EchoApiGameConfig = {
  casino?: Record<string, unknown>;
  configVersion: string;
  cooldowns?: Record<string, unknown>;
  crime?: Record<string, unknown>;
  grind?: Record<string, unknown>;
  jobs?: Record<string, unknown>;
  lottery?: Record<string, unknown>;
  modifiers?: Record<string, unknown>;
  rituals?: Record<string, unknown>;
  xp?: Record<string, unknown>;
};

export type EchoApiRitual = {
  available: boolean;
  id: string;
  interactive: boolean;
  name: string;
  nextClaimAt: string | null;
  placement: 'other' | 'primary' | string;
  shortName?: string;
  unix: number | null;
};

export type EchoApiRitualsResponse = {
  configVersion: string;
  jailed: boolean;
  profile: EchoApiProfile;
  rituals: EchoApiRitual[];
};

export type EchoApiRitualClaimResponse = {
  configSource?: string;
  configVersion: string;
  cooldown?: {
    nextClaimAt: string;
    unix: number;
  };
  message: string;
  payout?: {
    baseAmount?: number;
    creditedAmount: number;
    finalAmount: number;
  };
  profile: EchoApiProfile;
  ritualId: string;
  status: 'claimed';
};

export type EchoApiRitualSessionStatus = 'abandoned' | 'active' | 'expired' | 'resolved' | string;

export type EchoApiRitualHistoryEntry = {
  correctSpot?: number;
  exact?: number;
  guess?: string;
  markers?: string[] | string;
  misplaced?: number;
  wrongSpot?: number;
};

export type EchoApiRitualSession = {
  availableActions?: string[];
  clues?: string[];
  correctOrder?: string[] | number[];
  correctPositions?: number;
  currentFragment?: number | null;
  expiresAt?: string | null;
  history?: EchoApiRitualHistoryEntry[];
  id?: string;
  lastFeedback?: string | null;
  lastSubmittedOrder?: string[] | null;
  message?: string;
  mistakesAllowed?: number;
  mistakesUsed?: number;
  names?: string[];
  payout?: number;
  placements?: (number | null)[];
  profile?: EchoApiProfile;
  result?: Record<string, unknown> | string | null;
  result_json?: Record<string, unknown> | null;
  ritualId?: string;
  scenario?: {
    id?: string;
    intro?: string;
    name?: string;
  };
  seatCount?: number;
  selectedCol?: number;
  selectedRow?: number;
  selectedTile?: number;
  session?: EchoApiRitualSession;
  sessionId?: string;
  state?: Record<string, unknown>;
  state_json?: Record<string, unknown>;
  status: EchoApiRitualSessionStatus;
  step?: number;
  strikeCol?: number;
  strikeRow?: number;
  submittedOrder?: string[];
};

export type EchoApiRitualSessionResponse = {
  configVersion?: string;
  message?: string;
  profile?: EchoApiProfile;
  session?: EchoApiRitualSession;
} & EchoApiRitualSession;

export type EchoApiRitualActionBody =
  | { action: 'choose_tile'; tile: number }
  | { action: 'give_up' }
  | { action: 'guess'; guess: string }
  | { action: 'place'; slot: number }
  | { action: 'spin' }
  | { action: 'submit'; order: string[] };

export type EchoApiBankLoan = {
  defaultAt?: string | null;
  dueAt?: string | null;
  fee?: number;
  id?: string;
  offerId?: string;
  offerName: string;
  principal?: number;
  remainingDue: number;
  status: 'active' | 'defaulted' | 'overdue' | 'paid';
  totalDue?: number;
};

export type EchoApiBankLoanOffer = {
  defaultAt?: string | null;
  description: string;
  dueDays?: number;
  fee: number;
  graceDays?: number;
  id: string;
  locked?: boolean;
  name: string;
  principal: number;
  requirement?: string | null;
  totalDue: number;
};

export type EchoApiRecurringDeposit = {
  amount: number;
  enabled: boolean;
  failedCount?: number;
  lastResult?: string | null;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
};

export type EchoApiBankDashboard = {
  account_number?: string | null;
  accountNumber: string | null;
  bankBalance: number;
  loan: EchoApiBankLoan | null;
  profile: EchoApiProfile;
  recurringDeposit: EchoApiRecurringDeposit | null;
  totalWealth: number;
  walletBalance: number;
};

export type EchoApiBankTransaction = {
  amount: number;
  createdAt: string;
  displayAmount?: number;
  id: string;
  meta?: Record<string, unknown>;
  type: string;
};

export type EchoApiBankTransactionsResponse = {
  transactions: EchoApiBankTransaction[];
};

export type EchoApiBankLoansResponse = {
  loan: EchoApiBankLoan | null;
  offers: EchoApiBankLoanOffer[];
  profile?: EchoApiProfile;
};

export type EchoApiBankMoveResponse = {
  accountNumber?: string | null;
  amount: number;
  bankBalance?: number;
  creditedAmount?: number;
  loanStatus?: string;
  profile: EchoApiProfile;
  recoveredAmount?: number;
  senderBankBalance?: number;
  status: 'deposited' | 'transferred' | 'withdrawn';
  toAccountNumber?: string;
  walletBalance?: number;
};

export type EchoApiLoanAcceptResponse = {
  loan: EchoApiBankLoan;
  profile: EchoApiProfile;
  status: 'approved';
};

export type EchoApiLoanRepayResponse = {
  loan: EchoApiBankLoan;
  paid: number;
  profile: EchoApiProfile;
  status: 'cleared' | 'paid';
};

export type EchoApiFarmSeason = {
  current?: string;
  name?: string;
  next?: string;
  nextSeason?: string;
  nextSeasonAt?: number | string | null;
};

export type EchoApiFarmWeather = {
  activeNow?: boolean;
  baseWeather?: string;
  event?: Record<string, unknown> | string | null;
  eventName?: string | null;
  forecast?: string;
  headline?: string;
  impact?: string;
  season?: string;
};

export type EchoApiFarmTask = {
  cropId?: string;
  endsAt?: number | string | null;
  key?: string;
  startedAt?: number | string | null;
};

export type EchoApiFarmField = {
  adultCount?: number;
  animalCount?: number;
  babies?: unknown[];
  capacity?: number;
  cropId?: string | null;
  cropWeatherEffect?: Record<string, unknown> | string | null;
  cultivated?: boolean;
  fieldCondition?: Record<string, unknown> | string | null;
  fertiliserApplications?: Record<string, unknown>;
  fertiliserStages?: Record<string, unknown>;
  kind?: 'barn' | string;
  lastCollectedAt?: number | string | null;
  lastCropFamily?: string | null;
  level?: number;
  livestockType?: string;
  plantedAt?: number | string | null;
  readyAt?: number | string | null;
  sameFamilyStreak?: number;
  soilHealth?: number;
  state?: 'empty' | 'growing' | 'ready' | 'spoiled' | string;
  task?: EchoApiFarmTask | null;
  weatherMeta?: Record<string, unknown>;
};

export type EchoApiFarmMachineLease = {
  expiresAt?: number | string | null;
  rentedAt?: number | string | null;
};

export type EchoApiFarmMachineBucket = {
  leases?: EchoApiFarmMachineLease[];
};

export type EchoApiFarmMachineState = {
  activeTasks?: EchoApiFarmTask[];
  owned?: Record<string, number>;
  rented?: Record<string, EchoApiFarmMachineBucket | number>;
};

export type EchoApiFarmInventoryItem = {
  itemId: string;
  name?: string;
  qty: number;
  totalValue?: number;
  unitPrice?: number;
};

export type EchoApiFarmData = {
  fertilisers?: Record<string, number>;
  fields?: EchoApiFarmField[];
  husbandry?: Record<string, number>;
};

export type EchoApiFarmingOverview = {
  config?: Record<string, unknown>;
  farm: EchoApiFarmData;
  machines?: EchoApiFarmMachineState;
  message?: string;
  nextFieldCost?: number;
  profile?: EchoApiProfile;
  season?: EchoApiFarmSeason;
  sellableInventory?: EchoApiFarmInventoryItem[];
  weather?: EchoApiFarmWeather;
};

export type EchoApiFarmingActionResponse = EchoApiFarmingOverview & {
  message: string;
};

export type EchoApiFarmingConfig = Record<string, unknown>;

export type DiscordLinkCodeResponse = {
  expiresAt: string;
  linkCode: string;
};

export type DiscordLinkStatusResponse = {
  profile: EchoApiProfile | null;
  sessionToken: string | null;
  status: 'expired' | 'linked' | 'pending';
};

type ApiOptions = {
  body?: unknown;
  method?: 'DELETE' | 'GET' | 'POST';
  signal?: AbortSignal;
  token?: string | null;
};

export class EchoApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.code = code;
    this.name = 'EchoApiError';
    this.status = status;
  }
}

const rawEchoApiBaseUrl = process.env.EXPO_PUBLIC_ECHO_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? '';
const webHostname = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : '';
const isHostedWeb =
  Platform.OS === 'web' &&
  !!webHostname &&
  !/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(webHostname);
const useVercelApiProxy = Platform.OS === 'web' && (process.env.NODE_ENV === 'production' || isHostedWeb);
const productionUnsafeApiUrl =
  !useVercelApiProxy &&
  process.env.NODE_ENV === 'production' &&
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(rawEchoApiBaseUrl);

export const echoApiBaseUrl = useVercelApiProxy ? '/echo-api' : productionUnsafeApiUrl ? '' : rawEchoApiBaseUrl.replace(/\/$/, '');
export const isEchoApiConfigured = echoApiBaseUrl.length > 0;
export const echoApiConfigError = productionUnsafeApiUrl
  ? 'Production API URL cannot use localhost or a loopback address.'
  : echoApiBaseUrl
    ? null
    : 'Echo API URL is not configured.';

const logApiFailure = (path: string, method: string, error: unknown) => {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.warn('[Echo API] request failed', {
    error,
    method,
    path,
    url: `${echoApiBaseUrl}${path}`,
  });
};

async function readError(response: Response) {
  const payload = await response.json().catch(() => null);

  if (payload && typeof payload === 'object' && 'message' in payload) {
    return String(payload.message);
  }

  return `Echo API request failed with HTTP ${response.status}`;
}

export async function echoApiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!isEchoApiConfigured) {
    throw new EchoApiError(echoApiConfigError ?? 'Railway API URL is not configured yet.', 0, 'API_NOT_CONFIGURED');
  }

  const hasBody = options.body !== undefined;
  const method = options.method ?? 'GET';

  try {
    const response = await fetch(`${echoApiBaseUrl}${path}`, {
      body: hasBody ? JSON.stringify(options.body) : undefined,
      headers: {
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      method,
      signal: options.signal,
    });

    if (!response.ok) {
      throw new EchoApiError(await readError(response), response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof EchoApiError) {
      logApiFailure(path, method, error);
      throw error;
    }

    logApiFailure(path, method, error);
    throw new EchoApiError(`Cannot reach Echo's Tale API. Please check your connection or try again.`, 0, 'NETWORK_ERROR');
  }
}

async function echoApiRequestAny<T>(paths: string[], options: ApiOptions = {}): Promise<T> {
  let lastNotFound: EchoApiError | null = null;

  for (const path of paths) {
    try {
      return await echoApiRequest<T>(path, options);
    } catch (error) {
      if (error instanceof EchoApiError && error.status === 404) {
        lastNotFound = error;
        continue;
      }

      throw error;
    }
  }

  throw lastNotFound ?? new EchoApiError('Echo API route was not found.', 404);
}

function higherLowerTablePaths(suffix = '') {
  return [
    `/v1/casino/higher-lower/tables${suffix}`,
    `/v1/casino/higherlower/tables${suffix}`,
    `/v1/casino/higher-or-lower/tables${suffix}`,
  ];
}

function blackjackTablePaths(suffix = '') {
  return [
    `/v1/casino/blackjack/tables${suffix}`,
    `/v1/casino/blackjack-table/tables${suffix}`,
  ];
}

function ritualStartPaths(ritualId: string) {
  const ids = Array.from(new Set([ritualId, ritualId.replace(/_/g, '-')]));

  if (ritualId === 'echo_arrangement') {
    ids.push('echo-seating');
  }

  return ids.map((id) => `/v1/rituals/${encodeURIComponent(id)}/start`);
}

export function createDiscordLinkCode() {
  return echoApiRequest<DiscordLinkCodeResponse>('/v1/link-codes?client=echo-mobile', {
    method: 'POST',
  });
}

export function checkDiscordLinkCode(linkCode: string, signal?: AbortSignal) {
  return echoApiRequest<DiscordLinkStatusResponse>(`/v1/link-codes/${encodeURIComponent(linkCode)}`, {
    signal,
  });
}

export function fetchEchoProfile(sessionToken: string, signal?: AbortSignal) {
  return echoApiRequest<EchoApiProfile>('/v1/me', {
    signal,
    token: sessionToken,
  });
}

export function startBlackjackRound(sessionToken: string, bet: number) {
  return echoApiRequest<EchoApiBlackjackRound>('/v1/casino/blackjack/start', {
    body: { bet },
    method: 'POST',
    token: sessionToken,
  });
}

export function hitBlackjackRound(sessionToken: string, gameId: string) {
  return echoApiRequest<EchoApiBlackjackRound>(`/v1/casino/blackjack/${encodeURIComponent(gameId)}/hit`, {
    method: 'POST',
    token: sessionToken,
  });
}

export function standBlackjackRound(sessionToken: string, gameId: string) {
  return echoApiRequest<EchoApiBlackjackRound>(`/v1/casino/blackjack/${encodeURIComponent(gameId)}/stand`, {
    method: 'POST',
    token: sessionToken,
  });
}

export function startHigherLowerRound(sessionToken: string, bet: number) {
  return echoApiRequest<EchoApiHigherLowerRound>('/v1/casino/higher-lower/start', {
    body: { bet },
    method: 'POST',
    token: sessionToken,
  });
}

export function guessHigherLowerRound(sessionToken: string, gameId: string, pick: 'higher' | 'lower' | 'same') {
  return echoApiRequest<EchoApiHigherLowerRound>(`/v1/casino/higher-lower/${encodeURIComponent(gameId)}/guess`, {
    body: { pick },
    method: 'POST',
    token: sessionToken,
  });
}

export function doubleBlackjackRound(sessionToken: string, gameId: string) {
  return echoApiRequest<EchoApiBlackjackRound>(`/v1/casino/blackjack/${encodeURIComponent(gameId)}/double`, {
    method: 'POST',
    token: sessionToken,
  });
}

export function splitBlackjackRound(sessionToken: string, gameId: string) {
  return echoApiRequest<EchoApiBlackjackRound>(`/v1/casino/blackjack/${encodeURIComponent(gameId)}/split`, {
    method: 'POST',
    token: sessionToken,
  });
}

export function cashOutHigherLowerRound(sessionToken: string, gameId: string) {
  return echoApiRequest<EchoApiHigherLowerRound>(`/v1/casino/higher-lower/${encodeURIComponent(gameId)}/cashout`, {
    method: 'POST',
    token: sessionToken,
  });
}

export function fetchHigherLowerTables(sessionToken: string, signal?: AbortSignal) {
  return echoApiRequestAny<EchoApiHigherLowerTablesResponse | EchoApiHigherLowerTable[]>(higherLowerTablePaths(), {
    signal,
    token: sessionToken,
  });
}

export function createHigherLowerTable(sessionToken: string) {
  return echoApiRequestAny<EchoApiHigherLowerTable | EchoApiHigherLowerTableResponse>(higherLowerTablePaths(), {
    body: { announceToDiscord: true, source: 'app' },
    method: 'POST',
    token: sessionToken,
  });
}

export function fetchHigherLowerTable(sessionToken: string, tableId: string, signal?: AbortSignal) {
  return echoApiRequestAny<EchoApiHigherLowerTable | EchoApiHigherLowerTableResponse>(
    higherLowerTablePaths(`/${encodeURIComponent(tableId)}`),
    {
      signal,
      token: sessionToken,
    }
  );
}

export function joinHigherLowerTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiHigherLowerTable | EchoApiHigherLowerTableResponse>(
    higherLowerTablePaths(`/${encodeURIComponent(tableId)}/join`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function leaveHigherLowerTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiHigherLowerTable | EchoApiHigherLowerTableResponse>(
    higherLowerTablePaths(`/${encodeURIComponent(tableId)}/leave`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function betHigherLowerTable(sessionToken: string, tableId: string, amount: number) {
  return echoApiRequestAny<EchoApiHigherLowerTable | EchoApiHigherLowerTableResponse>(
    higherLowerTablePaths(`/${encodeURIComponent(tableId)}/bet`),
    {
      body: { amount },
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function startHigherLowerTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiHigherLowerTable | EchoApiHigherLowerTableResponse>(
    higherLowerTablePaths(`/${encodeURIComponent(tableId)}/start`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function guessHigherLowerTable(sessionToken: string, tableId: string, pick: 'higher' | 'lower' | 'same') {
  return echoApiRequestAny<EchoApiHigherLowerTable | EchoApiHigherLowerTableResponse>(
    higherLowerTablePaths(`/${encodeURIComponent(tableId)}/guess`),
    {
      body: { pick },
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function cashOutHigherLowerTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiHigherLowerTable | EchoApiHigherLowerTableResponse>(
    higherLowerTablePaths(`/${encodeURIComponent(tableId)}/cashout`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function fetchBlackjackTables(sessionToken: string, signal?: AbortSignal) {
  return echoApiRequestAny<EchoApiBlackjackTablesResponse | EchoApiBlackjackTable[]>(blackjackTablePaths(), {
    signal,
    token: sessionToken,
  });
}

export function createBlackjackTable(sessionToken: string) {
  return echoApiRequestAny<EchoApiBlackjackTable | EchoApiBlackjackTableResponse>(blackjackTablePaths(), {
    body: { announceToDiscord: true, source: 'app' },
    method: 'POST',
    token: sessionToken,
  });
}

export function fetchBlackjackTable(sessionToken: string, tableId: string, signal?: AbortSignal) {
  return echoApiRequestAny<EchoApiBlackjackTable | EchoApiBlackjackTableResponse>(
    blackjackTablePaths(`/${encodeURIComponent(tableId)}`),
    {
      signal,
      token: sessionToken,
    }
  );
}

export function joinBlackjackTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiBlackjackTable | EchoApiBlackjackTableResponse>(
    blackjackTablePaths(`/${encodeURIComponent(tableId)}/join`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function leaveBlackjackTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiBlackjackTable | EchoApiBlackjackTableResponse>(
    blackjackTablePaths(`/${encodeURIComponent(tableId)}/leave`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function betBlackjackTable(sessionToken: string, tableId: string, amount: number) {
  return echoApiRequestAny<EchoApiBlackjackTable | EchoApiBlackjackTableResponse>(
    blackjackTablePaths(`/${encodeURIComponent(tableId)}/bet`),
    {
      body: { amount },
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function startBlackjackTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiBlackjackTable | EchoApiBlackjackTableResponse>(
    blackjackTablePaths(`/${encodeURIComponent(tableId)}/start`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function hitBlackjackTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiBlackjackTable | EchoApiBlackjackTableResponse>(
    blackjackTablePaths(`/${encodeURIComponent(tableId)}/hit`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function standBlackjackTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiBlackjackTable | EchoApiBlackjackTableResponse>(
    blackjackTablePaths(`/${encodeURIComponent(tableId)}/stand`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function doubleBlackjackTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiBlackjackTable | EchoApiBlackjackTableResponse>(
    blackjackTablePaths(`/${encodeURIComponent(tableId)}/double`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function splitBlackjackTable(sessionToken: string, tableId: string) {
  return echoApiRequestAny<EchoApiBlackjackTable | EchoApiBlackjackTableResponse>(
    blackjackTablePaths(`/${encodeURIComponent(tableId)}/split`),
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function fetchInsideTrackCurrent(sessionToken: string, signal?: AbortSignal) {
  return echoApiRequest<EchoApiInsideTrackRace>('/v1/casino/inside-track/current', {
    signal,
    token: sessionToken,
  });
}

export function placeInsideTrackBet(
  sessionToken: string,
  bet: { amount: number; betType: EchoApiInsideTrackBetType; horseNumber: number; raceId: string }
) {
  return echoApiRequest<EchoApiInsideTrackBetResponse>('/v1/casino/inside-track/bet', {
    body: bet,
    method: 'POST',
    token: sessionToken,
  });
}

export function fetchGameConfig(sessionToken?: string | null, signal?: AbortSignal) {
  return echoApiRequest<EchoApiGameConfig>('/v1/game-config', {
    signal,
    token: sessionToken,
  });
}

export function fetchRituals(sessionToken: string, signal?: AbortSignal) {
  return echoApiRequest<EchoApiRitualsResponse>('/v1/rituals', {
    signal,
    token: sessionToken,
  });
}

export function claimRitual(sessionToken: string, ritualId: string) {
  return echoApiRequest<EchoApiRitualClaimResponse>(`/v1/rituals/${encodeURIComponent(ritualId)}/claim`, {
    method: 'POST',
    token: sessionToken,
  });
}

export function startRitualSession(sessionToken: string, ritualId: string) {
  return echoApiRequestAny<EchoApiRitualSessionResponse>(ritualStartPaths(ritualId), {
    method: 'POST',
    token: sessionToken,
  });
}

export function fetchRitualSession(sessionToken: string, sessionId: string, signal?: AbortSignal) {
  return echoApiRequest<EchoApiRitualSessionResponse>(`/v1/rituals/sessions/${encodeURIComponent(sessionId)}`, {
    signal,
    token: sessionToken,
  });
}

export function sendRitualSessionAction(sessionToken: string, sessionId: string, body: EchoApiRitualActionBody) {
  return echoApiRequest<EchoApiRitualSessionResponse>(`/v1/rituals/sessions/${encodeURIComponent(sessionId)}/action`, {
    body,
    method: 'POST',
    token: sessionToken,
  });
}

export function fetchBankDashboard(sessionToken: string, signal?: AbortSignal) {
  return echoApiRequest<EchoApiBankDashboard>('/v1/bank', {
    signal,
    token: sessionToken,
  });
}

export function depositBankFunds(sessionToken: string, amount: number | 'all') {
  return echoApiRequest<EchoApiBankMoveResponse>('/v1/bank/deposit', {
    body: { amount },
    method: 'POST',
    token: sessionToken,
  });
}

export function withdrawBankFunds(sessionToken: string, amount: number | 'all') {
  return echoApiRequest<EchoApiBankMoveResponse>('/v1/bank/withdraw', {
    body: { amount },
    method: 'POST',
    token: sessionToken,
  });
}

export function transferBankFunds(sessionToken: string, accountNumber: string, amount: number) {
  return echoApiRequest<EchoApiBankMoveResponse>('/v1/bank/transfer', {
    body: { accountNumber, amount },
    method: 'POST',
    token: sessionToken,
  });
}

export function fetchBankTransactions(sessionToken: string, signal?: AbortSignal) {
  return echoApiRequest<EchoApiBankTransactionsResponse>('/v1/bank/transactions', {
    signal,
    token: sessionToken,
  });
}

export function fetchBankLoans(sessionToken: string, signal?: AbortSignal) {
  return echoApiRequest<EchoApiBankLoansResponse>('/v1/bank/loans', {
    signal,
    token: sessionToken,
  });
}

export function acceptBankLoan(sessionToken: string, offerId: string) {
  return echoApiRequest<EchoApiLoanAcceptResponse>(`/v1/bank/loans/${encodeURIComponent(offerId)}/accept`, {
    method: 'POST',
    token: sessionToken,
  });
}

export function repayBankLoan(sessionToken: string, amount: number | 'all') {
  return echoApiRequest<EchoApiLoanRepayResponse>('/v1/bank/loans/repay', {
    body: { amount },
    method: 'POST',
    token: sessionToken,
  });
}

export function setRecurringDeposit(sessionToken: string, amount: number) {
  return echoApiRequest<EchoApiRecurringDeposit>('/v1/bank/recurring-deposit', {
    body: { amount },
    method: 'POST',
    token: sessionToken,
  });
}

export function disableRecurringDeposit(sessionToken: string) {
  return echoApiRequest<EchoApiRecurringDeposit>('/v1/bank/recurring-deposit', {
    method: 'DELETE',
    token: sessionToken,
  });
}

export function fetchFarmingOverview(sessionToken: string, signal?: AbortSignal) {
  return echoApiRequest<EchoApiFarmingOverview>('/v1/enterprises/farming', {
    signal,
    token: sessionToken,
  });
}

export function fetchFarmingConfig(sessionToken: string, signal?: AbortSignal) {
  return echoApiRequest<EchoApiFarmingConfig>('/v1/enterprises/farming/config', {
    signal,
    token: sessionToken,
  });
}

export function buyFarmingField(sessionToken: string) {
  return echoApiRequest<EchoApiFarmingActionResponse>('/v1/enterprises/farming/fields', {
    method: 'POST',
    token: sessionToken,
  });
}

export function startFarmingFieldAction(
  sessionToken: string,
  fieldIndex: number,
  action: 'cultivate' | 'harvest' | 'rest' | 'upgrade'
) {
  return echoApiRequest<EchoApiFarmingActionResponse>(
    `/v1/enterprises/farming/fields/${encodeURIComponent(String(fieldIndex))}/${action}`,
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function plantFarmingCrop(sessionToken: string, fieldIndex: number, cropId: string) {
  return echoApiRequest<EchoApiFarmingActionResponse>(
    `/v1/enterprises/farming/fields/${encodeURIComponent(String(fieldIndex))}/plant`,
    {
      body: { cropId },
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function fertiliseFarmingField(sessionToken: string, fieldIndex: number, fertiliserId: string) {
  return echoApiRequest<EchoApiFarmingActionResponse>(
    `/v1/enterprises/farming/fields/${encodeURIComponent(String(fieldIndex))}/fertilise`,
    {
      body: { fertiliserId },
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function convertFarmingBarn(sessionToken: string, fieldIndex: number, livestockType: string) {
  return echoApiRequest<EchoApiFarmingActionResponse>(
    `/v1/enterprises/farming/fields/${encodeURIComponent(String(fieldIndex))}/convert-barn`,
    {
      body: { livestockType },
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function startFarmingBarnAction(
  sessionToken: string,
  fieldIndex: number,
  action: 'collect' | 'demolish' | 'restock' | 'slaughter' | 'slaughter-elderly' | 'upgrade'
) {
  return echoApiRequest<EchoApiFarmingActionResponse>(
    `/v1/enterprises/farming/barns/${encodeURIComponent(String(fieldIndex))}/${action}`,
    {
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function breedFarmingBarn(sessionToken: string, fieldIndex: number, itemId: string) {
  return echoApiRequest<EchoApiFarmingActionResponse>(
    `/v1/enterprises/farming/barns/${encodeURIComponent(String(fieldIndex))}/breed`,
    {
      body: { itemId },
      method: 'POST',
      token: sessionToken,
    }
  );
}

export function buyFarmingStoreItem(
  sessionToken: string,
  bucket: 'fertiliser' | 'husbandry',
  itemId: string,
  qty: number
) {
  const body = bucket === 'fertiliser' ? { fertiliserId: itemId, qty } : { itemId, qty };

  return echoApiRequest<EchoApiFarmingActionResponse>(`/v1/enterprises/farming/store/${bucket}`, {
    body,
    method: 'POST',
    token: sessionToken,
  });
}

export function startFarmingMachineAction(
  sessionToken: string,
  action: 'buy' | 'rent' | 'sell',
  machineId: string
) {
  return echoApiRequest<EchoApiFarmingActionResponse>(`/v1/enterprises/farming/machines/${action}`, {
    body: { machineId },
    method: 'POST',
    token: sessionToken,
  });
}

export function sellFarmingMarketItem(sessionToken: string, itemId: string) {
  return echoApiRequest<EchoApiFarmingActionResponse>('/v1/enterprises/farming/market/sell', {
    body: { itemId },
    method: 'POST',
    token: sessionToken,
  });
}
