import { Text, type TextProps } from 'react-native';

import { GameTheme } from '@/constants/theme';

type GameTextProps = TextProps & {
  tone?: 'primary' | 'muted' | 'faint' | 'echo' | 'ember';
  variant?: 'body' | 'caption' | 'label' | 'title' | 'display';
};

const toneColors = {
  primary: GameTheme.colors.text,
  muted: GameTheme.colors.textMuted,
  faint: GameTheme.colors.textFaint,
  echo: GameTheme.colors.echo,
  ember: GameTheme.colors.ember,
};

const variantStyles = {
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  title: { fontSize: 22, fontWeight: '800' as const, lineHeight: 28 },
  display: { fontSize: 44, fontWeight: '900' as const, lineHeight: 50 },
};

export function GameText({
  children,
  style,
  tone = 'primary',
  variant = 'body',
  ...props
}: GameTextProps) {
  return (
    <Text
      selectable={variant === 'display' || variant === 'title'}
      {...props}
      style={[{ color: toneColors[tone] }, variantStyles[variant], style]}>
      {children}
    </Text>
  );
}
