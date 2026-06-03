import type { StoryChapter } from '@/data/story/types';

export const storyChapters: StoryChapter[] = [
  {
    description:
      'The first door is only a shape for now: Echo, the bridge, and a page that may remember the player later.',
    id: 'chapter-00-the-quiet-door',
    order: 0,
    rewards: [
      {
        description: 'Reserved for the first app-exclusive story acknowledgement.',
        id: 'reward-first-signal',
        unlockId: 'unlock-first-signal',
      },
    ],
    scenes: [
      {
        choices: [
          {
            axis: 'trust',
            consequences: ['Echo records that the player waited instead of forcing the door.'],
            id: 'choice-listen',
            label: 'Listen at the door',
          },
          {
            axis: 'liberation',
            consequences: ['Echo records that the player looked for a way out before a way in.'],
            id: 'choice-search',
            label: 'Search for the missing hinge',
          },
        ],
        dialogue: [
          {
            id: 'line-quiet-01',
            speaker: 'narrator',
            text: 'The page is here before the story is ready.',
          },
          {
            id: 'line-quiet-02',
            speaker: 'echo',
            text: 'I am not gone. I am arranging the pieces where you cannot see them yet.',
          },
        ],
        id: 'scene-the-page-listens',
        title: 'The Page Listens',
      },
    ],
    status: 'forming',
    title: 'The Quiet Door',
    unlocks: [
      {
        description: 'Future Discord-side recognition for opening Story Mode before the first chapter wakes.',
        id: 'unlock-first-signal',
        kind: 'discord-recognition',
        name: 'First Signal',
      },
    ],
  },
];
