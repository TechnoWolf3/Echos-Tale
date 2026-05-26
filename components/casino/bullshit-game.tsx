import { useState } from 'react';
import { View } from 'react-native';

import { BetPicker } from '@/components/casino/bet-picker';
import { CasinoButton } from '@/components/casino/casino-button';
import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';
import { BullshitResult, playBullshit } from '@/services/casino-service';

export function BullshitGame() {
  const game = useElsewhereGame();
  const [buyIn, setBuyIn] = useState(500);
  const [result, setResult] = useState<BullshitResult | null>(null);

  const playRound = () => {
    if (game.sessionToken) {
      return;
    }

    const nextResult = playBullshit(buyIn);
    const settled = game.resolveCasinoPlay({ cost: buyIn, message: nextResult.message, payout: nextResult.payout });

    if (settled) {
      setResult(nextResult);
    }
  };

  return (
    <GameCard elevated>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText variant="title">Bullshit</GameText>
        <GameText tone="muted">
          {game.sessionToken
            ? 'Linked play is locked until Railway owns pots and calls.'
            : 'A compact bot-table version: buy in, sell the lie, survive the call.'}
        </GameText>
      </View>
      <BetPicker amount={buyIn} disabled={!!game.sessionToken} onChange={setBuyIn} />
      <CasinoButton disabled={!!game.sessionToken} onPress={playRound} tone="ember">
        {game.sessionToken ? 'Server Soon' : 'Play Hand'}
      </CasinoButton>
      {result ? (
        <GameText tone={result.payout > 0 ? 'echo' : result.survived ? 'muted' : 'ember'}>{result.message}</GameText>
      ) : null}
    </GameCard>
  );
}
