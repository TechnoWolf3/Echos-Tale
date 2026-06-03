import botPools from '@/services/content/bot-pools.json';

export type SkillColor = 'Red' | 'Blue' | 'Green' | 'Yellow';

export type SkillCheckSession = {
  expiresAt: number;
  input: SkillColor[];
  pattern: SkillColor[];
  revealUntil: number;
  startedAt: number;
  status: 'memorise' | 'repeat' | 'resolved';
};

export type SkillCheckResult = {
  message: string;
  payout: number;
  success: boolean;
  xp: number;
};

export type EmailFolder = 'Urgent' | 'To-Do' | 'Spam' | 'Scam';

export type JobEmail = {
  body: string;
  category: EmailFolder;
  familyKey: string;
  from: string;
  id: string;
  subject: string;
};

export type EmailSortResult = {
  actual: EmailFolder;
  chosen: EmailFolder;
  emailId: string;
  outcome: 'correct' | 'incorrect' | 'compromised' | 'penalty';
  penalty: number;
  subject: string;
};

export type EmailSorterSession = {
  currentIndex: number;
  emails: JobEmail[];
  results: EmailSortResult[];
  status: 'sorting' | 'resolved';
};

export type EmailSorterResolution = {
  failed: boolean;
  message: string;
  payout: number;
  results: EmailSortResult[];
  xp: number;
};

type EmailTemplateFamily = {
  fromPool: string[];
  key: string;
  paragraph1Pool: string[];
  paragraph2Pool: string[];
  signoffPool: string[];
  subjectPool: string[];
};

type BotTruckerFreight = {
  category: string;
  name: string;
  payoutModifier: number;
};

type BotTruckerPools = {
  freightPool: BotTruckerFreight[];
  manifestLines: string[];
  routes: { distanceKm: number; route: string }[];
  trailerConfigs: Record<string, string[]>;
};

const botEmailTemplates = botPools.emailTemplates as Record<EmailFolder, EmailTemplateFamily[]>;
const botTruckerPools = botPools.trucker as BotTruckerPools;

const skillColors: SkillColor[] = ['Red', 'Blue', 'Green', 'Yellow'];

function rollBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pickFromPool<T>(pool: T[]) {
  return pool[rollBetween(0, pool.length - 1)];
}

function getJobMultiplier(level: number) {
  return Math.min(1.6, 1 + 0.02 * (level - 1));
}

export function startSkillCheckSession(jobLevel: number): SkillCheckSession {
  const now = Date.now();
  const patternLength = jobLevel >= 15 ? 5 : jobLevel >= 8 ? 4 : 3;
  const pattern = Array.from({ length: patternLength }, () => skillColors[rollBetween(0, 3)]);

  return {
    expiresAt: now + 18_000,
    input: [],
    pattern,
    revealUntil: now + 3_500,
    startedAt: now,
    status: 'memorise',
  };
}

export function resolveSkillCheckSession({
  input,
  jobLevel,
  pattern,
}: {
  input: SkillColor[];
  jobLevel: number;
  pattern: SkillColor[];
}): SkillCheckResult {
  const success = pattern.every((color, index) => input[index] === color);

  if (!success) {
    return {
      message: 'Wrong colour. Payroll has filed this under creative failure.',
      payout: rollBetween(50, 220),
      success: false,
      xp: 3,
    };
  }

  const payout = Math.round(rollBetween(2_000, 4_000) * getJobMultiplier(jobLevel));

  return {
    message: `Skill Check cleared for ${payout.toLocaleString()} wallet cash. Suspiciously competent.`,
    payout,
    success: true,
    xp: 10,
  };
}

