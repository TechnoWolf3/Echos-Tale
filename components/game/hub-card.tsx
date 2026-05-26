import { Href, Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';

type HubCardProps = {
  detail: string;
  href?: Href;
  meta: string;
  onPress?: () => void;
  status?: string;
  title: string;
  tone?: 'echo' | 'ember' | 'danger' | 'success';
};

const toneColor = {
  danger: GameTheme.colors.danger,
  echo: GameTheme.colors.echo,
  ember: GameTheme.colors.ember,
  success: GameTheme.colors.success,
};

function HubCardContent({ detail, meta, status, title, tone = 'echo' }: Omit<HubCardProps, 'href' | 'onPress'>) {
  return (
    <GameCard style={{ padding: 0 }}>
      <View style={{ gap: GameTheme.spacing.md, padding: GameTheme.spacing.lg }}>
        <View
          style={{
            alignItems: 'flex-start',
            flexDirection: 'row',
            gap: GameTheme.spacing.md,
            justifyContent: 'space-between',
          }}>
          <View style={{ flex: 1, gap: 4 }}>
            <GameText variant="title">{title}</GameText>
            <GameText tone="muted">{detail}</GameText>
          </View>
          {status ? (
            <View
              style={{
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: toneColor[tone],
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                paddingHorizontal: GameTheme.spacing.sm,
                paddingVertical: GameTheme.spacing.xs,
              }}>
              <GameText style={{ color: toneColor[tone] }} variant="label">
                {status}
              </GameText>
            </View>
          ) : null}
        </View>
        <GameText tone="faint" variant="caption">
          {meta}
        </GameText>
      </View>
    </GameCard>
  );
}

export function HubCard(props: HubCardProps) {
  const content = <HubCardContent {...props} />;

  if (props.href) {
    return (
      <Link asChild href={props.href}>
        <Pressable accessibilityRole="button">{content}</Pressable>
      </Link>
    );
  }

  if (props.onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={props.onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}
