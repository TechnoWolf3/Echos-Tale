import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GameTheme } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GameTheme.colors.echo,
        tabBarButton: HapticTab,
        tabBarInactiveTintColor: GameTheme.colors.textFaint,
        tabBarStyle: {
          backgroundColor: GameTheme.colors.backgroundSoft,
          borderTopColor: GameTheme.colors.border,
          height: isWeb ? 64 : undefined,
          overflow: 'visible',
          paddingBottom: isWeb ? 8 : undefined,
          paddingTop: isWeb ? 6 : undefined,
        },
        tabBarItemStyle: {
          height: isWeb ? 50 : undefined,
          justifyContent: 'center',
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          lineHeight: 16,
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'City',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="command" color={color} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="suit.spade.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bank"
        options={{
          title: 'Bank',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="rituals"
        options={{
          title: 'Rituals',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="sparkles" color={color} />,
        }}
      />
    </Tabs>
  );
}
