import botPools from '@/services/content/bot-pools.json';

export type ScratchCardTier = 'pocket' | 'lucky' | 'cursed';
export type ScratchSymbol = 'cash' | 'clover' | 'diamond' | 'eye' | 'fire' | 'skull' | 'star';
export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type CardSuit = 'Clubs' | 'Diamonds' | 'Hearts' | 'Spades';
export type HigherLowerPick = 'higher' | 'lower' | 'same';
export type RouletteBetType = 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' | 'number';
export type KenoBetType = 'heads' | 'tails' | 'draw' | 'quickpick';
export type TrackBetType = 'win' | 'place' | 'show';
export type BlackjackMove = 'hit' | 'stand';

export type CasinoCard = {
  rank: CardRank;
  suit: CardSuit;
};

export type HigherLowerSession = {
  bet: number;
  currentCard: CasinoCard;
  deck: CasinoCard[];
  lastCard: CasinoCard | null;
  lastPick: HigherLowerPick | null;
  payout: number;
  status: 'playing' | 'cashed' | 'busted';
  streak: number;
};

export type RouletteResult = {
  message: string;
  multiplier: number;
  payout: number;
  pocket: number;
  won: boolean;
};

export type BlackjackSession = {
  bet: number;
  dealer: CasinoCard[];
  deck: CasinoCard[];
  message: string;
  payout: number;
  player: CasinoCard[];
  status: 'playing' | 'stood' | 'resolved';
};

export type KenoResult = {
  drawn: number[];
  heads: number;
  hits: number;
  message: string;
  payout: number;
  tails: number;
  ticket: number[];
  won: boolean;
};

export type TrackHorse = {
  name: string;
  number: number;
  odds: number;
  form: string;
};

export type TrackRace = {
  condition: string;
  horses: TrackHorse[];
  name: string;
};

export type TrackResult = {
  message: string;
  order: TrackHorse[];
  payout: number;
  won: boolean;
};

export type BullshitResult = {
  message: string;
  payout: number;
  survived: boolean;
  tableRank: CardRank;
};

export type ScratchCardConfig = {
  cost: number;
  id: ScratchCardTier;
  name: string;
  style: string;
  symbols: ScratchSymbol[];
};

export type ScratchCardSession = {
  board: ScratchSymbol[];
  config: ScratchCardConfig;
  revealed: number[];
  result: ScratchCardResult | null;
  status: 'scratching' | 'resolved';
};

export type ScratchCardResult = {
  bestCount: number;
  bestSymbol: ScratchSymbol | null;
  message: string;
  payout: number;
};

export const scratchCardConfigs: ScratchCardConfig[] = [
  {
    cost: 500,
    id: 'pocket',
    name: 'Pocket Scratch',
    style: 'Stable, cheap, friendlier odds.',
    symbols: ['cash', 'clover', 'star', 'skull', 'eye'],
  },
  {
    cost: 1_500,
    id: 'lucky',
    name: 'Lucky Lines',
    style: 'Balanced, mid-risk, better payouts.',
    symbols: ['cash', 'clover', 'diamond', 'star', 'skull', 'eye'],
  },
  {
    cost: 3_000,
    id: 'cursed',
    name: 'Cursed Card',
    style: 'Swingy, chaotic, Echo-touched.',
    symbols: ['cash', 'clover', 'diamond', 'fire', 'skull', 'eye'],
  },
];

const payoutTables: Record<ScratchCardTier, Partial<Record<ScratchSymbol, Record<number, number>>>> = {
  pocket: {
    cash: { 3: 700, 4: 950, 5: 1_200 },
    clover: { 3: 850, 4: 1_100, 5: 1_450 },
    eye: { 3: 900, 4: 1_300, 5: 1_800 },
    star: { 3: 1_000, 4: 1_300, 5: 1_700 },
  },
  lucky: {
    cash: { 3: 2_100, 4: 2_800, 5: 3_600 },
    clover: { 3: 2_400, 4: 3_200, 5: 4_200 },
    diamond: { 3: 3_300, 4: 4_700, 5: 6_200 },
    eye: { 3: 2_500, 4: 3_600, 5: 5_200 },
    star: { 3: 2_600, 4: 3_500, 5: 4_700 },
  },
  cursed: {
    cash: { 3: 4_300, 4: 5_400, 5: 7_000 },
    clover: { 3: 4_700, 4: 6_100, 5: 7_900 },
    diamond: { 3: 6_200, 4: 8_500, 5: 11_000 },
    eye: { 3: 5_600, 4: 7_800, 5: 9_800 },
    fire: { 3: 5_200, 4: 7_000, 5: 9_200 },
  },
};

function rollBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pickFromPool<T>(pool: T[]) {
  return pool[rollBetween(0, pool.length - 1)];
}

function pickUnique<T>(pool: T[], count: number) {
  const copy = [...pool];
  const picked: T[] = [];

  while (picked.length < count && copy.length > 0) {
    const index = rollBetween(0, copy.length - 1);
    const [item] = copy.splice(index, 1);
    picked.push(item);
  }

  return picked;
}

const ranks: CardRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const suits: CardSuit[] = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];

const rankValues: Record<CardRank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function formatCard(card: CasinoCard) {
  return `${card.rank} of ${card.suit}`;
}

function createDeck() {
  return ranks.flatMap((rank) => suits.map((suit) => ({ rank, suit })));
}

function drawCard(deck: CasinoCard[]) {
  const nextDeck = [...deck];
  const index = rollBetween(0, nextDeck.length - 1);
  const [card] = nextDeck.splice(index, 1);

  return { card, deck: nextDeck };
}

export function startHigherLower(bet: number): HigherLowerSession {
  const firstDraw = drawCard(createDeck());

  return {
    bet,
    currentCard: firstDraw.card,
    deck: firstDraw.deck,
    lastCard: null,
    lastPick: null,
    payout: 0,
    status: 'playing',
    streak: 0,
  };
}

export function pickHigherLower(session: HigherLowerSession, pick: HigherLowerPick): HigherLowerSession {
  if (session.status !== 'playing') {
    return session;
  }

  const nextDraw = drawCard(session.deck.length > 0 ? session.deck : createDeck());
  const currentValue = rankValues[session.currentCard.rank];
  const nextValue = rankValues[nextDraw.card.rank];
  const won =
    (pick === 'higher' && nextValue > currentValue) ||
    (pick === 'lower' && nextValue < currentValue) ||
    (pick === 'same' && nextValue === currentValue);

  if (!won) {
    return {
      ...session,
      deck: nextDraw.deck,
      lastCard: nextDraw.card,
      lastPick: pick,
      payout: 0,
      status: 'busted',
    };
  }

  return {
    ...session,
    currentCard: nextDraw.card,
    deck: nextDraw.deck,
    lastCard: nextDraw.card,
    lastPick: pick,
    streak: session.streak + 1,
  };
}

export function cashOutHigherLower(session: HigherLowerSession): HigherLowerSession {
  const multiplier = Math.min(10, 1 + session.streak * 0.5);

  return {
    ...session,
    payout: Math.floor(session.bet * multiplier),
    status: 'cashed',
  };
}

const rouletteReds = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function spinRoulette(amount: number, type: RouletteBetType, value?: number): RouletteResult {
  const pocket = rollBetween(0, 36);
  const isRed = rouletteReds.has(pocket);
  const isBlack = pocket !== 0 && !isRed;
  const won =
    (type === 'red' && isRed) ||
    (type === 'black' && isBlack) ||
    (type === 'odd' && pocket !== 0 && pocket % 2 === 1) ||
    (type === 'even' && pocket !== 0 && pocket % 2 === 0) ||
    (type === 'low' && pocket >= 1 && pocket <= 18) ||
    (type === 'high' && pocket >= 19 && pocket <= 36) ||
    (type === 'number' && pocket === value);
  const multiplier = type === 'number' ? 36 : 2;
  const payout = won ? Math.floor(amount * multiplier) : 0;

  return {
    message: won
      ? `Roulette landed ${pocket}. The table paid ${payout.toLocaleString()} and looked annoyed.`
      : `Roulette landed ${pocket}. Your chips joined the house pool.`,
    multiplier,
    payout,
    pocket,
    won,
  };
}

