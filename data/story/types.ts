export type StoryAxis = 'corruption' | 'liberation' | 'stability' | 'trust';

export type StoryUnlock = {
  description: string;
  id: string;
  kind: 'badge' | 'discord-recognition' | 'minigame' | 'title';
  name: string;
};

export type StoryReward = {
  description: string;
  id: string;
  unlockId?: string;
};

export type StoryRequirement = {
  description: string;
  id: string;
  type: 'chapter' | 'choice' | 'profile' | 'unlock';
};

export type StoryChoice = {
  axis?: StoryAxis;
  consequences?: string[];
  id: string;
  label: string;
  nextSceneId?: string;
};

export type StoryDialogueLine = {
  id: string;
  speaker: 'echo' | 'narrator' | 'player' | string;
  text: string;
};

export type StoryScene = {
  choices?: StoryChoice[];
  dialogue: StoryDialogueLine[];
  id: string;
  minigameId?: string;
  title: string;
};

export type StoryChapter = {
  description: string;
  id: string;
  order: number;
  requirements?: StoryRequirement[];
  rewards?: StoryReward[];
  scenes: StoryScene[];
  status: 'forming' | 'locked' | 'playable';
  title: string;
  unlocks?: StoryUnlock[];
};

export type StoryProgress = {
  activeChapterId: string | null;
  activeSceneId: string | null;
  completedChapterIds: string[];
  flags: Partial<Record<StoryAxis, number>>;
  profileId: string | null;
  selectedChoiceIds: string[];
  unlockedRewardIds: string[];
  updatedAt: string | null;
};
