// ══ App Configuration ═══════════════════════════════════
import { Platform } from "react-native";

// Android 模拟器的 localhost 指向模拟器自身，需用 10.0.2.2 才能访问宿主机
const DEV_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${DEV_HOST}:8000/api/v1`;

export const OSS_BUCKET = process.env.EXPO_PUBLIC_OSS_BUCKET || "";
export const OSS_REGION = process.env.EXPO_PUBLIC_OSS_REGION || "oss-cn-hangzhou";

export const APP_NAME = "ShengKe";
export const APP_SLOGAN = "记录你的每一刻";

export const PAGE_SIZE = 20;
