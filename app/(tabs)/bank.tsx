import { useCallback, useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { StatPill } from '@/components/game/stat-pill';
import { GameTheme } from '@/constants/theme';
import { formatMoney, useElsewhereGame } from '@/hooks/use-elsewhere-game';
import {
  acceptBankLoan,
  depositBankFunds,
  disableRecurringDeposit,
  EchoApiBankDashboard,
  EchoApiBankLoansResponse,
  EchoApiBankTransaction,
  EchoApiError,
  fetchBankDashboard,
  fetchBankLoans,
  fetchBankTransactions,
  repayBankLoan,
  setRecurringDeposit,
  transferBankFunds,
  withdrawBankFunds,
} from '@/services/echo-api';

type BankTab = 'loans' | 'move' | 'overview' | 'statement' | 'transfer';

const tabs: BankTab[] = ['overview', 'move', 'transfer', 'loans', 'statement'];

function cleanAmount(value: string) {
  const parsed = Number(value.replace(/\D/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Date(value).toLocaleString();
}

function transactionLabel(transaction: EchoApiBankTransaction) {
  const displayAmount = transaction.displayAmount ?? Number(transaction.meta?.amount ?? transaction.amount);
  const sign = displayAmount > 0 ? '+' : displayAmount < 0 ? '-' : '';
  const cleanType = transaction.type.replace(/_/g, ' ');

  return `${cleanType} | ${sign}${formatMoney(Math.abs(displayAmount))}`;
}

function SectionTabs({ activeTab, onChange }: { activeTab: BankTab; onChange: (tab: BankTab) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
      {tabs.map((tab) => (
        <CasinoButton key={tab} onPress={() => onChange(tab)} tone={activeTab === tab ? 'echo' : 'plain'}>
          {tab}
        </CasinoButton>
      ))}
    </View>
  );
}

function MoneyInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <View
      style={{
        backgroundColor: GameTheme.colors.backgroundSoft,
        borderColor: GameTheme.colors.borderBright,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        gap: GameTheme.spacing.xs,
        padding: GameTheme.spacing.sm,
      }}>
      <GameText tone="faint" variant="caption">
        {label}
      </GameText>
      <TextInput
        keyboardType="number-pad"
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor={GameTheme.colors.textFaint}
        style={{ color: GameTheme.colors.echo, fontSize: 24, fontWeight: '800', padding: 0 }}
        value={value}
      />
    </View>
  );
}

function AccountInput({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <View
      style={{
        backgroundColor: GameTheme.colors.backgroundSoft,
        borderColor: GameTheme.colors.borderBright,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        gap: GameTheme.spacing.xs,
        padding: GameTheme.spacing.sm,
      }}>
      <GameText tone="faint" variant="caption">
        Recipient Account Number
      </GameText>
      <TextInput
        keyboardType="number-pad"
        maxLength={14}
        onChangeText={(nextValue) => onChange(nextValue.replace(/\D/g, '').slice(0, 10))}
        placeholder="10 digit account"
        placeholderTextColor={GameTheme.colors.textFaint}
        style={{ color: GameTheme.colors.text, fontSize: 20, fontWeight: '800', padding: 0 }}
        value={value}
      />
    </View>
  );
}

export default function BankScreen() {
  const game = useElsewhereGame();
  const { accountNumber: linkedAccountNumber, applyRemoteProfile, sessionToken } = game;
  const [activeTab, setActiveTab] = useState<BankTab>('overview');
  const [dashboard, setDashboard] = useState<EchoApiBankDashboard | null>(null);
  const [transactions, setTransactions] = useState<EchoApiBankTransaction[]>([]);
  const [loans, setLoans] = useState<EchoApiBankLoansResponse | null>(null);
  const [amount, setAmount] = useState('5000');
  const [transferAccount, setTransferAccount] = useState('');
  const [recurringAmount, setRecurringAmount] = useState('5000');
  const [message, setMessage] = useState('The Reserve is quiet.');
  const [loading, setLoading] = useState(false);

  const accountNumber = dashboard?.accountNumber ?? linkedAccountNumber;
  const loan = loans?.loan ?? dashboard?.loan ?? null;
  const recurringDeposit = dashboard?.recurringDeposit ?? null;
  const jailed = game.jailUntil !== null && game.jailUntil > game.now;

  const loadBank = useCallback(
    async (signal?: AbortSignal) => {
      if (!sessionToken) {
        return;
      }

      try {
        const [nextDashboard, nextTransactions, nextLoans] = await Promise.all([
          fetchBankDashboard(sessionToken, signal),
          fetchBankTransactions(sessionToken, signal).catch(() => ({ transactions: [] })),
          fetchBankLoans(sessionToken, signal).catch(() => null),
        ]);

        setDashboard(nextDashboard);
        setTransactions(nextTransactions.transactions);
        setLoans(nextLoans);
        applyRemoteProfile(nextDashboard.profile, { announce: false });
        setMessage('The Reserve accepted your credentials.');
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        setMessage(error instanceof EchoApiError ? error.message : 'The Reserve window is closed.');
      }
    },
    [applyRemoteProfile, sessionToken]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadBank(controller.signal);

    return () => controller.abort();
  }, [loadBank]);

  const runBankAction = async (action: () => Promise<{ profile?: typeof game.linkedProfile }>, success: string) => {
    if (!sessionToken) {
      return;
    }

    setLoading(true);
    setMessage('The Reserve is counting silently...');

    try {
      const response = await action();

      if (response.profile) {
        game.applyRemoteProfile(response.profile, { announce: false });
      }

      setMessage(success);
      await loadBank();
    } catch (error) {
      setMessage(error instanceof EchoApiError ? error.message : 'The Reserve rejected the slip.');
    } finally {
      setLoading(false);
    }
  };

  const parsedAmount = useMemo(() => cleanAmount(amount), [amount]);
  const parsedRecurringAmount = useMemo(() => cleanAmount(recurringAmount), [recurringAmount]);

  const deposit = (depositAll = false) =>
    runBankAction(
      () => depositBankFunds(sessionToken!, depositAll ? 'all' : parsedAmount),
      depositAll ? 'Wallet swept into the Reserve.' : `${formatMoney(parsedAmount)} deposited into the Reserve.`
    );

  const withdraw = (withdrawAll = false) =>
    runBankAction(
      () => withdrawBankFunds(sessionToken!, withdrawAll ? 'all' : parsedAmount),
      withdrawAll ? 'Bank balance moved back to street money.' : `${formatMoney(parsedAmount)} withdrawn to wallet.`
    );

  const transfer = () =>
    runBankAction(
      () => transferBankFunds(sessionToken!, transferAccount, parsedAmount),
      `${formatMoney(parsedAmount)} sent to account ${transferAccount}.`
    );

  const updateRecurring = () =>
    runBankAction(
      () => setRecurringDeposit(sessionToken!, parsedRecurringAmount).then((response) => ({ profile: dashboard?.profile, response })),
      `Daily auto-deposit set to ${formatMoney(parsedRecurringAmount)}.`
    );

  const disableRecurring = () =>
    runBankAction(
      () => disableRecurringDeposit(sessionToken!).then((response) => ({ profile: dashboard?.profile, response })),
      'Daily auto-deposit disabled.'
    );

  const acceptLoan = (offerId: string) =>
    runBankAction(
      () => acceptBankLoan(sessionToken!, offerId),
      'Loan approved. The Reserve has updated your file.'
    );

  const repayLoan = (repayAll = false) =>
    runBankAction(
      () => repayBankLoan(sessionToken!, repayAll ? 'all' : parsedAmount),
      repayAll ? 'Loan repayment submitted in full.' : `${formatMoney(parsedAmount)} paid toward the loan.`
    );

  return (
    <GameScreen backgroundAsset="reserve" backgroundOpacity={0.16}>
      <View style={{ gap: GameTheme.spacing.sm, paddingTop: GameTheme.spacing.xl }}>
        <GameText tone="faint" variant="label">
          The Echo Reserve
        </GameText>
        <GameText variant="display">Bank</GameText>
        <GameText tone="muted">Stability. Security. Silence.</GameText>
      </View>

      {!sessionToken ? (
        <GameCard elevated>
          <GameText variant="title">Link Required</GameText>
          <GameText tone="muted">
            Bank actions need the Railway ledger. Link Discord first so the app can read your existing account number and balances.
          </GameText>
        </GameCard>
      ) : null}

      <GameCard elevated>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          <StatPill label="Wallet" value={formatMoney(game.wallet)} />
          <StatPill label="Bank" value={formatMoney(game.bank)} />
          <StatPill label="Total Wealth" value={formatMoney((dashboard?.totalWealth ?? game.wallet + game.bank))} />
        </View>
        <View
          style={{
            backgroundColor: GameTheme.colors.backgroundSoft,
            borderColor: GameTheme.colors.echo,
            borderRadius: GameTheme.radius.sm,
            borderWidth: 1,
            gap: GameTheme.spacing.xs,
            padding: GameTheme.spacing.md,
          }}>
          <GameText tone="faint" variant="caption">
            Echo Reserve Account Number
          </GameText>
          <GameText tone="echo" variant="title">
            {accountNumber ?? 'Pending Railway'}
          </GameText>
          <GameText tone="faint" variant="caption">
            Existing Discord account numbers are displayed as-is. The app does not generate or replace them.
          </GameText>
        </View>
        {jailed ? (
          <GameText tone="ember">Bank actions are locked while jailed. Viewing remains available.</GameText>
        ) : null}
      </GameCard>

      <SectionTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' ? (
        <GameCard>
          <GameText variant="title">Reserve Notes</GameText>
          <GameText tone="muted">Casino uses wallet. Purchases use bank. Transfers move bank to bank.</GameText>
          <GameText tone={loan?.status === 'defaulted' ? 'ember' : loan ? 'echo' : 'faint'}>
            Loan: {loan ? `${loan.offerName} | ${loan.status.toUpperCase()} | due ${formatMoney(loan.remainingDue)}` : 'No active loan'}
          </GameText>
          <GameText tone="muted">
            Auto-deposit:{' '}
            {recurringDeposit?.enabled
              ? `${formatMoney(recurringDeposit.amount)} daily | next ${formatDate(recurringDeposit.nextRunAt)}`
              : 'Disabled'}
          </GameText>
        </GameCard>
      ) : null}

      {activeTab === 'move' ? (
        <GameCard>
          <GameText variant="title">Move Money</GameText>
          <MoneyInput label="Amount" onChange={setAmount} value={amount} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
            <CasinoButton disabled={loading || jailed || parsedAmount <= 0} onPress={() => void deposit()} tone="echo">
              Deposit
            </CasinoButton>
            <CasinoButton disabled={loading || jailed} onPress={() => void deposit(true)} tone="echo">
              Deposit All
            </CasinoButton>
            <CasinoButton disabled={loading || jailed || parsedAmount <= 0} onPress={() => void withdraw()} tone="ember">
              Withdraw
            </CasinoButton>
            <CasinoButton disabled={loading || jailed} onPress={() => void withdraw(true)} tone="ember">
              Withdraw All
            </CasinoButton>
          </View>
          <MoneyInput label="Daily Auto-Deposit Amount" onChange={setRecurringAmount} value={recurringAmount} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
            <CasinoButton disabled={loading || jailed || parsedRecurringAmount <= 0} onPress={() => void updateRecurring()} tone="echo">
              Set Daily
            </CasinoButton>
            <CasinoButton disabled={loading || jailed} onPress={() => void disableRecurring()}>
              Disable Daily
            </CasinoButton>
          </View>
        </GameCard>
      ) : null}

      {activeTab === 'transfer' ? (
        <GameCard>
          <GameText variant="title">Bank Transfer</GameText>
          <GameText tone="muted">Transfers use Echo Reserve account numbers, not Discord usernames.</GameText>
          <AccountInput onChange={setTransferAccount} value={transferAccount} />
          <MoneyInput label="Amount" onChange={setAmount} value={amount} />
          <CasinoButton disabled={loading || jailed || parsedAmount <= 0 || transferAccount.length !== 10} onPress={() => void transfer()} tone="echo">
            Send Transfer
          </CasinoButton>
        </GameCard>
      ) : null}

      {activeTab === 'loans' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {loan ? (
            <GameCard>
              <GameText variant="title">{loan.offerName}</GameText>
              <GameText tone={loan.status === 'defaulted' ? 'ember' : 'muted'}>
                {loan.status.toUpperCase()} | Remaining {formatMoney(loan.remainingDue)}
              </GameText>
              <GameText tone="faint">Due {formatDate(loan.dueAt)} | Default {formatDate(loan.defaultAt)}</GameText>
              <MoneyInput label="Repayment Amount" onChange={setAmount} value={amount} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
                <CasinoButton disabled={loading || jailed || parsedAmount <= 0} onPress={() => void repayLoan()} tone="echo">
                  Repay
                </CasinoButton>
                <CasinoButton disabled={loading || jailed} onPress={() => void repayLoan(true)} tone="ember">
                  Repay All
                </CasinoButton>
              </View>
            </GameCard>
          ) : null}
          {(loans?.offers ?? []).map((offer) => (
            <GameCard key={offer.id}>
              <GameText variant="title">{offer.name}</GameText>
              <GameText tone="muted">{offer.description}</GameText>
              <GameText tone="faint">
                Borrow {formatMoney(offer.principal)} | fee {formatMoney(offer.fee)} | due {formatMoney(offer.totalDue)}
              </GameText>
              {offer.requirement ? <GameText tone="faint">Requirement: {offer.requirement}</GameText> : null}
              <CasinoButton disabled={loading || jailed || !!loan || !!offer.locked} onPress={() => void acceptLoan(offer.id)} tone="echo">
                Accept Loan
              </CasinoButton>
            </GameCard>
          ))}
          {!loan && !(loans?.offers ?? []).length ? (
            <GameCard>
              <GameText tone="muted">Loan offers have not been returned by Railway yet.</GameText>
            </GameCard>
          ) : null}
        </View>
      ) : null}

      {activeTab === 'statement' ? (
        <View style={{ gap: GameTheme.spacing.md }}>
          {transactions.length ? (
            transactions.slice(0, 10).map((transaction) => (
              <GameCard key={transaction.id} style={{ padding: GameTheme.spacing.md }}>
                <GameText>{transactionLabel(transaction)}</GameText>
                <GameText tone="faint" variant="caption">
                  {formatDate(transaction.createdAt)}
                </GameText>
              </GameCard>
            ))
          ) : (
            <GameCard>
              <GameText tone="muted">No statement rows returned yet.</GameText>
            </GameCard>
          )}
        </View>
      ) : null}

      <GameCard style={{ padding: GameTheme.spacing.md }}>
        <GameText tone={message.includes('rejected') || message.includes('closed') ? 'ember' : 'muted'}>
          {message}
        </GameText>
      </GameCard>
    </GameScreen>
  );
}
