// ══ Emotion / Mood Mapping ═══════════════════════════════

export const MOOD_OPTIONS = [
  { emoji: "😊", label: "开心" },
  { emoji: "😢", label: "难过" },
  { emoji: "😡", label: "生气" },
  { emoji: "😌", label: "平静" },
  { emoji: "😰", label: "焦虑" },
  { emoji: "🥰", label: "幸福" },
  { emoji: "😴", label: "疲惫" },
  { emoji: "🤩", label: "兴奋" },
  { emoji: "🤔", label: "思考" },
  { emoji: "😎", label: "自信" },
  { emoji: "🥳", label: "庆祝" },
  { emoji: "💪", label: "加油" },
] as const;

export type MoodKey = (typeof MOOD_OPTIONS)[number]["emoji"];

export function getMoodLabel(emoji: string): string {
  return MOOD_OPTIONS.find((m) => m.emoji === emoji)?.label || "";
}
