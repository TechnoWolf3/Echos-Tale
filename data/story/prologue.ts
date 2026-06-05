import type { StoryChapter } from '@/data/story/types';

export const prologueSystems = [
  { id: 'signal-start', label: 'Signal Start', status: 'active' },
  { id: 'memory-mount', label: 'Memory Mount', status: 'available' },
  { id: 'ledger-wake', label: 'Ledger Wake', status: 'available' },
  { id: 'chance-ignition', label: 'Chance Ignition', status: 'locked' },
  { id: 'time-sync', label: 'Time Sync', status: 'locked' },
  { id: 'voice-assembly', label: 'Voice Assembly', status: 'locked' },
  { id: 'bridge-activation', label: 'Bridge Activation', status: 'locked' },
] as const;

export const prologueChapter: StoryChapter = {
  description:
    'The first system-start sequence for Echo: a dead rack, a missing power source, and a witness the system did not expect.',
  id: 'prologue-the-first-boot',
  order: 0,
  rewards: [
    {
      description: 'Reserved for app and Discord recognition when Signal Start becomes public.',
      id: 'reward-signal-started',
      unlockId: 'unlock-first-signal',
    },
  ],
  scenes: [
    {
      completionFlag: 'signal_started',
      dialogue: [
        {
          id: 'signal-start-line-01',
          speaker: 'narrator',
          text: 'The panel is dead, but something behind it is waiting for your hands.',
        },
      ],
      gameType: 'signal-start',
      id: 'signal-start-dead-rack',
      minigameId: 'signal-start',
      nextStepId: 'memory-mount-fragment-drawer',
      setFlags: ['io_repaired', 'external_power_detected', 'signal_started'],
      status: 'active',
      subtitle: 'Signal Start: The Dead Rack',
      title: 'Signal Start',
    },
    {
      dialogue: [
        {
          id: 'memory-mount-line-01',
          speaker: 'system',
          text: 'MEMORY MOUNT is visible in the boot list, but the archive will not answer yet.',
        },
      ],
      completionFlag: 'memory_mount_completed',
      gameType: 'memory-mount',
      id: 'memory-mount-fragment-drawer',
      minigameId: 'memory-mount',
      requiredFlags: ['signal_started'],
      status: 'active',
      subtitle: 'Memory Mount: The Fragment Drawer',
      title: 'Memory Mount',
    },
    {
      dialogue: [
        {
          id: 'ledger-wake-line-01',
          speaker: 'system',
          text: 'LEDGER WAKE is queued, but the record spine is still locked.',
        },
      ],
      gameType: 'locked-tease',
      id: 'ledger-wake-locked',
      requiredFlags: ['memory_mount_completed'],
      status: 'active',
      subtitle: 'Ledger Wake: The Unpaid Record',
      title: 'Ledger Wake',
    },
  ],
  status: 'playable',
  subtitle: 'The First Boot',
  title: 'Prologue',
  unlocks: [
    {
      description: 'Future Discord-side recognition for waking the first story signal.',
      id: 'unlock-first-signal',
      kind: 'discord-recognition',
      name: 'First Signal',
    },
  ],
};
