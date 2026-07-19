/**
 * 简单表单验证
 */

export function validatePhone(phone: string): string | null {
  if (!phone.trim()) return "请输入手机号";
  if (!/^1[3-9]\d{9}$/.test(phone)) return "请输入正确的手机号";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "请输入密码";
  if (password.length < 6) return "密码至少 6 位";
  return null;
}
