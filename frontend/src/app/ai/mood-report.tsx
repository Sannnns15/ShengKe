import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getMoodReport, getMoodStats } from "../../services/ai";
import type { MoodStats } from "../../services/ai";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "../../constants/theme";
import { getMoodLabel } from "../../constants/emotions";
import type { MoodReport } from "../../types/api";

// ── Period options ─────────────────────────────────────
const PERIOD_OPTIONS = [
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
] as const;

type Period = (typeof PERIOD_OPTIONS)[number]["key"];

// ── Tab options ────────────────────────────────────────
const TABS = [
  { key: "report", label: "情绪报告" },
  { key: "stats", label: "数据统计" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

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

function getMoodEmojiType(v: { positive: number; neutral: number; negative: number }): string {
  if (v.positive > v.neutral && v.positive > v.negative) return "😊";
  if (v.neutral >= v.positive && v.neutral >= v.negative) return "😐";
  return "😞";
}

// ── Color dots for mood trend ──────────────────────────
const DOT_SIZE = 12;
const DOT_GAP = 6;

function MoodTrendDots({ dailyMoods }: { dailyMoods: MoodStats["daily_moods"] }) {
  const screenWidth = Dimensions.get("window").width;
  const padding = Spacing.md * 2 + Spacing.page;
  const availableWidth = screenWidth - padding;
  const totalItemWidth = DOT_SIZE + DOT_GAP;
  const maxDots = Math.floor(availableWidth / totalItemWidth);
  const dots = dailyMoods.slice(0, maxDots);

  if (!dots.length) {
    return <Text style={styles.emptyText}>暂无日常数据</Text>;
  }

  return (
    <View>
      <View style={styles.trendDotsRow}>
        {dots.map((d, i) => {
          const dotColor = getDotColor(d);
          return (
            <View key={d.date + i} style={styles.trendDotItem}>
              <View style={[styles.trendDot, { backgroundColor: dotColor }]} />
              <Text style={styles.trendDotLabel}>
                {new Date(d.date).getDate()}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.trendLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
          <Text style={styles.legendText}>正面</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.info }]} />
          <Text style={styles.legendText}>中性</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
          <Text style={styles.legendText}>负面</Text>
        </View>
      </View>
    </View>
  );
}

function getDotColor(d: { positive: number; neutral: number; negative: number }): string {
  if (d.positive > d.neutral && d.positive > d.negative) return Colors.success;
  if (d.neutral >= d.positive && d.neutral >= d.negative) return Colors.info;
  return Colors.warning;
}

// ── Pie chart (simple colored bars) ────────────────────
function MoodPieChart({ pie }: { pie: { positive: number; neutral: number; negative: number } }) {
  const total = pie.positive + pie.neutral + pie.negative || 1;
  const segments = [
    { label: "😊 正面", value: pie.positive, color: Colors.success, pct: Math.round((pie.positive / total) * 100) },
    { label: "😐 中性", value: pie.neutral, color: Colors.info, pct: Math.round((pie.neutral / total) * 100) },
    { label: "😞 负面", value: pie.negative, color: Colors.warning, pct: Math.round((pie.negative / total) * 100) },
  ];

  return (
    <View>
      {/* Stacked bar as a simple pie substitute */}
      <View style={styles.pieBarTrack}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <View
              key={s.label}
              style={[
                styles.pieBarSegment,
                {
                  backgroundColor: s.color,
                  flex: s.value,
                },
              ]}
            />
          ))}
      </View>
      <View style={styles.pieLabels}>
        {segments.map((s) => (
          <View key={s.label} style={styles.pieLabelRow}>
            <View style={[styles.pieLabelDot, { backgroundColor: s.color }]} />
            <Text style={styles.pieLabelText}>
              {s.label} — {s.pct}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Top tags ────────────────────────────────────────────
function TopTagList({ tags }: { tags: { tag: string; count: number }[] }) {
  if (!tags.length) return null;
  const maxCount = Math.max(...tags.map((t) => t.count), 1);
  return (
    <View style={styles.tagsWrap}>
      {tags.map((t) => (
        <View key={t.tag} style={styles.tagRow}>
          <Text style={styles.tagName}>{t.tag}</Text>
          <View style={styles.tagBarTrack}>
            <View
              style={[
                styles.tagBarFill,
                { width: `${(t.count / maxCount) * 100}%` as any },
              ]}
            />
          </View>
          <Text style={styles.tagCount}>{t.count}次</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────
export default function MoodReportScreen() {
  const [period, setPeriod] = useState<Period>("week");
  const [activeTab, setActiveTab] = useState<TabKey>("report");

  // ── Report query ──
  const {
    data: report,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<MoodReport>({
    queryKey: ["moodReport", period],
    queryFn: () => getMoodReport({ period }),
    enabled: activeTab === "report",
  });

  // ── Stats query ──
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery<MoodStats>({
    queryKey: ["moodStats", 30],
    queryFn: () => getMoodStats(30),
    enabled: activeTab === "stats",
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

      {/* ── Tab Selector ── */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Period Selector ── */}
      {activeTab === "report" && (
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
      )}
    </View>
  );

  // ── Emotion distribution bars (report tab) ──
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

        {r.summary && <Text style={styles.summary}>{r.summary}</Text>}
      </View>
    );
  };

  // ── Daily moods ──
  const renderDailyMoods = (r: MoodReport) => {
    if (!r.daily_moods.length) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>每日情绪</Text>

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
                  { width: `${(day.mood_score / 5) * 100}%` as any },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

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

  // ── Stats tab content ──
  const renderStatsTab = () => {
    if (statsLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>加载统计数据…</Text>
        </View>
      );
    }

    if (statsError) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity onPress={() => refetchStats()}>
            <Text style={styles.retryText}>点击重试</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!stats) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>暂无数据</Text>
        </View>
      );
    }

    return (
      <>
        {/* ── Daily Mood Trend (colored dots) ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>情绪趋势 (每日)</Text>
          <MoodTrendDots dailyMoods={stats.daily_moods} />
        </View>

        {/* ── Mood Pie Distribution ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>情绪比例</Text>
          <MoodPieChart pie={stats.emotion_pie} />
        </View>

        {/* ── Top Tags ── */}
        {stats.top_tags && stats.top_tags.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>高频标签</Text>
            <TopTagList tags={stats.top_tags} />
          </View>
        )}
      </>
    );
  };

  // ── Loading / Error (report tab) ──
  if (activeTab === "report" && (isLoading || isError)) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {renderHeader()}
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>加载情绪报告中…</Text>
          </View>
        )}
        {isError && (
          <View style={styles.center}>
            <Text style={styles.errorText}>加载失败</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={styles.retryText}>点击重试</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (activeTab === "report" && !report) {
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
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => (activeTab === "report" ? refetch() : refetchStats())}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}

        {activeTab === "report" && report && (
          <>
            {renderDistributions(report)}
            {renderDailyMoods(report)}
            {renderKeywords(report)}
          </>
        )}

        {activeTab === "stats" && renderStatsTab()}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
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
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  backButton: {
    fontSize: FontSize.body,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  headerTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  // ── Tab Selector ──
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.page,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    gap: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  tabTextActive: {
    color: Colors.textInverse,
    fontWeight: FontWeight.bold,
  },
  periodRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    gap: Spacing.sm,
  },
  periodButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  periodTextActive: {
    color: Colors.textInverse,
    fontWeight: FontWeight.bold,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.bold,
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
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: Colors.bg,
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
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
    textAlign: "right",
  },
  summary: {
    fontSize: FontSize.body,
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
    fontSize: FontSize.caption,
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
    fontSize: FontSize.caption,
    color: Colors.textPrimary,
  },
  dayScoreTrack: {
    width: 60,
    height: 8,
    backgroundColor: Colors.bg,
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
    fontSize: FontSize.caption,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.body,
    color: Colors.textTertiary,
  },
  errorText: {
    fontSize: FontSize.body,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.body,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.textTertiary,
  },
  // ── Trend Dots ──
  trendDotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DOT_GAP,
  },
  trendDotItem: {
    alignItems: "center",
    width: DOT_SIZE + 4,
  },
  trendDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  trendDotLabel: {
    fontSize: 8,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  trendLegend: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  // ── Pie chart (stacked bar) ──
  pieBarTrack: {
    flexDirection: "row",
    height: 24,
    borderRadius: Radius.full,
    overflow: "hidden",
    backgroundColor: Colors.bg,
  },
  pieBarSegment: {
    height: "100%",
  },
  pieLabels: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  pieLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pieLabelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pieLabelText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  // ── Tags ──
  tagsWrap: {
    gap: Spacing.sm,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tagName: {
    width: 80,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  tagBarTrack: {
    flex: 1,
    height: 16,
    backgroundColor: Colors.bg,
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  tagBarFill: {
    height: "100%",
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
  },
  tagCount: {
    width: 40,
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
    textAlign: "right",
  },
});
