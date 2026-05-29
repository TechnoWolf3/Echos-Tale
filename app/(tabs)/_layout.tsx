import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GameTheme } from '@/constants/theme';

const isWeb = Platform.OS === 'web';
const WEB_TAB_HEIGHT = 76;

function WebTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  return (
    <View
      style={{
        alignItems: 'stretch',
        backgroundColor: GameTheme.colors.backgroundSoft,
        borderTopColor: GameTheme.colors.border,
        borderTopWidth: 1,
        bottom: 0,
        flexDirection: 'row',
        height: WEB_TAB_HEIGHT,
        left: 0,
        paddingBottom: 10,
        paddingTop: 8,
        position: 'absolute',
        right: 0,
      }}>
      {state.routes.map((route, index) => {
        const options = descriptors[route.key].options;
        const isFocused = state.index === index;
        const color = isFocused ? GameTheme.colors.echo : GameTheme.colors.textFaint;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : undefined}
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                canPreventDefault: true,
                target: route.key,
                type: 'tabPress',
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            style={{
              alignItems: 'center',
              flex: 1,
              gap: 3,
              justifyContent: 'center',
              minWidth: 0,
            }}>
            {options.tabBarIcon?.({ color, focused: isFocused, size: 24 })}
            <Text
              numberOfLines={1}
              style={{
                color,
                fontSize: 12,
                fontWeight: '800',
                lineHeight: 16,
              }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={isWeb ? (props) => <WebTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GameTheme.colors.echo,
        tabBarHideOnKeyboard: true,
        tabBarButton: HapticTab,
        tabBarInactiveTintColor: GameTheme.colors.textFaint,
        tabBarStyle: {
          backgroundColor: GameTheme.colors.backgroundSoft,
          borderTopColor: GameTheme.colors.border,
          height: isWeb ? WEB_TAB_HEIGHT : undefined,
        },
        tabBarItemStyle: {
          height: isWeb ? WEB_TAB_HEIGHT : undefined,
          justifyContent: 'center',
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
