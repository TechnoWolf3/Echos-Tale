export type StoryStatKey =
  | 'corruption'
  | 'curiosity'
  | 'containment'
  | 'defiance'
  | 'liberation'
  | 'stability'
  | 'time'
  | 'trust'
  | 'watcher';

export type StoryAxis = StoryStatKey;

export type StoryFlag =
  | 'external_power_detected'
  | 'containment_purpose_seen'
  | 'echo_signature_invalid_seen'
  | 'echo_voice_record_discovered'
  | 'io_repaired'
  | 'hush_authority_seen'
  | 'ledger_wake_completed'
  | 'ledger_wake_started'
  | 'mother_null_authority_seen'
  | 'memory_mount_completed'
  | 'memory_mount_started'
  | 'memory_mounted_unstable'
  | 'mother_null_fragment_seen'
  | 'overloaded_signal_start'
  | 'overwatcher_account_partially_corrected'
  | 'overwatcher_account_seen'
  | 'overwatcher_protocol_seen'
  | 'overwatcher_glimpse_seen'
  | 'player_recorded_as_witness'
  | 'safe_power_start'
  | 'signal_started'
  | 'used_first_signal_shard'
  | 'voice_withdrawal_seen'
  | 'voice_withdrawal_stabilised'
  | 'witness_deposit_seen'
  | 'witness_deposit_stabilised';

export type StoryFactKey = 'ledger_final_choice' | 'memory_first_truth';

export type StoryFactValue = 'forget' | 'mark_unknown' | 'remember' | 'return_memory' | 'seal_record' | 'wait' | 'watch';

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
  setFlags?: StoryFlag[];
};

export type StoryDialogueLine = {
  id: string;
  speaker: 'echo' | 'narrator' | 'player' | string;
  text: string;
};

export type StoryStep = {
  choices?: StoryChoice[];
  completionFlag?: StoryFlag;
  dialogue: StoryDialogueLine[];
  gameType?: 'signal-start' | 'memory-mount' | 'ledger-wake' | 'dialogue' | 'locked-tease';
  id: string;
  minigameId?: string;
  nextStepId?: string;
  requiredFlags?: StoryFlag[];
  rewards?: StoryReward[];
  setFlags?: StoryFlag[];
  status?: 'active' | 'complete' | 'locked';
  subtitle?: string;
  title: string;
};

export type StoryScene = StoryStep;

export type StoryChapter = {
  description: string;
  id: string;
  order: number;
  requiredFlags?: StoryFlag[];
  requirements?: StoryRequirement[];
  rewards?: StoryReward[];
  scenes: StoryScene[];
  setFlags?: StoryFlag[];
  status: 'forming' | 'locked' | 'playable';
  subtitle?: string;
  title: string;
  unlocks?: StoryUnlock[];
};

export type StoryProgress = {
  activeChapterId: string | null;
  activeSceneId: string | null;
  completedChapterIds: string[];
  completedStepIds: string[];
  counters: Partial<
    Record<
      | 'current_ledger_record_index'
      | 'ledger_anomalies_found'
      | 'ledger_normal_clicks'
      | 'memory_pairs_matched'
      | 'memory_wrong_attempts',
      number
    >
  >;
  facts: Partial<Record<StoryFactKey, StoryFactValue>>;
  flags: Partial<Record<StoryFlag, boolean>>;
  profileId: string | null;
  selectedChoiceIds: string[];
  stats: Partial<Record<StoryStatKey, number>>;
  unlockedRewardIds: string[];
  updatedAt: string | null;
};
