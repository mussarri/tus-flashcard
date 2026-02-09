import { View, StyleSheet } from "react-native";
import { ThemedText } from "@components/themed-text";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Profile</ThemedText>
      <ThemedText type="default">
        Profile screen placeholder.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
