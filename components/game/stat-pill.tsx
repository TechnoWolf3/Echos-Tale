import { View } from 'react-native';

import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';

type StatPillProps = {
  label: string;
  value: string;
};

export function StatPill({ label, value }: StatPillProps) {
  return (
    <View
      style={{
        backgroundColor: GameTheme.colors.backgroundSoft,
        borderColor: GameTheme.colors.border,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        flex: 1,
        gap: 2,
        minWidth: 118,
        padding: GameTheme.spacing.md,
      }}>
      <GameText tone="faint" variant="caption">
        {label}
      </GameText>
      <GameText style={{ fontVariant: ['tabular-nums'] }} tone="echo" variant="title">
        {value}
      </GameText>
    </View>
  );
}
