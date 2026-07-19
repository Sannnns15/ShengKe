import React, { useState, useRef, useEffect, useCallback } from "react";
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
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { sendCodeAPI } from "../../services/auth";
import { extractErrorMessage } from "../../services/client";
import { validatePhone, validatePassword } from "../../utils/validation";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "../../constants/theme";

export default function RegisterScreen() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { register } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Countdown timer ────────────────────────────────
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown]);

  // ── Send verification code ─────────────────────────
  const handleSendCode = useCallback(async () => {
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      Alert.alert("提示", phoneErr);
      return;
    }

    setCodeSending(true);
    try {
      await sendCodeAPI({ phone: phone.trim(), type: "register" });
      setCountdown(60);
      Alert.alert("提示", "验证码已发送");
    } catch (error: any) {
      Alert.alert("发送失败", extractErrorMessage(error));
    } finally {
      setCodeSending(false);
    }
  }, [phone]);

  // ── Submit registration ────────────────────────────
  const handleRegister = async () => {
    // Validate phone
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      Alert.alert("提示", phoneErr);
      return;
    }

    // Validate code
    if (!code.trim()) {
      Alert.alert("提示", "请输入验证码");
      return;
    }

    // Validate nickname
    if (!nickname.trim()) {
      Alert.alert("提示", "请输入昵称");
      return;
    }

    // Validate password
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      Alert.alert("提示", pwdErr);
      return;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      Alert.alert("提示", "两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      await register(phone.trim(), password, code.trim(), nickname.trim());
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("注册失败", extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* ── Logo / Title ── */}
          <Text style={styles.logoText}>ShengKe</Text>
          <Text style={styles.slogan}>加入 ShengKe，记录每一刻</Text>

          <View style={styles.form}>
            {/* Phone */}
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

            {/* Verification code + send button */}
            <View style={styles.codeRow}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="验证码"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ""))}
              />
              <TouchableOpacity
                style={[
                  styles.codeButton,
                  (countdown > 0 || codeSending) && styles.codeButtonDisabled,
                ]}
                onPress={handleSendCode}
                disabled={countdown > 0 || codeSending}
                activeOpacity={0.7}
              >
                {codeSending ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text
                    style={[
                      styles.codeButtonText,
                      countdown > 0 && styles.codeButtonTextDisabled,
                    ]}
                  >
                    {countdown > 0 ? `${countdown}s` : "获取验证码"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Nickname */}
            <TextInput
              style={styles.input}
              placeholder="昵称"
              placeholderTextColor={Colors.textTertiary}
              maxLength={20}
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <TextInput
              style={styles.input}
              placeholder="密码（至少8位）"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Confirm Password */}
            <TextInput
              style={styles.input}
              placeholder="确认密码"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.buttonText}>注册</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>已有账号？</Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/login")}
                activeOpacity={0.7}
              >
                <Text style={styles.link}>去登录</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  inner: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
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
  codeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
  },
  codeButton: {
    height: 52,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    minWidth: 100,
  },
  codeButtonDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.bgSecondary,
  },
  codeButtonText: {
    color: Colors.textAccent,
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
  },
  codeButtonTextDisabled: {
    color: Colors.textTertiary,
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
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSize.small,
    color: Colors.textSecondary,
  },
  link: {
    color: Colors.textAccent,
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
  },
});
