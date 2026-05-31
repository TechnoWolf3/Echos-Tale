import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';

const angryEcho = require('../../assets/images/angry-echo.png');
const HOLD_MS = 6800;
const EXIT_MS = 760;

function getIllusionKey(illusion: ReturnType<typeof useElsewhereGame>['illusion']) {
  if (!illusion) {
    return null;
  }

  return `${illusion.type}:${illusion.startedAt ?? illusion.expiresAt ?? 'active'}`;
}

export function AngryEchoIllusion() {
  const { illusion } = useElsewhereGame();
  const [visibleIllusionKey, setVisibleIllusionKey] = useState<string | null>(null);
  const lastShownIllusionKey = useRef<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const translateY = useRef(new Animated.Value(68)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const illusionKey = getIllusionKey(illusion);

    if (!illusionKey || lastShownIllusionKey.current === illusionKey) {
      opacity.setValue(0);
      scale.setValue(0.82);
      translateY.setValue(68);
      setVisibleIllusionKey(null);
      return;
    }

    lastShownIllusionKey.current = illusionKey;
    setVisibleIllusionKey(illusionKey);

    const intro = Animated.parallel([
      Animated.timing(opacity, {
        duration: 760,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        duration: 900,
        easing: Easing.out(Easing.back(1.2)),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);
    const exit = Animated.parallel([
      Animated.timing(opacity, {
        duration: EXIT_MS,
        easing: Easing.in(Easing.quad),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        toValue: 0.72,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        toValue: 180,
        useNativeDriver: true,
      }),
    ]);
    const sequence = Animated.sequence([intro, Animated.delay(HOLD_MS), exit]);

    sequence.start(({ finished }) => {
      if (finished) {
        setVisibleIllusionKey(null);
      }
    });

    return () => sequence.stop();
  }, [illusion, opacity, scale, translateY]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [pulse]);

  if (!illusion || !visibleIllusionKey) {
    return null;
  }

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.42],
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { opacity }]}>
      <View style={styles.backdrop} />
      <Animated.View style={[styles.halo, { opacity: pulseOpacity }]} />
      <Animated.View style={[styles.echoWrap, { transform: [{ translateY }, { scale }] }]}>
        <Image accessibilityIgnoresInvertColors resizeMode="contain" source={angryEcho} style={styles.echo} />
      </Animated.View>
      {illusion.message ? (
        <Animated.View style={[styles.message, { transform: [{ translateY }] }]}>
          <GameText style={{ textAlign: 'center' }} tone="echo" variant="title">
            {illusion.message}
          </GameText>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 7, 18, 0.68)',
  },
  echo: {
    height: '100%',
    width: '100%',
  },
  echoWrap: {
    bottom: -72,
    height: '92%',
    left: '-18%',
    position: 'absolute',
    right: '-18%',
  },
  halo: {
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    borderColor: 'rgba(169, 243, 255, 0.4)',
    borderRadius: 999,
    borderWidth: 1,
    height: 360,
    position: 'absolute',
    top: '18%',
    transform: [{ scale: 1.25 }],
    width: 360,
  },
  message: {
    alignItems: 'center',
    backgroundColor: 'rgba(6, 7, 18, 0.74)',
    borderColor: GameTheme.colors.echo,
    borderRadius: GameTheme.radius.sm,
    borderWidth: 1,
    bottom: '12%',
    left: GameTheme.spacing.lg,
    padding: GameTheme.spacing.lg,
    position: 'absolute',
    right: GameTheme.spacing.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1400,
  },
});