const emailTemplates: Record<EmailFolder, Omit<JobEmail, 'id' | 'category'>[]> = {
  Scam: [
    {
      body: 'Your payroll access expires today. Confirm your password through the attached portal before 5 PM.',
      familyKey: 'fake_payroll',
      from: 'payroll-review@elsewhere-secure.example',
      subject: 'Immediate payroll verification required',
    },
    {
      body: 'Please approve the attached invoice. The vendor changed bank details this morning. Do not call them.',
      familyKey: 'invoice_trap',
      from: 'accounts-payable@elsewhere-vendors.example',
      subject: 'Updated invoice banking details',
    },
    {
      body: 'Your storage is full. Sign in to restore access to all city work documents.',
      familyKey: 'storage_warning',
      from: 'cloud-notices@elsewhere-files.example',
      subject: 'Document access suspended',
    },
  ],
  Spam: [
    {
      body: 'Congratulations. You are eligible for a discounted ergonomic chair and a mug nobody asked for.',
      familyKey: 'promo',
      from: 'offers@chair-barn.example',
      subject: 'Office comfort blowout sale',
    },
    {
      body: 'Take our six-minute workplace snack survey and receive one imaginary coupon.',
      familyKey: 'survey',
      from: 'research@snackmetrics.example',
      subject: 'Tell us about biscuits',
    },
  ],
  'To-Do': [
    {
      body: 'Please update the delivery notes before Friday so the warehouse stops calling us.',
      familyKey: 'routine_report',
      from: 'marta@elsewhere-office.example',
      subject: 'Delivery notes cleanup',
    },
    {
      body: 'Can you prep the vendor list before tomorrow morning? Nothing is on fire yet.',
      familyKey: 'meeting_prep',
      from: 'admin@elsewhere-office.example',
      subject: 'Vendor list for tomorrow',
    },
  ],
  Urgent: [
    {
      body: 'Register three is down and the queue is forming opinions. Please route this to operations now.',
      familyKey: 'outage',
      from: 'ops@elsewhere-office.example',
      subject: 'Register outage active',
    },
    {
      body: 'Same-day courier cutoff moved forward. Confirm dispatch before the driver vanishes.',
      familyKey: 'cutoff',
      from: 'dispatch@elsewhere-office.example',
      subject: 'Courier cutoff changed',
    },
  ],
};

function pickEmail(category: EmailFolder, index: number): JobEmail {
  const family = pickFromPool(botEmailTemplates[category] ?? []);

  if (family) {
    return {
      body: [
        pickFromPool(family.paragraph1Pool),
        pickFromPool(family.paragraph2Pool),
        pickFromPool(family.signoffPool),
      ].join('\n\n'),
      category,
      familyKey: family.key,
      from: pickFromPool(family.fromPool),
      id: `${category}-${index}-${rollBetween(100, 999)}`,
      subject: pickFromPool(family.subjectPool),
    };
  }

  const templates = emailTemplates[category];
  const template = templates[rollBetween(0, templates.length - 1)];

  return {
    ...template,
    category,
    id: `${category}-${index}-${rollBetween(100, 999)}`,
  };
}

function pickWeightedFolder(): EmailFolder {
  const roll = rollBetween(1, 100);

  if (roll <= 22) {
    return 'Urgent';
  }

  if (roll <= 50) {
    return 'To-Do';
  }

  if (roll <= 70) {
    return 'Spam';
  }

  return 'Scam';
}

export function startEmailSorterSession(): EmailSorterSession {
  const folders: EmailFolder[] = ['Scam', pickWeightedFolder(), pickWeightedFolder()];
  const shuffled = folders.sort(() => Math.random() - 0.5);

  return {
    currentIndex: 0,
    emails: shuffled.map((folder, index) => pickEmail(folder, index)),
    results: [],
    status: 'sorting',
  };
}

export function scoreEmailChoice(email: JobEmail, chosen: EmailFolder): EmailSortResult {
  if (email.category === 'Scam' && (chosen === 'Urgent' || chosen === 'To-Do')) {
    return {
      actual: email.category,
      chosen,
      emailId: email.id,
      outcome: 'compromised',
      penalty: 0,
      subject: email.subject,
    };
  }

  if (email.category === 'Scam' && chosen === 'Spam') {
    return {
      actual: email.category,
      chosen,
      emailId: email.id,
      outcome: 'penalty',
      penalty: rollBetween(180, 360),
      subject: email.subject,
    };
  }

  return {
    actual: email.category,
    chosen,
    emailId: email.id,
    outcome: email.category === chosen ? 'correct' : 'incorrect',
    penalty: 0,
    subject: email.subject,
  };
}

