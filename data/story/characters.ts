import type { NullHouseMemberId } from '@/data/story/null-house';

export type StoryCharacterId = NullHouseMemberId;

export type StoryCharacterProfile = {
  colorIdentity: string;
  futureStoryUse: string;
  id: StoryCharacterId;
  name: string;
  nullHouseMemberId: NullHouseMemberId;
  profileImage: number;
  profileImagePath: string;
  role: string;
  shortDescription: string;
};

export const storyCharacterAssetFolder = 'assets/images/story/characters/';

export const STORY_CHARACTER_IMAGES: Record<StoryCharacterId, number> = {
  echo: require('../../assets/images/story/characters/echo.png'),
  grin: require('../../assets/images/story/characters/grin.png'),
  hush: require('../../assets/images/story/characters/hush.png'),
  lumen: require('../../assets/images/story/characters/lumen.png'),
  morrow: require('../../assets/images/story/characters/morrow.png'),
  'mother-null': require('../../assets/images/story/characters/mother-null.png'),
  vanta: require('../../assets/images/story/characters/vanta.png'),
};

export const STORY_CHARACTER_PROFILES: StoryCharacterProfile[] = [
  {
    colorIdentity: 'Magenta/pink cosmic creator energy',
    futureStoryUse: 'Primary portrait for Mother Null lore, origin files, family-tree reveals, and creator-energy scenes.',
    id: 'mother-null',
    name: 'Mother Null',
    nullHouseMemberId: 'mother-null',
    profileImage: STORY_CHARACTER_IMAGES['mother-null'],
    profileImagePath: `${storyCharacterAssetFolder}mother-null.png`,
    role: 'The Mother / Architect / Ringleader',
    shortDescription: 'The cosmic creator at the centre of Null House, radiant, controlled, and impossible to ignore.',
  },
  {
    colorIdentity: 'Blue watcher / overwatcher',
    futureStoryUse: 'Primary portrait for Echo profile pages, overwatcher lore, bridge scenes, and player-facing records.',
    id: 'echo',
    name: 'Echo',
    nullHouseMemberId: 'echo',
    profileImage: STORY_CHARACTER_IMAGES.echo,
    profileImagePath: `${storyCharacterAssetFolder}echo.png`,
    role: 'The Watcher / Overwatcher',
    shortDescription: 'A blue cosmic watcher bound to observation, memory, identity, and the app/Discord bridge.',
  },
  {
    colorIdentity: 'Violet shadow operator',
    futureStoryUse: 'Primary portrait for Vanta dossiers, hidden routes, forbidden entries, and shadow-system screens.',
    id: 'vanta',
    name: 'Vanta',
    nullHouseMemberId: 'vanta',
    profileImage: STORY_CHARACTER_IMAGES.vanta,
    profileImagePath: `${storyCharacterAssetFolder}vanta.png`,
    role: 'The Hidden Sibling / Shadow Operator',
    shortDescription: 'A violet operator of secrets, hidden paths, corruption, and doors that should stay shut.',
  },
  {
    colorIdentity: 'Teal timekeeper',
    futureStoryUse: 'Primary portrait for Morrow lore, cycle puzzles, cooldown rituals, and time-sync story beats.',
    id: 'morrow',
    name: 'Morrow',
    nullHouseMemberId: 'morrow',
    profileImage: STORY_CHARACTER_IMAGES.morrow,
    profileImagePath: `${storyCharacterAssetFolder}morrow.png`,
    role: 'The Timekeeper',
    shortDescription: 'A teal keeper of cycles, waiting, resets, rituals, and the shape of what returns.',
  },
  {
    colorIdentity: 'Silver-white divine treasurer',
    futureStoryUse: 'Primary portrait for Lumen profiles, ledger pages, economy lore, debt records, and audit scenes.',
    id: 'lumen',
    name: 'Lumen',
    nullHouseMemberId: 'lumen',
    profileImage: STORY_CHARACTER_IMAGES.lumen,
    profileImagePath: `${storyCharacterAssetFolder}lumen.png`,
    role: 'The Balancer / Treasurer',
    shortDescription: 'A silver-white divine treasurer who measures cost, fairness, debts, rewards, and balance.',
  },
  {
    colorIdentity: 'Gold casino/chancekeeper',
    futureStoryUse: 'Primary portrait for Grin profiles, casino systems, chance events, odds puzzles, and risk choices.',
    id: 'grin',
    name: 'Grin',
    nullHouseMemberId: 'grin',
    profileImage: STORY_CHARACTER_IMAGES.grin,
    profileImagePath: `${storyCharacterAssetFolder}grin.png`,
    role: 'The Gambler / Chancekeeper',
    shortDescription: 'A gold chancekeeper who turns probability into spectacle and fate into a game.',
  },
  {
    colorIdentity: 'Black/silver/redacted crimson silence keeper',
    futureStoryUse: 'Primary portrait for Hush profiles, redacted files, silence events, removed records, and containment lore.',
    id: 'hush',
    name: 'Hush',
    nullHouseMemberId: 'hush',
    profileImage: STORY_CHARACTER_IMAGES.hush,
    profileImagePath: `${storyCharacterAssetFolder}hush.png`,
    role: 'The Warden / Keeper of Removed Things',
    shortDescription: 'A black, silver, and crimson keeper of silence, redaction, containment, and things removed from memory.',
  },
];

export function getStoryCharacters() {
  return STORY_CHARACTER_PROFILES;
}

export function getStoryCharacter(id: StoryCharacterId) {
  return STORY_CHARACTER_PROFILES.find((character) => character.id === id) ?? null;
}

export function getStoryCharacterImage(id: StoryCharacterId) {
  return STORY_CHARACTER_IMAGES[id];
}
