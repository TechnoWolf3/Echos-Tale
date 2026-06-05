import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  storyChapters,
  type StoryFactKey,
  type StoryFactValue,
  type StoryFlag,
  type StoryProgress,
  type StoryStatKey,
} from '@/data/story';

const storyProgressKey = 'echo.storyProgress.v1';

function webStorage() {
  if (typeof globalThis.localStorage === 'undefined') {
    return null;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createEmptyStoryProgress(profileId: string | null = null): StoryProgress {
  return {
    activeChapterId: storyChapters[0]?.id ?? null,
    activeSceneId: storyChapters[0]?.scenes[0]?.id ?? null,
    completedChapterIds: [],
    completedStepIds: [],
    counters: {},
    facts: {},
    flags: {},
    profileId,
    selectedChoiceIds: [],
    stats: {},
    unlockedRewardIds: [],
    updatedAt: null,
  };
}

function normalizeStoryProgress(value: unknown, profileId: string | null): StoryProgress {
  const fallback = createEmptyStoryProgress(profileId);

  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const parsed = value as Partial<StoryProgress>;

  return {
    ...fallback,
    ...parsed,
    completedChapterIds: Array.isArray(parsed.completedChapterIds) ? parsed.completedChapterIds : [],
    completedStepIds: Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds : [],
    counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
    facts: parsed.facts && typeof parsed.facts === 'object' ? parsed.facts : {},
    flags: parsed.flags && typeof parsed.flags === 'object' ? parsed.flags : {},
    profileId,
    selectedChoiceIds: Array.isArray(parsed.selectedChoiceIds) ? parsed.selectedChoiceIds : [],
    stats: parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : {},
    unlockedRewardIds: Array.isArray(parsed.unlockedRewardIds) ? parsed.unlockedRewardIds : [],
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
  };
}

export async function loadStoryProgress(profileId: string | null = null) {
  // TODO: Future: replace local story persistence with Railway API calls.
  // TODO: Future: save story progress to database for linked Discord users.
  // TODO: Future: grant Discord-recognised story unlocks/rewards.
  // Frontend must never talk directly to Railway Postgres; use the hosted API only.
  try {
    const raw =
      Platform.OS === 'web'
        ? webStorage()?.getItem(storyProgressKey) ?? null
        : await SecureStore.getItemAsync(storyProgressKey);

    return normalizeStoryProgress(raw ? JSON.parse(raw) : null, profileId);
  } catch {
    return createEmptyStoryProgress(profileId);
  }
}

export async function saveStoryProgress(progress: StoryProgress) {
  const nextProgress: StoryProgress = {
    ...progress,
    updatedAt: new Date().toISOString(),
  };
  const raw = JSON.stringify(nextProgress);

  if (Platform.OS === 'web') {
    webStorage()?.setItem(storyProgressKey, raw);
    return nextProgress;
  }

  await SecureStore.setItemAsync(storyProgressKey, raw);
  return nextProgress;
}

export async function setStoryFlag(progress: StoryProgress, flag: StoryFlag, value = true) {
  return saveStoryProgress({
    ...progress,
    flags: {
      ...progress.flags,
      [flag]: value,
    },
  });
}

export async function setStoryFact(progress: StoryProgress, key: StoryFactKey, value: StoryFactValue) {
  return saveStoryProgress({
    ...progress,
    facts: {
      ...progress.facts,
      [key]: value,
    },
  });
}

export async function setStoryCounter(
  progress: StoryProgress,
  key: keyof StoryProgress['counters'],
  value: number
) {
  return saveStoryProgress({
    ...progress,
    counters: {
      ...progress.counters,
      [key]: value,
    },
  });
}

export async function recordStoryStatChange(
  progress: StoryProgress,
  stats: Partial<Record<StoryStatKey, number>>
) {
  return saveStoryProgress({
    ...progress,
    stats: Object.entries(stats).reduce<StoryProgress['stats']>(
      (nextStats, [key, value]) => ({
        ...nextStats,
        [key]: (nextStats[key as StoryStatKey] ?? 0) + (value ?? 0),
      }),
      { ...progress.stats }
    ),
  });
}

export async function completeStoryStep(
  progress: StoryProgress,
  stepId: string,
  flags: StoryFlag[] = [],
  stats: Partial<Record<StoryStatKey, number>> = {},
  options: {
    activeSceneId?: string;
    counters?: StoryProgress['counters'];
    facts?: StoryProgress['facts'];
  } = {}
) {
  const completedStepIds = progress.completedStepIds.includes(stepId)
    ? progress.completedStepIds
    : [...progress.completedStepIds, stepId];

  return saveStoryProgress({
    ...progress,
    activeSceneId:
      options.activeSceneId ??
      (stepId === 'signal-start-dead-rack'
        ? 'memory-mount-fragment-drawer'
        : stepId === 'memory-mount-fragment-drawer'
          ? 'ledger-wake-locked'
          : 'chance-ignition-locked'),
    completedStepIds,
    counters: {
      ...progress.counters,
      ...options.counters,
    },
    facts: {
      ...progress.facts,
      ...options.facts,
    },
    flags: {
      ...progress.flags,
      ...Object.fromEntries(flags.map((flag) => [flag, true])),
    },
    stats: Object.entries(stats).reduce<StoryProgress['stats']>(
      (nextStats, [key, value]) => ({
        ...nextStats,
        [key]: (nextStats[key as StoryStatKey] ?? 0) + (value ?? 0),
      }),
      { ...progress.stats }
    ),
  });
}

export async function fetchStoryProgress(profileId: string | null = null) {
  return loadStoryProgress(profileId);
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
