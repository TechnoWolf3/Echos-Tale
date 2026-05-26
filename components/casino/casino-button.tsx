import { ReactNode } from 'react';
import { Pressable } from 'react-native';

import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';

type CasinoButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  tone?: 'echo' | 'ember' | 'plain';
};

export function CasinoButton({ children, disabled, onPress, tone = 'plain' }: CasinoButtonProps) {
  const borderColor =
    tone === 'echo' ? GameTheme.colors.echo : tone === 'ember' ? GameTheme.colors.ember : GameTheme.colors.borderBright;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: GameTheme.colors.backgroundSoft,
        borderColor,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        opacity: disabled ? 0.42 : pressed ? 0.76 : 1,
        paddingHorizontal: GameTheme.spacing.md,
        paddingVertical: GameTheme.spacing.sm,
      })}>
      <GameText tone={tone === 'ember' ? 'ember' : tone === 'echo' ? 'echo' : 'primary'} variant="label">
        {children}
      </GameText>
    </Pressable>
  );
}
