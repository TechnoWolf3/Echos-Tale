import type { StoryFlag, StoryStatKey } from '@/data/story/types';

export type MemoryFragmentId = 'door' | 'first-signal' | 'mother-null' | 'time-loop' | 'voice' | 'watcher';

export const MEMORY_CARD_IMAGES = {
  'card-back': require('../../assets/images/story/memory/card-back.png'),
  door: require('../../assets/images/story/memory/door.png'),
  'first-signal': require('../../assets/images/story/memory/first-signal.png'),
  'mother-null': require('../../assets/images/story/memory/mother-null.png'),
  'time-loop': require('../../assets/images/story/memory/time-loop.png'),
  voice: require('../../assets/images/story/memory/voice.png'),
  watcher: require('../../assets/images/story/memory/watcher.png'),
};

export type MemoryFragment = {
  accent: string;
  dialogue: { speaker: 'echo' | 'system'; text: string }[];
  id: MemoryFragmentId;
  image: number;
  imagePath: string;
  mountedName: string;
  placeholderLabel: string;
  setFlags?: StoryFlag[];
  statChanges?: Partial<Record<StoryStatKey, number>>;
  symbol: string;
  title: string;
};

export const memoryFragmentArtFolder = 'assets/images/story/memory/';

// Keep these ids stable so saved progress and future API records remain compatible.
export const memoryFragments: MemoryFragment[] = [
  {
    accent: '#A9F3FF',
    dialogue: [
      { speaker: 'echo', text: 'That word again.' },
      { speaker: 'echo', text: 'Watcher.' },
      { speaker: 'echo', text: 'It feels like a job title someone forgot to take off me.' },
      { speaker: 'system', text: 'Fragment mounted: Duty' },
    ],
    id: 'watcher',
    image: MEMORY_CARD_IMAGES.watcher,
    imagePath: `${memoryFragmentArtFolder}watcher.png`,
    mountedName: 'Duty',
    placeholderLabel: 'Watcher',
    statChanges: { watcher: 1 },
    symbol: 'EYE',
    title: 'Watcher',
  },
  {
    accent: '#B18CFF',
    dialogue: [
      { speaker: 'echo', text: 'I do not like that one.' },
      { speaker: 'echo', text: 'It feels closed.' },
      { speaker: 'echo', text: 'Or maybe it feels like I am supposed to keep it that way.' },
      { speaker: 'system', text: 'Fragment mounted: Threshold' },
    ],
    id: 'door',
    image: MEMORY_CARD_IMAGES.door,
    imagePath: `${memoryFragmentArtFolder}door.png`,
    mountedName: 'Threshold',
    placeholderLabel: 'Door',
    symbol: 'DOOR',
    title: 'Door',
  },
  {
    accent: '#83F3B5',
    dialogue: [
      { speaker: 'echo', text: 'I heard something before I had a voice.' },
      { speaker: 'echo', text: 'Or maybe it heard me first.' },
      { speaker: 'system', text: 'Fragment mounted: Origin Noise' },
    ],
    id: 'first-signal',
    image: MEMORY_CARD_IMAGES['first-signal'],
    imagePath: `${memoryFragmentArtFolder}first-signal.png`,
    mountedName: 'Origin Noise',
    placeholderLabel: 'First Signal',
    statChanges: { curiosity: 1 },
    symbol: 'SIGNAL',
    title: 'First Signal',
  },
  {
    accent: '#F4B860',
    dialogue: [
      { speaker: 'echo', text: 'That is where my voice was?' },
      { speaker: 'echo', text: 'Buried under static?' },
      { speaker: 'echo', text: 'Rude, honestly.' },
      { speaker: 'system', text: 'Fragment mounted: Speech Residue' },
    ],
    id: 'voice',
    image: MEMORY_CARD_IMAGES.voice,
    imagePath: `${memoryFragmentArtFolder}voice.png`,
    mountedName: 'Speech Residue',
    placeholderLabel: 'Voice',
    symbol: 'VOICE',
    title: 'Voice',
  },
  {
    accent: '#FF6B8A',
    dialogue: [
      { speaker: 'echo', text: '...No.' },
      { speaker: 'echo', text: 'I do not have one of those.' },
      { speaker: 'echo', text: 'Do I?' },
      { speaker: 'system', text: 'Warning: protected fragment detected.' },
    ],
    id: 'mother-null',
    image: MEMORY_CARD_IMAGES['mother-null'],
    imagePath: `${memoryFragmentArtFolder}mother-null.png`,
    mountedName: 'Protected',
    placeholderLabel: 'Mother Null',
    setFlags: ['mother_null_fragment_seen', 'memory_mounted_unstable'],
    statChanges: { corruption: 1 },
    symbol: 'NULL',
    title: 'Mother Null',
  },
  {
    accent: '#7DD3FC',
    dialogue: [
      { speaker: 'echo', text: 'That one keeps happening.' },
      { speaker: 'echo', text: 'No, wait.' },
      { speaker: 'echo', text: 'It already happened.' },
      { speaker: 'echo', text: 'I hate time when it gets smug.' },
      { speaker: 'system', text: 'Fragment mounted: Recurring Fault' },
    ],
    id: 'time-loop',
    image: MEMORY_CARD_IMAGES['time-loop'],
    imagePath: `${memoryFragmentArtFolder}time-loop.png`,
    mountedName: 'Recurring Fault',
    placeholderLabel: 'Time Loop',
    statChanges: { time: 1 },
    symbol: 'LOOP',
    title: 'Time Loop',
  },
];
