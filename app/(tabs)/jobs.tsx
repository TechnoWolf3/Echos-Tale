import { useEffect } from 'react';
import { View } from 'react-native';

import { ActionCard } from '@/components/game/action-card';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { HubCard } from '@/components/game/hub-card';
import { ProgressBar } from '@/components/game/progress-bar';
import { EmailSorterJob } from '@/components/jobs/email-sorter-job';
import { ShiftJob } from '@/components/jobs/shift-job';
import { SkillCheckJob } from '@/components/jobs/skill-check-job';
import { TransportContractJob } from '@/components/jobs/transport-contract-job';
import { TruckerJob } from '@/components/jobs/trucker-job';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';

const workJobs = [
  {
    detail: 'A rare golden job card after normal work. Short challenge, huge payout, no mercy.',
    meta: 'job_95_legendary | rare spawn | reaction challenge',
    status: 'Rare',
    title: 'Legendary Job',
  },
];

const grindJobs = [
  {
    detail: 'Fulfill timed orders, build streaks, and pray the supervisor picked another aisle.',
    title: 'Warehousing',
  },
  {
    detail: 'Cast, wait, tug, and manage tension when the water starts acting expensive.',
    title: 'Fishing',
  },
  {
    detail: 'Choose a dig site, go deeper, and decide when the cracks are being dramatic.',
    title: 'Quarry',
  },
  {
    detail: 'Judge passengers, remember routes, and hope the sketchy fare pays in money.',
    title: 'Taxi Driver',
  },
];

const nightWalkerJobs = [
  {
    detail: 'Read the room for five rounds. Charm pays. Oversharing does not.',
    title: 'Flirt',
  },
  {
    detail: 'Stage confidence, timing, and crowd reads. Keep it smooth, not explicit.',
    title: 'Performance',
  },
  {
    detail: 'Negotiate boundaries, payment, safety, and exit timing with a private client.',
    title: 'Private Client',
  },
];

const enterpriseJobs = [
  {
    detail: 'Plant crops, buy machines with bank money, harvest goods into storage.',
    title: 'Farming',
  },
  {
    detail: 'Run recipes through production lines, then sell goods or fill contracts.',
    title: 'Manufacturing',
  },
];

