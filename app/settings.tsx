import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';

export default function SettingsScreen() {
  const game = useElsewhereGame();
  const [devPasswordInput, setDevPasswordInput] = useState(game.devPassword ?? '');
  const [message, setMessage] = useState<string | null>(null);

  const savePassword = async () => {
    await game.saveDevPassword(devPasswordInput);
    setMessage(devPasswordInput.trim() ? 'Dev password saved for this device.' : 'Dev password cleared.');
  };

  const clearPassword = async () => {
    setDevPasswordInput('');
    await game.clearDevPassword();
    setMessage('Dev password cleared.');
  };

  const unlinkDiscord = async () => {
    await game.clearLinkedSession();
    setMessage('Discord bridge unlinked on this device.');
    router.replace('/');
  };

  const refreshProfile = async () => {
    await game.refreshRemoteProfile();
    setMessage('Railway profile refresh requested.');
  };

  return (
    <GameScreen backgroundAsset="echo" backgroundOpacity={0.18}>
      <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
        <GameText tone="faint" variant="label">
          Echo of Elsewhere
        </GameText>
        <GameText variant="display">Settings</GameText>
        <GameText tone="muted">
          Device controls, bridge status, and future backend access.
        </GameText>
      </View>

      <GameCard elevated>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText variant="title">Discord Bridge</GameText>
          {game.sessionToken ? (
            <>
              <GameText tone="echo">
                Linked{game.linkedProfile ? ` as ${game.linkedProfile.displayName}` : ''}. The app will restore this session on launch.
              </GameText>
              <GameText tone="faint">
                Last sync: {game.lastSyncedAt ? new Date(game.lastSyncedAt).toLocaleString() : 'Waiting for Railway'}
              </GameText>
            </>
          ) : (
            <GameText tone="muted">
              Not linked. Use the Discord bridge link flow when you want this device connected to Railway.
            </GameText>
          )}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          <CasinoButton disabled={!game.sessionToken} onPress={refreshProfile} tone="echo">
            Refresh Profile
          </CasinoButton>
          <CasinoButton disabled={!game.sessionToken} onPress={unlinkDiscord} tone="ember">
            Unlink Discord
          </CasinoButton>
          <CasinoButton onPress={() => router.push('/link-discord')} tone="plain">
            Link Flow
          </CasinoButton>
        </View>
      </GameCard>

      <GameCard>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText variant="title">Backend Dev Access</GameText>
          <GameText tone="muted">
            Store the dev password here now. Future backend controls can read it when those tools are added.
          </GameText>
        </View>

        <TextInput
          accessibilityLabel="Backend dev password"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setDevPasswordInput}
          placeholder="Dev password"
          placeholderTextColor={GameTheme.colors.textFaint}
          secureTextEntry
          style={{
            backgroundColor: GameTheme.colors.backgroundSoft,
            borderColor: GameTheme.colors.borderBright,
            borderRadius: GameTheme.radius.sm,
            borderWidth: 1,
            color: GameTheme.colors.text,
            fontSize: 16,
            paddingHorizontal: GameTheme.spacing.md,
            paddingVertical: GameTheme.spacing.sm,
          }}
          value={devPasswordInput}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          <CasinoButton onPress={savePassword} tone="echo">
            Save Password
          </CasinoButton>
          <CasinoButton disabled={!game.devPassword && !devPasswordInput} onPress={clearPassword} tone="plain">
            Clear
          </CasinoButton>
        </View>

        <GameText tone={game.devPassword ? 'echo' : 'faint'} variant="caption">
          {game.devPassword ? 'Dev password is stored on this device.' : 'No dev password stored.'}
        </GameText>
      </GameCard>

      {message ? (
        <GameCard style={{ padding: GameTheme.spacing.md }}>
          <GameText tone="echo">{message}</GameText>
        </GameCard>
      ) : null}
    </GameScreen>
  );
}
