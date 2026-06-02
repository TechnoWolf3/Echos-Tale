import { useState } from 'react';
import { View } from 'react-native';

import { BetPicker } from '@/components/casino/bet-picker';
import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import { KenoBetType, KenoResult, playKeno } from '@/services/casino-service';

const modes: { label: string; type: KenoBetType }[] = [
  { label: 'Heads', type: 'heads' },
  { label: 'Tails', type: 'tails' },
  { label: 'Draw', type: 'draw' },
  { label: 'Quick Pick', type: 'quickpick' },
];

export function KenoGame() {
  const game = useElsewhereGame();
  const [amount, setAmount] = useState(500);
  const [mode, setMode] = useState<KenoBetType>('heads');
  const [result, setResult] = useState<KenoResult | null>(null);

  const draw = () => {
    if (game.sessionToken) {
      return;
    }

    const nextResult = playKeno(amount, mode);
    const settled = game.resolveCasinoPlay({ cost: amount, message: nextResult.message, payout: nextResult.payout });

    if (settled) {
      setResult(nextResult);
    }
  };

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Keno</GameText>
        <GameText tone="muted">
          {game.sessionToken
            ? 'Linked play is locked until the house owns Keno draws.'
            : 'A fast draw version for now. The live table can grow from this.'}
        </GameText>
      </View>
      <BetPicker amount={amount} disabled={!!game.sessionToken} onChange={setAmount} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {modes.map((entry) => (
          <CasinoButton key={entry.type} onPress={() => setMode(entry.type)} tone={mode === entry.type ? 'ember' : 'plain'}>
            {entry.label}
          </CasinoButton>
        ))}
      </View>
      <CasinoButton disabled={!!game.sessionToken} onPress={draw} tone="ember">
        {game.sessionToken ? 'Server Soon' : 'Draw'}
      </CasinoButton>
      {result ? (
        <View style={{ gap: GameTheme.spacing.xs }}>
          <GameText tone={result.won ? 'echo' : 'muted'}>{result.message}</GameText>
          {result.ticket.length > 0 ? <GameText tone="faint">Ticket hits: {result.hits}/10</GameText> : null}
        </View>
      ) : null}
    </GameCard>
  );
}
