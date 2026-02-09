import { Stack } from "expo-router";
import { theme } from "@theme/index";

export default function QuestionBankLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontFamily: theme.typography.fonts.heading,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "New Session",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="session"
        options={{
          title: "Practice Session",
          headerShown: true,
          headerBackTitle: "New Session",
        }}
      />
      <Stack.Screen
        name="summary"
        options={{
          title: "Summary",
          headerShown: false, // Custom header or no header for summary
          gestureEnabled: false, // Prevent going back to questions
        }}
      />
    </Stack>
  );
}