export default function JobsScreen() {
  const game = useElsewhereGame();
  const { refreshRemoteProfileIfStale } = game;
  const xpProgress = game.jobXp / (100 + (game.jobLevel - 1) * 60);

  useEffect(() => {
    const interval = setInterval(game.tick, 1000);

    return () => clearInterval(interval);
  }, [game.tick]);

  useEffect(() => {
    void refreshRemoteProfileIfStale(8_000);
  }, [refreshRemoteProfileIfStale]);

  return (
    <GameScreen>
      <View style={{ gap: GameTheme.spacing.sm }}>
        <GameText tone="faint" variant="label">
          Dodgy work, honest-ish pay
        </GameText>
        <GameText variant="display">Job Board</GameText>
        <GameText tone="muted">
          Legal jobs, grind shifts, nightlife, crime, and long-term operations. Payroll keeps a
          weird amount of notes.
        </GameText>
      </View>

      <GameCard>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText variant="title">Shared Job Level {game.jobLevel}</GameText>
          <GameText tone="muted">Keep clocking in. Payroll eventually becomes suspiciously generous.</GameText>
        </View>
        <ProgressBar progress={xpProgress} />
        <GameText style={{ textAlign: 'right' }} tone="faint" variant="caption">
          {game.jobXp} XP banked
        </GameText>
      </GameCard>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Work a 9-5</GameText>
        <TransportContractJob />
        <SkillCheckJob />
        <EmailSorterJob />
        <ShiftJob />
        <TruckerJob />
        {workJobs.map((job) => (
          <HubCard
            key={job.title}
            detail={job.detail}
            meta={job.meta}
            status={job.status}
            title={job.title}
            tone="success"
          />
        ))}
      </View>

      <GameCard>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText variant="title">9-5 Rules</GameText>
          <GameText tone="muted">
            Legal work pays Wallet cash, adds job XP, records a transaction, respects cooldowns,
            and should resolve server-side once the Railway API exists.
          </GameText>
        </View>
        <GameText tone="faint" variant="caption">
          Needs active_jobs for mobile-safe sessions; Trucker also needs manifest and run storage.
        </GameText>
      </GameCard>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">The Grind</GameText>
        <ActionCard
          description="Customers buy things. You make change. The register hates you today."
          disabled={!!game.sessionToken || !game.canAct('storeClerk')}
          label={game.sessionToken ? 'Server Soon' : game.getCooldownLabel('storeClerk')}
          meta="Start Shift | +14 job XP | fatigue later"
          onPress={game.runStoreClerk}
          title="Store Clerk"
          tone="success"
        />
        {grindJobs.map((job) => (
          <HubCard
            key={job.title}
            detail={job.detail}
            meta="Grind job | fatigue | repeatable shift"
            status={job.title === 'Fishing' ? 'MVP Next' : 'Later'}
            title={job.title}
            tone="success"
          />
        ))}
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Night Walker</GameText>
        {nightWalkerJobs.map((job) => (
          <HubCard
            key={job.title}
            detail={job.detail}
            meta="Night work | social risk | wallet payout"
            status="Later"
            title={job.title}
            tone="ember"
          />
        ))}
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Crime</GameText>
        <ActionCard
          description="Fast cash, bad fingerprints. Clean runs pay. Messy ones leave your shoes remembered."
          disabled={!!game.sessionToken || !game.canAct('storeRobbery')}
          label={game.sessionToken ? 'Server Soon' : game.getCooldownLabel('storeRobbery')}
          meta="Rob Store | raises heat | fines feed Server Bank"
          onPress={game.runStoreRobbery}
          title="Store Robbery"
          tone="danger"
        />
        <ActionCard
          description="Pay a patrol officer to forget your name. Sometimes they forget the wrong thing."
          disabled={!!game.sessionToken || game.wallet < 5_000}
          label={game.sessionToken ? 'Server Soon' : game.wallet < 5_000 ? 'Need $5k' : 'Pay $5k'}
          meta="Lay Low alternative later | bribe feeds Server Bank"
          onPress={game.bribeOfficer}
          title="Bribe Officer"
          tone="ember"
        />
        <HubCard
          detail="Dialogue pressure, persuasion, suspicion, and knowing when to hang up."
          meta="Crime | heat | suspicion"
          status="MVP Next"
          title="Scam Call"
          tone="danger"
        />
        <HubCard
          detail="Scout, entry, inside, vault, loot, escape, cleanup. A whole bad evening."
          meta="Crime | multi-phase | high cooldown"
          status="Later"
          title="Heist"
          tone="danger"
        />
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Enterprises</GameText>
        {enterpriseJobs.map((job) => (
          <HubCard
            key={job.title}
            detail={job.detail}
            meta="Bank funded | inventory | long-term state"
            status="Later"
            title={job.title}
            tone="echo"
          />
        ))}
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">The Underworld</GameText>
        <HubCard
          detail="Shell properties, conversion timers, batches, suspicion, raids, and distribution."
          meta="Illegal enterprise | bank setup | raid risk"
          status="Later"
          title="Operations"
          tone="danger"
        />
        <HubCard
          detail="Pick cargo, pick route, dodge inspections, and decide whether to abandon the run."
          meta="Smuggling | route risk | timed cargo"
          status="Later"
          title="Smuggling"
          tone="danger"
        />
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Community Contracts</GameText>
        <HubCard
          detail="Shared city projects funded by player activity, contributions, and Server Bank movement."
          meta="World goal | contributions | shared rewards"
          status="Later"
          title="City Work Orders"
          tone="echo"
        />
      </View>
    </GameScreen>
  );
}
