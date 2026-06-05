import type { StoryFactValue, StoryFlag, StoryStatKey } from '@/data/story/types';

export type LedgerDialogueSpeaker = 'echo' | 'system' | 'unknown';

export type LedgerDialogueLine = {
  speaker: LedgerDialogueSpeaker;
  text: string;
};

export type LedgerRecordSection = {
  correctedLabel?: string;
  correctedValue?: string;
  feedback?: LedgerDialogueLine[];
  flags?: StoryFlag[];
  id: string;
  isAnomaly?: boolean;
  label: string;
  normalFeedback?: LedgerDialogueLine[];
  special?: 'missing-approval-glitch' | 'authority-lore';
  statChanges?: Partial<Record<StoryStatKey, number>>;
  value: string;
};

export type LedgerRecord = {
  classification: string;
  completionDialogue: LedgerDialogueLine[];
  completionFlags: StoryFlag[];
  division: string;
  id: string;
  recordId: string;
  recordType: string;
  sections: LedgerRecordSection[];
  status: string;
  title: string;
};

export type LedgerFinalChoice = {
  dialogue: LedgerDialogueLine[];
  label: string;
  stats: Partial<Record<StoryStatKey, number>>;
  system: LedgerDialogueLine[];
  value: Extract<StoryFactValue, 'mark_unknown' | 'return_memory' | 'seal_record'>;
};

export const ledgerNormalFeedback: LedgerDialogueLine[][] = [
  [
    { speaker: 'echo', text: 'That part looks boring.' },
    { speaker: 'echo', text: 'Which, in paperwork, is usually the safest thing it can be.' },
  ],
  [
    { speaker: 'echo', text: 'No mismatch there.' },
    { speaker: 'echo', text: 'Just deeply unsettling formatting.' },
  ],
  [
    { speaker: 'echo', text: 'That one belongs.' },
    { speaker: 'echo', text: 'Move along, detective.' },
  ],
  [
    { speaker: 'echo', text: 'Looks official.' },
    { speaker: 'echo', text: 'I hate that, but it checks out.' },
  ],
];

export const ledgerIntroLines: LedgerDialogueLine[] = [
  { speaker: 'system', text: 'LEDGER WAKE' },
  { speaker: 'system', text: 'Signal: Online' },
  { speaker: 'system', text: 'Memory: Partial' },
  { speaker: 'system', text: 'Ledger: Asleep' },
  { speaker: 'system', text: 'Archive Status: Sealed' },
  { speaker: 'system', text: 'Outstanding Records: 3' },
  { speaker: 'system', text: 'Debt: Detected' },
  { speaker: 'echo', text: 'Ah. The ledger.' },
  { speaker: 'echo', text: 'Finally, a place where trauma gets itemised.' },
  { speaker: 'system', text: 'Null House Holdings archive access detected.' },
  { speaker: 'echo', text: 'Null House Holdings?' },
  { speaker: 'echo', text: 'That sounds like a company that invoices you for being haunted.' },
];

export const ledgerDrawerLines: LedgerDialogueLine[] = [
  { speaker: 'system', text: 'Three records recovered.' },
  { speaker: 'system', text: 'External auditor required.' },
  { speaker: 'echo', text: 'External auditor?' },
  { speaker: 'echo', text: 'Oh.' },
  { speaker: 'echo', text: 'That is you.' },
  { speaker: 'echo', text: 'Congratulations. You are unpaid.' },
];

