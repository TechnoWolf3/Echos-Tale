import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BetPicker } from '@/components/casino/bet-picker';
import { CasinoButton } from '@/components/casino/casino-button';
import { PlayingCard } from '@/components/casino/playing-card';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { ResultCard } from '@/components/game/result-card';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import { formatCard } from '@/services/casino-service';
import {
  betHigherLowerTable,
  cashOutHigherLowerTable,
  createHigherLowerTable,
  EchoApiError,
  EchoApiHigherLowerTable,
  EchoApiHigherLowerTablePlayer,
  EchoApiHigherLowerTableResponse,
  EchoApiHigherLowerTablesResponse,
  fetchHigherLowerTable,
  fetchHigherLowerTables,
  guessHigherLowerTable,
  joinHigherLowerTable,
  leaveHigherLowerTable,
  startHigherLowerTable,
} from '@/services/echo-api';

type TablePayload = EchoApiHigherLowerTable | EchoApiHigherLowerTableResponse;
type HigherLowerTableGameProps = {
  autoCreate?: boolean;
};

function getErrorMessage(error: unknown) {
  if (error instanceof EchoApiError) {
    if (error.status === 404) {
      return 'The Higher or Lower multiplayer tables are not open yet.';
    }

    return error.message;
  }

  return 'The table did not answer.';
}

function getTable(payload: TablePayload) {
  const table = 'table' in payload && payload.table ? payload.table : (payload as EchoApiHigherLowerTable);

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

  const table = getTable(payload);
  return table.profile ?? null;
}

function getTables(payload: EchoApiHigherLowerTablesResponse | EchoApiHigherLowerTable[]) {
  const tables = Array.isArray(payload) ? payload : payload.tables;

  return tables
    .map((entry) => ({
      ...entry,
      players: entry.players ?? [],
      tableId: entry.tableId ?? entry.id ?? '',
    }))
    .filter((entry) => entry.status === 'playing' || entry.players.length > 0);
}

function playerName(player: EchoApiHigherLowerTablePlayer, index: number) {
  return player.displayName || `Seat ${index + 1}`;
}

function playerIsActive(player: EchoApiHigherLowerTablePlayer) {
  return player.alive || player.status === 'alive' || player.status === 'paid';
}

function tableCode(table: EchoApiHigherLowerTable) {
  return (table.tableId || table.id || 'table').slice(-6).toUpperCase();
}

function statusTone(status: EchoApiHigherLowerTable['status']) {
  return status === 'playing' ? 'ember' : status === 'lobby' ? 'echo' : 'muted';
}

