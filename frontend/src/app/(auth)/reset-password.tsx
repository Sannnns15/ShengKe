import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ResetPasswordScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>重置密码（待实现）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 16,
    color: "#666",
  },
});
