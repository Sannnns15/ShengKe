import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="settings"
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack>
  );
}
