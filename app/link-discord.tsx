import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  checkDiscordLinkCode,
  createDiscordLinkCode,
  DiscordLinkCodeResponse,
  EchoApiError,
  echoApiBaseUrl,
  isEchoApiConfigured,
} from '@/services/echo-api';

type LinkScreenStatus = 'idle' | 'creating' | 'pending' | 'checking' | 'linked' | 'error';

function LinkButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => Promise<void> | void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: GameTheme.colors.backgroundSoft,
        borderColor: GameTheme.colors.echo,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        opacity: disabled ? 0.42 : pressed ? 0.78 : 1,
        padding: GameTheme.spacing.md,
      })}>
      <GameText tone="echo" variant="label">
        {label}
      </GameText>
    </Pressable>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof EchoApiError) {
    return error.message;
  }

  return 'Something went sideways while talking to Railway.';
}

export default function LinkDiscordScreen() {
  const game = useElsewhereGame();
  const {
    applyRemoteProfile,
    clearLinkedSession,
    linkedProfile,
    refreshRemoteProfile,
    sessionToken,
    setLinkedSession,
  } = game;
  const [linkCode, setLinkCode] = useState<DiscordLinkCodeResponse | null>(null);
  const [message, setMessage] = useState('Generate a code here, then run /link CODE in Discord.');
  const [status, setStatus] = useState<LinkScreenStatus>('idle');

  const generateCode = async () => {
    setStatus('creating');
    setMessage('Asking Railway for a fresh link code...');

    try {
      const response = await createDiscordLinkCode();
      setLinkCode(response);
      setStatus('pending');
      setMessage('Code ready. Run the Discord command, then come back and check the link.');
    } catch (error) {
      setStatus('error');
      setMessage(getErrorMessage(error));
    }
  };

  const checkCode = async () => {
    if (!linkCode) {
      return;
    }

    setStatus('checking');
    setMessage('Checking whether Discord has claimed this code...');

    try {
      const response = await checkDiscordLinkCode(linkCode.linkCode);

      if (response.status === 'linked' && response.profile) {
        if (response.sessionToken) {
          await setLinkedSession(response.sessionToken, response.profile);
        } else {
          applyRemoteProfile(response.profile);
        }
        setStatus('linked');
        setMessage(`Linked as ${response.profile.displayName}. Wallet, bank, heat, and job progress pulled from Railway.`);
        return;
      }

      if (response.status === 'expired') {
        setStatus('idle');
        setLinkCode(null);
        setMessage('That link code expired. Generate a new one and try again.');
        return;
      }

      setStatus('pending');
      setMessage('Still waiting. Run /link with the code in Discord, then check again.');
    } catch (error) {
      setStatus('error');
      setMessage(getErrorMessage(error));
    }
  };

  useEffect(() => {
    if (!linkCode || status !== 'pending') {
      return;
    }

    const controller = new AbortController();
    const interval = setInterval(() => {
      checkDiscordLinkCode(linkCode.linkCode, controller.signal)
        .then((response) => {
          if (response.status === 'linked' && response.profile) {
            if (response.sessionToken) {
              void setLinkedSession(response.sessionToken, response.profile);
            } else {
              applyRemoteProfile(response.profile);
            }
            setStatus('linked');
            setMessage(`Linked as ${response.profile.displayName}. The ledger crossed over.`);
            return;
          }

          if (response.status === 'expired') {
            setStatus('idle');
            setLinkCode(null);
            setMessage('That link code expired. Generate a new one and try again.');
          }
        })
        .catch((error) => {
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
        });
    }, 5000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [applyRemoteProfile, linkCode, setLinkedSession, status]);

  return (
    <GameScreen backgroundAsset="echo" backgroundOpacity={0.18}>
      <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
        <GameText tone="faint" variant="label">
          Railway bridge
        </GameText>
        <GameText variant="display">Link Discord</GameText>
        <GameText tone="muted">
          Connect the app to the Discord bot ledger so money, heat, jail, jobs, and future casino state can transfer both ways.
        </GameText>
      </View>

      <GameCard elevated>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText variant="title">Bridge Status</GameText>
          <GameText tone={isEchoApiConfigured ? 'echo' : 'ember'}>
            {isEchoApiConfigured ? `Railway API: ${echoApiBaseUrl}` : 'Railway API URL is not configured yet.'}
          </GameText>
          {linkedProfile ? (
            <GameText tone="echo">
              Linked to Discord as {linkedProfile.displayName}. Session will restore on launch.
            </GameText>
          ) : null}
          <GameText tone="muted">{message}</GameText>
        </View>

        {linkCode ? (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: GameTheme.colors.backgroundSoft,
              borderColor: GameTheme.colors.violet,
              borderRadius: GameTheme.radius.sm,
              borderWidth: 1,
              gap: GameTheme.spacing.xs,
              padding: GameTheme.spacing.lg,
            }}>
            <GameText tone="faint" variant="label">
              Link Code
            </GameText>
            <GameText selectable tone="echo" variant="display">
              {linkCode.linkCode}
            </GameText>
            <GameText tone="muted">Expires {new Date(linkCode.expiresAt).toLocaleTimeString()}</GameText>
          </View>
        ) : null}

        <View style={{ gap: GameTheme.spacing.sm }}>
          <LinkButton
            disabled={!isEchoApiConfigured || status === 'creating' || status === 'checking'}
            label={linkCode ? 'Generate New Code' : 'Generate Link Code'}
            onPress={generateCode}
          />
          <LinkButton
            disabled={!linkCode || status === 'creating' || status === 'checking' || status === 'linked'}
            label={status === 'checking' ? 'Checking...' : 'Check Link'}
            onPress={checkCode}
          />
          <LinkButton
            disabled={!sessionToken}
            label="Refresh Railway Profile"
            onPress={refreshRemoteProfile}
          />
          <LinkButton
            disabled={!sessionToken}
            label="Unlink This Device"
            onPress={clearLinkedSession}
          />
        </View>
      </GameCard>

      <GameCard>
        <GameText variant="title">Discord Bot Endpoint</GameText>
        <GameText tone="muted">
          The Discord bot should accept /link CODE, send the Discord user ID plus that code to the Railway API, and let the API attach
          the app session to the same profile.
        </GameText>
        <GameText selectable tone="faint" variant="caption">
          Bot calls: POST /v1/link-codes/:code/claim with discord_user_id and display_name
        </GameText>
      </GameCard>
    </GameScreen>
  );
}
