import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  EchoApiError,
  echoApiBaseUrl,
  echoApiConfigError,
  fetchEchoAdminPanel,
  fetchEchoAdminUsers,
  isEchoApiConfigured,
  reportEchoAdminFailedUnlock,
  runEchoAdminPanelAction,
  type EchoApiAdminUser,
  type EchoApiAdminPanel,
  type EchoApiAdminPanelAction,
  type EchoApiAdminPanelField,
} from '@/services/echo-api';

type FieldValues = Record<string, string | number | boolean>;

const hiddenAdminCategoryIds = new Set(['boards', 'patchboard']);
const hiddenAdminActionPrefixes = ['boards:', 'patchboard:'];

function filterAdminPanel(panel: EchoApiAdminPanel): EchoApiAdminPanel {
  return {
    ...panel,
    categories: panel.categories
      .filter((category) => !hiddenAdminCategoryIds.has(category.id))
      .map((category) => ({
        ...category,
        actions: category.actions.filter((action) =>
          hiddenAdminActionPrefixes.every((prefix) => !action.id.startsWith(prefix))
        ),
      }))
      .filter((category) => category.actions.length > 0),
  };
}

function stringifyResult(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseFieldValue(field: EchoApiAdminPanelField, value: string | number | boolean | undefined) {
  if (field.type === 'boolean') {
    return Boolean(value);
  }

  if (field.type === 'number') {
    return Math.round(Number(String(value ?? '').replace(/[^\d.-]/g, '')) || 0);
  }

  return String(value ?? '').trim();
}

function getInitialFieldValues(action: EchoApiAdminPanelAction | null): FieldValues {
  return Object.fromEntries(
    (action?.fields ?? []).map((field) => [
      field.id,
      field.defaultValue ?? field.options?.[0]?.value ?? (field.type === 'boolean' ? false : ''),
    ])
  );
}

function getAdminUserDiscordId(user: EchoApiAdminUser) {
  return user.discordUserId ?? user.discord_user_id ?? '';
}

function getAdminUserName(user: EchoApiAdminUser) {
  return user.displayName ?? user.display_name ?? user.username ?? 'Unknown Echo User';
}

function getAdminUserAvatar(user: EchoApiAdminUser) {
  return user.avatarUrl ?? user.avatar_url ?? null;
}

function isUserField(field: EchoApiAdminPanelField) {
  return field.type === 'user' || field.id === 'user_id' || field.id === 'discord_user_id';
}

function isCooldownField(field: EchoApiAdminPanelField, action: EchoApiAdminPanelAction | null) {
  const fieldId = field.id.toLowerCase();
  return (
    field.type === 'cooldown' ||
    (fieldId === 'key' && action?.id.toLowerCase().includes('cooldown')) ||
    fieldId === 'cooldown_key'
  );
}

function isConfirmationField(field: EchoApiAdminPanelField) {
  const text = `${field.id} ${field.label} ${field.placeholder ?? ''}`.toLowerCase();
  return text.includes('confirm');
}

export default function SettingsScreen() {
  const game = useElsewhereGame();
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [adminPanel, setAdminPanel] = useState<EchoApiAdminPanel | null>(null);
  const [adminUsers, setAdminUsers] = useState<EchoApiAdminUser[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [userSearchByField, setUserSearchByField] = useState<Record<string, string>>({});
  const [confirmationInput, setConfirmationInput] = useState('');
  const [devBusy, setDevBusy] = useState(false);
  const [failedUnlockCount, setFailedUnlockCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);

  const categories = useMemo(() => adminPanel?.categories ?? [], [adminPanel]);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null,
    [categories, selectedCategoryId]
  );
  const selectedAction = useMemo(
    () => selectedCategory?.actions.find((action) => action.id === selectedActionId) ?? selectedCategory?.actions[0] ?? null,
    [selectedActionId, selectedCategory]
  );
  const unlocked = !!adminPassword && !!adminPanel;

  const visibleFields = useMemo(() => selectedAction?.fields ?? [], [selectedAction]);
  const needsSeparateConfirmation = !!selectedAction?.requiresConfirmation && !visibleFields.some(isConfirmationField);
  const requiredFieldsReady = useMemo(
    () =>
      visibleFields.every((field) => {
        if (!field.required) {
          return true;
        }

        return String(fieldValues[field.id] ?? '').trim().length > 0;
      }),
    [fieldValues, visibleFields]
  );
  const confirmationReady = !needsSeparateConfirmation || confirmationInput.trim() === 'CONFIRM';
  const canRunAction =
    unlocked && !devBusy && !!game.sessionToken && !!selectedAction && requiredFieldsReady && confirmationReady;

  useEffect(() => {
    if (!selectedCategoryId && categories[0]) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (selectedCategory && !selectedCategory.actions.some((action) => action.id === selectedActionId)) {
      setSelectedActionId(selectedCategory.actions[0]?.id ?? null);
    }
  }, [selectedActionId, selectedCategory]);

  useEffect(() => {
    setFieldValues(getInitialFieldValues(selectedAction));
    setUserSearchByField({});
    setConfirmationInput('');
    setResultText(null);
  }, [selectedAction]);

  const getFilteredAdminUsers = (field: EchoApiAdminPanelField) => {
    const query = String(userSearchByField[field.id] ?? '').trim().toLowerCase();

    if (!query) {
      return adminUsers.slice(0, 12);
    }

    return adminUsers
      .filter((user) => {
        const discordId = getAdminUserDiscordId(user);
        const name = getAdminUserName(user);
        return `${name} ${discordId}`.toLowerCase().includes(query);
      })
      .slice(0, 12);
  };

  const unlockAdminPanel = async () => {
    const password = devPasswordInput.trim();

    if (!isEchoApiConfigured) {
      setMessage(echoApiConfigError);
      return;
    }

    if (!game.sessionToken) {
      setMessage('Link Discord before unlocking admin tools.');
      return;
    }

    if (!password) {
      setMessage('Enter the dev password for this session.');
      return;
    }

    setDevBusy(true);
    setResultText(null);

    try {
      const panel = filterAdminPanel(await fetchEchoAdminPanel(game.sessionToken, password));
      setAdminPassword(password);
      setAdminPanel(panel);
      setSelectedCategoryId(panel.categories[0]?.id ?? null);
      setSelectedActionId(panel.categories[0]?.actions[0]?.id ?? null);
      setFailedUnlockCount(0);
      game.setDevToolsUnlocked(true);
      setMessage(panel.message ?? 'Admin tools unlocked for this app session.');

      const usersResponse = await fetchEchoAdminUsers(game.sessionToken, password).catch(() => null);
      setAdminUsers(usersResponse?.users ?? []);
    } catch (error) {
      if (error instanceof EchoApiError && error.status === 404) {
        setAdminPassword(null);
        setAdminPanel(null);
        game.setDevToolsUnlocked(false);
        game.setShowJailDevTools(false);
        setMessage('The admin panel is not available yet, so the password cannot be validated.');
      } else if (error instanceof EchoApiError) {
        setAdminPassword(null);
        setAdminPanel(null);
        game.setDevToolsUnlocked(false);
        game.setShowJailDevTools(false);
        if (error.status === 401 || error.status === 403) {
          const nextFailedCount = failedUnlockCount + 1;

          setFailedUnlockCount((current) => {
            const nextCount = current + 1;
            return nextCount;
          });
          setMessage(error.message);

          if (game.sessionToken) {
            const failedUnlock = await reportEchoAdminFailedUnlock(game.sessionToken, nextFailedCount).catch(() => null);

            if (failedUnlock?.profile) {
              game.applyRemoteProfile(failedUnlock.profile, { announce: false });
            } else if (failedUnlock?.illusion) {
              await game.refreshRemoteProfile();
            }

            if (failedUnlock?.message) {
              setMessage(failedUnlock.message);
            }
          }
        } else {
          setMessage(error.message);
        }
      } else {
        setMessage('Admin unlock failed.');
      }
    } finally {
      setDevBusy(false);
    }
  };

  const lockAdminPanel = () => {
    setAdminPassword(null);
    setDevPasswordInput('');
    setAdminPanel(null);
    setAdminUsers([]);
    setSelectedCategoryId(null);
    setSelectedActionId(null);
    setFieldValues({});
    setUserSearchByField({});
    setConfirmationInput('');
    setFailedUnlockCount(0);
    setResultText(null);
    game.setDevToolsUnlocked(false);
    game.setShowJailDevTools(false);
    setMessage('Admin tools locked. Reloading the app also clears access.');
  };

  const runSelectedAction = async () => {
    if (!adminPassword || !game.sessionToken || !selectedAction) {
      return;
    }

    const payload = Object.fromEntries(
      visibleFields.map((field) => [field.id, parseFieldValue(field, fieldValues[field.id])])
    ) as FieldValues;

    setDevBusy(true);
    setResultText(null);

    try {
      const response = await runEchoAdminPanelAction(game.sessionToken, adminPassword, selectedAction.id, payload);

      if (response.profile) {
        game.applyRemoteProfile(response.profile, { announce: false });
      } else {
        await game.refreshRemoteProfile();
      }

      setMessage(response.message ?? `${selectedAction.label} completed.`);
      setResultText(stringifyResult(response.result ?? response.data));
    } catch (error) {
      setMessage(error instanceof EchoApiError ? error.message : 'Admin action failed.');
    } finally {
      setDevBusy(false);
    }
  };

  const refreshProfile = async () => {
    await game.refreshRemoteProfile();
    setMessage('Profile refresh requested.');
  };

  const unlinkDiscord = async () => {
    lockAdminPanel();
    await game.clearLinkedSession();
    setMessage('Discord bridge unlinked on this device.');
    router.replace('/');
  };

  return (
    <GameScreen backgroundAsset="echo" backgroundOpacity={0.18}>
      <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
        <GameText tone="faint" variant="label">
          Echo of Elsewhere
        </GameText>
        <GameText variant="display">Settings</GameText>
        <GameText tone="muted">Device controls, bridge status, and admin access.</GameText>
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
                Last sync: {game.lastSyncedAt ? new Date(game.lastSyncedAt).toLocaleString() : 'Waiting for the ledger'}
              </GameText>
            </>
          ) : (
            <GameText tone="muted">
              Not linked. Use the Discord bridge link flow when you want this device connected to the shared ledger.
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
            Enter the dev password to unlock admin tools for this app session only. Reloading the app clears access.
          </GameText>
          <GameText tone={isEchoApiConfigured ? 'faint' : 'ember'} variant="caption">
            {isEchoApiConfigured ? `API: ${echoApiBaseUrl}` : echoApiConfigError}
          </GameText>
        </View>

        {!unlocked ? (
          <>
            <TextInput
              accessibilityLabel="Backend dev password"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setDevPasswordInput}
              onSubmitEditing={() => void unlockAdminPanel()}
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
            <CasinoButton disabled={devBusy || !devPasswordInput.trim()} onPress={() => void unlockAdminPanel()} tone="echo">
              Unlock Tools
            </CasinoButton>
          </>
        ) : (
          <>
            <GameText tone="echo" variant="caption">
              Unlocked for this app session.
            </GameText>
            <CasinoButton onPress={lockAdminPanel} tone="plain">
              Lock Tools
            </CasinoButton>
          </>
        )}
      </GameCard>

      {unlocked ? (
        <GameCard elevated>
          <View style={{ gap: GameTheme.spacing.sm }}>
            <View style={{ gap: GameTheme.spacing.xs }}>
              <GameText variant="title">Dev Tools</GameText>
              <GameText tone="muted">
                Jail preview is only available after the dev password unlock. This does not put the player into Jail Mode.
              </GameText>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              <CasinoButton
                onPress={() => {
                  const nextValue = !game.showJailDevTools;
                  game.setShowJailDevTools(nextValue);
                  setMessage(nextValue ? 'Jail dev preview enabled. The Jail tab is visible for this app session.' : 'Jail dev preview hidden.');
                }}
                tone={game.showJailDevTools ? 'ember' : 'echo'}>
                {game.showJailDevTools ? 'Hide Jail' : 'Show Jail'}
              </CasinoButton>
              {game.showJailDevTools ? (
                <CasinoButton onPress={() => router.push('/jail')} tone="plain">
                  Open Jail
                </CasinoButton>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              {categories.map((category) => (
                <CasinoButton
                  key={category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                  tone={category.id === selectedCategory?.id ? 'echo' : 'plain'}>
                  {category.label}
                </CasinoButton>
              ))}
            </View>

            {selectedCategory?.description ? <GameText tone="muted">{selectedCategory.description}</GameText> : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              {selectedCategory?.actions.map((action) => (
                <CasinoButton
                  key={action.id}
                  onPress={() => setSelectedActionId(action.id)}
                  tone={action.id === selectedAction?.id ? (action.requiresConfirmation ? 'ember' : 'echo') : 'plain'}>
                  {action.label}
                </CasinoButton>
              ))}
            </View>
          </View>

          {selectedAction ? (
            <View style={{ gap: GameTheme.spacing.md }}>
              <View style={{ gap: GameTheme.spacing.xs }}>
                <GameText variant="title">{selectedAction.label}</GameText>
                <GameText tone="faint" variant="caption">
                  {selectedAction.id}
                </GameText>
                {selectedAction.description ? <GameText tone="muted">{selectedAction.description}</GameText> : null}
              </View>

              {visibleFields.map((field) => (
                <View key={field.id} style={{ gap: GameTheme.spacing.xs }}>
                  <GameText tone="faint" variant="caption">
                    {field.label}{field.required ? ' *' : ''}
                  </GameText>
                  {field.type === 'boolean' ? (
                    <CasinoButton
                      onPress={() => setFieldValues((current) => ({ ...current, [field.id]: !current[field.id] }))}
                      tone={fieldValues[field.id] ? 'echo' : 'plain'}>
                      {fieldValues[field.id] ? 'Enabled' : 'Disabled'}
                    </CasinoButton>
                  ) : isUserField(field) && adminUsers.length ? (
                    <View style={{ gap: GameTheme.spacing.sm }}>
                      <TextInput
                        accessibilityLabel={`${field.label} search`}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={(value) => setUserSearchByField((current) => ({ ...current, [field.id]: value }))}
                        placeholder="Search Echo users"
                        placeholderTextColor={GameTheme.colors.textFaint}
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
                        value={String(userSearchByField[field.id] ?? '')}
                      />
                      <TextInput
                        accessibilityLabel={field.label}
                        inputMode="text"
                        onChangeText={(value) => setFieldValues((current) => ({ ...current, [field.id]: value.trim() }))}
                        placeholder="Discord ID"
                        placeholderTextColor={GameTheme.colors.textFaint}
                        style={{
                          backgroundColor: GameTheme.colors.backgroundSoft,
                          borderColor: GameTheme.colors.border,
                          borderRadius: GameTheme.radius.sm,
                          borderWidth: 1,
                          color: GameTheme.colors.text,
                          fontSize: 16,
                          paddingHorizontal: GameTheme.spacing.md,
                          paddingVertical: GameTheme.spacing.sm,
                        }}
                        value={String(fieldValues[field.id] ?? '')}
                      />
                      <View style={{ gap: GameTheme.spacing.sm }}>
                        {getFilteredAdminUsers(field).map((user) => {
                          const discordId = getAdminUserDiscordId(user);
                          const name = getAdminUserName(user);
                          const avatar = getAdminUserAvatar(user);
                          const selected = fieldValues[field.id] === discordId;

                          return (
                            <Pressable
                              accessibilityRole="button"
                              key={discordId || user.profileId || user.profile_id || name}
                              onPress={() => {
                                setFieldValues((current) => ({ ...current, [field.id]: discordId }));
                                setUserSearchByField((current) => ({ ...current, [field.id]: name }));
                              }}
                              style={({ pressed }) => ({
                                backgroundColor: GameTheme.colors.backgroundSoft,
                                borderColor: selected ? GameTheme.colors.echo : GameTheme.colors.border,
                                borderRadius: GameTheme.radius.sm,
                                borderWidth: 1,
                                opacity: pressed ? 0.76 : 1,
                                padding: GameTheme.spacing.sm,
                              })}>
                              <View style={{ alignItems: 'center', flexDirection: 'row', gap: GameTheme.spacing.sm }}>
                                {avatar ? (
                                  <Image
                                    accessibilityIgnoresInvertColors
                                    contentFit="cover"
                                    source={{ uri: avatar }}
                                    style={{ borderRadius: 18, height: 36, width: 36 }}
                                  />
                                ) : null}
                                <View style={{ minWidth: 0 }}>
                                  <GameText tone={selected ? 'echo' : 'primary'} variant="label">
                                    {name}
                                  </GameText>
                                  <GameText tone="faint" variant="caption">
                                    {discordId || 'No Discord ID returned'}
                                  </GameText>
                                </View>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : isCooldownField(field, selectedAction) && field.options?.length ? (
                    <View style={{ gap: GameTheme.spacing.sm }}>
                      <TextInput
                        accessibilityLabel={field.label}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={(value) => setFieldValues((current) => ({ ...current, [field.id]: value.trim() }))}
                        placeholder="Cooldown key"
                        placeholderTextColor={GameTheme.colors.textFaint}
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
                        value={String(fieldValues[field.id] ?? '')}
                      />
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                        {field.options.map((option) => (
                          <CasinoButton
                            key={option.value}
                            onPress={() => setFieldValues((current) => ({ ...current, [field.id]: option.value }))}
                            tone={fieldValues[field.id] === option.value ? 'echo' : 'plain'}>
                            {option.label}
                          </CasinoButton>
                        ))}
                      </View>
                    </View>
                  ) : field.type === 'select' && field.options?.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                      {field.options.map((option) => (
                        <CasinoButton
                          key={option.value}
                          onPress={() => setFieldValues((current) => ({ ...current, [field.id]: option.value }))}
                          tone={fieldValues[field.id] === option.value ? 'echo' : 'plain'}>
                          {option.label}
                        </CasinoButton>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      accessibilityLabel={field.label}
                      inputMode={field.type === 'number' ? 'numeric' : 'text'}
                      multiline={field.type === 'textarea'}
                      onChangeText={(value) => setFieldValues((current) => ({ ...current, [field.id]: value }))}
                      placeholder={field.placeholder ?? field.label}
                      placeholderTextColor={GameTheme.colors.textFaint}
                      style={{
                        backgroundColor: GameTheme.colors.backgroundSoft,
                        borderColor: GameTheme.colors.borderBright,
                        borderRadius: GameTheme.radius.sm,
                        borderWidth: 1,
                        color: GameTheme.colors.text,
                        fontSize: 16,
                        minHeight: field.type === 'textarea' ? 92 : undefined,
                        paddingHorizontal: GameTheme.spacing.md,
                        paddingVertical: GameTheme.spacing.sm,
                        textAlignVertical: field.type === 'textarea' ? 'top' : 'center',
                      }}
                      value={String(fieldValues[field.id] ?? '')}
                    />
                  )}
                  {field.helpText ? (
                    <GameText tone="faint" variant="caption">
                      {field.helpText}
                    </GameText>
                  ) : null}
                </View>
              ))}

              {needsSeparateConfirmation ? (
                <View style={{ gap: GameTheme.spacing.xs }}>
                  <GameText tone="ember" variant="caption">
                    Type CONFIRM to run this action.
                  </GameText>
                  <TextInput
                    accessibilityLabel="Action confirmation"
                    autoCapitalize="characters"
                    onChangeText={setConfirmationInput}
                    placeholder="CONFIRM"
                    placeholderTextColor={GameTheme.colors.textFaint}
                    style={{
                      backgroundColor: GameTheme.colors.backgroundSoft,
                      borderColor: GameTheme.colors.ember,
                      borderRadius: GameTheme.radius.sm,
                      borderWidth: 1,
                      color: GameTheme.colors.text,
                      fontSize: 16,
                      paddingHorizontal: GameTheme.spacing.md,
                      paddingVertical: GameTheme.spacing.sm,
                    }}
                    value={confirmationInput}
                  />
                </View>
              ) : null}

              <CasinoButton disabled={!canRunAction} onPress={() => void runSelectedAction()} tone="echo">
                Run Action
              </CasinoButton>
            </View>
          ) : null}
        </GameCard>
      ) : null}

      {message ? (
        <GameCard style={{ padding: GameTheme.spacing.md }}>
          <GameText tone="echo">{message}</GameText>
        </GameCard>
      ) : null}

      {resultText ? (
        <GameCard style={{ padding: GameTheme.spacing.md }}>
          <GameText tone="faint" variant="caption">
            Result
          </GameText>
          <GameText selectable style={{ fontFamily: 'monospace' }}>
            {resultText}
          </GameText>
        </GameCard>
      ) : null}
    </GameScreen>
  );
}
