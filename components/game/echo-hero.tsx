import { Image } from 'expo-image';
import { View } from 'react-native';

import { GameText } from '@/components/game/game-text';
import { BrandAssets } from '@/constants/brand-assets';
import { GameTheme } from '@/constants/theme';

export function EchoHero() {
  return (
    <View
      style={{
        minHeight: 250,
        overflow: 'hidden',
        paddingVertical: GameTheme.spacing.xl,
      }}>
      <Image
        accessibilityIgnoresInvertColors
        contentFit="cover"
        source={{ uri: BrandAssets.echo.uri }}
        style={{
          bottom: -16,
          height: 280,
          opacity: 0.42,
          position: 'absolute',
          right: -34,
          width: 280,
        }}
      />
      <View
        style={{
          backgroundColor: 'rgba(6, 7, 18, 0.44)',
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <View
        style={{
          gap: GameTheme.spacing.sm,
          maxWidth: 500,
          paddingRight: 96,
          position: 'relative',
        }}>
        <GameText tone="faint" variant="label">
          Echo of Elsewhere
        </GameText>
        <GameText variant="display">Elsewhere</GameText>
        <GameText tone="muted">
          A crooked little city where every button has receipts.
        </GameText>
      </View>
    </View>
  );
}
