export type EchoApiProfile = {
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
  method?: 'GET' | 'POST';
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
