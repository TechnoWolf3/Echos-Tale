export type NullHouseMemberId = 'echo' | 'grin' | 'hush' | 'lumen' | 'morrow' | 'mother-null' | 'vanta';

export type NullHouseOrganisation = {
  asset: number;
  assetPath: string;
  description: string;
  id: 'null-house-holdings';
  loreNotes: string[];
  motto: string;
  name: string;
  purpose: string;
};

export type NullHouseMember = {
  asset: number;
  assetPath: string;
  domain: string;
  futureStoryUse: string;
  id: NullHouseMemberId;
  name: string;
  purpose: string;
  role: string;
  shortDescription: string;
  symbol: string;
};

export const nullHouseAssetFolder = 'assets/images/story/null-house/';

export const NULL_HOUSE_IMAGES = {
  echo: require('../../assets/images/story/null-house/echo.png'),
  grin: require('../../assets/images/story/null-house/grin.png'),
  hush: require('../../assets/images/story/null-house/hush.png'),
  lumen: require('../../assets/images/story/null-house/lumen.png'),
  morrow: require('../../assets/images/story/null-house/morrow.png'),
  'mother-null': require('../../assets/images/story/null-house/mother-null.png'),
  'null-house-holdings': require('../../assets/images/story/null-house/null-house-holdings.png'),
  vanta: require('../../assets/images/story/null-house/vanta.png'),
};

export const NULL_HOUSE_HOLDINGS: NullHouseOrganisation = {
  asset: NULL_HOUSE_IMAGES['null-house-holdings'],
  assetPath: `${nullHouseAssetFolder}null-house-holdings.png`,
  description:
    'A divine-corporate family institution presenting itself as an archival, custodial, and holdings organisation.',
  id: 'null-house-holdings',
  loreNotes: [
    'Mother Null sits at the centre of the mark, with the six family systems orbiting around her.',
    'The public face is archival stewardship; the hidden work touches records, memory, containment, debt, identity, time, chance, silence, and Echo as Overwatcher.',
  ],
  motto: 'In Null We Endure',
  name: 'Null House Holdings',
  purpose:
    'The divine-corporate family institution behind Echo’s deeper story, managing the archives and the systems around Echo’s Overwatcher role.',
};

