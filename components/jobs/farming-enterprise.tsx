import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ProgressBar } from '@/components/game/progress-bar';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  buyFarmingField,
  EchoApiError,
  EchoApiFarmField,
  EchoApiFarmingActionResponse,
  EchoApiFarmingOverview,
  echoApiBaseUrl,
  fetchFarmingConfig,
  fetchFarmingOverview,
  sellFarmingMarketItem,
  startFarmingBarnAction,
  startFarmingFieldAction,
} from '@/services/echo-api';

type FarmingTab = 'fields' | 'barns' | 'machines' | 'market' | 'store';

const tabs: { id: FarmingTab; label: string }[] = [
  { id: 'fields', label: 'Fields' },
  { id: 'barns', label: 'Barns' },
  { id: 'machines', label: 'Machines' },
  { id: 'market', label: 'Market' },
  { id: 'store', label: 'Store' },
];

const maxFieldsFallback = 6;

function toMillis(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function formatDateTime(value: number | string | null | undefined) {
  const millis = toMillis(value);

  if (!millis) {
    return 'Not set';
  }

  return new Date(millis).toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
  }

  return `${remainingSeconds}s`;
}

function titleCase(value: string | null | undefined) {
  if (!value) {
    return 'Unknown';
  }

  return value
    .replace(/[_-]/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function getCountdownLabel(value: number | string | null | undefined, now: number) {
  const millis = toMillis(value);

  if (!millis) {
    return null;
  }

  if (millis <= now) {
    return 'Refresh to roll over';
  }

  return formatDuration(millis - now);
}

function getFieldSize(field: EchoApiFarmField) {
  const level = field.level ?? 1;
  return Math.max(3, level + 2);
}

function getFieldProgress(field: EchoApiFarmField, now: number) {
  const plantedAt = toMillis(field.plantedAt);
  const readyAt = toMillis(field.readyAt);

  if (!plantedAt || !readyAt || readyAt <= plantedAt) {
    return field.state === 'ready' ? 1 : 0;
  }

  return (now - plantedAt) / (readyAt - plantedAt);
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: GameTheme.spacing.sm, justifyContent: 'space-between' }}>
      <GameText tone="muted">{label}</GameText>
      <GameText selectable style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </GameText>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? GameTheme.colors.echoDeep : GameTheme.colors.backgroundSoft,
        borderColor: selected ? GameTheme.colors.echo : GameTheme.colors.border,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        opacity: pressed ? 0.76 : 1,
        paddingHorizontal: GameTheme.spacing.sm,
        paddingVertical: GameTheme.spacing.xs,
      })}>
      <GameText tone={selected ? 'primary' : 'muted'} variant="label">
        {label}
      </GameText>
    </Pressable>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <GameCard>
      <GameText tone="muted">{message}</GameText>
    </GameCard>
  );
}