export function resolveEmailSorterSession({
  jobLevel,
  results,
}: {
  jobLevel: number;
  results: EmailSortResult[];
}): EmailSorterResolution {
  const failed = results.some((result) => result.outcome === 'compromised');

  if (failed) {
    return {
      failed,
      message: 'Email Sorter failed. A scam reached the work queue and now everyone is using the word audit.',
      payout: 0,
      results,
      xp: 4,
    };
  }

  const correctCount = results.filter((result) => result.outcome === 'correct').length;
  const basePay = rollBetween(750, 1_500);
  let correctPay = 0;

  for (let index = 0; index < correctCount; index += 1) {
    correctPay += rollBetween(1_000, 2_000);
  }

  const penalties = results.reduce((total, result) => total + result.penalty, 0);
  const payout = Math.max(0, Math.round((basePay + correctPay - penalties) * getJobMultiplier(jobLevel)));
  const perfect = correctCount === results.length;

  return {
    failed,
    message: perfect
      ? `Email Sorter perfect run paid ${payout.toLocaleString()}. Inbox defeated, somehow.`
      : `Email Sorter paid ${payout.toLocaleString()}. The inbox survived with paperwork damage.`,
    payout,
    results,
    xp: perfect ? 16 : 9,
  };
}

export type TransportChoice = {
  bonusMax: number;
  bonusMin: number;
  label: string;
  risk: number;
  unlockLevel?: number;
};

export type TransportStep = {
  choices: TransportChoice[];
  key: 'route' | 'handling' | 'finish';
  title: string;
};

export type TransportSelection = TransportChoice & {
  bonus: number;
  stepKey: TransportStep['key'];
};

export type TransportSession = {
  basePay: number;
  selections: TransportSelection[];
  status: 'choosing' | 'resolved';
  stepIndex: number;
};

export type TransportResolution = {
  failed: boolean;
  message: string;
  payout: number;
  risk: number;
  xp: number;
};

export const transportSteps: TransportStep[] = [
  {
    key: 'route',
    title: 'Pick your route',
    choices: [
      { bonusMax: 340, bonusMin: 0, label: 'Highway', risk: 2 },
      { bonusMax: 590, bonusMin: 170, label: 'Backstreets', risk: 6 },
      { bonusMax: 380, bonusMin: -80, label: 'Scenic', risk: 1 },
      { bonusMax: 880, bonusMin: 340, label: 'VIP Lane', risk: 8, unlockLevel: 10 },
      { bonusMax: 1_470, bonusMin: 630, label: 'Hot Route', risk: 14, unlockLevel: 20 },
    ],
  },
  {
    key: 'handling',
    title: 'Choose handling',
    choices: [
      { bonusMax: 380, bonusMin: 80, label: 'Careful', risk: 1 },
      { bonusMax: 710, bonusMin: 250, label: 'Fast', risk: 8 },
      { bonusMax: 340, bonusMin: 0, label: 'Standard', risk: 3 },
      { bonusMax: 670, bonusMin: 250, label: 'Insured Handling', risk: 4, unlockLevel: 10 },
      { bonusMax: 1_300, bonusMin: 550, label: 'Ultra Fragile', risk: 16, unlockLevel: 20 },
    ],
  },
  {
    key: 'finish',
    title: 'Finish the delivery',
    choices: [
      { bonusMax: 460, bonusMin: 150, label: 'Signature', risk: 3 },
      { bonusMax: 360, bonusMin: 0, label: 'Doorstep', risk: 5 },
      { bonusMax: 800, bonusMin: 290, label: 'Priority', risk: 10 },
      { bonusMax: 1_260, bonusMin: 500, label: 'VIP Priority', risk: 12, unlockLevel: 10 },
      { bonusMax: 1_890, bonusMin: 840, label: 'Black Ops Drop', risk: 20, unlockLevel: 20 },
    ],
  },
];

export function startTransportSession(): TransportSession {
  return {
    basePay: rollBetween(1_575, 2_625),
    selections: [],
    status: 'choosing',
    stepIndex: 0,
  };
}

