import { Image } from 'expo-image';
import { View } from 'react-native';

import { BrandAssetKey, BrandAssets } from '@/constants/brand-assets';
import { GameTheme } from '@/constants/theme';

type BrandLogoProps = {
  asset: BrandAssetKey;
  height?: number;
};

export function BrandLogo({ asset, height = 96 }: BrandLogoProps) {
  const logo = BrandAssets[asset];

  return (
    <View
      accessibilityLabel={logo.alt}
      style={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: GameTheme.colors.backgroundSoft,
        borderColor: GameTheme.colors.border,
        borderRadius: GameTheme.radius.md,
        borderWidth: 1,
        boxShadow: `0 14px 32px ${GameTheme.colors.shadow}`,
        maxWidth: 360,
        overflow: 'hidden',
        padding: GameTheme.spacing.sm,
        width: '100%',
      }}>
      <Image
        accessibilityLabel={logo.alt}
        contentFit="contain"
        source={{ uri: logo.uri }}
        style={{ height, width: '100%' }}
      />
    </View>
  );
}
