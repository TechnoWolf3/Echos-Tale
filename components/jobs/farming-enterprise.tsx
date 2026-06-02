import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ProgressBar } from '@/components/game/progress-bar';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  buyFarmingStoreItem,
  buyFarmingField,
  convertFarmingBarn,
  EchoApiError,
  EchoApiFarmField,
  EchoApiFarmingActionResponse,
  EchoApiFarmingOverview,
  echoApiBaseUrl,
  fetchFarmingConfig,
  fetchFarmingOverview,
  fertiliseFarmingField,
  plantFarmingCrop,
  sellFarmingMarketItem,
  startFarmingMachineAction,
  startFarmingBarnAction,
  startFarmingFieldAction,
} from '@/services/echo-api';

type FarmingTab = 'fields' | 'barns' | 'machines' | 'market' | 'store' | 'weather';

const tabs: { id: FarmingTab; label: string }[] = [
  { id: 'fields', label: 'Fields' },
  { id: 'barns', label: 'Barns' },
  { id: 'weather', label: 'Weather' },
  { id: 'machines', label: 'Machines' },
  { id: 'market', label: 'Market' },
  { id: 'store', label: 'Store' },
];

const maxFieldsFallback = 6;
const defaultStoreQty = 1;

type ConfigItem = {
  id: string;
  name: string;
  raw: Record<string, unknown>;
};

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function numberFrom(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringFrom(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function booleanLabel(value: boolean | null | undefined) {
  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 'Not returned';
}

function getConfigValue(config: Record<string, unknown> | null, keys: string[]) {
  if (!config) {
    return null;
  }

  for (const key of keys) {
    if (key in config) {
      return config[key];
    }
  }

  return null;
}

function normalizeConfigItems(config: Record<string, unknown> | null, keys: string[]): ConfigItem[] {
  const value = getConfigValue(config, keys);

  if (Array.isArray(value)) {
    return value
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => !!entry)
      .map((entry, index) => {
        const id = stringFrom(entry.id) ?? stringFrom(entry.itemId) ?? stringFrom(entry.machineId) ?? `item_${index}`;
        return {
          id,
          name: stringFrom(entry.name) ?? stringFrom(entry.label) ?? titleCase(id),
          raw: entry,
        };
      });
  }

  const record = asRecord(value);

  if (!record) {
    return [];
  }

  return Object.entries(record)
    .map(([id, entry]) => {
      const raw = asRecord(entry) ?? { value: entry };

      return {
        id,
        name: stringFrom(raw.name) ?? stringFrom(raw.label) ?? titleCase(id),
        raw,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeMachineItems(config: Record<string, unknown> | null): ConfigItem[] {
  const value = getConfigValue(config, ['machines', 'machineStore', 'machineCategories']);

  if (Array.isArray(value)) {
    return normalizeConfigItems(config, ['machines', 'machineStore', 'machineCategories']);
  }

  const record = asRecord(value);

  if (!record) {
    return [];
  }

  const flattened: ConfigItem[] = [];

  for (const [categoryId, categoryValue] of Object.entries(record)) {
    const categoryRecord = asRecord(categoryValue);
    const nested =
      (categoryRecord && (categoryRecord.machines ?? categoryRecord.items ?? categoryRecord.options)) ?? categoryValue;
    const categoryName = categoryRecord ? stringFrom(categoryRecord.name) ?? titleCase(categoryId) : titleCase(categoryId);

    if (Array.isArray(nested)) {
      nested.forEach((entry, index) => {
        const raw = asRecord(entry);

        if (!raw) {
          return;
        }

        const id = stringFrom(raw.id) ?? stringFrom(raw.machineId) ?? `${categoryId}_${index}`;
        flattened.push({
          id,
          name: stringFrom(raw.name) ?? stringFrom(raw.label) ?? titleCase(id),
          raw: { ...raw, category: stringFrom(raw.category) ?? categoryName },
        });
      });
      continue;
    }

    const nestedRecord = asRecord(nested);

    if (nestedRecord) {
      for (const [id, entry] of Object.entries(nestedRecord)) {
        const raw = asRecord(entry) ?? { value: entry };
        flattened.push({
          id,
          name: stringFrom(raw.name) ?? stringFrom(raw.label) ?? titleCase(id),
          raw: { ...raw, category: stringFrom(raw.category) ?? categoryName },
        });
      }
    }
  }

  return flattened.sort((left, right) => left.name.localeCompare(right.name));
}

function getItemPrice(item: ConfigItem, keys = ['price', 'basePrice', 'cost']) {
  for (const key of keys) {
    const value = numberFrom(item.raw[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function formatOptionalMoney(value: number | null) {
  return value === null ? 'Not returned' : formatMoney(value);
}

function formatMultiplier(value: number, label: string) {
  if (value === 1) {
    return `${label} neutral`;
  }

  const percent = Math.round((value - 1) * 100);
  const sign = percent > 0 ? '+' : '';

  return `${label} ${sign}${percent}%`;
}

function formatPct(value: number, label: string) {
  const sign = value > 0 ? '+' : '';
  return `${label} ${sign}${Math.round(value)}%`;
}

function describeWeatherValue(value: unknown) {
  const record = asRecord(value);

  if (typeof value === 'string') {
    return titleCase(value);
  }

  if (!record) {
    return 'Not returned';
  }

  const name =
    stringFrom(record.name) ??
    stringFrom(record.title) ??
    stringFrom(record.label) ??
    stringFrom(record.id) ??
    stringFrom(record.type);
  const parts: string[] = [];

  if (name) {
    parts.push(titleCase(name));
  }

  const description = stringFrom(record.description) ?? stringFrom(record.detail) ?? stringFrom(record.message);
  const impact = stringFrom(record.impact) ?? stringFrom(record.effect);

  if (description) {
    parts.push(description);
  }

  if (impact && impact !== description) {
    parts.push(impact);
  }

  const yieldMultiplier = numberFrom(record.yieldMultiplier) ?? numberFrom(record.yieldMult);
  const usablePlotMultiplier = numberFrom(record.usablePlotMultiplier) ?? numberFrom(record.usablePlotsMultiplier);
  const growthMultiplier = numberFrom(record.growthMultiplier) ?? numberFrom(record.growthMult);
  const speedPct = numberFrom(record.speedBonusPct) ?? numberFrom(record.growthBonusPct) ?? numberFrom(record.yieldBonusPct);

  if (yieldMultiplier !== null) {
    parts.push(formatMultiplier(yieldMultiplier, 'Yield'));
  }

  if (usablePlotMultiplier !== null) {
    parts.push(formatMultiplier(usablePlotMultiplier, 'Usable plots'));
  }

  if (growthMultiplier !== null) {
    parts.push(formatMultiplier(growthMultiplier, 'Growth'));
  }

  if (speedPct !== null) {
    parts.push(formatPct(speedPct, 'Bonus'));
  }

  if (record.requiresCultivation === true) {
    parts.push('Requires cultivation');
  }

  if (record.damaged === true || record.damage === true) {
    parts.push('Field damage');
  }

  return parts.length > 0 ? parts.join(' | ') : 'Weather effect returned';
}

function getWeatherEventLabel(weather: EchoApiFarmingOverview['weather'] | null | undefined) {
  if (!weather) {
    return 'Not returned';
  }

  if (weather.eventName) {
    return weather.eventName;
  }

  if (weather.event) {
    return describeWeatherValue(weather.event);
  }

  return 'None today';
}

function unwrapRecord(value: unknown) {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const data = asRecord(record.data);
  return data ? { ...record, ...data } : record;
}

function getOverviewWeather(overview: EchoApiFarmingOverview | null) {
  const record = asRecord(overview);

  if (!record) {
    return null;
  }

  for (const key of ['weather', 'farmWeather', 'weatherState', 'dailyWeather']) {
    const weather = unwrapRecord(record[key]);

    if (weather) {
      return weather as EchoApiFarmingOverview['weather'];
    }
  }

  return null;
}

function getOverviewSeason(overview: EchoApiFarmingOverview | null, weather: EchoApiFarmingOverview['weather'] | null | undefined) {
  const record = asRecord(overview);

  if (!record) {
    return weather?.season ? { current: weather.season } : null;
  }

  for (const key of ['season', 'seasonState', 'farmSeason', 'currentSeason']) {
    const value = record[key];

    if (typeof value === 'string') {
      return { current: value };
    }

    const season = unwrapRecord(value);

    if (season) {
      return season as EchoApiFarmingOverview['season'];
    }
  }

  return weather?.season ? { current: weather.season } : null;
}

function arrayOfStrings(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return [value];
  }

  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function getCropSeasons(crop: ConfigItem) {
  return arrayOfStrings(crop.raw.seasons ?? crop.raw.validSeasons ?? crop.raw.plantingSeasons ?? crop.raw.allowedSeasons).map((season) =>
    season.toLowerCase()
  );
}

function getCropRequiredLevel(crop: ConfigItem) {
  return (
    numberFrom(crop.raw.level) ??
    numberFrom(crop.raw.requiredLevel) ??
    numberFrom(crop.raw.fieldLevel) ??
    numberFrom(crop.raw.unlockLevel) ??
    1
  );
}

function getMachineCategory(machine: ConfigItem) {
  return (
    stringFrom(machine.raw.category) ??
    stringFrom(machine.raw.type) ??
    stringFrom(machine.raw.machineType) ??
    stringFrom(machine.raw.taskCategory) ??
    'Other'
  );
}

function formatPercentMultiplier(value: number) {
  if (value <= 0) {
    return null;
  }

  if (value < 1) {
    return `${Math.round((1 - value) * 100)}% faster`;
  }

  if (value > 1) {
    return `${Math.round((value - 1) * 100)}% faster`;
  }

  return 'Standard speed';
}

function getMachineBonus(machine: ConfigItem) {
  const speedMultiplier =
    numberFrom(machine.raw.speedMultiplier) ??
    numberFrom(machine.raw.speed) ??
    numberFrom(machine.raw.taskSpeedMultiplier) ??
    numberFrom(machine.raw.durationMultiplier) ??
    numberFrom(machine.raw.durationMult);
  const speedPct =
    numberFrom(machine.raw.speedBonus) ??
    numberFrom(machine.raw.speedBonusPct) ??
    numberFrom(machine.raw.speedBonusPercent) ??
    numberFrom(machine.raw.taskSpeedBonusPct) ??
    numberFrom(machine.raw.taskSpeedBonusPercent) ??
    numberFrom(machine.raw.bonusPct) ??
    numberFrom(machine.raw.bonusPercent);
  const compatibleTasks = arrayOfStrings(
    machine.raw.tasks ?? machine.raw.compatibleTasks ?? machine.raw.taskKeys ?? machine.raw.supports ?? machine.raw.taskTypes
  );
  const parts: string[] = [];

  if (speedMultiplier !== null) {
    const label = formatPercentMultiplier(speedMultiplier);

    if (label) {
      parts.push(label);
    }
  } else if (speedPct !== null) {
    parts.push(`${Math.round(speedPct)}% faster`);
  }

  if (compatibleTasks.length > 0) {
    parts.push(`Tasks: ${compatibleTasks.map(titleCase).join(', ')}`);
  }

  return parts.join(' | ');
}

function getMachineRequirement(machine: ConfigItem) {
  const horsepower =
    numberFrom(machine.raw.requiredHorsepower) ??
    numberFrom(machine.raw.requiresHorsepower) ??
    numberFrom(machine.raw.requiredHp) ??
    numberFrom(machine.raw.requiresHp) ??
    numberFrom(machine.raw.hpRequired);
  const providesHorsepower =
    numberFrom(machine.raw.horsepower) ??
    numberFrom(machine.raw.hp) ??
    numberFrom(machine.raw.powerHp) ??
    numberFrom(machine.raw.powerHorsepower) ??
    numberFrom(machine.raw.providesHp) ??
    numberFrom(machine.raw.providesHorsepower);
  const tier = numberFrom(machine.raw.tier) ?? numberFrom(machine.raw.level);
  const parts: string[] = [];

  if (tier !== null) {
    parts.push(`Tier ${tier}`);
  }

  if (providesHorsepower !== null) {
    parts.push(`Power ${providesHorsepower} HP`);
  }

  if (horsepower !== null) {
    parts.push(`Requires ${horsepower} HP`);
  }

  return parts.join(' | ');
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

function getFieldTask(field: EchoApiFarmField) {
  return (
    field.task ??
    (asRecord(field)?.activeTask as EchoApiFarmField['task'] | undefined) ??
    (asRecord(field)?.pendingTask as EchoApiFarmField['task'] | undefined) ??
    null
  );
}

function getVisibleFieldTask(
  field: EchoApiFarmField,
  index: number,
  fallbacks: Record<number, EchoApiFarmField['task']>
) {
  return getFieldTask(field) ?? fallbacks[index] ?? null;
}

function getNextTaskEnd(fields: EchoApiFarmField[], fallbacks: Record<number, EchoApiFarmField['task']>) {
  let nextEnd: number | null = null;

  fields.forEach((field, index) => {
    const endsAt = toMillis(getVisibleFieldTask(field, index, fallbacks)?.endsAt);

    if (!endsAt) {
      return;
    }

    if (nextEnd === null || endsAt < nextEnd) {
      nextEnd = endsAt;
    }
  });

  return nextEnd;
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
  const { applyRemoteProfile, sessionToken } = game;
  const [overview, setOverview] = useState<EchoApiFarmingOverview | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<FarmingTab>('fields');
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panelMessages, setPanelMessages] = useState<Record<string, string>>({});
  const [startedTaskFallbacks, setStartedTaskFallbacks] = useState<Record<number, EchoApiFarmField['task']>>({});
  const [selectedMachineCategory, setSelectedMachineCategory] = useState<string | null>(null);

  const fields = useMemo(() => overview?.farm.fields ?? [], [overview?.farm.fields]);
  const barns = useMemo(() => fields.filter((field) => field.kind === 'barn'), [fields]);
  const cropFields = useMemo(() => fields.filter((field) => field.kind !== 'barn'), [fields]);
  const cropFieldEntries = useMemo(
    () =>
      fields
        .map((field, fieldIndex) => ({ field, fieldIndex }))
        .filter((entry) => entry.field.kind !== 'barn')
        .map((entry, displayIndex) => ({ ...entry, displayIndex })),
    [fields]
  );
  const weatherState = useMemo(() => getOverviewWeather(overview), [overview]);
  const seasonState = useMemo(() => getOverviewSeason(overview, weatherState), [overview, weatherState]);
  const maxFields = typeof config?.maxFields === 'number' ? config.maxFields : maxFieldsFallback;
  const crops = useMemo(() => normalizeConfigItems(config, ['crops', 'cropOptions', 'availableCrops']), [config]);
  const fertilisers = useMemo(() => normalizeConfigItems(config, ['fertilisers', 'fertilizers']), [config]);
  const husbandryItems = useMemo(() => normalizeConfigItems(config, ['husbandryItems', 'husbandry']), [config]);
  const livestock = useMemo(() => normalizeConfigItems(config, ['livestock', 'livestockTypes']), [config]);
  const machines = useMemo(() => normalizeMachineItems(config), [config]);
  const currentSeason = (seasonState?.current ?? seasonState?.name ?? weatherState?.season ?? '').toLowerCase();
  const seasonCrops = useMemo(
    () =>
      crops.filter((crop) => {
        const seasons = getCropSeasons(crop);
        return seasons.length === 0 ? !currentSeason : seasons.includes(currentSeason);
      }),
    [crops, currentSeason]
  );
  const hasCropSeasonMetadata = useMemo(() => crops.some((crop) => getCropSeasons(crop).length > 0), [crops]);
  const machineCategories = useMemo(() => Array.from(new Set(machines.map(getMachineCategory))).sort(), [machines]);
  const activeMachineCategory = selectedMachineCategory ?? machineCategories[0] ?? null;
  const categoryMachines = useMemo(
    () => machines.filter((machine) => getMachineCategory(machine) === activeMachineCategory),
    [activeMachineCategory, machines]
  );

  const loadFarm = useCallback(
    async (signal?: AbortSignal) => {
      if (!sessionToken) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextOverview = await fetchFarmingOverview(sessionToken, signal);

        setOverview(nextOverview);

        if (nextOverview.profile) {
          applyRemoteProfile(nextOverview.profile, { announce: false });
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        setError(loadError instanceof EchoApiError ? loadError.message : 'Farming could not be loaded from the ledger.');
      } finally {
        setLoading(false);
      }
    },
    [applyRemoteProfile, sessionToken]
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadFarm(controller.signal);

    return () => controller.abort();
  }, [loadFarm]);

  useEffect(() => {
    if (!sessionToken || config) {
      return;
    }

    const controller = new AbortController();

    fetchFarmingConfig(sessionToken, controller.signal)
      .then(setConfig)
      .catch(() => null);

    return () => controller.abort();
  }, [config, sessionToken]);

  useEffect(() => {
    if (!sessionToken || loading) {
      return;
    }

    const nextTaskEnd = getNextTaskEnd(fields, startedTaskFallbacks);

    if (!nextTaskEnd) {
      return;
    }

    const delay = Math.max(500, nextTaskEnd - Date.now() + 750);
    const timeout = setTimeout(() => {
      void loadFarm();
    }, delay);

    return () => clearTimeout(timeout);
  }, [fields, loadFarm, loading, sessionToken, startedTaskFallbacks]);

  const applyActionResponse = useCallback(
    (response: EchoApiFarmingActionResponse, panelKey?: string) => {
      setOverview(response);

      if (typeof response.startedTask?.fieldIndex === 'number' && response.startedTask.task) {
        setStartedTaskFallbacks((current) => ({
          ...current,
          [response.startedTask!.fieldIndex!]: response.startedTask!.task!,
        }));
      }

      if (panelKey) {
        setPanelMessages((current) => ({ ...current, [panelKey]: response.message }));
      } else {
        setNotice(response.message);
      }

      if (response.profile) {
        applyRemoteProfile(response.profile, { announce: false });
      }
    },
    [applyRemoteProfile]
  );

  const runAction = useCallback(
    async (key: string, action: () => Promise<EchoApiFarmingActionResponse>, panelKey?: string) => {
      setBusyKey(key);
      setError(null);
      setNotice(null);
      if (panelKey) {
        setPanelMessages((current) => {
          const next = { ...current };
          delete next[panelKey];
          return next;
        });
      }

      try {
        applyActionResponse(await action(), panelKey);

        if (sessionToken) {
          const refreshedOverview = await fetchFarmingOverview(sessionToken).catch(() => null);

          if (refreshedOverview) {
            setOverview(refreshedOverview);
            setStartedTaskFallbacks((current) => {
              const next = { ...current };

              refreshedOverview.farm.fields?.forEach((field, index) => {
                if (getFieldTask(field)) {
                  delete next[index];
                }
              });

              return next;
            });

            if (refreshedOverview.profile) {
              applyRemoteProfile(refreshedOverview.profile, { announce: false });
            }
          }
        }
      } catch (actionError) {
        const message = actionError instanceof EchoApiError ? actionError.message : 'The ledger rejected that farming action.';

        if (panelKey) {
          setPanelMessages((current) => ({ ...current, [panelKey]: message }));
        } else {
          setError(message);
        }
      } finally {
        setBusyKey(null);
      }
    },
    [applyActionResponse, applyRemoteProfile, sessionToken]
  );

  const fieldSummary = useMemo(() => {
    const activeTasks = fields.filter((field, index) => getVisibleFieldTask(field, index, startedTaskFallbacks)).length;
    const readyCrops = cropFields.filter((field) => field.state === 'ready').length;

    return { activeTasks, readyCrops };
  }, [cropFields, fields, startedTaskFallbacks]);

  if (!sessionToken) {
    return (
      <GameCard>
        <GameText variant="title">Farming</GameText>
            <GameText tone="muted">
              Link Discord first. Farms, machines, inventory, crops, barns, timers, and money all live in the shared ledger.
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
            The farm ledger is in charge here. The app renders the returned farm state and sends every action back for settlement.
          </GameText>
        </View>

        <View style={{ gap: GameTheme.spacing.sm }}>
          <StatRow label="Season" value={titleCase(seasonState?.current ?? seasonState?.name ?? weatherState?.season)} />
          <StatRow label="Weather" value={weatherState?.headline ?? getWeatherEventLabel(weatherState) ?? weatherState?.baseWeather ?? 'Loading'} />
          <StatRow label="Weather Active" value={booleanLabel(weatherState?.activeNow)} />
          <StatRow label="API Route" value={echoApiBaseUrl || 'Not configured'} />
          <StatRow label="Fields" value={`${fields.length}/${maxFields}`} />
          <StatRow label="Active Tasks" value={String(fieldSummary.activeTasks)} />
          <StatRow label="Ready Crops" value={String(fieldSummary.readyCrops)} />
          <StatRow label="Next Field" value={typeof overview?.nextFieldCost === 'number' ? formatMoney(overview.nextFieldCost) : 'Not returned'} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          <CasinoButton disabled={loading || busyKey !== null} onPress={() => void loadFarm()} tone="echo">
            Refresh Farm
          </CasinoButton>
          <CasinoButton
            disabled={loading || busyKey !== null || fields.length >= maxFields}
            onPress={() => void runAction('buy-field', () => buyFarmingField(sessionToken!))}
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
          {cropFields.length === 0 ? <EmptyState message="No crop fields have appeared yet." /> : null}
          {cropFieldEntries.map(({ field, fieldIndex, displayIndex }) => {
            const task = getVisibleFieldTask(field, fieldIndex, startedTaskFallbacks);
            const taskLabel = task?.key ? `${titleCase(task.key)}: ${getCountdownLabel(task.endsAt, game.now) ?? 'Queued'}` : 'Idle';
            const readyLabel = field.state === 'growing' ? getCountdownLabel(field.readyAt, game.now) : null;
            const panelKey = `field-${fieldIndex}`;
            const isIdle = !task;
            const hasCrop = !!field.cropId;
            const canCultivate = isIdle && (!field.cultivated || field.state === 'spoiled' || !!field.fieldCondition);
            const canHarvest = isIdle && field.state === 'ready' && hasCrop;
            const canRest = isIdle && field.cultivated && !hasCrop && field.state === 'empty';
            const canUpgrade = isIdle && field.cultivated && !hasCrop && field.state === 'empty';
            const canPlant = isIdle && field.cultivated && !hasCrop && (field.state === 'empty' || field.state === 'spoiled');
            const canFertilise = !task && !!field.cropId && field.state === 'growing';
            const ownedFertilisers = Object.entries(overview?.farm.fertilisers ?? {}).filter(([, qty]) => qty > 0);
            const canConvertBarn = isIdle && field.cultivated && field.state === 'empty' && !hasCrop;
            const fieldLevel = field.level ?? 1;
            const availableCrops = seasonCrops.filter((crop) => getCropRequiredLevel(crop) <= fieldLevel);

            return (
              <GameCard key={panelKey}>
                <View style={{ gap: GameTheme.spacing.xs }}>
                  <GameText variant="title">Field {displayIndex + 1}</GameText>
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
                  <StatRow label="Soil" value={typeof field.soilHealth === 'number' ? `${field.soilHealth}%` : 'Ledger managed'} />
                  <StatRow label="Rotation" value={`${titleCase(field.lastCropFamily)} x${field.sameFamilyStreak ?? 0}`} />
                  {field.fieldCondition ? <StatRow label="Condition" value={describeWeatherValue(field.fieldCondition)} /> : null}
                </View>
                {field.cropWeatherEffect || field.fieldCondition ? (
                  <GameText tone="ember">
                    Weather effect active: {describeWeatherValue(field.cropWeatherEffect ?? field.fieldCondition)}
                  </GameText>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  {canCultivate ? (
                    <CasinoButton
                      disabled={busyKey !== null}
                      onPress={() => void runAction(`cultivate-${fieldIndex}`, () => startFarmingFieldAction(sessionToken!, fieldIndex, 'cultivate'), panelKey)}>
                      Cultivate
                    </CasinoButton>
                  ) : null}
                  {canHarvest ? (
                    <CasinoButton
                      disabled={busyKey !== null}
                      onPress={() => void runAction(`harvest-${fieldIndex}`, () => startFarmingFieldAction(sessionToken!, fieldIndex, 'harvest'), panelKey)}
                      tone="echo">
                      Harvest
                    </CasinoButton>
                  ) : null}
                  {canRest ? (
                    <CasinoButton
                      disabled={busyKey !== null}
                      onPress={() => void runAction(`rest-${fieldIndex}`, () => startFarmingFieldAction(sessionToken!, fieldIndex, 'rest'), panelKey)}>
                      Rest
                    </CasinoButton>
                  ) : null}
                  {canUpgrade ? (
                    <CasinoButton
                      disabled={busyKey !== null}
                      onPress={() => void runAction(`upgrade-${fieldIndex}`, () => startFarmingFieldAction(sessionToken!, fieldIndex, 'upgrade'), panelKey)}
                      tone="ember">
                      Upgrade
                    </CasinoButton>
                  ) : null}
                </View>
                {canPlant ? (
                  <View style={{ gap: GameTheme.spacing.sm }}>
                    <GameText tone="faint" variant="caption">
                      Plant Crop{currentSeason ? ` | ${titleCase(currentSeason)} crops` : ''}
                    </GameText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                      {availableCrops.length === 0 ? (
                        <GameText tone="muted">
                          {hasCropSeasonMetadata
                            ? 'No crops available for this season and field level.'
                            : 'Crop season metadata not returned.'}
                        </GameText>
                      ) : null}
                      {availableCrops.map((crop) => (
                        <CasinoButton
                          disabled={busyKey !== null}
                          key={crop.id}
                          onPress={() => void runAction(`plant-${fieldIndex}-${crop.id}`, () => plantFarmingCrop(sessionToken!, fieldIndex, crop.id), panelKey)}
                          tone="echo">
                          {crop.name}
                        </CasinoButton>
                      ))}
                    </View>
                  </View>
                ) : null}
                {canFertilise ? (
                  <View style={{ gap: GameTheme.spacing.sm }}>
                    <GameText tone="faint" variant="caption">
                      Fertilise
                    </GameText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                      {ownedFertilisers.length === 0 ? <GameText tone="muted">No fertiliser owned.</GameText> : null}
                      {ownedFertilisers.map(([fertiliserId, qty]) => (
                        <CasinoButton
                          disabled={busyKey !== null}
                          key={fertiliserId}
                          onPress={() =>
                            void runAction(`fertilise-${fieldIndex}-${fertiliserId}`, () => fertiliseFarmingField(sessionToken!, fieldIndex, fertiliserId), panelKey)
                          }>
                          {titleCase(fertiliserId)} x{qty}
                        </CasinoButton>
                      ))}
                    </View>
                  </View>
                ) : null}
                {canConvertBarn ? (
                  <View style={{ gap: GameTheme.spacing.sm }}>
                    <GameText tone="faint" variant="caption">
                      Convert To Barn
                    </GameText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                      {livestock.length === 0 ? <GameText tone="muted">No livestock options returned in config.</GameText> : null}
                      {livestock.map((animal) => (
                        <CasinoButton
                          disabled={busyKey !== null}
                          key={animal.id}
                          onPress={() => void runAction(`convert-${fieldIndex}-${animal.id}`, () => convertFarmingBarn(sessionToken!, fieldIndex, animal.id), panelKey)}
                          tone="ember">
                          {animal.name}
                        </CasinoButton>
                      ))}
                    </View>
                  </View>
                ) : null}
                {panelMessages[panelKey] ? <GameText tone="echo">{panelMessages[panelKey]}</GameText> : null}
              </GameCard>
            );
          })}
        </View>
      ) : null}

      {tab === 'barns' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {barns.length === 0 ? <EmptyState message="No barns have appeared yet." /> : null}
          {fields.map((field, index) =>
            field.kind === 'barn' ? (
              <GameCard key={`barn-${index}`}>
                <View style={{ gap: GameTheme.spacing.xs }}>
                  <GameText variant="title">{titleCase(field.livestockType)} Barn</GameText>
                  <GameText tone="muted">Field slot {index + 1}</GameText>
                </View>
                <View style={{ gap: GameTheme.spacing.sm }}>
                  <StatRow label="Level" value={String(field.level ?? 1)} />
                  <StatRow label="Animals" value={String(field.animalCount ?? 0)} />
                  {typeof field.capacity === 'number' ? <StatRow label="Capacity" value={String(field.capacity)} /> : null}
                  <StatRow label="Adults" value={String(field.adultCount ?? 0)} />
                  <StatRow label="Last Collected" value={formatDateTime(field.lastCollectedAt)} />
                  <StatRow
                    label="Task"
                    value={
                      getVisibleFieldTask(field, index, startedTaskFallbacks)?.key
                        ? `${titleCase(getVisibleFieldTask(field, index, startedTaskFallbacks)?.key)}: ${
                            getCountdownLabel(getVisibleFieldTask(field, index, startedTaskFallbacks)?.endsAt, game.now) ?? 'Queued'
                          }`
                        : 'Idle'
                    }
                  />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  <CasinoButton
                    disabled={busyKey !== null || !!getVisibleFieldTask(field, index, startedTaskFallbacks)}
                    onPress={() => void runAction(`collect-${index}`, () => startFarmingBarnAction(sessionToken!, index, 'collect'), `barn-${index}`)}
                    tone="echo">
                    Collect
                  </CasinoButton>
                  <CasinoButton
                    disabled={busyKey !== null || !!getVisibleFieldTask(field, index, startedTaskFallbacks)}
                    onPress={() => void runAction(`restock-${index}`, () => startFarmingBarnAction(sessionToken!, index, 'restock'), `barn-${index}`)}>
                    Restock
                  </CasinoButton>
                  <CasinoButton
                    disabled={busyKey !== null || !!getVisibleFieldTask(field, index, startedTaskFallbacks)}
                    onPress={() => void runAction(`elderly-${index}`, () => startFarmingBarnAction(sessionToken!, index, 'slaughter-elderly'), `barn-${index}`)}
                    tone="ember">
                    Cull Elderly
                  </CasinoButton>
                  <CasinoButton
                    disabled={busyKey !== null || !!getVisibleFieldTask(field, index, startedTaskFallbacks)}
                    onPress={() => void runAction(`barn-upgrade-${index}`, () => startFarmingBarnAction(sessionToken!, index, 'upgrade'), `barn-${index}`)}>
                    Upgrade
                  </CasinoButton>
                </View>
                {panelMessages[`barn-${index}`] ? <GameText tone="echo">{panelMessages[`barn-${index}`]}</GameText> : null}
              </GameCard>
            ) : null
          )}
        </View>
      ) : null}

      {tab === 'weather' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <GameCard>
            <GameText variant="title">Farm Weather</GameText>
            {weatherState ? (
              <View style={{ gap: GameTheme.spacing.sm }}>
                <StatRow label="Headline" value={weatherState.headline ?? 'Not returned'} />
                <StatRow label="Base Weather" value={weatherState.baseWeather ? titleCase(weatherState.baseWeather) : 'Not returned'} />
                <StatRow label="Event" value={getWeatherEventLabel(weatherState)} />
                <StatRow label="Active Now" value={booleanLabel(weatherState.activeNow)} />
                <StatRow label="Season" value={titleCase(weatherState.season ?? seasonState?.current ?? seasonState?.name)} />
                <StatRow label="Day Key" value={weatherState.dayKey ?? 'Not returned'} />
                <StatRow label="Rolled At" value={formatDateTime(weatherState.rolledAt)} />
                {weatherState.forecast ? <StatRow label="Forecast" value={weatherState.forecast} /> : null}
                {weatherState.impact ? <StatRow label="Impact" value={weatherState.impact} /> : null}
              </View>
            ) : (
              <GameText tone="muted">No weather state has appeared yet.</GameText>
            )}
          </GameCard>

          <GameCard>
            <GameText variant="title">Active Event</GameText>
            <GameText tone={weatherState?.activeNow ? 'echo' : 'muted'}>
              {weatherState?.event ? describeWeatherValue(weatherState.event) : 'No event details returned.'}
            </GameText>
          </GameCard>

          <View style={{ gap: GameTheme.spacing.md }}>
            {fields.filter((field) => field.cropWeatherEffect || field.fieldCondition).length === 0 ? (
              <EmptyState message="No field-specific weather effects are active." />
            ) : null}
            {fields.map((field, index) =>
              field.cropWeatherEffect || field.fieldCondition ? (
                <GameCard key={`weather-field-${index}`}>
                  <View style={{ gap: GameTheme.spacing.xs }}>
                    <GameText variant="title">Field {index + 1}</GameText>
                    <GameText tone="muted">
                      {field.kind === 'barn' ? `${titleCase(field.livestockType)} Barn` : `${titleCase(field.cropId)} | ${titleCase(field.state)}`}
                    </GameText>
                  </View>
                  {field.cropWeatherEffect ? <StatRow label="Crop Effect" value={describeWeatherValue(field.cropWeatherEffect)} /> : null}
                  {field.fieldCondition ? <StatRow label="Field Condition" value={describeWeatherValue(field.fieldCondition)} /> : null}
                </GameCard>
              ) : null
            )}
          </View>
        </View>
      ) : null}

      {tab === 'machines' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <GameCard>
            <GameText variant="title">Machine Shed</GameText>
            <View style={{ gap: GameTheme.spacing.sm }}>
              {Object.entries(overview?.machines?.owned ?? {}).map(([machineId, qty]) => (
                <StatRow key={machineId} label={titleCase(machineId)} value={`Owned x${qty}`} />
              ))}
              {Object.entries(overview?.machines?.rented ?? {}).map(([machineId, rental]) => {
                const leases = asRecord(rental)?.leases;
                const leaseCount = Array.isArray(leases) ? leases.length : typeof rental === 'number' ? rental : 0;
                return <StatRow key={machineId} label={titleCase(machineId)} value={`Rented x${leaseCount}`} />;
              })}
              {Object.keys(overview?.machines?.owned ?? {}).length === 0 ? <GameText tone="muted">No owned machines returned yet.</GameText> : null}
              <StatRow label="Reserved Tasks" value={String(overview?.machines?.activeTasks?.length ?? 0)} />
            </View>
          </GameCard>
          <GameCard>
            <GameText variant="title">Machine Store</GameText>
            <View style={{ gap: GameTheme.spacing.md }}>
              {machines.length === 0 ? <GameText tone="muted">No machine store returned in config.</GameText> : null}
              {machineCategories.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  {machineCategories.map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      onPress={() => {
                        setSelectedMachineCategory(category);
                      }}
                      selected={activeMachineCategory === category}
                    />
                  ))}
                </View>
              ) : null}
              {categoryMachines.length === 0 && machines.length > 0 ? <GameText tone="muted">No machines returned for this category.</GameText> : null}
              {categoryMachines.map((machine) => {
                  const ownedQty = overview?.machines?.owned?.[machine.id] ?? 0;
                  const rentedValue = overview?.machines?.rented?.[machine.id];
                  const leases = asRecord(rentedValue)?.leases;
                  const rentedQty = Array.isArray(leases) ? leases.length : typeof rentedValue === 'number' ? rentedValue : 0;
                  const busyQty =
                    overview?.machines?.activeTasks?.filter((task) => arrayOfStrings(asRecord(task)?.machineIds).includes(machine.id)).length ?? 0;
                  const buyPrice = getItemPrice(machine, ['buyPrice', 'price', 'cost']);
                  const rentPrice = getItemPrice(machine, ['rentPrice', 'rentalPrice', 'rentCost']);
                  const sellValue = getItemPrice(machine, ['sellValue', 'sellPrice', 'resaleValue', 'resalePrice', 'sell']);
                  const bonus = getMachineBonus(machine);
                  const requirement = getMachineRequirement(machine);

                  return (
                    <View
                      key={machine.id}
                      style={{
                        backgroundColor: GameTheme.colors.backgroundSoft,
                        borderColor: GameTheme.colors.border,
                        borderRadius: GameTheme.radius.sm,
                        borderWidth: 1,
                        gap: GameTheme.spacing.md,
                        padding: GameTheme.spacing.md,
                      }}>
                      <View
                        style={{
                          alignItems: 'flex-start',
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: GameTheme.spacing.md,
                          justifyContent: 'space-between',
                        }}>
                        <View style={{ flex: 1, gap: GameTheme.spacing.xs, minWidth: 220 }}>
                          <GameText variant="title">{machine.name}</GameText>
                          <GameText tone="muted">
                            Buy {formatOptionalMoney(buyPrice)} | Rent {formatOptionalMoney(rentPrice)}
                            {sellValue === null ? '' : ` | Sell ${formatMoney(sellValue)}`}
                          </GameText>
                          {requirement ? <GameText tone="muted">{requirement}</GameText> : null}
                          {bonus ? <GameText tone="echo">{bonus}</GameText> : null}
                        </View>
                        <View style={{ gap: GameTheme.spacing.xs, minWidth: 120 }}>
                          <StatRow label="Owned" value={String(ownedQty)} />
                          <StatRow label="Rented" value={String(rentedQty)} />
                          <StatRow label="Busy" value={String(busyQty)} />
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                        <CasinoButton
                          disabled={busyKey !== null}
                          onPress={() => void runAction(`machine-buy-${machine.id}`, () => startFarmingMachineAction(sessionToken!, 'buy', machine.id), `machine-${machine.id}`)}
                          tone="echo">
                          Buy
                        </CasinoButton>
                        <CasinoButton
                          disabled={busyKey !== null}
                          onPress={() => void runAction(`machine-rent-${machine.id}`, () => startFarmingMachineAction(sessionToken!, 'rent', machine.id), `machine-${machine.id}`)}>
                          Rent
                        </CasinoButton>
                        <CasinoButton
                          disabled={busyKey !== null || ownedQty <= 0}
                          onPress={() => void runAction(`machine-sell-${machine.id}`, () => startFarmingMachineAction(sessionToken!, 'sell', machine.id), `machine-${machine.id}`)}
                          tone="ember">
                          Sell
                        </CasinoButton>
                      </View>
                      {panelMessages[`machine-${machine.id}`] ? <GameText tone="echo">{panelMessages[`machine-${machine.id}`]}</GameText> : null}
                    </View>
                  );
                })}
            </View>
          </GameCard>
        </View>
      ) : null}

      {tab === 'market' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {(overview?.sellableInventory ?? []).length === 0 ? <EmptyState message="No sellable farm goods have appeared yet." /> : null}
          {(overview?.sellableInventory ?? []).map((item) => (
            <GameCard key={item.itemId}>
              <View style={{ gap: GameTheme.spacing.xs }}>
                <GameText variant="title">{item.name ?? titleCase(item.itemId)}</GameText>
                <GameText tone="muted">
                  Qty {item.qty}
                  {typeof item.unitPrice === 'number' ? ` | Unit ${formatMoney(item.unitPrice)}` : ''}
                  {typeof item.totalValue === 'number' ? ` | Total ${formatMoney(item.totalValue)}` : ''}
                </GameText>
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <CasinoButton
                  disabled={busyKey !== null}
                  onPress={() => void runAction(`sell-${item.itemId}`, () => sellFarmingMarketItem(sessionToken!, item.itemId))}
                  tone="echo">
                  Sell All
                </CasinoButton>
              </View>
            </GameCard>
          ))}
        </View>
      ) : null}

      {tab === 'store' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          <GameCard>
            <GameText variant="title">Owned Supplies</GameText>
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
          <GameCard>
            <GameText variant="title">Farm Store</GameText>
            <View style={{ gap: GameTheme.spacing.md }}>
              {fertilisers.length === 0 && husbandryItems.length === 0 ? <GameText tone="muted">No store catalogue returned in config.</GameText> : null}
              {fertilisers.map((item) => (
                <View key={item.id} style={{ gap: GameTheme.spacing.sm }}>
                  <StatRow label={item.name} value={`Fertiliser | ${formatOptionalMoney(getItemPrice(item))}`} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                    <CasinoButton
                      disabled={busyKey !== null}
                      onPress={() =>
                        void runAction(
                          `store-fert-${item.id}`,
                          () => buyFarmingStoreItem(sessionToken!, 'fertiliser', item.id, defaultStoreQty),
                          `store-${item.id}`
                        )
                      }
                      tone="echo">
                      Buy 1
                    </CasinoButton>
                    <CasinoButton
                      disabled={busyKey !== null}
                      onPress={() => void runAction(`store-fert-${item.id}-5`, () => buyFarmingStoreItem(sessionToken!, 'fertiliser', item.id, 5), `store-${item.id}`)}>
                      Buy 5
                    </CasinoButton>
                  </View>
                  {panelMessages[`store-${item.id}`] ? <GameText tone="echo">{panelMessages[`store-${item.id}`]}</GameText> : null}
                </View>
              ))}
              {husbandryItems.map((item) => (
                <View key={item.id} style={{ gap: GameTheme.spacing.sm }}>
                  <StatRow label={item.name} value={`Husbandry | ${formatOptionalMoney(getItemPrice(item))}`} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                    <CasinoButton
                      disabled={busyKey !== null}
                      onPress={() => void runAction(`store-husbandry-${item.id}`, () => buyFarmingStoreItem(sessionToken!, 'husbandry', item.id, defaultStoreQty), `store-${item.id}`)}
                      tone="echo">
                      Buy 1
                    </CasinoButton>
                  </View>
                  {panelMessages[`store-${item.id}`] ? <GameText tone="echo">{panelMessages[`store-${item.id}`]}</GameText> : null}
                </View>
              ))}
            </View>
          </GameCard>
        </View>
      ) : null}
    </View>
  );
}