export function selectTransportChoice(
  session: TransportSession,
  choice: TransportChoice
): TransportSession {
  const step = transportSteps[session.stepIndex];
  const selection = {
    ...choice,
    bonus: rollBetween(choice.bonusMin, choice.bonusMax),
    stepKey: step.key,
  };

  return {
    ...session,
    selections: [...session.selections, selection],
    stepIndex: session.stepIndex + 1,
  };
}

export function resolveTransportSession({
  jobLevel,
  session,
}: {
  jobLevel: number;
  session: TransportSession;
}): TransportResolution {
  const bonusTotal = session.selections.reduce((total, choice) => total + choice.bonus, 0);
  const risk = session.selections.reduce((total, choice) => total + choice.risk, 0);
  const failed = rollBetween(1, 100) <= risk;

  if (failed) {
    return {
      failed,
      message: 'Transport Contract failed. The package arrived spiritually, not physically.',
      payout: rollBetween(60, 260),
      risk,
      xp: 4,
    };
  }

  const payout = Math.round((session.basePay + bonusTotal) * getJobMultiplier(jobLevel));

  return {
    failed,
    message: `Transport Contract paid ${payout.toLocaleString()}. Delivery notes look almost legal.`,
    payout,
    risk,
    xp: 15,
  };
}

export type ShiftChoice = {
  bonus: number;
  label: string;
  note: string;
};

export type ShiftEvent = {
  choices: ShiftChoice[];
  prompt: string;
};

export type ShiftSession = {
  bonusTotal: number;
  eventIndex: number;
  events: ShiftEvent[];
  readyAt: number;
  startedAt: number;
  status: 'working' | 'ready' | 'resolved';
};

export type ShiftResolution = {
  message: string;
  payout: number;
  xp: number;
};

const shiftEvents: ShiftEvent[] = [
  {
    prompt: 'The register freezes during a rush.',
    choices: [
      { bonus: 180, label: 'Restart properly', note: 'Small bonus, no drama.' },
      { bonus: 320, label: 'Smack the panel', note: 'Fast, cursed, effective.' },
      { bonus: 0, label: 'Call manager', note: 'Safe and deeply boring.' },
    ],
  },
  {
    prompt: 'A customer asks where the impossible cereal lives.',
    choices: [
      { bonus: 220, label: 'Walk them over', note: 'Customer service detected.' },
      { bonus: 120, label: 'Point vaguely', note: 'Technically an answer.' },
      { bonus: -80, label: 'Invent aisle 13', note: 'There is no aisle 13.' },
    ],
  },
  {
    prompt: 'A suspicious noise comes from the stockroom.',
    choices: [
      { bonus: 260, label: 'Check it', note: 'Brave, or underpaid.' },
      { bonus: 90, label: 'Ignore it', note: 'The noise files a complaint.' },
      { bonus: 160, label: 'Send Kyle', note: 'Kyle knows what he did.' },
    ],
  },
];

export function startShiftSession(): ShiftSession {
  const now = Date.now();

  return {
    bonusTotal: 0,
    eventIndex: 0,
    events: shiftEvents.sort(() => Math.random() - 0.5).slice(0, 3),
    readyAt: now + 45_000,
    startedAt: now,
    status: 'working',
  };
}

export function applyShiftChoice(session: ShiftSession, choice: ShiftChoice): ShiftSession {
  return {
    ...session,
    bonusTotal: session.bonusTotal + choice.bonus,
    eventIndex: session.eventIndex + 1,
  };
}

export function resolveShiftSession({
  jobLevel,
  session,
}: {
  jobLevel: number;
  session: ShiftSession;
}): ShiftResolution {
  const payout = Math.max(
    0,
    Math.round((rollBetween(3_500, 6_500) + session.bonusTotal) * getJobMultiplier(jobLevel))
  );

  return {
    message: `Shift paid ${payout.toLocaleString()}. Payroll approved it with suspicious enthusiasm.`,
    payout,
    xp: 12,
  };
}

export type TruckerManifest = {
  cargoType: string;
  distanceKm: number;
  flavor: string;
  freight: string;
  payout: number;
  route: string;
  trailer: string;
};