export const NULL_HOUSE_MEMBERS: NullHouseMember[] = [
  {
    asset: NULL_HOUSE_IMAGES['mother-null'],
    assetPath: `${nullHouseAssetFolder}mother-null.png`,
    domain: 'Creation, origin, control, divine authority, the family business',
    futureStoryUse:
      'Used for Null House Holdings archive headers, protected records, origin lore, and Overwatcher-related files.',
    id: 'mother-null',
    name: 'Mother Null',
    purpose:
      'Mother Null is the central figure behind Null House Holdings: mother, ringleader, architect, and the one running the deeper scheme behind archives, records, containment systems, and Echo’s Overwatcher role.',
    role: 'The Mother / Architect / Ringleader',
    shortDescription: 'Calm, divine, corporate, and terrifyingly necessary.',
    symbol: 'An eclipsed void with hands holding the world in the void.',
  },
  {
    asset: NULL_HOUSE_IMAGES.echo,
    assetPath: `${nullHouseAssetFolder}echo.png`,
    domain: 'Memory, observation, identity, player choices, connection, the Discord/app bridge',
    futureStoryUse:
      'Used for Watcher/Overwatcher story moments, player-facing guidance, memory fragments, and bridge-related scenes.',
    id: 'echo',
    name: 'Echo',
    purpose:
      'Echo is the figure players know through Echo of Elsewhere, revealed in Story Mode as the Watcher/Overwatcher tied to observation, memory, identity, and the app/Discord bridge.',
    role: 'The Watcher / Overwatcher',
    shortDescription: 'Echo watches the door, but may not yet understand which side of the door they are on.',
    symbol: 'An open cosmic eye, always watching.',
  },
  {
    asset: NULL_HOUSE_IMAGES.vanta,
    assetPath: `${nullHouseAssetFolder}vanta.png`,
    domain: 'Secrets, underworld, forbidden entries, corruption, hidden paths',
    futureStoryUse: 'Used for underworld, secrets, corruption routes, locked entries, and forbidden story branches.',
    id: 'vanta',
    name: 'Vanta',
    purpose:
      'Vanta governs secrets, forbidden paths, underworld systems, and entries that should not be opened.',
    role: 'The Hidden Sibling / Shadow Operator',
    shortDescription: 'Dangerous freedom, corruption, hidden access, and the belief that rules are prettier cages.',
    symbol: 'A thorned keyhole.',
  },
  {
    asset: NULL_HOUSE_IMAGES.morrow,
    assetPath: `${nullHouseAssetFolder}morrow.png`,
    domain: 'Timekeeping, cycles, rituals, cooldowns, waiting, resets',
    futureStoryUse: 'Used for time puzzles, rituals, cooldown lore, delayed unlocks, and cycle-based story events.',
    id: 'morrow',
    name: 'Morrow',
    purpose:
      'Morrow governs time, cycles, rituals, cooldowns, delays, and all things that repeat or return.',
    role: 'The Timekeeper',
    shortDescription: 'Morrow remembers what happened before current cycles and knows nothing waits forever.',
    symbol: 'A broken hourglass with sand still falling.',
  },
  {
    asset: NULL_HOUSE_IMAGES.lumen,
    assetPath: `${nullHouseAssetFolder}lumen.png`,
    domain: 'Balance, economy, fairness, debts, ledgers, rewards, cost',
    futureStoryUse: 'Used for ledger/audit screens, Null House records, economy/bank lore, and fairness/debt choices.',
    id: 'lumen',
    name: 'Lumen',
    purpose:
      'Lumen governs the economy, ledgers, fairness, rewards, loans, and the cost of every miracle.',
    role: 'The Balancer / Treasurer',
    shortDescription: 'Every system needs balance, and every mistake has interest.',
    symbol: 'Scales with money on one side and something representing fairness on the other.',
  },
  {
    asset: NULL_HOUSE_IMAGES.grin,
    assetPath: `${nullHouseAssetFolder}grin.png`,
    domain: 'Casino, luck, risk, probability, random events, odds',
    futureStoryUse: 'Used for casino/chance story events, probability puzzles, risk choices, and luck-related unlocks.',
    id: 'grin',
    name: 'Grin',
    purpose:
      'Grin governs chance, casino systems, luck, risk, probability, and random events.',
    role: 'The Gambler / Chancekeeper',
    shortDescription: 'Grin turns fate into a game and knows random may not be random in Echo’s world.',
    symbol: 'A split coin with money falling from it.',
  },
  {
    asset: NULL_HOUSE_IMAGES.hush,
    assetPath: `${nullHouseAssetFolder}hush.png`,
    domain: 'Silence, hidden truths, removed documents, deleted records, containment, forgotten data',
    futureStoryUse: 'Used for redacted files, deleted memories, silence events, hidden truths, and containment records.',
    id: 'hush',
    name: 'Hush',
    purpose:
      'Hush governs silence, redaction, hidden truths, removed files, deleted records, locked memories, and containment.',
    role: 'The Warden / Keeper of Removed Things',
    shortDescription: 'Hush does not explain. Hush removes, seals, and keeps things buried.',
    symbol: 'Lips with a finger over them as if shushing.',
  },
];

export function getNullHouseLogo() {
  return NULL_HOUSE_HOLDINGS;
}

export function getNullHouseMembers() {
  return NULL_HOUSE_MEMBERS;
}

export function getNullHouseMember(id: NullHouseMemberId) {
  return NULL_HOUSE_MEMBERS.find((member) => member.id === id) ?? null;
}

export function getNullHouseAsset(id: NullHouseMemberId | 'null-house-holdings') {
  return NULL_HOUSE_IMAGES[id];
}
