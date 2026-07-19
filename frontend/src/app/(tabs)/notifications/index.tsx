import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>通知</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>🚧 通知页面待实现</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginTop: 16 },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { fontSize: 16, color: "#999" },
});
