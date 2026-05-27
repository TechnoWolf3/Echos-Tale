import { Pressable, View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';

type ActionCardProps = {
  description: string;
  disabled?: boolean;
  label: string;
  meta: string;
  onPress: () => void;
  title: string;
  tone?: 'echo' | 'ember' | 'danger' | 'success';
};

const toneColor = {
  danger: GameTheme.colors.danger,
  echo: GameTheme.colors.echo,
  ember: GameTheme.colors.ember,
  success: GameTheme.colors.success,
};

export function ActionCard({
  description,
  disabled,
  label,
  meta,
  onPress,
  title,
  tone = 'echo',
}: ActionCardProps) {
  return (
    <GameCard style={{ padding: 0 }}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          gap: GameTheme.spacing.md,
          opacity: disabled ? 0.48 : pressed ? 0.78 : 1,
          padding: GameTheme.spacing.lg,
        })}>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: GameTheme.spacing.md,
            justifyContent: 'space-between',
          }}>
          <View style={{ flex: 1, gap: 4 }}>
            <GameText variant="title">{title}</GameText>
            <GameText tone="muted">{description}</GameText>
          </View>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: GameTheme.colors.backgroundSoft,
              borderColor: toneColor[tone],
              borderRadius: GameTheme.radius.sm,
              borderWidth: 1,
              justifyContent: 'center',
              minHeight: 46,
              minWidth: 86,
              padding: GameTheme.spacing.sm,
            }}>
            <GameText style={{ color: toneColor[tone], textAlign: 'center' }} variant="label">
              {label}
            </GameText>
          </View>
        </View>
        <GameText tone="faint" variant="caption">
          {meta}
        </GameText>
      </Pressable>
    </GameCard>
  );
}
