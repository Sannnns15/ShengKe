import React from "react";
import { Stack } from "expo-router";

export default function AiLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="chat" options={{ title: "AI 陪伴" }} />
      <Stack.Screen name="mood-report" options={{ title: "情绪报告" }} />
    </Stack>
  );
}