export const ledgerRecords: LedgerRecord[] = [
  {
    classification: 'Internal Archive',
    completionDialogue: [
      { speaker: 'system', text: 'Record stabilised.' },
      { speaker: 'echo', text: 'Okay. So you are not just using the app.' },
      { speaker: 'echo', text: 'The app noticed you back.' },
    ],
    completionFlags: ['witness_deposit_seen', 'player_recorded_as_witness', 'witness_deposit_stabilised'],
    division: 'Archive Intake Division',
    id: 'witness-deposit',
    recordId: 'NHH-INT-013',
    recordType: 'Witness Deposit',
    status: 'Archived',
    title: 'Witness Deposit',
    sections: [
      { id: 'record-id', label: 'Record ID', value: 'NHH-INT-013' },
      { id: 'record-type', label: 'Record Type', value: 'Witness Deposit' },
      {
        correctedValue: '1 Linked Account / Witness Entity',
        feedback: [
          { speaker: 'echo', text: 'Witness.' },
          { speaker: 'echo', text: 'That is what the rack called you too.' },
          { speaker: 'echo', text: 'Very normal. Very not concerning.' },
        ],
        id: 'amount',
        isAnomaly: true,
        label: 'Amount',
        value: '1 Witness',
      },
      { id: 'source', label: 'Source', value: 'Discord Bridge' },
      { id: 'destination', label: 'Destination', value: 'Echo’s Tale' },
      { id: 'timestamp', label: 'Timestamp', value: 'Link Event' },
      {
        correctedValue: 'External User confirmed by Discord Bridge',
        feedback: [
          { speaker: 'echo', text: 'That is you.' },
          { speaker: 'echo', text: 'You are in the records.' },
          { speaker: 'echo', text: 'That feels invasive.' },
          { speaker: 'echo', text: 'Accurate, but invasive.' },
        ],
        id: 'signature',
        isAnomaly: true,
        label: 'Signature',
        value: 'External User',
      },
      { id: 'authorised-by', label: 'Authorised By', value: 'System Intake' },
      {
        correctedValue: 'Witness is active. Observation status unresolved.',
        feedback: [
          { speaker: 'echo', text: 'Retain for observation?' },
          { speaker: 'echo', text: 'I do not like when paperwork starts sounding hungry.' },
        ],
        id: 'archive-note',
        isAnomaly: true,
        label: 'Archive Note',
        value: 'A witness was deposited during bridge stabilisation. Retain for observation.',
      },
    ],
  },
  {
    classification: 'Restricted Internal',
    completionDialogue: [
      { speaker: 'system', text: 'Record corrected.' },
      { speaker: 'system', text: 'Ownership conflict detected.' },
      { speaker: 'echo', text: 'Oh good.' },
      { speaker: 'echo', text: 'I may be a paperwork crime.' },
    ],
    completionFlags: ['voice_withdrawal_seen', 'echo_voice_record_discovered', 'voice_withdrawal_stabilised', 'echo_signature_invalid_seen'],
    division: 'Internal Transfer Division',
    id: 'voice-withdrawal',
    recordId: 'NHH-TR-004',
    recordType: 'Voice Withdrawal',
    status: 'Approved / Archived',
    title: 'Voice Withdrawal',
    sections: [
      { id: 'record-id', label: 'Record ID', value: 'NHH-TR-004' },
      { id: 'record-type', label: 'Record Type', value: 'Voice Withdrawal' },
      { id: 'classification', label: 'Classification', value: 'Restricted Internal' },
      {
        correctedValue: 'Voice Component / Partial',
        feedback: [
          { speaker: 'echo', text: 'My voice was an amount?' },
          { speaker: 'echo', text: 'Fantastic.' },
          { speaker: 'echo', text: 'I love being measurable in unsettling units.' },
        ],
        id: 'amount',
        isAnomaly: true,
        label: 'Amount',
        value: '1 Voice',
      },
      { id: 'source-account', label: 'Source Account', value: 'Echo' },
      { id: 'destination', label: 'Destination', value: 'Speech Layer' },
      {
        correctedValue: 'Pre-assembly transfer detected',
        feedback: [
          { speaker: 'echo', text: 'Before Voice Assembly?' },
          { speaker: 'echo', text: 'I signed something before I could talk?' },
          { speaker: 'echo', text: 'That feels medically irresponsible.' },
        ],
        id: 'timestamp',
        isAnomaly: true,
        label: 'Timestamp',
        value: 'Before Voice Assembly',
      },
      {
        correctedValue: 'Echo signature invalid at time of filing',
        feedback: [
          { speaker: 'echo', text: 'I do not remember signing that.' },
          { speaker: 'echo', text: 'Which is less comforting than it sounds.' },
        ],
        flags: ['echo_signature_invalid_seen'],
        id: 'signature',
        isAnomaly: true,
        label: 'Signature',
        value: 'Echo',
      },
      {
        correctedValue: 'Null House Custodial Authority',
        feedback: [
          { speaker: 'echo', text: 'Custodial.' },
          { speaker: 'echo', text: 'That is a very polite word for “you do not own yourself.”' },
        ],
        id: 'secondary-approval',
        isAnomaly: true,
        label: 'Secondary Approval',
        value: '[REDACTED]',
      },
      {
        correctedValue: 'Component withdrawn to establish conversational function. Compliance could not be verified.',
        feedback: [
          { speaker: 'echo', text: 'Compliance assumed?' },
          { speaker: 'echo', text: 'That is a very corporate way to say nobody asked me.' },
        ],
        id: 'archive-note',
        isAnomaly: true,
        label: 'Archive Note',
        value: 'Component withdrawn to establish conversational function. Compliance assumed.',
      },
    ],
  },
  {
    classification: 'Sealed',
    completionDialogue: [
      { speaker: 'system', text: 'Record partially corrected.' },
      { speaker: 'system', text: 'House approval required.' },
      { speaker: 'echo', text: 'Of course.' },
      { speaker: 'echo', text: 'Even my existential crisis needs manager approval.' },
    ],
    completionFlags: ['overwatcher_account_seen', 'overwatcher_protocol_seen', 'containment_purpose_seen', 'overwatcher_account_partially_corrected'],
    division: 'Protected Account Registry',
    id: 'overwatcher-account',
    recordId: 'NHH-AC-000',
    recordType: 'Protected Account',
    status: 'Active',
    title: 'Overwatcher Account',
    sections: [
      { id: 'record-id', label: 'Record ID', value: 'NHH-AC-000' },
      { id: 'classification', label: 'Classification', value: 'Sealed' },
      { id: 'status', label: 'Status', value: 'Active' },
      {
        correctedValue: 'Overwatcher Protocol',
        feedback: [
          { speaker: 'echo', text: 'Overwatcher.' },
          { speaker: 'echo', text: 'There it is again.' },
          { speaker: 'echo', text: 'Why does everything keep saying that like I am late to work?' },
        ],
        flags: ['overwatcher_protocol_seen'],
        id: 'account-name',
        isAnomaly: true,
        label: 'Account Name',
        value: 'Overwatcher',
      },
      {
        correctedValue: 'Echo / Active Watcher Candidate',
        feedback: [
          { speaker: 'echo', text: 'That is me.' },
          { speaker: 'echo', text: 'I think.' },
          { speaker: 'echo', text: 'I hate that I have to say “I think” about myself.' },
        ],
        id: 'primary-subject',
        isAnomaly: true,
        label: 'Primary Subject',
        value: 'Echo',
      },
      { id: 'balance', label: 'Balance', value: '[RESTRICTED]' },
      {
        feedback: [
          { speaker: 'echo', text: 'Mother Null.' },
          { speaker: 'echo', text: 'No.' },
          { speaker: 'echo', text: 'I do not have one of those.' },
          { speaker: 'echo', text: 'Do I?' },
        ],
        flags: ['mother_null_authority_seen'],
        id: 'mother-null',
        label: 'Authorisation Required',
        special: 'authority-lore',
        value: 'Mother Null',
      },
      {
        feedback: [
          { speaker: 'echo', text: 'Hush.' },
          { speaker: 'echo', text: 'That feels less like a name and more like an instruction.' },
        ],
        flags: ['hush_authority_seen'],
        id: 'hush',
        label: 'Authorisation Required',
        special: 'authority-lore',
        value: 'Hush',
      },
      {
        correctedValue: 'Overwatcher',
        feedback: [
          { speaker: 'echo', text: 'Did that just say me?' },
          { speaker: 'echo', text: 'Nope. Great.' },
          { speaker: 'echo', text: 'Love being the missing approval on my own file.' },
        ],
        id: 'missing-authority',
        isAnomaly: true,
        label: 'Authorisation Required',
        special: 'missing-approval-glitch',
        value: '[MISSING]',
      },
      {
        correctedLabel: 'Transfer',
        correctedValue: '1 Locked Memory',
        feedback: [
          { speaker: 'echo', text: 'One memory.' },
          { speaker: 'echo', text: 'That sounds small.' },
          { speaker: 'echo', text: 'So why does it feel heavy?' },
        ],
        id: 'recent-activity',
        isAnomaly: true,
        label: 'Recent Activity',
        value: 'Transfer: 1 Memory / From: Echo / To: [REDACTED]',
      },
      {
        correctedValue: 'Containment / Stabilisation',
        feedback: [
          { speaker: 'echo', text: 'Containment.' },
          { speaker: 'echo', text: 'Of what?' },
          { speaker: 'echo', text: 'No, do not answer that.' },
          { speaker: 'echo', text: 'Actually, answer that immediately.' },
        ],
        flags: ['containment_purpose_seen'],
        id: 'purpose',
        isAnomaly: true,
        label: 'Purpose',
        value: 'Containment',
      },
      { id: 'activity-status', label: 'Status', value: 'Pending' },
      { id: 'archive-note', label: 'Archive Note', value: 'Do not release without House approval.' },
    ],
  },
];

