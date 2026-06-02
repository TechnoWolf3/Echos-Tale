import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, TextInput, View } from 'react-native';

import { BetPicker } from '@/components/casino/bet-picker';
import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ResultCard } from '@/components/game/result-card';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  betRouletteTable,
  clearRouletteTableBet,
  createRouletteTable,
  EchoApiError,
  EchoApiRouletteBetType,
  EchoApiRouletteColor,
  EchoApiRouletteTable,
  EchoApiRouletteTablePlayer,
  EchoApiRouletteTableResponse,
  EchoApiRouletteTablesResponse,
  endRouletteTable,
  fetchRouletteTable,
  fetchRouletteTables,
  joinRouletteTable,
  leaveRouletteTable,
  repeatRouletteTableLastBet,
  spinRouletteTable,
} from '@/services/echo-api';

type TablePayload = EchoApiRouletteTable | EchoApiRouletteTableResponse;

const wheelOrder = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26,
];
const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const rouletteBets: { label: string; type: EchoApiRouletteBetType }[] = [
  { label: 'Red', type: 'red' },
  { label: 'Black', type: 'black' },
  { label: 'Odd', type: 'odd' },
  { label: 'Even', type: 'even' },
  { label: '1-18', type: 'low' },
  { label: '19-36', type: 'high' },
  { label: 'Number', type: 'number' },
];
const quickBets = [500, 1_000, 5_000, 10_000, 50_000, 250_000];

function getErrorMessage(error: unknown) {
  if (error instanceof EchoApiError) {
    if (error.status === 404) {
      return 'The Roulette tables are not open on Railway yet.';
    }

    return error.message;
  }

  return 'The Roulette table did not answer.';
}

function getTable(payload: TablePayload) {
  const table = 'table' in payload && payload.table ? payload.table : (payload as EchoApiRouletteTable);

  return {
    ...table,
    players: table.players ?? [],
    tableId: table.tableId ?? table.id ?? '',
  };
}

function getProfile(payload: TablePayload) {
  if ('profile' in payload && payload.profile) {
    return payload.profile;
  }

  return getTable(payload).profile ?? null;
}

function getTables(payload: EchoApiRouletteTablesResponse | EchoApiRouletteTable[]) {
  const tables = Array.isArray(payload) ? payload : payload.tables;

  return tables
    .map((entry) => ({
      ...entry,
      players: entry.players ?? [],
      tableId: entry.tableId ?? entry.id ?? '',
    }))
    .filter((entry) => entry.status !== 'closed' && entry.status !== 'expired');
}

function tableCode(table: EchoApiRouletteTable) {
  return (table.tableId || table.id || 'table').slice(-6).toUpperCase();
}

function playerName(player: EchoApiRouletteTablePlayer, index: number) {
  return player.displayName || `Seat ${index + 1}`;
}

function pocketColor(pocket: number): EchoApiRouletteColor {
  if (pocket === 0) {
    return 'green';
  }

  return redNumbers.has(pocket) ? 'red' : 'black';
}

function resultColor(result?: { color?: EchoApiRouletteColor; colour?: EchoApiRouletteColor; pocket?: number } | null) {
  if (!result) {
    return null;
  }

  return result.color ?? result.colour ?? (result.pocket !== undefined ? pocketColor(result.pocket) : null);
}

function betLabel(type?: EchoApiRouletteBetType | null, value?: number | null) {
  if (!type) {
    return 'No bet';
  }

  if (type === 'number') {
    return `Number ${value ?? '-'}`;
  }

  return rouletteBets.find((bet) => bet.type === type)?.label ?? type;
}

function statusTone(status: EchoApiRouletteTable['status']) {
  return status === 'lobby' ? 'echo' : status === 'result' ? 'ember' : status === 'spinning' ? 'ember' : 'muted';
}

function potentialPayout(amount: number, type: EchoApiRouletteBetType) {
  return amount * (type === 'number' ? 36 : 2);
}

