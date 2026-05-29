import { ReactNode } from 'react';
import { Image } from 'expo-image';
import { Platform, ScrollView, StyleProp, View, ViewStyle } from 'react-native';

import { BrandAssetKey, BrandAssets } from '@/constants/brand-assets';
import { GameTheme } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

type GameScreenProps = {
  backgroundAsset?: BrandAssetKey;
  backgroundOpacity?: number;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function GameScreen({ backgroundAsset, backgroundOpacity = 0.18, children, contentStyle }: GameScreenProps) {
  const background = backgroundAsset ? BrandAssets[backgroundAsset] : null;

  return (
    <View style={{ backgroundColor: GameTheme.colors.background, flex: 1, overflow: 'hidden' }}>
      {background ? (
        <>
          <Image
            accessibilityIgnoresInvertColors
            contentFit="cover"
            source={{ uri: background.uri }}
            style={{
              bottom: 0,
              left: 0,
              opacity: backgroundOpacity,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          />
          <View
            style={{
              backgroundColor: 'rgba(6, 7, 18, 0.72)',
              bottom: 0,
              left: 0,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          />
        </>
      ) : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={[
          {
            flexGrow: 1,
            padding: GameTheme.spacing.lg,
            paddingBottom: isWeb ? GameTheme.spacing.xl + 88 : GameTheme.spacing.xl + 20,
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
    </View>
  );
}
