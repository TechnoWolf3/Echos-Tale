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

const skillColors: SkillColor[] = ['Red', 'Blue', 'Green', 'Yellow'];

function rollBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
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
