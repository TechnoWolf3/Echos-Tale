import { useState } from 'react';
import { View } from 'react-native';

import { BetPicker } from '@/components/casino/bet-picker';
import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import { RouletteBetType, spinRoulette } from '@/services/casino-service';

const rouletteBets: { label: string; type: RouletteBetType; value?: number }[] = [
  { label: 'Red', type: 'red' },
  { label: 'Black', type: 'black' },
  { label: 'Odd', type: 'odd' },
  { label: 'Even', type: 'even' },
  { label: 'Low', type: 'low' },
  { label: 'High', type: 'high' },
  { label: 'Zero', type: 'number', value: 0 },
  { label: '17', type: 'number', value: 17 },
];

export function RouletteGame() {
  const game = useElsewhereGame();
  const [amount, setAmount] = useState(500);
  const [selected, setSelected] = useState(rouletteBets[0]);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const spin = () => {
    if (game.sessionToken) {
      return;
    }

    const result = spinRoulette(amount, selected.type, selected.value);
    const settled = game.resolveCasinoPlay({ cost: amount, message: result.message, payout: result.payout });

    if (settled) {
      setLastResult(`Pocket ${result.pocket} | ${result.won ? `${result.multiplier}x win` : 'loss'}`);
    }
  };

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Roulette</GameText>
        <GameText tone="muted">
          {game.sessionToken
            ? 'Linked play is locked until Railway owns spins and payouts.'
            : 'European wheel. No double zero, just regular consequences.'}
        </GameText>
      </View>
      <BetPicker amount={amount} disabled={!!game.sessionToken} onChange={setAmount} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {rouletteBets.map((bet) => (
          <CasinoButton
            key={`${bet.type}-${bet.value ?? bet.label}`}
            onPress={() => setSelected(bet)}
            tone={selected === bet ? 'ember' : 'plain'}>
            {bet.label}
          </CasinoButton>
        ))}
      </View>
      <CasinoButton disabled={!!game.sessionToken} onPress={spin} tone="ember">
        {game.sessionToken ? 'Server Soon' : 'Spin'}
      </CasinoButton>
      {lastResult ? <GameText tone="muted">{lastResult}</GameText> : null}
    </GameCard>
  );
}