const blackjackValue = (cards: CasinoCard[]) => {
  let total = 0;
  let aces = 0;

  cards.forEach((card) => {
    if (card.rank === 'A') {
      aces += 1;
      total += 11;
      return;
    }

    total += ['J', 'Q', 'K'].includes(card.rank) ? 10 : Number(card.rank);
  });

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
};

export function getBlackjackValue(cards: CasinoCard[]) {
  return blackjackValue(cards);
}

export function startBlackjack(bet: number): BlackjackSession {
  let deck = createDeck();
  const playerFirst = drawCard(deck);
  deck = playerFirst.deck;
  const dealerFirst = drawCard(deck);
  deck = dealerFirst.deck;
  const playerSecond = drawCard(deck);
  deck = playerSecond.deck;
  const dealerSecond = drawCard(deck);

  return {
    bet,
    dealer: [dealerFirst.card, dealerSecond.card],
    deck: dealerSecond.deck,
    message: 'Cards dealt. The dealer is pretending this is routine.',
    payout: 0,
    player: [playerFirst.card, playerSecond.card],
    status: 'playing',
  };
}

export function hitBlackjack(session: BlackjackSession): BlackjackSession {
  if (session.status !== 'playing') {
    return session;
  }

  const nextDraw = drawCard(session.deck);
  const player = [...session.player, nextDraw.card];

  if (blackjackValue(player) > 21) {
    return {
      ...session,
      deck: nextDraw.deck,
      message: 'Bust. The dealer swept the chips like it had practiced.',
      player,
      status: 'resolved',
    };
  }

  return { ...session, deck: nextDraw.deck, player };
}

export function standBlackjack(session: BlackjackSession): BlackjackSession {
  let deck = session.deck;
  let dealer = [...session.dealer];

  while (blackjackValue(dealer) < 17) {
    const nextDraw = drawCard(deck);
    dealer = [...dealer, nextDraw.card];
    deck = nextDraw.deck;
  }

  const playerValue = blackjackValue(session.player);
  const dealerValue = blackjackValue(dealer);
  const playerBlackjack = session.player.length === 2 && playerValue === 21;
  const payout =
    dealerValue > 21 || playerValue > dealerValue
      ? Math.floor(session.bet * (playerBlackjack ? 2.5 : 2))
      : playerValue === dealerValue
        ? session.bet
        : 0;

  return {
    ...session,
    dealer,
    deck,
    message:
      payout > session.bet
        ? `Blackjack paid ${payout.toLocaleString()}. The dealer became very still.`
        : payout === session.bet
          ? 'Push. Your stake wandered back looking tired.'
          : 'Dealer wins. The felt made a quiet little meal of it.',
    payout,
    status: 'resolved',
  };
}

function sampleNumbers(count: number, max: number) {
  const pool = Array.from({ length: max }, (_, index) => index + 1);
  const picked: number[] = [];

  while (picked.length < count) {
    const index = rollBetween(0, pool.length - 1);
    const [number] = pool.splice(index, 1);
    picked.push(number);
  }

  return picked.sort((a, b) => a - b);
}

const kenoPayouts: Record<number, Record<number, number>> = {
  1: { 1: 3.5 },
  2: { 1: 1, 2: 10 },
  3: { 2: 2, 3: 25 },
  4: { 2: 1, 3: 5, 4: 75 },
  5: { 3: 2, 4: 15, 5: 250 },
  6: { 3: 1, 4: 5, 5: 50, 6: 800 },
  7: { 4: 2, 5: 15, 6: 120, 7: 2000 },
  8: { 4: 2, 5: 10, 6: 50, 7: 400, 8: 5000 },
  9: { 4: 1, 5: 5, 6: 25, 7: 120, 8: 1000, 9: 10000 },
  10: { 4: 1, 5: 5, 6: 20, 7: 80, 8: 400, 9: 2500, 10: 25000 },
};