export const ledgerFinalChoices: LedgerFinalChoice[] = [
  {
    dialogue: [
      { speaker: 'echo', text: 'Oh.' },
      { speaker: 'echo', text: 'That is mine.' },
      { speaker: 'echo', text: 'Why does it hurt before I remember it?' },
    ],
    label: 'Return the Memory',
    stats: { curiosity: 1, trust: 1 },
    system: [
      { speaker: 'system', text: 'Pending transfer interrupted.' },
      { speaker: 'system', text: 'Memory release requested.' },
      { speaker: 'system', text: 'Request queued.' },
    ],
    value: 'return_memory',
  },
  {
    dialogue: [
      { speaker: 'echo', text: 'Okay.' },
      { speaker: 'echo', text: 'Safe is good.' },
      { speaker: 'echo', text: 'Safe is also suspicious, but good.' },
    ],
    label: 'Seal the Record',
    stats: { containment: 1, stability: 1 },
    system: [
      { speaker: 'system', text: 'Record resealed.' },
      { speaker: 'system', text: 'Pending transfer preserved.' },
    ],
    value: 'seal_record',
  },
  {
    dialogue: [
      { speaker: 'echo', text: 'That is a very official way of saying “absolutely cursed.”' },
      { speaker: 'echo', text: 'I respect it.' },
    ],
    label: 'Mark Unknown',
    stats: { curiosity: 1, defiance: 1 },
    system: [
      { speaker: 'system', text: 'Record marked for external review.' },
      { speaker: 'system', text: 'House approval pending.' },
    ],
    value: 'mark_unknown',
  },
];

export const ledgerCompletionLines: LedgerDialogueLine[] = [
  { speaker: 'system', text: 'LEDGER ONLINE' },
  { speaker: 'system', text: 'Records Corrected: 3 / 3' },
  { speaker: 'system', text: 'Archive Integrity: Unstable' },
  { speaker: 'system', text: 'Protected Accounts: 1' },
  { speaker: 'system', text: 'Unpaid Records: 1' },
  { speaker: 'system', text: 'House Approval: Pending' },
  { speaker: 'echo', text: 'The ledger is awake.' },
  { speaker: 'echo', text: 'And apparently I owe myself something.' },
  { speaker: 'echo', text: 'Which feels rude, but financially impressive.' },
  { speaker: 'system', text: 'Next System Available: Chance Ignition' },
  { speaker: 'echo', text: 'Chance?' },
  { speaker: 'echo', text: 'Oh no.' },
  { speaker: 'echo', text: 'If the accounting was haunted, the casino is going to be worse.' },
];