function RouletteWheel({
  rotation,
  result,
}: {
  result?: { color?: EchoApiRouletteColor; colour?: EchoApiRouletteColor; pocket?: number } | null;
  rotation: Animated.Value;
}) {
  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });
  const size = 276;
  const radius = 116;
  const center = size / 2;
  const color = resultColor(result);

  return (
    <View style={{ alignItems: 'center', gap: GameTheme.spacing.sm }}>
      <View style={{ height: size + 20, width: size }}>
        <View
          style={{
            alignSelf: 'center',
            borderBottomColor: GameTheme.colors.ember,
            borderBottomWidth: 18,
            borderLeftColor: 'transparent',
            borderLeftWidth: 10,
            borderRightColor: 'transparent',
            borderRightWidth: 10,
            height: 0,
            marginBottom: -8,
            width: 0,
            zIndex: 3,
          }}
        />
        <Animated.View
          style={{
            backgroundColor: '#07140F',
            borderColor: GameTheme.colors.ember,
            borderRadius: size / 2,
            borderWidth: 2,
            height: size,
            overflow: 'hidden',
            position: 'relative',
            transform: [{ rotate }],
            width: size,
          }}>
          {wheelOrder.map((pocket, index) => {
            const angle = (index / wheelOrder.length) * Math.PI * 2 - Math.PI / 2;
            const left = center + Math.cos(angle) * radius - 14;
            const top = center + Math.sin(angle) * radius - 14;
            const tone = pocketColor(pocket);

            return (
              <View
                key={pocket}
                style={{
                  alignItems: 'center',
                  backgroundColor: tone === 'green' ? '#118B4D' : tone === 'red' ? '#B7273B' : '#11131A',
                  borderColor: 'rgba(255,255,255,0.28)',
                  borderRadius: 14,
                  borderWidth: 1,
                  height: 28,
                  justifyContent: 'center',
                  left,
                  position: 'absolute',
                  top,
                  width: 28,
                }}>
                <GameText variant="caption">{pocket}</GameText>
              </View>
            );
          })}
          <View
            style={{
              alignItems: 'center',
              backgroundColor: GameTheme.colors.backgroundSoft,
              borderColor: GameTheme.colors.borderBright,
              borderRadius: 58,
              borderWidth: 1,
              height: 116,
              justifyContent: 'center',
              left: center - 58,
              position: 'absolute',
              top: center - 58,
              width: 116,
            }}>
            <GameText tone="faint" variant="caption">
              European
            </GameText>
            <GameText variant="title">0-36</GameText>
          </View>
        </Animated.View>
      </View>
      {result?.pocket !== undefined ? (
        <GameText tone={color === 'green' ? 'echo' : color === 'red' ? 'ember' : 'primary'} variant="title">
          {result.pocket} {color?.toUpperCase()}
        </GameText>
      ) : (
        <GameText tone="muted">Waiting on Railway result.</GameText>
      )}
    </View>
  );
}

