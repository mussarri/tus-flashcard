import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@components/haptic-tab";
import { IconSymbol } from "@components/ui/icon-symbol";
import { Colors } from "@constants/theme";
import { useColorScheme } from "@hooks/use-color-scheme";
import { theme } from "@theme/index";
import { CustomTabBar } from "@components/CustomTabBar";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray[400],
        headerShown: false,
        sceneStyle: {
          paddingVertical: 16,
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="flashcards"
        options={{
          title: "Flashcard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="book.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="questions"
        options={{
          title: "Solve",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="pencil.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="chart.bar.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
