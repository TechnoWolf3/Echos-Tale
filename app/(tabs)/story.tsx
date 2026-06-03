import { View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { storyChapters } from '@/data/story';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import { createEmptyStoryProgress } from '@/services/story-api';

const publicSignalRows = [
  ['Status', 'Story Mode is forming...'],
  ['Signal', 'Incomplete'],
  ['Bridge', 'Listening'],
  ['Fragments', 'Unknown'],
] as const;

export default function StoryScreen() {
  const game = useElsewhereGame();
  const progress = createEmptyStoryProgress(game.linkedProfile?.profileId ?? null);

  if (!game.isDevToolsUnlocked) {
    return (
      <GameScreen backgroundAsset="echo" backgroundOpacity={0.24}>
        <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
          <GameText tone="faint" variant="label">
            Echo's Tale
          </GameText>
          <GameText variant="display">Echo's Tale</GameText>
        </View>

        <GameCard elevated>
          <View style={{ gap: GameTheme.spacing.md }}>
            <GameText>Echo has gone quiet here.</GameText>
            <View style={{ gap: 2 }}>
              <GameText tone="muted">Not absent.</GameText>
              <GameText tone="muted">Not broken.</GameText>
            </View>
            <GameText tone="echo" variant="title">
              Thinking.
            </GameText>
            <GameText tone="muted">
              Somewhere behind this screen, something is being assembled piece by piece - a memory, a door,
              a mistake, or maybe the first page of a story that was never supposed to be opened.
            </GameText>
            <GameText tone="muted">For now, the signal is incomplete.</GameText>
            <GameText tone="echo">But Echo is still listening.</GameText>
          </View>
        </GameCard>

        <GameCard>
          <View style={{ gap: GameTheme.spacing.sm }}>
            {publicSignalRows.map(([label, value]) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  gap: GameTheme.spacing.md,
                  justifyContent: 'space-between',
                }}>
                <GameText tone="faint" variant="label">
                  {label}
                </GameText>
                <GameText tone={label === 'Status' || label === 'Bridge' ? 'echo' : 'muted'}>
                  {value}
                </GameText>
              </View>
            ))}
          </View>
        </GameCard>

        <CasinoButton disabled onPress={() => undefined} tone="plain">
          The signal is not ready
        </CasinoButton>

        <GameText style={{ textAlign: 'center' }} tone="faint">
          Check back later. The page may remember you.
        </GameText>
      </GameScreen>
    );
  }

  return (
    <GameScreen backgroundAsset="echo" backgroundOpacity={0.2}>
      <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
        <GameText tone="faint" variant="label">
          Dev Story Preview
        </GameText>
        <GameText variant="display">Echo's Tale</GameText>
        <GameText tone="muted">
          Story Mode foundation is visible because the dev password is active for this app session.
        </GameText>
      </View>

      <GameCard elevated>
        <GameText variant="title">Progress Skeleton</GameText>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText tone="muted">Profile: {progress.profileId ?? 'local preview'}</GameText>
          <GameText tone="muted">Active chapter: {progress.activeChapterId ?? 'none'}</GameText>
          <GameText tone="muted">Active scene: {progress.activeSceneId ?? 'none'}</GameText>
        </View>
      </GameCard>

      {storyChapters.map((chapter) => (
        <GameCard key={chapter.id}>
          <View style={{ gap: GameTheme.spacing.xs }}>
            <GameText tone="faint" variant="label">
              Chapter {chapter.order.toString().padStart(2, '0')} | {chapter.status}
            </GameText>
            <GameText variant="title">{chapter.title}</GameText>
            <GameText tone="muted">{chapter.description}</GameText>
          </View>

          {chapter.scenes.map((scene) => (
            <View key={scene.id} style={{ gap: GameTheme.spacing.sm }}>
              <GameText tone="echo" variant="label">
                {scene.title}
              </GameText>
              {scene.dialogue.map((line) => (
                <GameText key={line.id} tone={line.speaker === 'echo' ? 'echo' : 'muted'}>
                  {line.speaker}: {line.text}
                </GameText>
              ))}
              {scene.choices?.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  {scene.choices.map((choice) => (
                    <CasinoButton disabled key={choice.id} onPress={() => undefined} tone="plain">
                      {choice.label}
                    </CasinoButton>
                  ))}
                </View>
              ) : null}
            </View>
          ))}

          {chapter.unlocks?.length ? (
            <View style={{ gap: GameTheme.spacing.xs }}>
              <GameText tone="faint" variant="label">
                Future Unlocks
              </GameText>
              {chapter.unlocks.map((unlock) => (
                <GameText key={unlock.id} tone="muted">
                  {unlock.name}: {unlock.description}
                </GameText>
              ))}
            </View>
          ) : null}
        </GameCard>
      ))}
    </GameScreen>
  );
}
