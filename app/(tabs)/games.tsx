import { View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameScreen } from '@/components/game/game-screen';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';

const casinoTables = [
  'Higher or Lower',
  'Blackjack',
  'Roulette',
  'Keno',
  'Inside Track',
  'Scratch Cards',
  'Bullshit',
];

export default function GamesScreen() {
  return (
    <GameScreen>
      <View style={{ gap: GameTheme.spacing.sm }}>
        <GameText tone="faint" variant="label">
          Casino lights, bad ideas
        </GameText>
        <GameText variant="display">Casino</GameText>
        <GameText tone="muted">
          The house keeps receipts. The tables pretend that is normal.
        </GameText>
      </View>

      <View style={{ gap: GameTheme.spacing.md }}>
        <GameText variant="title">Tables</GameText>
        <GameCard>
          {casinoTables.map((table) => (
            <GameText key={table} tone="muted">
              {table}
            </GameText>
          ))}
        </GameCard>
      </View>
    </GameScreen>
  );
}