export function HigherLowerTableGame({ autoCreate }: HigherLowerTableGameProps) {
  const game = useElsewhereGame();
  const [tables, setTables] = useState<EchoApiHigherLowerTable[]>([]);
  const [table, setTable] = useState<EchoApiHigherLowerTable | null>(null);
  const [bet, setBet] = useState(500);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoCreateAttempted, setAutoCreateAttempted] = useState(false);

  const token = game.sessionToken;
  const myProfileId = game.linkedProfile?.profileId;
  const myDiscordId = game.linkedProfile?.discordUserId;
  const myPlayer = useMemo(
    () =>
      table?.players.find(
        (player) => (myProfileId && player.profileId === myProfileId) || (myDiscordId && player.userId === myDiscordId)
      ) ?? null,
    [myDiscordId, myProfileId, table?.players]
  );
  const isHost = !!table && ((myProfileId && table.hostProfileId === myProfileId) || (myDiscordId && table.hostUserId === myDiscordId));
  const joined = !!myPlayer;
  const paid = !!myPlayer?.paid;
  const alive = !!myPlayer && playerIsActive(myPlayer);
  const canBet = table?.status === 'lobby' && joined;
  const canStart = table?.status === 'lobby' && isHost && table.players.length > 0 && table.players.every((player) => player.paid);
  const canGuess = table?.status === 'playing' && alive && !myPlayer?.pick;
  const canCashOut = table?.status === 'playing' && alive && (myPlayer?.streak ?? 0) > 0;
  const readyCount = table?.players.filter((player) => player.paid).length ?? 0;
  const tableHasCards = !!table && (table.status === 'playing' || table.status === 'resolved');
  const resolvedPlayer = table?.lastResult?.resolvedPlayers?.find(
    (player) => (myProfileId && player.profileId === myProfileId) || (myDiscordId && player.userId === myDiscordId)
  );
  const latestResult = resolvedPlayer ?? (table?.status === 'resolved' ? myPlayer : null);

  const applyTablePayload = useCallback(
    (payload: TablePayload) => {
      const nextTable = getTable(payload);
      const profile = getProfile(payload);

      setTable(nextTable);
      setTables((current) => getTables([...current.filter((entry) => entry.tableId !== nextTable.tableId), nextTable]));
      setError(null);

      if (profile) {
        game.applyRemoteProfile(profile, { announce: false });
      }

      return nextTable;
    },
    [game]
  );

  const loadTables = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) {
        return;
      }

      const payload = await fetchHigherLowerTables(token, signal);
      setTables(getTables(payload));
    },
    [token]
  );

  const refreshTable = useCallback(
    async (signal?: AbortSignal) => {
      if (!token || !table?.tableId) {
        return;
      }

      applyTablePayload(await fetchHigherLowerTable(token, table.tableId, signal));
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

    const intervalMs = table.status === 'playing' ? 1_500 : 4_000;
    const interval = setInterval(() => {
      refreshTable().catch((requestError: unknown) => setError(getErrorMessage(requestError)));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refreshTable, table?.status, table?.tableId, token]);

  const runTableAction = useCallback(
    async (actionName: string, action: () => Promise<TablePayload>) => {
      if (!token) {
        return;
      }

      setBusyAction(actionName);
      setError(null);

      try {
        applyTablePayload(await action());
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setBusyAction(null);
      }
    },
    [applyTablePayload, token]
  );

  const createTable = useCallback(() => runTableAction('create', () => createHigherLowerTable(token!)), [runTableAction, token]);
  const selectTable = (nextTable: EchoApiHigherLowerTable) => setTable(nextTable);
  const joinTable = () => table && runTableAction('join', () => joinHigherLowerTable(token!, table.tableId));
  const leaveTable = () => table && runTableAction('leave', () => leaveHigherLowerTable(token!, table.tableId));
  const placeBet = () => table && runTableAction('bet', () => betHigherLowerTable(token!, table.tableId, bet));
  const startTable = () => table && runTableAction('start', () => startHigherLowerTable(token!, table.tableId));
  const guess = (pick: 'higher' | 'lower' | 'same') =>
    table && runTableAction(`guess-${pick}`, () => guessHigherLowerTable(token!, table.tableId, pick));
  const cashOut = () => table && runTableAction('cashout', () => cashOutHigherLowerTable(token!, table.tableId));

  useEffect(() => {
    if (!autoCreate || autoCreateAttempted || !token || table || busyAction) {
      return;
    }

    setAutoCreateAttempted(true);
    createTable();
  }, [autoCreate, autoCreateAttempted, busyAction, createTable, table, token]);

  if (!token) {
    return (
      <GameCard>
        <GameText variant="title">Higher or Lower Tables</GameText>
        <GameText tone="muted">Link Discord to open shared tables. Solo practice is still available below.</GameText>
      </GameCard>
    );
  }

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText tone="faint" variant="label">
          Live Table
        </GameText>
        <GameText variant="title">The Liar&apos;s Ladder</GameText>
        <GameText tone="muted">Shared by the app and Discord. This table can start solo, but anyone can join while it is open.</GameText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {table ? (
          <CasinoButton disabled={!!busyAction} onPress={() => setTable(null)} tone="echo">
            Back To Rails
          </CasinoButton>
        ) : (
          <>
            <CasinoButton disabled={!!busyAction} onPress={createTable} tone="ember">
              {busyAction === 'create' ? 'Opening...' : 'Start Higher or Lower'}
            </CasinoButton>
            <CasinoButton disabled={!!busyAction} onPress={() => loadTables().catch((requestError: unknown) => setError(getErrorMessage(requestError)))} tone="echo">
              Refresh Live Tables
            </CasinoButton>
          </>
        )}
      </View>

      {error ? <GameText tone="ember">{error}</GameText> : null}

      {!table ? (
        <View style={{ gap: GameTheme.spacing.sm }}>
          {tables.length === 0 ? (
            <View
              style={{
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: GameTheme.colors.border,
                borderRadius: GameTheme.radius.md,
                borderWidth: 1,
                gap: GameTheme.spacing.xs,
                padding: GameTheme.spacing.lg,
              }}>
              <GameText variant="title">No Live Tables</GameText>
              <GameText tone="muted">Start Higher or Lower and Discord gets a join button. Other players can sit down, but you do not need them.</GameText>
            </View>
          ) : null}
            {tables.map((entry) => (
            <Pressable
              accessibilityRole="button"
              key={entry.tableId || entry.id}
              onPress={() => selectTable(entry)}
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
                  <GameText variant="label">Higher or Lower {tableCode(entry)}</GameText>
                  <GameText tone="muted">Host {entry.hostDisplayName ?? 'Unknown'}</GameText>
                </View>
                <GameText tone={statusTone(entry.status)} variant="label">
                  {entry.status.toUpperCase()}
                </GameText>
              </View>
              <GameText tone="muted">
                {entry.players.length}/{entry.maxPlayers ?? 10} seats filled | Joinable from app or Discord
              </GameText>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ gap: GameTheme.spacing.md }}>
          <View
            style={{
              backgroundColor: '#111529',
              borderColor: GameTheme.colors.borderBright,
              borderRadius: GameTheme.radius.md,
              borderWidth: 1,
              gap: GameTheme.spacing.md,
              padding: GameTheme.spacing.md,
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: GameTheme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <GameText tone="faint" variant="label">
                  Rail
                </GameText>
                <GameText variant="title">{tableCode(table)}</GameText>
                <GameText tone="muted">Hosted by {table.hostDisplayName ?? 'the house'}</GameText>
              </View>
              <View style={{ alignItems: 'flex-end', flex: 1 }}>
                <GameText tone="faint" variant="label">
                  Status
                </GameText>
                <GameText tone={statusTone(table.status)} variant="title">
                  {table.status.toUpperCase()}
                </GameText>
                <GameText tone="muted">
                  {readyCount}/{table.players.length || 1} ready
                </GameText>
              </View>
            </View>

            {tableHasCards ? (
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: GameTheme.spacing.lg, justifyContent: 'center' }}>
                <View style={{ alignItems: 'center', gap: GameTheme.spacing.xs }}>
                  <GameText tone="faint" variant="caption">
                    Previous
                  </GameText>
                  <PlayingCard card={table.previousCard ?? table.lastResult?.fromCard ?? undefined} hidden={!table.previousCard && !table.lastResult?.fromCard} />
                </View>
                <View style={{ alignItems: 'center', gap: GameTheme.spacing.xs }}>
                  <GameText tone="faint" variant="caption">
                    Current
                  </GameText>
                  <PlayingCard card={table.currentCard ?? table.lastResult?.toCard ?? undefined} hidden={!table.currentCard && !table.lastResult?.toCard} />
                </View>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: 'rgba(169, 243, 255, 0.06)',
                  borderColor: GameTheme.colors.border,
                  borderRadius: GameTheme.radius.sm,
                  borderWidth: 1,
                  gap: GameTheme.spacing.xs,
                  padding: GameTheme.spacing.md,
                }}>
                <GameText variant="label">Lobby</GameText>
                <GameText tone="muted">Lock a buy-in, then start when you are ready. Discord can still join from the announcement.</GameText>
              </View>
            )}
          </View>

          <View style={{ gap: GameTheme.spacing.sm }}>
            <GameText variant="label">Seats</GameText>
            {table.players.length === 0 ? <GameText tone="muted">No one has sat down yet.</GameText> : null}
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
                  <GameText tone={player.alive ? 'echo' : player.status === 'busted' ? 'ember' : player.paid ? 'echo' : 'muted'} variant="label">
                    {player.paid && table.status === 'lobby' ? 'READY' : (player.status ?? (player.paid ? 'paid' : 'joined')).toUpperCase()}
                  </GameText>
                </View>
                <GameText tone="muted">
                  {player.bet ? `Buy-in ${formatMoney(player.bet)}` : 'No buy-in yet'} | Streak {player.streak ?? 0}
                  {player.pick ? ` | Picked ${player.pick}` : ''}
                </GameText>
              </View>
            ))}
          </View>

          {latestResult?.result || latestResult?.payout ? (
            <ResultCard
              details={[
                { label: 'Status', value: latestResult.status ?? latestResult.result ?? 'Resolved' },
                { label: 'Streak', value: String(latestResult.streak ?? 0) },
              ]}
              payout={latestResult.payout ?? 0}
              profit={latestResult.profit ?? (latestResult.payout ?? 0) - (latestResult.bet ?? 0)}
              stake={latestResult.bet ?? 0}
              summary={table.lastResult?.message ?? 'The table resolved your ticket.'}
              title="Table Result"
              tone={(latestResult.payout ?? 0) > (latestResult.bet ?? 0) ? 'good' : 'bad'}
            />
          ) : null}

          {table.lastResult?.fromCard && table.lastResult?.toCard ? (
            <GameText tone="muted">
              Last draw: {formatCard(table.lastResult.fromCard)} into {formatCard(table.lastResult.toCard)}
            </GameText>
          ) : null}

          {table.status === 'lobby' ? (
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
                    <GameText variant="label">Buy-In</GameText>
                    <GameText tone="muted">Set your stake before the rail opens. Changes go through the house ledger.</GameText>
                  </View>
                  <BetPicker amount={bet} disabled={!!busyAction} onChange={setBet} />
                  <CasinoButton disabled={!!busyAction} onPress={placeBet} tone="ember">
                    {busyAction === 'bet' ? 'Placing...' : paid ? 'Change Buy-In' : 'Lock Buy-In'}
                  </CasinoButton>
                </View>
              ) : null}
              {canStart ? (
                <CasinoButton disabled={!!busyAction} onPress={startTable} tone="echo">
                  {busyAction === 'start' ? 'Dealing...' : 'Start Rail'}
                </CasinoButton>
              ) : null}
              {joined ? (
                <CasinoButton disabled={!!busyAction} onPress={leaveTable}>
                  Leave Table
                </CasinoButton>
              ) : null}
              {joined && !paid ? <GameText tone="muted">Lock your buy-in before starting. The house wants a receipt first.</GameText> : null}
              {isHost && !canStart ? <GameText tone="muted">You can start once every seated player has paid. One player is enough here.</GameText> : null}
            </View>
          ) : null}

          {table.status === 'playing' ? (
            <View style={{ gap: GameTheme.spacing.md }}>
              {table.currentCard ? <GameText tone="echo">Current card: {formatCard(table.currentCard)}</GameText> : null}
              {canGuess ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  <CasinoButton disabled={!!busyAction} onPress={() => guess('higher')} tone="echo">
                    Higher
                  </CasinoButton>
                  <CasinoButton disabled={!!busyAction} onPress={() => guess('lower')} tone="echo">
                    Lower
                  </CasinoButton>
                  <CasinoButton disabled={!!busyAction} onPress={() => guess('same')} tone="echo">
                    Same
                  </CasinoButton>
                </View>
              ) : (
                <GameText tone="muted">
                  {alive ? 'Waiting for the table to finish choosing.' : 'Your seat is out of this streak.'}
                </GameText>
              )}
              {canCashOut ? (
                <CasinoButton disabled={!!busyAction} onPress={cashOut} tone="ember">
                  Cash Out
                </CasinoButton>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </GameCard>
  );
}
