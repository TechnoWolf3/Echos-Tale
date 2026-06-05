import { Animated, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';

import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { MEMORY_CARD_IMAGES, type MemoryFragment } from '@/data/story';

type MemoryCardProps = {
  disabled?: boolean;
  fragment: MemoryFragment;
  matched?: boolean;
  onPress: () => void;
  revealed?: boolean;
};

export function MemoryCard({ disabled, fragment, matched, onPress, revealed }: MemoryCardProps) {
  const flipProgress = useRef(new Animated.Value(revealed || matched ? 1 : 0)).current;
  const faceUp = revealed || matched;

  useEffect(() => {
    Animated.timing(flipProgress, {
      duration: matched ? 360 : 260,
      toValue: faceUp ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [faceUp, flipProgress, matched]);

  const frontRotation = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const backRotation = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable
      accessibilityLabel={`${revealed || matched ? fragment.title : 'Hidden'} memory card`}
      accessibilityRole="button"
      disabled={disabled || matched}
      onPress={onPress}
      style={({ pressed }) => ({
        aspectRatio: 0.78,
        backgroundColor: faceUp ? 'rgba(169, 243, 255, 0.08)' : GameTheme.colors.backgroundSoft,
        borderColor: matched ? fragment.accent : revealed ? GameTheme.colors.echo : GameTheme.colors.border,
        borderRadius: GameTheme.radius.md,
        borderWidth: matched ? 2 : 1,
        boxShadow: matched
          ? `0 0 24px ${fragment.accent}55`
          : revealed
            ? `0 0 18px rgba(169, 243, 255, 0.18)`
            : `0 8px 18px ${GameTheme.colors.shadow}`,
        justifyContent: 'center',
        minHeight: 118,
        opacity: disabled && !matched ? 0.68 : pressed ? 0.78 : 1,
        overflow: 'hidden',
        padding: GameTheme.spacing.xs,
        width: '31%',
      })}>
      <View style={{ flex: 1 }}>
        <Animated.View
          pointerEvents={faceUp ? 'auto' : 'none'}
          style={{
            backgroundColor: 'rgba(3, 5, 16, 0.72)',
            borderColor: fragment.accent,
            borderRadius: GameTheme.radius.sm,
            borderWidth: 1,
            backfaceVisibility: 'hidden',
            bottom: 0,
            left: 0,
            overflow: 'hidden',
            position: 'absolute',
            right: 0,
            top: 0,
            transform: [{ perspective: 900 }, { rotateY: frontRotation }],
          }}>
          <Image
            accessibilityIgnoresInvertColors
            contentFit="cover"
            source={fragment.image}
            style={{
              flex: 1,
              width: '100%',
            }}
          />
          {matched ? (
            <View
              style={{
                backgroundColor: 'rgba(3, 5, 16, 0.7)',
                borderColor: fragment.accent,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                bottom: GameTheme.spacing.xs,
                left: GameTheme.spacing.xs,
                paddingHorizontal: GameTheme.spacing.xs,
                paddingVertical: 2,
                position: 'absolute',
              }}>
              <GameText tone="echo" variant="caption" style={{ fontSize: 10, textAlign: 'center' }}>
                mounted
              </GameText>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View
          pointerEvents={faceUp ? 'none' : 'auto'}
          style={{
            alignItems: 'center',
            borderColor: GameTheme.colors.borderBright,
            borderRadius: GameTheme.radius.sm,
            borderWidth: 1,
            backfaceVisibility: 'hidden',
            bottom: 0,
            justifyContent: 'center',
            left: 0,
            overflow: 'hidden',
            position: 'absolute',
            right: 0,
            top: 0,
            transform: [{ perspective: 900 }, { rotateY: backRotation }],
          }}>
          <Image
            accessibilityIgnoresInvertColors
            contentFit="cover"
            source={MEMORY_CARD_IMAGES['card-back']}
            style={{
              flex: 1,
              width: '100%',
            }}
          />
          <View
            style={{
              backgroundColor: 'rgba(3, 5, 16, 0.36)',
              bottom: 0,
              left: 0,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}
