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
  trackCondition: EchoApiInsideTrackCondition | string;
  type?: 'major' | 'standard';
};

export type EchoApiInsideTrackBetResponse = {
  profile: EchoApiProfile;
  race?: EchoApiInsideTrackRace;
  status: 'accepted';
  ticket: EchoApiInsideTrackTicket;
};

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

export const echoApiBaseUrl = process.env.EXPO_PUBLIC_ECHO_API_URL?.replace(/\/$/, '') ?? '';
export const isEchoApiConfigured = echoApiBaseUrl.length > 0;

async function readError(response: Response) {
  const payload = await response.json().catch(() => null);

  if (payload && typeof payload === 'object' && 'message' in payload) {
    return String(payload.message);
  }

  return `Echo API request failed with HTTP ${response.status}`;
}

export async function echoApiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!isEchoApiConfigured) {
    throw new EchoApiError('Railway API URL is not configured yet.', 0, 'API_NOT_CONFIGURED');
  }

  try {
    const response = await fetch(`${echoApiBaseUrl}${path}`, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      method: options.method ?? 'GET',
      signal: options.signal,
    });

    if (!response.ok) {
      throw new EchoApiError(await readError(response), response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof EchoApiError) {
      throw error;
    }

    throw new EchoApiError('Could not reach the Railway API.', 0, 'NETWORK_ERROR');
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

export function createDiscordLinkCode() {
  return echoApiRequest<DiscordLinkCodeResponse>('/v1/link-codes', {
    body: { client: 'echo-mobile' },
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