export function FarmingEnterprise() {
  const game = useElsewhereGame();
  const [overview, setOverview] = useState<EchoApiFarmingOverview | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<FarmingTab>('fields');
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = useMemo(() => overview?.farm.fields ?? [], [overview?.farm.fields]);
  const barns = useMemo(() => fields.filter((field) => field.kind === 'barn'), [fields]);
  const cropFields = useMemo(() => fields.filter((field) => field.kind !== 'barn'), [fields]);
  const maxFields = typeof config?.maxFields === 'number' ? config.maxFields : maxFieldsFallback;

  const loadFarm = useCallback(
    async (signal?: AbortSignal) => {
      if (!game.sessionToken) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [nextOverview, nextConfig] = await Promise.all([
          fetchFarmingOverview(game.sessionToken, signal),
          fetchFarmingConfig(game.sessionToken, signal).catch(() => null),
        ]);

        setOverview(nextOverview);
        setConfig(nextConfig);

        if (nextOverview.profile) {
          game.applyRemoteProfile(nextOverview.profile, { announce: false });
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        setError(loadError instanceof EchoApiError ? loadError.message : 'Farming could not be loaded from Railway.');
      } finally {
        setLoading(false);
      }
    },
    [game]
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadFarm(controller.signal);

    return () => controller.abort();
  }, [loadFarm]);

  const applyActionResponse = useCallback(
    (response: EchoApiFarmingActionResponse) => {
      setOverview(response);
      setNotice(response.message);

      if (response.profile) {
        game.applyRemoteProfile(response.profile, { announce: false });
      }
    },
    [game]
  );

  const runAction = useCallback(
    async (key: string, action: () => Promise<EchoApiFarmingActionResponse>) => {
      setBusyKey(key);
      setError(null);
      setNotice(null);

      try {
        applyActionResponse(await action());
      } catch (actionError) {
        setError(actionError instanceof EchoApiError ? actionError.message : 'Railway rejected that farming action.');
      } finally {
        setBusyKey(null);
      }
    },
    [applyActionResponse]
  );

  const fieldSummary = useMemo(() => {
    const activeTasks = fields.filter((field) => field.task).length;
    const readyCrops = cropFields.filter((field) => field.state === 'ready').length;

    return { activeTasks, readyCrops };
  }, [cropFields, fields]);

  if (!game.sessionToken) {
    return (
      <GameCard>
        <GameText variant="title">Farming</GameText>
        <GameText tone="muted">
          Link Discord first. Farms, machines, inventory, crops, barns, timers, and money all live on Railway.
        </GameText>
      </GameCard>
    );
  }

  return (
    <View style={{ gap: GameTheme.spacing.md }}>
      <GameCard elevated>
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText variant="title">Farming</GameText>
          <GameText tone="muted">
            Railway is the ledger here. The app renders the returned farm state and sends every action back to the API.
          </GameText>
        </View>

        <View style={{ gap: GameTheme.spacing.sm }}>
          <StatRow label="Season" value={titleCase(overview?.season?.current ?? overview?.season?.name ?? overview?.weather?.season)} />
          <StatRow label="Weather" value={overview?.weather?.headline ?? overview?.weather?.baseWeather ?? 'Loading'} />
          <StatRow label="API Route" value={echoApiBaseUrl || 'Not configured'} />
          <StatRow label="Fields" value={`${fields.length}/${maxFields}`} />
          <StatRow label="Active Tasks" value={String(fieldSummary.activeTasks)} />
          <StatRow label="Ready Crops" value={String(fieldSummary.readyCrops)} />
          <StatRow label="Next Field" value={overview?.nextFieldCost ? formatMoney(overview.nextFieldCost) : 'Railway priced'} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          <CasinoButton disabled={loading || busyKey !== null} onPress={() => void loadFarm()} tone="echo">
            Refresh Farm
          </CasinoButton>
          <CasinoButton
            disabled={loading || busyKey !== null || fields.length >= maxFields}
            onPress={() => void runAction('buy-field', () => buyFarmingField(game.sessionToken!))}
            tone="ember">
            Buy Field
          </CasinoButton>
        </View>

        {notice ? <GameText tone="echo">{notice}</GameText> : null}
        {error ? <GameText selectable tone="ember">{error}</GameText> : null}
      </GameCard>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {tabs.map((item) => (
          <Chip key={item.id} label={item.label} onPress={() => setTab(item.id)} selected={tab === item.id} />
        ))}
      </View>

      {tab === 'fields' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {cropFields.length === 0 ? <EmptyState message="No crop fields returned by Railway yet." /> : null}
          {cropFields.map((field, index) => {
            const taskLabel = field.task?.key ? `${titleCase(field.task.key)}: ${getCountdownLabel(field.task.endsAt, game.now) ?? 'Queued'}` : 'Idle';
            const readyLabel = field.state === 'growing' ? getCountdownLabel(field.readyAt, game.now) : null;

            return (
              <GameCard key={`field-${index}`}>
                <View style={{ gap: GameTheme.spacing.xs }}>
                  <GameText variant="title">Field {index + 1}</GameText>
                  <GameText tone="muted">
                    {titleCase(field.cropId)} | {titleCase(field.state)} | {getFieldSize(field)}x{getFieldSize(field)}
                  </GameText>
                </View>
                <ProgressBar progress={getFieldProgress(field, game.now)} />
                <View style={{ gap: GameTheme.spacing.sm }}>
                  <StatRow label="Level" value={String(field.level ?? 1)} />
                  <StatRow label="Cultivated" value={field.cultivated ? 'Yes' : 'No'} />
                  <StatRow label="Task" value={taskLabel} />
                  <StatRow label="Ready" value={readyLabel ?? formatDateTime(field.readyAt)} />
                  <StatRow label="Soil" value={typeof field.soilHealth === 'number' ? `${field.soilHealth}%` : 'Railway managed'} />
                  <StatRow label="Rotation" value={`${titleCase(field.lastCropFamily)} x${field.sameFamilyStreak ?? 0}`} />
                </View>
                {field.cropWeatherEffect || field.fieldCondition ? (
                  <GameText tone="ember">
                    Weather effect active: {titleCase(String(field.cropWeatherEffect ?? field.fieldCondition))}
                  </GameText>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  <CasinoButton
                    disabled={busyKey !== null || !!field.task}
                    onPress={() => void runAction(`cultivate-${index}`, () => startFarmingFieldAction(game.sessionToken!, index, 'cultivate'))}>
                    Cultivate
                  </CasinoButton>
                  <CasinoButton
                    disabled={busyKey !== null || !!field.task}
                    onPress={() => void runAction(`harvest-${index}`, () => startFarmingFieldAction(game.sessionToken!, index, 'harvest'))}
                    tone="echo">
                    Harvest
                  </CasinoButton>
                  <CasinoButton
                    disabled={busyKey !== null || !!field.task}
                    onPress={() => void runAction(`rest-${index}`, () => startFarmingFieldAction(game.sessionToken!, index, 'rest'))}>
                    Rest
                  </CasinoButton>
                  <CasinoButton
                    disabled={busyKey !== null || !!field.task}
                    onPress={() => void runAction(`upgrade-${index}`, () => startFarmingFieldAction(game.sessionToken!, index, 'upgrade'))}
                    tone="ember">
                    Upgrade
                  </CasinoButton>
                </View>
              </GameCard>
            );
          })}
        </View>
      ) : null}

      {tab === 'barns' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {barns.length === 0 ? <EmptyState message="No barns returned by Railway yet." /> : null}
          {fields.map((field, index) =>
            field.kind === 'barn' ? (
              <GameCard key={`barn-${index}`}>
                <View style={{ gap: GameTheme.spacing.xs }}>
                  <GameText variant="title">{titleCase(field.livestockType)} Barn</GameText>
                  <GameText tone="muted">Field slot {index + 1}</GameText>
                </View>
                <View style={{ gap: GameTheme.spacing.sm }}>
                  <StatRow label="Level" value={String(field.level ?? 1)} />
                  <StatRow label="Animals" value={`${field.animalCount ?? 0}/${field.capacity ?? 'Railway capacity'}`} />
                  <StatRow label="Adults" value={String(field.adultCount ?? 0)} />
                  <StatRow label="Last Collected" value={formatDateTime(field.lastCollectedAt)} />
                  <StatRow label="Task" value={field.task?.key ? `${titleCase(field.task.key)}: ${getCountdownLabel(field.task.endsAt, game.now) ?? 'Queued'}` : 'Idle'} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  <CasinoButton
                    disabled={busyKey !== null || !!field.task}
                    onPress={() => void runAction(`collect-${index}`, () => startFarmingBarnAction(game.sessionToken!, index, 'collect'))}
                    tone="echo">
                    Collect
                  </CasinoButton>
                  <CasinoButton
                    disabled={busyKey !== null || !!field.task}
                    onPress={() => void runAction(`restock-${index}`, () => startFarmingBarnAction(game.sessionToken!, index, 'restock'))}>
                    Restock
                  </CasinoButton>
                  <CasinoButton
                    disabled={busyKey !== null || !!field.task}
                    onPress={() => void runAction(`elderly-${index}`, () => startFarmingBarnAction(game.sessionToken!, index, 'slaughter-elderly'))}
                    tone="ember">
                    Cull Elderly
                  </CasinoButton>
                  <CasinoButton
                    disabled={busyKey !== null || !!field.task}
                    onPress={() => void runAction(`barn-upgrade-${index}`, () => startFarmingBarnAction(game.sessionToken!, index, 'upgrade'))}>
                    Upgrade
                  </CasinoButton>
                </View>
              </GameCard>
            ) : null
          )}
        </View>
      ) : null}

      {tab === 'machines' ? (
        <GameCard>
          <GameText variant="title">Machine Shed</GameText>
          <View style={{ gap: GameTheme.spacing.sm }}>
            {Object.entries(overview?.machines?.owned ?? {}).map(([machineId, qty]) => (
              <StatRow key={machineId} label={titleCase(machineId)} value={`Owned x${qty}`} />
            ))}
            {Object.keys(overview?.machines?.owned ?? {}).length === 0 ? <GameText tone="muted">No owned machines returned yet.</GameText> : null}
            <StatRow label="Reserved Tasks" value={String(overview?.machines?.activeTasks?.length ?? 0)} />
          </View>
        </GameCard>
      ) : null}

      {tab === 'market' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {(overview?.sellableInventory ?? []).length === 0 ? <EmptyState message="No sellable farm goods returned by Railway yet." /> : null}
          {(overview?.sellableInventory ?? []).map((item) => (
            <GameCard key={item.itemId}>
              <View style={{ gap: GameTheme.spacing.xs }}>
                <GameText variant="title">{item.name ?? titleCase(item.itemId)}</GameText>
                <GameText tone="muted">
                  Qty {item.qty} | Unit {typeof item.unitPrice === 'number' ? formatMoney(item.unitPrice) : 'Railway priced'} | Total{' '}
                  {typeof item.totalValue === 'number' ? formatMoney(item.totalValue) : 'Railway calculated'}
                </GameText>
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <CasinoButton
                  disabled={busyKey !== null}
                  onPress={() => void runAction(`sell-${item.itemId}`, () => sellFarmingMarketItem(game.sessionToken!, item.itemId))}
                  tone="echo">
                  Sell All
                </CasinoButton>
              </View>
            </GameCard>
          ))}
        </View>
      ) : null}

      {tab === 'store' ? (
        <GameCard>
          <GameText variant="title">Farm Store</GameText>
          <View style={{ gap: GameTheme.spacing.sm }}>
            {Object.entries(overview?.farm.fertilisers ?? {}).map(([itemId, qty]) => (
              <StatRow key={itemId} label={titleCase(itemId)} value={`Fertiliser x${qty}`} />
            ))}
            {Object.entries(overview?.farm.husbandry ?? {}).map(([itemId, qty]) => (
              <StatRow key={itemId} label={titleCase(itemId)} value={`Husbandry x${qty}`} />
            ))}
            {Object.keys(overview?.farm.fertilisers ?? {}).length === 0 && Object.keys(overview?.farm.husbandry ?? {}).length === 0 ? (
              <GameText tone="muted">No store inventory returned yet.</GameText>
            ) : null}
          </View>
        </GameCard>
      ) : null}
    </View>
  );
}
