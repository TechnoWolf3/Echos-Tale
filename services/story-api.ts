import { storyChapters, type StoryProgress } from '@/data/story';

export function createEmptyStoryProgress(profileId: string | null = null): StoryProgress {
  return {
    activeChapterId: storyChapters[0]?.id ?? null,
    activeSceneId: storyChapters[0]?.scenes[0]?.id ?? null,
    completedChapterIds: [],
    flags: {},
    profileId,
    selectedChoiceIds: [],
    unlockedRewardIds: [],
    updatedAt: null,
  };
}

export async function fetchStoryProgress(profileId: string | null = null) {
  // TODO: Fetch Story Mode progress from the hosted Echo API when the backend route exists.
  return createEmptyStoryProgress(profileId);
}

export async function saveStoryChoice(_choiceId: string) {
  // TODO: Persist choices through the hosted Echo API. Do not connect directly to the database here.
  return { status: 'pending-api' as const };
}

export async function completeStoryChapter(_chapterId: string) {
  // TODO: Complete chapters through the hosted Echo API so Discord-side unlocks can observe progress.
  return { status: 'pending-api' as const };
}

export async function unlockStoryReward(_unlockId: string) {
  // TODO: Request story unlocks through the hosted Echo API once reward validation exists.
  return { status: 'pending-api' as const };
}
