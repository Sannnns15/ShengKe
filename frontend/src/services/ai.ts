import { apiClient } from "./client";
import type { ChatMessage, MomentAnalysis, MoodReport } from "../types/api";

// ── Mood Stats types ────────────────────────────────────
export interface DailyMood {
  date: string
  positive: number
  neutral: number
  negative: number
  count: number
}

export interface MoodStats {
  daily_moods: DailyMood[]
  emotion_pie: { positive: number; neutral: number; negative: number }
  top_tags: { tag: string; count: number }[]
}

/**
 * Analyze a single Moment for AI summary / emotion / tags.
 */
export async function analyzeMoment(
  momentId: string
): Promise<MomentAnalysis> {
  return apiClient.post(`/ai/moments/${momentId}/analyze`);
}

/**
 * Fetch mood report for a given period (week / month).
 */
/**
 * Fetch mood statistics (daily breakdown, pie, tags) for the given number of days.
 */
export async function getMoodStats(days: number = 30): Promise<MoodStats> {
  return apiClient.get('/users/me/mood-stats', {
    params: { days },
  }) as unknown as MoodStats;
}

/**
 * Fetch mood report for a given period (week / month).
 */
export async function getMoodReport(params: {
  period: string;
  start_date?: string;
  end_date?: string;
}): Promise<MoodReport> {
  return apiClient.get("/ai/mood-report", { params });
}

/**
 * Send a message to the AI companion chat.
 * Optionally attach context moment IDs for the AI to reference.
 */
export async function chatWithAI(
  message: string,
  contextMomentIds?: string[]
): Promise<ChatMessage> {
  return apiClient.post("/ai/chat", {
    message,
    context_moment_ids: contextMomentIds,
  });
}
