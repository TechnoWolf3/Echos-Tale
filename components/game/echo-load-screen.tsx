import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BrandAssets } from '@/constants/brand-assets';
import { GameTheme } from '@/constants/theme';
import { useElsewhereGame } from '@/hooks/use-elsewhere-game';

const echoLogo = require('../../assets/images/echo-logo-feathered.png');
const echoTitle = require('../../assets/images/echos-tale-title.png');

const INTRO_MS = 520;
const HOLD_MS = 520;
const EXIT_MS = 920;
const MAX_BRIDGE_WAIT_MS = 9000;
const TITLE_ASPECT_RATIO = 1369 / 258;

export function EchoLoadScreen() {
  const { width } = useWindowDimensions();
  const { isBridgeReady } = useElsewhereGame();
  const [isVisible, setIsVisible] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [forceRelease, setForceRelease] = useState(false);
  const [isLogoReady, setIsLogoReady] = useState(false);
  const [isTitleReady, setIsTitleReady] = useState(false);
  const hasStartedExit = useRef(false);
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [pulse]);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(markOpacity, {
          duration: 260,
          easing: Easing.out(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          duration: INTRO_MS,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          duration: 420,
          easing: Easing.out(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslate, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(HOLD_MS),
    ]).start(({ finished }) => {
      if (finished) {
        setIntroComplete(true);
      }
    });
  }, [markOpacity, scale, titleOpacity, titleTranslate]);

  useEffect(() => {
    const timeout = setTimeout(() => setForceRelease(true), MAX_BRIDGE_WAIT_MS);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const assetsReady = isLogoReady && isTitleReady;

    if (!introComplete || (!assetsReady && !forceRelease) || (!isBridgeReady && !forceRelease) || hasStartedExit.current) {
      return;
    }

    hasStartedExit.current = true;

    Animated.parallel([
      Animated.timing(scale, {
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        toValue: 3.25,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        duration: EXIT_MS,
        easing: Easing.out(Easing.quad),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        duration: EXIT_MS * 0.55,
        easing: Easing.out(Easing.quad),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsVisible(false);
      }
    });
  }, [forceRelease, introComplete, isBridgeReady, isLogoReady, isTitleReady, opacity, scale, titleOpacity]);

  if (!isVisible) {
    return null;
  }

  const logoSize = Math.min(width * 0.76, 420);
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.55],
  });
  const titleWidth = Math.min(width * 0.9, 620);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        {
          opacity,
        },
      ]}>
      <View style={styles.backdrop} />
      <Animated.View
        style={[
          styles.echoHalo,
          {
            height: logoSize * 1.16,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
            width: logoSize * 1.16,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.logoFrame,
          {
            height: logoSize,
            opacity: markOpacity,
            transform: [{ scale }],
            width: logoSize,
          },
        ]}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={BrandAssets.echo.alt}
          onLoadEnd={() => setIsLogoReady(true)}
          resizeMode="contain"
          source={echoLogo}
          style={styles.logo}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.titleWrap,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslate }],
          },
        ]}>
        <Image
          accessibilityLabel="Echo's Tale"
          onLoadEnd={() => setIsTitleReady(true)}
          resizeMode="contain"
          source={echoTitle}
          style={{
            height: titleWidth / TITLE_ASPECT_RATIO,
            width: titleWidth,
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GameTheme.colors.background,
  },
  echoHalo: {
    borderColor: 'rgba(169, 243, 255, 0.5)',
    borderRadius: 999,
    borderWidth: 1,
    position: 'absolute',
  },
  logo: {
    height: '100%',
    width: '100%',
  },
  logoFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: GameTheme.colors.background,
    justifyContent: 'center',
    zIndex: 1000,
  },
  titleWrap: {
    alignItems: 'center',
    bottom: '16%',
    left: GameTheme.spacing.lg,
    position: 'absolute',
    right: GameTheme.spacing.lg,
  },
});
