import { View } from 'react-native';

import { GameTheme } from '@/constants/theme';

type ProgressBarProps = {
  color?: string;
  progress: number;
};

export function ProgressBar({ color = GameTheme.colors.violet, progress }: ProgressBarProps) {
  return (
    <View
      style={{
        backgroundColor: GameTheme.colors.backgroundSoft,
        borderRadius: GameTheme.radius.sm,
        height: 10,
        overflow: 'hidden',
      }}>
      <View
        style={{
          backgroundColor: color,
          borderRadius: GameTheme.radius.sm,
          height: '100%',
          width: `${Math.max(0, Math.min(progress, 1)) * 100}%`,
        }}
      />
    </View>
  );
}
