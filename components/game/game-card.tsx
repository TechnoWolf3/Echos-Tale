import { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { GameTheme } from '@/constants/theme';

type GameCardProps = {
  children: ReactNode;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GameCard({ children, elevated, style }: GameCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? GameTheme.colors.panelRaised : GameTheme.colors.panel,
          borderColor: GameTheme.colors.border,
          borderRadius: GameTheme.radius.md,
          borderWidth: 1,
          boxShadow: `0 12px 28px ${GameTheme.colors.shadow}`,
          gap: GameTheme.spacing.md,
          padding: GameTheme.spacing.lg,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