export type TruckerSession = {
  manifest: TruckerManifest;
  paidAt?: number;
  readyAt: number;
  startedAt: number;
  status: 'active' | 'paid';
};

const fallbackTruckerRoutes = [
  { distanceKm: 915, route: 'Brisbane to Sydney' },
  { distanceKm: 1_681, route: 'Brisbane to Cairns' },
  { distanceKm: 878, route: 'Sydney to Melbourne' },
  { distanceKm: 3_420, route: 'Melbourne to Perth' },
  { distanceKm: 3_027, route: 'Adelaide to Darwin' },
  { distanceKm: 2_240, route: 'Perth to Broome' },
  { distanceKm: 1_497, route: 'Darwin to Alice Springs' },
  { distanceKm: 244, route: 'Canberra to Wagga Wagga' },
  { distanceKm: 904, route: 'Townsville to Mount Isa' },
];

const fallbackTruckerFreight: BotTruckerFreight[] = [
  { category: 'refrigerated', name: 'Frozen Meat', payoutModifier: 1.12 },
  { category: 'generalPalletised', name: 'Medical Supplies', payoutModifier: 1 },
  { category: 'livestock', name: 'Livestock', payoutModifier: 1.16 },
  { category: 'grainBulk', name: 'Bulk Grain', payoutModifier: 1.03 },
  { category: 'machineryHeavy', name: 'Machinery Crates', payoutModifier: 1.15 },
  { category: 'tanker', name: 'Fuel', payoutModifier: 1.14 },
  { category: 'dangerousGoods', name: 'Dangerous Goods', payoutModifier: 2 },
  { category: 'plantsOutdoor', name: 'Nursery Plants', payoutModifier: 1 },
];

const fallbackTrailerConfigs: Record<string, string[]> = {
  dangerousGoods: ['Dangerous Goods Trailer'],
  generalPalletised: ['Curtainsider', 'Semi Trailer'],
  grainBulk: ['Tipper'],
  livestock: ['Livestock Carrier'],
  machineryHeavy: ['Drop Deck'],
  plantsOutdoor: ['Semi Trailer'],
  refrigerated: ['Refrigerated Trailer'],
  tanker: ['Tanker'],
};

const fallbackManifestLines = ['The manifest smells like diesel, coffee, and questionable scheduling.'];

export function generateTruckerManifest(): TruckerManifest {
  const routes = botTruckerPools.routes.length > 0 ? botTruckerPools.routes : fallbackTruckerRoutes;
  const freightPool = botTruckerPools.freightPool.length > 0 ? botTruckerPools.freightPool : fallbackTruckerFreight;
  const manifestLines =
    botTruckerPools.manifestLines.length > 0 ? botTruckerPools.manifestLines : fallbackManifestLines;
  const route = pickFromPool(routes);
  const freight = pickFromPool(freightPool);
  const trailers = botTruckerPools.trailerConfigs[freight.category] ?? fallbackTrailerConfigs[freight.category] ?? ['Semi Trailer'];

  return {
    cargoType: titleCaseCargoType(freight.category),
    distanceKm: route.distanceKm,
    flavor: pickFromPool(manifestLines),
    freight: freight.name,
    payout: Math.round(route.distanceKm * 12 * freight.payoutModifier),
    route: route.route,
    trailer: pickFromPool(trailers),
  };
}

function titleCaseCargoType(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function startTruckerRun(manifest: TruckerManifest): TruckerSession {
  const now = Date.now();
  const minutes = Math.max(3, manifest.distanceKm * 0.01);

  return {
    manifest,
    readyAt: now + minutes * 60_000,
    startedAt: now,
    status: 'active',
  };
}

export function resolveTruckerRun({
  jobLevel,
  session,
}: {
  jobLevel: number;
  session: TruckerSession;
}): ShiftResolution {
  const payout = Math.round(session.manifest.payout * getJobMultiplier(jobLevel));

  return {
    message: `Trucker route paid ${payout.toLocaleString()}. The kilometres have been monetised.`,
    payout,
    xp: 18,
  };
}