export function RouletteGame() {
  const game = useElsewhereGame();
  const rotation = useRef(new Animated.Value(0)).current;
  const [tables, setTables] = useState<EchoApiRouletteTable[]>([]);
  const [table, setTable] = useState<EchoApiRouletteTable | null>(null);
  const [amount, setAmount] = useState(500);
  const [selectedType, setSelectedType] = useState<EchoApiRouletteBetType>('red');
  const [selectedNumber, setSelectedNumber] = useState(17);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoCreateAttempted, setAutoCreateAttempted] = useState(false);
  const [visualResult, setVisualResult] = useState<{ color?: EchoApiRouletteColor; pocket: number } | null>(null);

  const token = game.sessionToken;
  const myProfileId = game.linkedProfile?.profileId;
  const myDiscordId = game.linkedProfile?.discordUserId;
  const allowedActions = table?.allowedActions ?? [];
  const myPlayer = useMemo(
    () =>
      table?.players.find(
        (player) => (myProfileId && player.profileId === myProfileId) || (myDiscordId && player.userId === myDiscordId)
      ) ?? null,
    [myDiscordId, myProfileId, table?.players]
  );
  const isHost = !!table && ((myProfileId && table.hostProfileId === myProfileId) || (myDiscordId && table.hostUserId === myDiscordId));
  const joined = !!myPlayer;
  const minBet = table?.minBet ?? 500;
  const maxBet = table?.maxBet ?? 250_000;
  const readyCount = table?.players.filter((player) => player.paid).length ?? 0;
  const canBet = joined && (!allowedActions.length || allowedActions.includes('bet'));
  const canSpin = !!table?.readyToSpin || allowedActions.includes('spin');
  const lastResult = table?.lastResult ?? null;
  const latestResult = lastResult?.results?.find(
    (result) => (myProfileId && result.profileId === myProfileId) || (myDiscordId && result.userId === myDiscordId)
  );
  const feeAmount = myPlayer?.feeAmount ?? 0;
  const totalCharge = myPlayer?.totalCharge ?? amount + feeAmount;

  const applyTablePayload = useCallback(
    (payload: TablePayload) => {
      const nextTable = getTable(payload);
      const profile = getProfile(payload);

      setTable(nextTable);
      setError(null);

      if (profile) {
        game.applyRemoteProfile(profile, { announce: false });
      }

      return nextTable;
    },
    [game]
  );

  const animateToResult = useCallback(
    (result: { color?: EchoApiRouletteColor; durationMs?: number; pocket: number }) => {
      const targetIndex = wheelOrder.indexOf(result.pocket);
      const segmentAngle = 360 / wheelOrder.length;
      const targetRotation = 360 * 8 - targetIndex * segmentAngle;

      setVisualResult({ color: result.color ?? pocketColor(result.pocket), pocket: result.pocket });
      rotation.stopAnimation();
      rotation.setValue(0);
      Animated.timing(rotation, {
        duration: result.durationMs ?? 4_200,
        easing: Easing.out(Easing.cubic),
        toValue: targetRotation,
        useNativeDriver: true,
      }).start();
    },
    [rotation]
  );

  const loadTables = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) {
        return;
      }

      const payload = await fetchRouletteTables(token, signal);
      setTables(getTables(payload));
    },
    [token]
  );

  const refreshTable = useCallback(
    async (signal?: AbortSignal) => {
      if (!token || !table?.tableId) {
        return;
      }

      applyTablePayload(await fetchRouletteTable(token, table.tableId, signal));
    },
    [applyTablePayload, table?.tableId, token]
  );

  useEffect(() => {
    const controller = new AbortController();

    if (token) {
      loadTables(controller.signal).catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(requestError));
        }
      });
    }

    return () => controller.abort();
  }, [loadTables, token]);

  useEffect(() => {
    if (!token || table) {
      return;
    }

    const interval = setInterval(() => {
      loadTables().catch((requestError: unknown) => setError(getErrorMessage(requestError)));
    }, 6_000);

    return () => clearInterval(interval);
  }, [loadTables, table, token]);

  useEffect(() => {
    if (!token || !table?.tableId || table.status === 'closed' || table.status === 'expired') {
      return;
    }

    const interval = setInterval(() => {
      refreshTable().catch((requestError: unknown) => setError(getErrorMessage(requestError)));
    }, table.status === 'spinning' ? 1_200 : 4_000);

    return () => clearInterval(interval);
  }, [refreshTable, table?.status, table?.tableId, token]);

  const runTableAction = useCallback(
    async (actionName: string, action: () => Promise<TablePayload>, after?: (nextTable: EchoApiRouletteTable) => void) => {
      if (!token) {
        return;
      }

      setBusyAction(actionName);
      setError(null);

      try {
        const nextTable = applyTablePayload(await action());
        after?.(nextTable);
        await loadTables();
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setBusyAction(null);
      }
    },
    [applyTablePayload, loadTables, token]
  );

  const createTable = useCallback(() => runTableAction('create', () => createRouletteTable(token!)), [runTableAction, token]);
  const joinTable = () => table && runTableAction('join', () => joinRouletteTable(token!, table.tableId));
  const leaveTable = () => table && runTableAction('leave', () => leaveRouletteTable(token!, table.tableId));
  const clearBet = () => table && runTableAction('clear', () => clearRouletteTableBet(token!, table.tableId));
  const lastBet = () => table && runTableAction('last-bet', () => repeatRouletteTableLastBet(token!, table.tableId));
  const endTable = () => table && runTableAction('end', () => endRouletteTable(token!, table.tableId));
  const placeBet = () =>
    table &&
    runTableAction('bet', () =>
      betRouletteTable(token!, table.tableId, {
        amount,
        betType: selectedType,
        betValue: selectedType === 'number' ? selectedNumber : null,
      })
    );
  const spin = () =>
    table &&
    runTableAction(
      'spin',
      () => spinRouletteTable(token!, table.tableId),
      (nextTable) => {
        const spinResult = nextTable.spin ?? nextTable.lastResult;

        if (spinResult?.pocket !== undefined) {
          animateToResult({
            color: resultColor(spinResult) ?? undefined,
            durationMs: 'durationMs' in spinResult ? spinResult.durationMs : undefined,
            pocket: spinResult.pocket,
          });
        }
      }
    );

  useEffect(() => {
    if (!autoCreateAttempted && token && !table && tables.length === 0 && !busyAction) {
      setAutoCreateAttempted(true);
      createTable();
    }
  }, [autoCreateAttempted, busyAction, createTable, table, tables.length, token]);

  useEffect(() => {
    if (lastResult?.pocket !== undefined && !visualResult) {
      setVisualResult({ color: resultColor(lastResult) ?? undefined, pocket: lastResult.pocket });
    }
  }, [lastResult, visualResult]);

  if (!token) {
    return (
      <GameCard>
        <GameText variant="title">Roulette Tables</GameText>
        <GameText tone="muted">Link Discord to open Railway-owned Roulette. The app only animates results the server returns.</GameText>
      </GameCard>
    );
  }

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText tone="faint" variant="label">
          Live Table
        </GameText>
        <GameText variant="title">Roulette</GameText>
        <GameText tone="muted">European wheel, shared by app and Discord. Railway owns the pocket, wallet movement, fees, and payouts.</GameText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {table ? (
          <CasinoButton disabled={!!busyAction} onPress={() => setTable(null)} tone="echo">
            Back To Tables
          </CasinoButton>
        ) : (
          <>
            <CasinoButton disabled={!!busyAction} onPress={createTable} tone="ember">
              {busyAction === 'create' ? 'Opening...' : 'Start Roulette Table'}
            </CasinoButton>
            <CasinoButton disabled={!!busyAction} onPress={() => loadTables().catch((requestError: unknown) => setError(getErrorMessage(requestError)))} tone="echo">
              Refresh Tables
            </CasinoButton>
          </>
        )}
      </View>

      {error ? <GameText tone="ember">{error}</GameText> : null}

      {!table ? (
        <View style={{ gap: GameTheme.spacing.sm }}>
          {tables.length === 0 ? (
            <GameCard style={{ backgroundColor: GameTheme.colors.backgroundSoft }}>
              <GameText variant="title">No Roulette Tables</GameText>
              <GameText tone="muted">Open a table and Discord can join once Railway exposes the endpoints.</GameText>
            </GameCard>
          ) : null}
          {tables.map((entry) => (
            <Pressable
              accessibilityRole="button"
              key={entry.tableId || entry.id}
              onPress={() => setTable(entry)}
              style={({ pressed }) => ({
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: GameTheme.colors.border,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                gap: GameTheme.spacing.xs,
                opacity: pressed ? 0.78 : 1,
                padding: GameTheme.spacing.md,
              })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: GameTheme.spacing.md }}>
                <View style={{ gap: GameTheme.spacing.xs }}>
                  <GameText variant="label">Roulette {tableCode(entry)}</GameText>
                  <GameText tone="muted">Host {entry.hostDisplayName ?? 'Unknown'}</GameText>
                </View>
                <GameText tone={statusTone(entry.status)} variant="label">
                  {entry.status.toUpperCase()}
                </GameText>
              </View>
              <GameText tone="muted">
                {entry.players.length}/{entry.maxPlayers ?? 10} seats filled | {entry.players.filter((player) => player.paid).length} ready
              </GameText>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ gap: GameTheme.spacing.md }}>
          <View
            style={{
              backgroundColor: '#0A2418',
              borderColor: GameTheme.colors.ember,
              borderRadius: GameTheme.radius.md,
              borderWidth: 1,
              gap: GameTheme.spacing.md,
              padding: GameTheme.spacing.md,
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: GameTheme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <GameText tone="faint" variant="label">
                  Table
                </GameText>
                <GameText variant="title">{tableCode(table)}</GameText>
                <GameText tone="muted">Hosted by {table.hostDisplayName ?? 'the croupier'}</GameText>
              </View>
              <View style={{ alignItems: 'flex-end', flex: 1 }}>
                <GameText tone="faint" variant="label">
                  Status
                </GameText>
                <GameText tone={statusTone(table.status)} variant="title">
                  {table.status.toUpperCase()}
                </GameText>
                <GameText tone="muted">
                  {readyCount}/{table.players.length || 1} paid
                </GameText>
              </View>
            </View>
            <RouletteWheel rotation={rotation} result={visualResult ?? lastResult} />
          </View>

          <View style={{ gap: GameTheme.spacing.sm }}>
            <GameText variant="label">Seats</GameText>
            {table.players.length === 0 ? <GameText tone="muted">No one has joined yet.</GameText> : null}
            {table.players.map((player, index) => (
              <View
                key={`${player.userId ?? player.profileId ?? index}`}
                style={{
                  backgroundColor:
                    (myProfileId && player.profileId === myProfileId) || (myDiscordId && player.userId === myDiscordId)
                      ? 'rgba(169, 243, 255, 0.08)'
                      : GameTheme.colors.backgroundSoft,
                  borderColor:
                    (myProfileId && player.profileId === myProfileId) || (myDiscordId && player.userId === myDiscordId)
                      ? GameTheme.colors.echo
                      : GameTheme.colors.border,
                  borderRadius: GameTheme.radius.sm,
                  borderWidth: 1,
                  gap: GameTheme.spacing.xs,
                  padding: GameTheme.spacing.sm,
                }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: GameTheme.spacing.md }}>
                  <GameText variant="label">{playerName(player, index)}</GameText>
                  <GameText tone={player.paid ? 'echo' : 'muted'} variant="label">
                    {player.paid ? 'PAID' : (player.status ?? 'joined').toUpperCase()}
                  </GameText>
                </View>
                <GameText tone="muted">
                  {player.betAmount ? `${betLabel(player.betType, player.betValue)} | ${formatMoney(player.betAmount)}` : 'No bet yet'}
                  {player.feeAmount ? ` | Fee ${formatMoney(player.feeAmount)}` : ''}
                </GameText>
              </View>
            ))}
          </View>

          {latestResult ? (
            <ResultCard
              details={[
                { label: 'Pocket', value: lastResult ? `${lastResult.pocket} ${(resultColor(lastResult) ?? '').toUpperCase()}` : 'Settled' },
                { label: 'Bet', value: betLabel(latestResult.betType, latestResult.betValue) },
              ]}
              payout={latestResult.payout ?? 0}
              profit={latestResult.profit ?? 0}
              stake={latestResult.betAmount ?? 0}
              summary={latestResult.won ? 'Railway settled your winning spin.' : 'Railway settled your spin with the house.'}
              title="Roulette Result"
              tone={latestResult.won ? 'good' : 'bad'}
            />
          ) : null}

          <View style={{ gap: GameTheme.spacing.md }}>
            {!joined ? (
              <CasinoButton disabled={!!busyAction} onPress={joinTable} tone="echo">
                {busyAction === 'join' ? 'Sitting...' : 'Join Table'}
              </CasinoButton>
            ) : null}

            {canBet ? (
              <View
                style={{
                  backgroundColor: GameTheme.colors.backgroundSoft,
                  borderColor: GameTheme.colors.border,
                  borderRadius: GameTheme.radius.md,
                  borderWidth: 1,
                  gap: GameTheme.spacing.md,
                  padding: GameTheme.spacing.md,
                }}>
                <View style={{ gap: GameTheme.spacing.xs }}>
                  <GameText variant="label">Place Bet</GameText>
                  <GameText tone="muted">Stake, fees, and settlement are charged by Railway when the bet is accepted.</GameText>
                </View>
                <BetPicker amount={amount} disabled={!!busyAction} max={maxBet} min={minBet} onChange={setAmount} quickBets={quickBets} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  {rouletteBets.map((bet) => (
                    <CasinoButton
                      disabled={!!busyAction}
                      key={bet.type}
                      onPress={() => setSelectedType(bet.type)}
                      tone={selectedType === bet.type ? 'ember' : 'plain'}>
                      {bet.label}
                    </CasinoButton>
                  ))}
                </View>
                {selectedType === 'number' ? (
                  <View style={{ gap: GameTheme.spacing.sm }}>
                    <GameText tone="faint" variant="caption">
                      Single Number
                    </GameText>
                    <TextInput
                      editable={!busyAction}
                      keyboardType="number-pad"
                      onChangeText={(value) => setSelectedNumber(Math.max(0, Math.min(36, Number(value.replace(/\D/g, '')) || 0)))}
                      placeholder="0-36"
                      placeholderTextColor={GameTheme.colors.textFaint}
                      style={{
                        backgroundColor: GameTheme.colors.background,
                        borderColor: GameTheme.colors.borderBright,
                        borderRadius: GameTheme.radius.sm,
                        borderWidth: 1,
                        color: GameTheme.colors.echo,
                        fontSize: 22,
                        fontWeight: '800',
                        padding: GameTheme.spacing.sm,
                      }}
                      value={String(selectedNumber)}
                    />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {Array.from({ length: 37 }, (_, number) => (
                        <Pressable
                          accessibilityRole="button"
                          disabled={!!busyAction}
                          key={number}
                          onPress={() => setSelectedNumber(number)}
                          style={({ pressed }) => ({
                            alignItems: 'center',
                            backgroundColor: selectedNumber === number ? GameTheme.colors.ember : GameTheme.colors.background,
                            borderColor: selectedNumber === number ? GameTheme.colors.ember : GameTheme.colors.border,
                            borderRadius: 6,
                            borderWidth: 1,
                            height: 34,
                            justifyContent: 'center',
                            opacity: pressed ? 0.75 : 1,
                            width: 34,
                          })}>
                          <GameText tone={selectedNumber === number ? 'primary' : 'muted'} variant="caption">
                            {number}
                          </GameText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  <GameText tone="muted">Stake {formatMoney(amount)}</GameText>
                  <GameText tone="muted">Fee {formatMoney(feeAmount)}</GameText>
                  <GameText tone="muted">Total {formatMoney(totalCharge)}</GameText>
                  <GameText tone="muted">Potential {formatMoney(potentialPayout(amount, selectedType))}</GameText>
                </View>
                <CasinoButton disabled={!!busyAction} onPress={placeBet} tone="ember">
                  {busyAction === 'bet' ? 'Placing...' : myPlayer?.paid ? 'Change Bet' : 'Lock Bet'}
                </CasinoButton>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
              {joined && myPlayer?.lastBet ? (
                <CasinoButton disabled={!!busyAction || (allowedActions.length > 0 && !allowedActions.includes('last_bet'))} onPress={lastBet} tone="echo">
                  Last Bet
                </CasinoButton>
              ) : null}
              {joined && myPlayer?.paid ? (
                <CasinoButton disabled={!!busyAction || (allowedActions.length > 0 && !allowedActions.includes('clear_bet'))} onPress={clearBet}>
                  Clear Bet
                </CasinoButton>
              ) : null}
              {joined ? (
                <CasinoButton disabled={!!busyAction} onPress={leaveTable}>
                  Leave Table
                </CasinoButton>
              ) : null}
              {canSpin ? (
                <CasinoButton disabled={!!busyAction} onPress={spin} tone="ember">
                  {busyAction === 'spin' ? 'Spinning...' : 'Spin'}
                </CasinoButton>
              ) : null}
              {isHost ? (
                <CasinoButton disabled={!!busyAction || (allowedActions.length > 0 && !allowedActions.includes('end'))} onPress={endTable}>
                  End Table
                </CasinoButton>
              ) : null}
            </View>

            {joined && !canSpin ? <GameText tone="muted">Everyone seated needs a paid bet before the wheel can spin.</GameText> : null}
          </View>
        </View>
      )}
    </GameCard>
  );
}
