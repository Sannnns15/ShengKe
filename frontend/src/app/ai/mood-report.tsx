import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getMoodReport } from "../../services/ai";
import { Colors, Spacing, FontSize, Radius } from "../../constants/theme";
import { getMoodLabel } from "../../constants/emotions";
import type { MoodReport } from "../../types/api";

// ── Period options ─────────────────────────────────────
const PERIOD_OPTIONS = [
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
] as const;

type Period = (typeof PERIOD_OPTIONS)[number]["key"];

// ── Helper ─────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const wd = weekdays[d.getDay()];
  return `${month}月${day}日 周${wd}`;
}

function moodBarWidth(ratio: number): number {
  return Math.max(ratio * 100, 4);
}

function getScoreEmoji(score: number): string {
  if (score >= 4) return "😊";
  if (score >= 3) return "🙂";
  if (score >= 2) return "😐";
  return "😞";
}

// ── Main Screen ────────────────────────────────────────
export default function MoodReportScreen() {
  const [period, setPeriod] = useState<Period>("week");

  const {
    data: report,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<MoodReport>({
    queryKey: ["moodReport", period],
    queryFn: () => getMoodReport({ period }),
  });

  const renderHeader = () => (
    <View>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>情绪报告</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* ── Period Selector ── */}
      <View style={styles.periodRow}>
        {PERIOD_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.periodButton,
              period === opt.key && styles.periodButtonActive,
            ]}
            onPress={() => setPeriod(opt.key)}
          >
            <Text
              style={[
                styles.periodText,
                period === opt.key && styles.periodTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── Emotion distribution bars ──
  const renderDistributions = (r: MoodReport) => {
    const { positive, neutral, negative } = r.emotion_distribution;
    const total = positive + neutral + negative || 1;
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>情绪分布</Text>

        <View style={styles.barRow}>
          <Text style={styles.barLabel}>😊 正面</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                styles.barPositive,
                { width: `${moodBarWidth(positive / total)}%` as any },
              ]}
            />
          </View>
          <Text style={styles.barValue}>
            {Math.round((positive / total) * 100)}%
          </Text>
        </View>

        <View style={styles.barRow}>
          <Text style={styles.barLabel}>😐 中性</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                styles.barNeutral,
                { width: `${moodBarWidth(neutral / total)}%` as any },
              ]}
            />
          </View>
          <Text style={styles.barValue}>
            {Math.round((neutral / total) * 100)}%
          </Text>
        </View>

        <View style={styles.barRow}>
          <Text style={styles.barLabel}>😞 负面</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                styles.barNegative,
                { width: `${moodBarWidth(negative / total)}%` as any },
              ]}
            />
          </View>
          <Text style={styles.barValue}>
            {Math.round((negative / total) * 100)}%
          </Text>
        </View>

        {r.summary ? (
          <Text style={styles.summary}>{r.summary}</Text>
        ) : null}
      </View>
    );
  };

  // ── Daily moods list ──
  const renderDailyMoods = (r: MoodReport) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>每日心情</Text>
      {r.daily_moods.map((day) => (
        <View key={day.date} style={styles.dayRow}>
          <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
          <Text style={styles.dayEmoji}>
            {getScoreEmoji(day.mood_score)}
          </Text>
          <View style={styles.dayMoodInfo}>
            <Text style={styles.dayEmotion}>
              {getMoodLabel(day.dominant_emotion) || day.dominant_emotion}
            </Text>
          </View>
          <View style={styles.dayScoreTrack}>
            <View
              style={[
                styles.dayScoreFill,
                { width: `${Math.max(day.mood_score * 20, 10)}%` as any },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );

  // ── Top keywords ──
  const renderKeywords = (r: MoodReport) => {
    if (!r.top_keywords.length) return null;
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>热门关键词</Text>
        <View style={styles.keywordsWrap}>
          {r.top_keywords.map((kw) => (
            <View key={kw} style={styles.keywordTag}>
              <Text style={styles.keywordText}>{kw}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ── Loading / Error ──
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {renderHeader()}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>加载情绪报告中…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {renderHeader()}
        <View style={styles.center}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>点击重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {renderHeader()}
        <View style={styles.center}>
          <Text style={styles.emptyText}>暂无数据</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderDistributions(report)}
        {renderDailyMoods(report)}
        {renderKeywords(report)}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  backButton: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  periodRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  periodButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  periodTextActive: {
    color: Colors.textInverse,
    fontWeight: "700",
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  // ── Distribution bars ──
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  barLabel: {
    width: 60,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    overflow: "hidden",
    marginHorizontal: Spacing.sm,
  },
  barFill: {
    height: "100%",
    borderRadius: Radius.full,
  },
  barPositive: {
    backgroundColor: Colors.success,
  },
  barNeutral: {
    backgroundColor: Colors.info,
  },
  barNegative: {
    backgroundColor: Colors.warning,
  },
  barValue: {
    width: 40,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "right",
  },
  summary: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  // ── Daily moods ──
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  dayDate: {
    width: 110,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  dayEmoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  dayMoodInfo: {
    flex: 1,
  },
  dayEmotion: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  dayScoreTrack: {
    width: 60,
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    overflow: "hidden",
    marginLeft: Spacing.sm,
  },
  dayScoreFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  // ── Keywords ──
  keywordsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  keywordTag: {
    backgroundColor: Colors.primaryLight + "20",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  keywordText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "500",
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
});
