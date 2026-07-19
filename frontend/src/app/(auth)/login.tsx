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
import { useAuth } from "../../hooks/useAuth";
import { validatePhone, validatePassword } from "../../utils/validation";
import { extractErrorMessage } from "../../services/client";
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadows } from "../../constants/theme";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    // Validate phone
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      Alert.alert("提示", phoneErr);
      return;
    }

    // Validate password
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      Alert.alert("提示", pwdErr);
      return;
    }

    setLoading(true);
    try {
      await login(phone.trim(), password);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("登录失败", extractErrorMessage(error));
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
        {/* ── Logo / Title ── */}
        <Text style={styles.logoText}>ShengKe</Text>
        <Text style={styles.slogan}>生刻 · 记录你的每一刻</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="手机号"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="phone-pad"
            maxLength={11}
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="密码"
            placeholderTextColor={Colors.textTertiary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>登录</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              activeOpacity={0.7}
            >
              <Text style={styles.link}>注册账号</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/reset-password")}
              activeOpacity={0.7}
            >
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
    backgroundColor: Colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  logoText: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    textAlign: "center",
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  slogan: {
    fontSize: FontSize.body,
    textAlign: "center",
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxxl,
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgSecondary,
  },
  button: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
    borderWidth: 0,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  link: {
    color: Colors.textAccent,
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
  },
});
