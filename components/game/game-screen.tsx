import { ReactNode } from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';

import { GameTheme } from '@/constants/theme';

type GameScreenProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function GameScreen({ children, contentStyle }: GameScreenProps) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: GameTheme.colors.background }}
      contentContainerStyle={[
        {
          flexGrow: 1,
          padding: GameTheme.spacing.lg,
          paddingBottom: GameTheme.spacing.xl + 20,
        },
      ]}>
      <View
        style={[
          {
            alignSelf: 'center',
            gap: GameTheme.spacing.lg,
            maxWidth: 760,
            width: '100%',
          },
          contentStyle,
        ]}>
        {children}
      </View>
    </ScrollView>
  );
}
