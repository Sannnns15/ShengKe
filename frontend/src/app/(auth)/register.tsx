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
import { validatePhone, validatePassword } from "../../utils/validation";
import { Colors, Spacing, FontSize, Radius } from "../../constants/theme";

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
      const message =
        error?.response?.data?.message || error?.message || "发送验证码失败";
      Alert.alert("发送失败", message);
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
      const message =
        error?.response?.data?.message || error?.message || "注册失败";
      Alert.alert("注册失败", message);
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
          <Text style={styles.title}>注册账号</Text>
          <Text style={styles.subtitle}>加入 ShengKe，记录每一刻</Text>

          <View style={styles.form}>
            {/* Phone */}
            <TextInput
              style={styles.input}
              placeholder="手机号"
              placeholderTextColor={Colors.textPlaceholder}
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
                placeholderTextColor={Colors.textPlaceholder}
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
              placeholderTextColor={Colors.textPlaceholder}
              maxLength={20}
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <TextInput
              style={styles.input}
              placeholder="密码（至少6位）"
              placeholderTextColor={Colors.textPlaceholder}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Confirm password */}
            <TextInput
              style={styles.input}
              placeholder="确认密码"
              placeholderTextColor={Colors.textPlaceholder}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Register button */}
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

            {/* Login link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>已有账号？</Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/login")}
                activeOpacity={0.7}
              >
                <Text style={styles.link}>立即登录</Text>
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
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  inner: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: "700",
    textAlign: "center",
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
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
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
    minWidth: 100,
  },
  codeButtonDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  codeButtonText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  codeButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  button: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  link: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
});
