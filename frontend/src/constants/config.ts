// ══ App Configuration ═══════════════════════════════════

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const OSS_BUCKET = process.env.EXPO_PUBLIC_OSS_BUCKET || "";
export const OSS_REGION = process.env.EXPO_PUBLIC_OSS_REGION || "oss-cn-hangzhou";

export const APP_NAME = "ShengKe";
export const APP_SLOGAN = "记录你的每一刻";

export const PAGE_SIZE = 20;