export function playKeno(amount: number, type: KenoBetType, markedTicket?: number[]): KenoResult {
  const drawn = sampleNumbers(20, 80);
  const heads = drawn.filter((number) => number <= 40).length;
  const tails = 20 - heads;
  const ticket = type === 'quickpick' ? [...(markedTicket ?? [])].sort((a, b) => a - b) : [];
  const hits = ticket.filter((number) => drawn.includes(number)).length;
  const htdWon =
    (type === 'heads' && heads >= 11) ||
    (type === 'tails' && tails >= 11) ||
    (type === 'draw' && heads === 10);
  const multiplier = type === 'quickpick' ? (kenoPayouts[ticket.length]?.[hits] ?? 0) : type === 'draw' ? 4 : 2;
  const won = type === 'quickpick' ? multiplier > 0 : htdWon;
  const payout = won ? amount * multiplier : 0;

  return {
    drawn,
    heads,
    hits,
    message:
      payout > 0
        ? `Keno paid ${payout.toLocaleString()}. ${heads} heads, ${tails} tails, and several numbers felt accused.`
        : `Keno drew ${heads} heads and ${tails} tails. The board kept your bet.`,
    payout,
    tails,
    ticket,
    won,
  };
}

const fallbackHorseNames = [
  'Rent Due',
  'Tax Whisper',
  'Bad Omen',
  'Lucky Invoice',
  'Night Receipt',
  'Fast Regret',
  'Velvet Fine',
  'Echo Downs',
];

const fallbackTrackConditions = ['Dry', 'Fast', 'Wet', 'Muddy', 'Heavy', 'Windy', 'Night Race'];
const botInsideTrack = botPools.insideTrack as {
  formLines: Record<string, string[]>;
  horseNames: string[];
  majorRaces: string[];
  trackConditions: string[];
};

function getInsideTrackForm() {
  const formPools = Object.values(botInsideTrack.formLines ?? {}).filter((pool) => pool.length > 0);
  const formLine = formPools.length > 0 ? pickFromPool(pickFromPool(formPools)) : null;

  return formLine
    ? `${formLine}. Form ${rollBetween(1, 9)}-${rollBetween(1, 9)}-${rollBetween(1, 9)}`
    : `${rollBetween(1, 9)}-${rollBetween(1, 9)}-${rollBetween(1, 9)}`;
}

export function createInsideTrackRace(): TrackRace {
  const horseNamePool = botInsideTrack.horseNames.length > 0 ? botInsideTrack.horseNames : fallbackHorseNames;
  const conditions =
    botInsideTrack.trackConditions.length > 0 ? botInsideTrack.trackConditions : fallbackTrackConditions;
  const selectedHorseNames = pickUnique(horseNamePool, 6);
  const horses = Array.from({ length: 6 }, (_, index) => ({
    form: getInsideTrackForm(),
    name: selectedHorseNames[index] ?? fallbackHorseNames[index],
    number: index + 1,
    odds: Number((1.4 + Math.random() * 10.6).toFixed(2)),
  }));
  const isMajorRace = botInsideTrack.majorRaces.length > 0 && Math.random() < 0.08;

  return {
    condition: pickFromPool(conditions),
    horses,
    name: isMajorRace ? pickFromPool(botInsideTrack.majorRaces) : `Echo Downs Race ${rollBetween(10, 99)}`,
  };
}

export function runInsideTrack(race: TrackRace, amount: number, horseNumber: number, betType: TrackBetType): TrackResult {
  const order = [...race.horses].sort(() => Math.random() - 0.5);
  const place = order.findIndex((horse) => horse.number === horseNumber) + 1;
  const horse = race.horses.find((entry) => entry.number === horseNumber) ?? race.horses[0];
  const won =
    (betType === 'win' && place === 1) ||
    (betType === 'place' && place <= 2) ||
    (betType === 'show' && place <= 3);
  const factor = betType === 'win' ? 1 : betType === 'place' ? 0.45 : 0.25;
  const payout = won ? Math.floor(amount * horse.odds * factor) : 0;

  return {
    message: won
      ? `${horse.name} finished ${place}. Inside Track paid ${payout.toLocaleString()}.`
      : `${horse.name} finished ${place}. Echo Downs swallowed the ticket.`,
    order,
    payout,
    won,
  };
}

