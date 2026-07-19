import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../stores/authStore";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert("提示", "请输入手机号和密码");
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim(), password);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("登录失败", error.message || "请检查手机号和密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>ShengKe 生刻</Text>
        <Text style={styles.subtitle}>记录你的每一刻</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="手机号"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="密码"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>登录</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={styles.link}>注册账号</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/reset-password")}>
              <Text style={styles.link}>忘记密码？</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginTop: 8,
    marginBottom: 48,
  },
  form: {
    gap: 16,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1a1a1a",
    backgroundColor: "#f8f8f8",
  },
  button: {
    height: 52,
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  link: {
    color: "#4A90D9",
    fontSize: 14,
  },
});
