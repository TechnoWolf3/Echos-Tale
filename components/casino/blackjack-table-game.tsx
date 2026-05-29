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
import {
  betBlackjackTable,
  createBlackjackTable,
  doubleBlackjackTable,
  EchoApiBlackjackHand,
  EchoApiBlackjackTable,
  EchoApiBlackjackTablePlayer,
  EchoApiBlackjackTableResponse,
  EchoApiBlackjackTablesResponse,
  EchoApiError,
  fetchBlackjackTable,
  fetchBlackjackTables,
  hitBlackjackTable,
  joinBlackjackTable,
  leaveBlackjackTable,
  splitBlackjackTable,
  standBlackjackTable,
  startBlackjackTable,
} from '@/services/echo-api';

type TablePayload = EchoApiBlackjackTable | EchoApiBlackjackTableResponse;
type BlackjackTableGameProps = {
  autoCreate?: boolean;
};

function getErrorMessage(error: unknown) {
  if (error instanceof EchoApiError) {
    if (error.status === 404) {
      return 'Railway has not exposed the Blackjack multiplayer table routes yet.';
    }

    return error.message;
  }

  return 'The Blackjack table did not answer.';
}

function getTable(payload: TablePayload) {
  const table = 'table' in payload && payload.table ? payload.table : (payload as EchoApiBlackjackTable);

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

function getTables(payload: EchoApiBlackjackTablesResponse | EchoApiBlackjackTable[]) {
  const tables = Array.isArray(payload) ? payload : payload.tables;

  return tables
    .map((entry) => ({
      ...entry,
      players: entry.players ?? [],
      tableId: entry.tableId ?? entry.id ?? '',
    }))
    .filter((entry) => entry.status === 'playing' || entry.players.length > 0);
}

function tableCode(table: EchoApiBlackjackTable) {
  return (table.tableId || table.id || 'table').slice(-6).toUpperCase();
}

function statusTone(status: EchoApiBlackjackTable['status']) {
  return status === 'playing' ? 'ember' : status === 'lobby' ? 'echo' : 'muted';
}

function playerName(player: EchoApiBlackjackTablePlayer, index: number) {
  return player.displayName || `Seat ${index + 1}`;
}

function playerIsTurn(table: EchoApiBlackjackTable, player: EchoApiBlackjackTablePlayer) {
  return (
    (table.currentProfileId && player.profileId === table.currentProfileId) ||
    (table.currentPlayerId && player.userId === table.currentPlayerId)
  );
}

function handCards(hand?: EchoApiBlackjackHand | null) {
  return hand?.cards ?? hand?.visibleCards ?? [];
}

function TableHand({ hand, title }: { hand?: EchoApiBlackjackHand | null; title: string }) {
  const cards = handCards(hand);

  return (
    <View style={{ gap: GameTheme.spacing.xs }}>
      <GameText tone="faint" variant="label">
        {title} {hand?.value !== null && hand?.value !== undefined ? `| ${hand.value}` : ''}
      </GameText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {cards.length > 0 ? cards.map((card, index) => <PlayingCard card={card} key={`${card.rank}-${card.suit}-${index}`} />) : null}
        {Array.from({ length: hand?.hiddenCount ?? 0 }).map((_, index) => (
          <PlayingCard hidden key={`hidden-${index}`} />
        ))}
        {cards.length === 0 && !hand?.hiddenCount ? (
          <>
            <PlayingCard hidden />
            <PlayingCard hidden />
          </>
        ) : null}
      </View>
    </View>
  );
}

export function BlackjackTableGame({ autoCreate }: BlackjackTableGameProps) {
  const game = useElsewhereGame();
  const [tables, setTables] = useState<EchoApiBlackjackTable[]>([]);
  const [table, setTable] = useState<EchoApiBlackjackTable | null>(null);
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
  const dealer = table?.dealer ?? table?.dealerHand ?? null;
  const activeHand = myPlayer?.hands?.[myPlayer.activeHand ?? 0] ?? myPlayer?.hands?.[0] ?? null;
  const isHost = !!table && ((myProfileId && table.hostProfileId === myProfileId) || (myDiscordId && table.hostUserId === myDiscordId));
  const joined = !!myPlayer;
  const paid = !!myPlayer?.paid;
  const readyCount = table?.players.filter((player) => player.paid).length ?? 0;
  const canBet = table?.status === 'lobby' && joined;
  const canStart = table?.status === 'lobby' && isHost && table.players.length > 0 && table.players.every((player) => player.paid);
  const canAct = table?.status === 'playing' && myPlayer && playerIsTurn(table, myPlayer);
  const allowedActions = table?.allowedActions ?? [];
  const latestResult =
    table?.lastResult?.players?.find(
      (player) => (myProfileId && player.profileId === myProfileId) || (myDiscordId && player.userId === myDiscordId)
    ) ?? (table?.status === 'resolved' ? myPlayer : null);

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

  const loadTables = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) {
        return;
      }

      const payload = await fetchBlackjackTables(token, signal);
      setTables(getTables(payload));
    },
    [token]
  );

  const refreshTable = useCallback(
    async (signal?: AbortSignal) => {
      if (!token || !table?.tableId) {
        return;
      }

      applyTablePayload(await fetchBlackjackTable(token, table.tableId, signal));
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
    }, table.status === 'playing' ? 1_500 : 4_000);

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
        await loadTables();
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setBusyAction(null);
      }
    },
    [applyTablePayload, loadTables, token]
  );

  const createTable = useCallback(() => runTableAction('create', () => createBlackjackTable(token!)), [runTableAction, token]);
  const joinTable = () => table && runTableAction('join', () => joinBlackjackTable(token!, table.tableId));
  const leaveTable = () => table && runTableAction('leave', () => leaveBlackjackTable(token!, table.tableId));
  const placeBet = () => table && runTableAction('bet', () => betBlackjackTable(token!, table.tableId, bet));
  const startTable = () => table && runTableAction('start', () => startBlackjackTable(token!, table.tableId));
  const hit = () => table && runTableAction('hit', () => hitBlackjackTable(token!, table.tableId));
  const stand = () => table && runTableAction('stand', () => standBlackjackTable(token!, table.tableId));
  const double = () => table && runTableAction('double', () => doubleBlackjackTable(token!, table.tableId));
  const split = () => table && runTableAction('split', () => splitBlackjackTable(token!, table.tableId));

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
        <GameText variant="title">Blackjack Tables</GameText>
        <GameText tone="muted">Link Discord to open shared Blackjack tables.</GameText>
      </GameCard>
    );
  }

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText tone="faint" variant="label">
          Live Table
        </GameText>
        <GameText variant="title">Blackjack</GameText>
        <GameText tone="muted">Shared by the app and Discord. Start solo, or let others join before the dealer opens the shoe.</GameText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {table ? (
          <CasinoButton disabled={!!busyAction} onPress={() => setTable(null)} tone="echo">
            Back To Tables
          </CasinoButton>
        ) : (
          <>
            <CasinoButton disabled={!!busyAction} onPress={createTable} tone="ember">
              {busyAction === 'create' ? 'Opening...' : 'Start Blackjack Table'}
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
              <GameText variant="title">No Blackjack Tables</GameText>
              <GameText tone="muted">Open a table and Discord gets a join button. One player is enough to start.</GameText>
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
                  <GameText variant="label">Blackjack {tableCode(entry)}</GameText>
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
              backgroundColor: '#0A301F',
              borderColor: GameTheme.colors.echo,
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
                <GameText tone="muted">Hosted by {table.hostDisplayName ?? 'the dealer'}</GameText>
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
            <TableHand hand={dealer} title="Dealer" />
            <TableHand hand={activeHand} title="Your Active Hand" />
          </View>

          <View style={{ gap: GameTheme.spacing.sm }}>
            <GameText variant="label">Seats</GameText>
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
                      : playerIsTurn(table, player)
                        ? GameTheme.colors.ember
                        : GameTheme.colors.border,
                  borderRadius: GameTheme.radius.sm,
                  borderWidth: 1,
                  gap: GameTheme.spacing.xs,
                  padding: GameTheme.spacing.sm,
                }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: GameTheme.spacing.md }}>
                  <GameText variant="label">{playerName(player, index)}</GameText>
                  <GameText tone={playerIsTurn(table, player) ? 'ember' : player.paid ? 'echo' : 'muted'} variant="label">
                    {playerIsTurn(table, player) ? 'TURN' : player.paid && table.status === 'lobby' ? 'READY' : (player.status ?? 'joined').toUpperCase()}
                  </GameText>
                </View>
                <GameText tone="muted">
                  {player.bet ? `Bet ${formatMoney(player.bet)}` : 'No bet yet'}
                  {player.hands?.length ? ` | Hands ${player.hands.length}` : ''}
                </GameText>
              </View>
            ))}
          </View>

          {latestResult?.result || latestResult?.payout ? (
            <ResultCard
              details={[{ label: 'Result', value: latestResult.result ?? latestResult.status ?? 'Resolved' }]}
              payout={latestResult.payout ?? 0}
              profit={latestResult.profit ?? (latestResult.payout ?? 0) - (latestResult.bet ?? 0)}
              stake={latestResult.bet ?? 0}
              summary={table.lastResult?.message ?? table.message ?? 'The dealer settled your seat.'}
              title="Blackjack Result"
              tone={(latestResult.payout ?? 0) > (latestResult.bet ?? 0) ? 'good' : (latestResult.payout ?? 0) > 0 ? 'neutral' : 'bad'}
            />
          ) : null}

          {table.status === 'lobby' ? (
            <View style={{ gap: GameTheme.spacing.md }}>
              {!joined ? (
                <CasinoButton disabled={!!busyAction} onPress={joinTable} tone="echo">
                  {busyAction === 'join' ? 'Sitting...' : 'Join Table'}
                </CasinoButton>
              ) : null}
              {canBet ? (
                <GameCard style={{ backgroundColor: GameTheme.colors.backgroundSoft }}>
                  <GameText variant="label">Table Bet</GameText>
                  <BetPicker amount={bet} disabled={!!busyAction} onChange={setBet} />
                  <CasinoButton disabled={!!busyAction} onPress={placeBet} tone="ember">
                    {busyAction === 'bet' ? 'Placing...' : paid ? 'Change Bet' : 'Lock Bet'}
                  </CasinoButton>
                </GameCard>
              ) : null}
              {canStart ? (
                <CasinoButton disabled={!!busyAction} onPress={startTable} tone="echo">
                  {busyAction === 'start' ? 'Dealing...' : 'Start Round'}
                </CasinoButton>
              ) : null}
              {joined ? (
                <CasinoButton disabled={!!busyAction} onPress={leaveTable}>
                  Leave Table
                </CasinoButton>
              ) : null}
            </View>
          ) : null}

          {table.status === 'playing' ? (
            <View style={{ gap: GameTheme.spacing.md }}>
              {canAct ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                  <CasinoButton disabled={!!busyAction} onPress={hit} tone="echo">
                    Hit
                  </CasinoButton>
                  <CasinoButton disabled={!!busyAction} onPress={stand} tone="ember">
                    Stand
                  </CasinoButton>
                  {allowedActions.includes('double') ? (
                    <CasinoButton disabled={!!busyAction} onPress={double} tone="ember">
                      Double
                    </CasinoButton>
                  ) : null}
                  {allowedActions.includes('split') ? (
                    <CasinoButton disabled={!!busyAction} onPress={split} tone="echo">
                      Split
                    </CasinoButton>
                  ) : null}
                </View>
              ) : (
                <GameText tone="muted">Waiting for the current seat. The dealer is pretending to be patient.</GameText>
              )}
            </View>
          ) : null}
        </View>
      )}
    </GameCard>
  );
}
