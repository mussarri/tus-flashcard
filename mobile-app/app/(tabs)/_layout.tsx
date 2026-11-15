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
        name="flashcards"
        options={{
          title: "Flashcard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="book.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="topic-explanations"
        options={{
          title: "Konu Anlatımı",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="text.book.closed.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
