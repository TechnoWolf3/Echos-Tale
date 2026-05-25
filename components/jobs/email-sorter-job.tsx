import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ProgressBar } from '@/components/game/progress-bar';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  EmailFolder,
  EmailSortResult,
  EmailSorterResolution,
  EmailSorterSession,
  resolveEmailSorterSession,
  scoreEmailChoice,
  startEmailSorterSession,
} from '@/services/job-service';

const folders: EmailFolder[] = ['Urgent', 'To-Do', 'Spam', 'Scam'];

function formatEmailResult(result: EmailSortResult) {
  return [result.chosen, 'to', result.actual, `(${result.outcome})`].join(' ');
}

export function EmailSorterJob() {
  const game = useElsewhereGame();
  const [session, setSession] = useState<EmailSorterSession | null>(null);
  const [resolution, setResolution] = useState<EmailSorterResolution | null>(null);

  const ready = game.canAct('emailSorter');
  const cooldownLabel = game.getCooldownLabel('emailSorter');
  const currentEmail = session?.emails[session.currentIndex];

  const start = () => {
    if (!ready) {
      return;
    }

    setResolution(null);
    setSession(startEmailSorterSession());
  };

  const chooseFolder = (folder: EmailFolder) => {
    if (!session || !currentEmail || session.status !== 'sorting') {
      return;
    }

    const nextResults = [...session.results, scoreEmailChoice(currentEmail, folder)];
    const nextIndex = session.currentIndex + 1;

    if (nextIndex < session.emails.length) {
      setSession({ ...session, currentIndex: nextIndex, results: nextResults });
      return;
    }

    const result = resolveEmailSorterSession({
      jobLevel: game.jobLevel,
      results: nextResults,
    });

    game.resolveJobReward({
      cooldownId: 'emailSorter',
      cooldownSeconds: 480,
      message: result.message,
      payout: result.payout,
      tone: result.failed ? 'bad' : 'good',
      xp: result.xp,
    });
    setResolution(result);
    setSession({ ...session, currentIndex: nextIndex, results: nextResults, status: 'resolved' });
  };

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Email Sorter</GameText>
        <GameText tone="muted">
          Sort three emails. Scam in Urgent or To-Do ruins the whole shift.
        </GameText>
      </View>

      {!session || session.status === 'resolved' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <Pressable
            accessibilityRole="button"
            disabled={!ready}
            onPress={start}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: ready ? GameTheme.colors.backgroundSoft : GameTheme.colors.panel,
              borderColor: ready ? GameTheme.colors.success : GameTheme.colors.border,
              borderRadius: GameTheme.radius.sm,
              borderWidth: 1,
              opacity: pressed ? 0.78 : ready ? 1 : 0.52,
              padding: GameTheme.spacing.md,
            })}>
            <GameText tone={ready ? 'echo' : 'faint'} variant="label">
              {ready ? 'Sort Inbox' : cooldownLabel}
            </GameText>
          </Pressable>

          {resolution ? (
            <View style={{ gap: GameTheme.spacing.sm }}>
              {resolution.results.map((result) => (
                <GameCard key={result.emailId} style={{ padding: GameTheme.spacing.md }}>
                  <GameText variant="label">{result.subject}</GameText>
                  <GameText tone={result.outcome === 'correct' ? 'echo' : 'ember'} variant="caption">
                    {formatEmailResult(result)}
                  </GameText>
                </GameCard>
              ))}
            </View>
          ) : null}
        </View>
      ) : currentEmail ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <ProgressBar progress={session.currentIndex / session.emails.length} />
          <GameCard style={{ backgroundColor: GameTheme.colors.backgroundSoft }}>
            <GameText tone="faint" variant="caption">
              From
            </GameText>
            <GameText>{currentEmail.from}</GameText>
            <GameText tone="faint" variant="caption">
              Subject
            </GameText>
            <GameText variant="title">{currentEmail.subject}</GameText>
            <GameText tone="muted">{currentEmail.body}</GameText>
          </GameCard>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
            {folders.map((folder) => (
              <Pressable
                accessibilityRole="button"
                key={folder}
                onPress={() => chooseFolder(folder)}
                style={({ pressed }) => ({
                  backgroundColor: GameTheme.colors.backgroundSoft,
                  borderColor: folder === 'Scam' ? GameTheme.colors.danger : GameTheme.colors.borderBright,
                  borderRadius: GameTheme.radius.sm,
                  borderWidth: 1,
                  minWidth: 128,
                  opacity: pressed ? 0.76 : 1,
                  padding: GameTheme.spacing.md,
                })}>
                <GameText style={{ textAlign: 'center' }} tone={folder === 'Scam' ? 'ember' : 'echo'} variant="label">
                  {folder}
                </GameText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <GameText tone="faint" variant="caption">
        job:95:email_sorter | generated emails | 8m cooldown
      </GameText>
    </GameCard>
  );
}