export function playBullshit(buyIn: number): BullshitResult {
  const tableRank = ranks[rollBetween(0, ranks.length - 1)];
  const toldTruth = Math.random() > 0.46;
  const called = Math.random() > 0.42;
  const survived = !called || toldTruth || Math.random() > 0.35;
  const payout = survived && Math.random() > 0.45 ? buyIn * rollBetween(3, 5) : 0;

  return {
    message:
      payout > 0
        ? `Bullshit table rank was ${tableRank}. You sold the lie and took ${payout.toLocaleString()} from the pot.`
        : survived
          ? `Bullshit table rank was ${tableRank}. You survived the call, but the pot escaped.`
          : `Bullshit table rank was ${tableRank}. The call went badly. Chair empty, pot gone.`,
    payout,
    survived,
    tableRank,
  };
}

function countSymbols(board: ScratchSymbol[]) {
  return board.reduce(
    (counts, symbol) => ({
      ...counts,
      [symbol]: (counts[symbol] ?? 0) + 1,
    }),
    {} as Partial<Record<ScratchSymbol, number>>
  );
}

export function startScratchCard(config: ScratchCardConfig): ScratchCardSession {
  const board = Array.from({ length: 9 }, () => config.symbols[rollBetween(0, config.symbols.length - 1)]);

  return {
    board,
    config,
    revealed: [],
    result: null,
    status: 'scratching',
  };
}

export function revealScratchTile(session: ScratchCardSession, index: number): ScratchCardSession {
  if (session.status !== 'scratching' || session.revealed.includes(index)) {
    return session;
  }

  const revealed = [...session.revealed, index];

  if (revealed.length === session.board.length) {
    const result = resolveScratchCard({ ...session, revealed });
    return { ...session, revealed, result, status: 'resolved' };
  }

  return { ...session, revealed };
}

export function revealAllScratchTiles(session: ScratchCardSession): ScratchCardSession {
  const revealed = session.board.map((_, index) => index);
  const result = resolveScratchCard({ ...session, revealed });

  return { ...session, revealed, result, status: 'resolved' };
}

function resolveScratchCard(session: ScratchCardSession): ScratchCardResult {
  const counts = countSymbols(session.board);
  let bestSymbol: ScratchSymbol | null = null;
  let bestCount = 0;
  let payout = 0;

  for (const [symbol, count] of Object.entries(counts) as [ScratchSymbol, number][]) {
    const table = payoutTables[session.config.id][symbol];
    const cappedCount = Math.min(5, count);
    const symbolPayout = table?.[cappedCount] ?? 0;

    if (symbolPayout > payout) {
      bestSymbol = symbol;
      bestCount = count;
      payout = symbolPayout;
    }
  }

  const eyeCount = counts.eye ?? 0;
  const cloverCount = counts.clover ?? 0;
  const fireCount = counts.fire ?? 0;
  const skullCount = counts.skull ?? 0;

  if (session.config.id === 'pocket' && payout > 0 && eyeCount >= 3) {
    payout += 250;
  }

  if (session.config.id === 'lucky' && payout > 0 && cloverCount >= 2) {
    payout += 300;
  }

  if (session.config.id === 'cursed') {
    if (payout > 0 && fireCount >= 2 && Math.random() < 0.35) {
      payout += 900;
    }

    if (payout > 0 && skullCount >= 2 && Math.random() < 0.28) {
      payout = Math.max(0, payout - 1_200);
    }

    if (payout <= 0 && eyeCount >= 3 && Math.random() < 0.12) {
      bestSymbol = 'eye';
      bestCount = eyeCount;
      payout = 4_500;
    }
  }

  return {
    bestCount,
    bestSymbol,
    message:
      payout > 0
        ? `${session.config.name} paid ${payout.toLocaleString()}. The card made eye contact.`
        : `${session.config.name} paid nothing. The card did not apologise.`,
    payout,
  };
}
