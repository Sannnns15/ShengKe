import React, { useEffect } from "react";
import { Stack, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuthStore } from "../stores/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      retry: 2,
    },
  },
});

// ── Route guard ────────────────────────────────────────
// Redirect to login if the user is not authenticated.
function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated and not on auth pages → redirect to login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated but on auth pages → redirect to home
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, isLoading, segments]);
}

// ── Loading screen while checking auth state ───────────
function SplashScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator size="large" color="#4A90D9" />
    </View>
  );
}

export default function RootLayout() {
  const isLoading = useAuthStore((s) => s.isLoading);

  // Mount route guard
  useProtectedRoute();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          {isLoading ? (
            <SplashScreen />
          ) : (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="ai" />
            </Stack>
          )}
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
