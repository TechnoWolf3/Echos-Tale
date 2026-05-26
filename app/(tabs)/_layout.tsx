import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GameTheme } from '@/constants/theme';

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
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
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
          title: 'Casino',
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
