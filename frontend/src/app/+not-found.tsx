import { Link, Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "404" }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🔍</Text>
        <Text style={styles.title}>页面不存在</Text>
        <Text style={styles.subtitle}>
          你正在寻找的页面可能已被移除或地址不正确
        </Text>
        <Link href="/(tabs)/home" style={styles.link}>
          <Text style={styles.linkText}>返回首页</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 32,
  },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#999", textAlign: "center", marginBottom: 32 },
  link: { textDecorationLine: "none" },
  linkText: {
    fontSize: 16,
    color: "#4A90D9",
    fontWeight: "600",
  },
});
