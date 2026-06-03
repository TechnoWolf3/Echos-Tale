import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { ActionCard } from '@/components/game/action-card';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { HubCard } from '@/components/game/hub-card';
import { ProgressBar } from '@/components/game/progress-bar';
import { CrimeJob } from '@/components/jobs/crime-job';
import { EmailSorterJob } from '@/components/jobs/email-sorter-job';
import { FarmingEnterprise } from '@/components/jobs/farming-enterprise';
import { NightWalkerJob } from '@/components/jobs/night-walker-job';
import { ShiftJob } from '@/components/jobs/shift-job';
import { SkillCheckJob } from '@/components/jobs/skill-check-job';
import { TransportContractJob } from '@/components/jobs/transport-contract-job';
import { TruckerJob } from '@/components/jobs/trucker-job';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';

type JobHub = 'community' | 'crime' | 'enterprises' | 'grind' | 'night' | 'underworld' | 'work' | null;

const grindJobs = [
  { detail: 'Fulfill timed orders, build streaks, and pray the supervisor picked another aisle.', title: 'Warehousing' },
  { detail: 'Cast, wait, tug, and manage tension when the water starts acting expensive.', title: 'Fishing' },
  { detail: 'Choose a dig site, go deeper, and decide when the cracks are being dramatic.', title: 'Quarry' },
  { detail: 'Judge passengers, remember routes, and hope the sketchy fare pays in money.', title: 'Taxi Driver' },
];

const enterpriseJobs = [
  { detail: 'Run recipes through production lines, then sell goods or fill contracts.', title: 'Manufacturing' },
];

function hubTitle(activeHub: JobHub) {
  switch (activeHub) {
    case 'work':
      return 'Work a 9-5';
    case 'grind':
      return 'The Grind';
    case 'night':
      return 'Night Walker';
    case 'crime':
      return 'Crime';
    case 'enterprises':
      return 'Enterprises';
    case 'underworld':
      return 'The Underworld';
    case 'community':
      return 'Community Contracts';
    default:
      return 'Job Board';
  }
}

export default function JobsScreen() {
  const game = useElsewhereGame();
  const { refreshRemoteProfileIfStale } = game;
  const [activeHub, setActiveHub] = useState<JobHub>(null);
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
        <GameText variant="display">{hubTitle(activeHub)}</GameText>
        <GameText tone="muted">
          {activeHub
            ? 'Choose the exact shift, job, or bad idea from this branch.'
            : 'Pick a work category first. Payroll has enough problems without every job yelling at once.'}
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

      {!activeHub ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <HubCard
            detail="Safe, normal, slightly suspicious work. Contracts, skill checks, email sorting, shifts, and trucking."
            meta="Transport Contract, Skill Check, Email Sorter, Shift, Trucker"
            onPress={() => setActiveHub('work')}
            status="Open"
            title="Work a 9-5"
            tone="success"
          />
          <HubCard
            detail="Repeatable arcade-style shifts with fatigue, streaks, and the choice to push on."
            meta="Store Clerk, Warehousing, Fishing, Quarry, Taxi Driver"
            onPress={() => setActiveHub('grind')}
            status="Browse"
            title="The Grind"
            tone="success"
          />
          <HubCard
            detail="Late-night social jobs. Charm, risk, boundaries, and awkward consequences."
            meta="Flirt, Performance, Private Client"
            onPress={() => setActiveHub('night')}
            status="Later"
            title="Night Walker"
            tone="ember"
          />
          <HubCard
            detail="Fast money leaves fingerprints. Heat, jail, fines, bribes, and suspicious phone calls."
            meta="Store Robbery, Scam Call, Heist, Bribe Officer, Lay Low"
            onPress={() => setActiveHub('crime')}
            status="Risky"
            title="Crime"
            tone="danger"
          />
          <HubCard
            detail="Long-term bank-funded businesses with inventory, timers, and production."
            meta="Farming, Manufacturing"
            onPress={() => setActiveHub('enterprises')}
            status="Later"
            title="Enterprises"
            tone="echo"
          />
          <HubCard
            detail="Illegal operations, suspicion, raids, distribution, and properties with bad paperwork."
            meta="Operations, Smuggling, Fronts"
            onPress={() => setActiveHub('underworld')}
            status="Later"
            title="The Underworld"
            tone="danger"
          />
          <HubCard
            detail="Shared world projects funded by player activity, contributions, and city movement."
            meta="City Work Orders, contracts, shared rewards"
            onPress={() => setActiveHub('community')}
            status="Later"
            title="Community Contracts"
            tone="echo"
          />
        </View>
      ) : null}

      {activeHub ? (
        <View style={{ alignItems: 'flex-start' }}>
          <CasinoButton onPress={() => setActiveHub(null)} tone="echo">
            Back To Job Board
          </CasinoButton>
        </View>
      ) : null}

      {activeHub === 'work' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <TransportContractJob />
          <SkillCheckJob />
          <EmailSorterJob />
          <ShiftJob />
          <TruckerJob />
          <HubCard
            detail="A rare golden job card after normal work. Short challenge, huge payout, no mercy."
            meta="job_95_legendary | rare spawn | reaction challenge"
            status="Rare"
            title="Legendary Job"
            tone="success"
          />
          <GameCard>
            <GameText variant="title">9-5 Rules</GameText>
            <GameText tone="muted">
              Legal work pays Wallet cash, adds job XP, records a transaction, respects cooldowns, and resolves through the shared ledger once connected.
            </GameText>
          </GameCard>
        </View>
      ) : null}

      {activeHub === 'grind' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
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
      ) : null}

      {activeHub === 'night' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <NightWalkerJob />
        </View>
      ) : null}

      {activeHub === 'crime' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <CrimeJob />
        </View>
      ) : null}

      {activeHub === 'enterprises' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <FarmingEnterprise />
          {enterpriseJobs.map((job) => (
            <HubCard key={job.title} detail={job.detail} meta="Bank funded | inventory | long-term state" status="Later" title={job.title} tone="echo" />
          ))}
        </View>
      ) : null}

      {activeHub === 'underworld' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <HubCard detail="Shell properties, conversion timers, batches, suspicion, raids, and distribution." meta="Illegal enterprise | bank setup | raid risk" status="Later" title="Operations" tone="danger" />
          <HubCard detail="Pick cargo, pick route, dodge inspections, and decide whether to abandon the run." meta="Smuggling | route risk | timed cargo" status="Later" title="Smuggling" tone="danger" />
          <HubCard detail="Legal businesses used to cover illegal money, reduce suspicion, and generate quiet income." meta="Fronts | laundering | suspicion" status="Later" title="Fronts" tone="ember" />
        </View>
      ) : null}

      {activeHub === 'community' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <HubCard detail="Shared city projects funded by player activity, contributions, and world economy movement." meta="World goal | contributions | shared rewards" status="Later" title="City Work Orders" tone="echo" />
        </View>
      ) : null}
    </GameScreen>
  );
}
