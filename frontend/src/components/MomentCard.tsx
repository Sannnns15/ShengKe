import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatRelativeTime } from "../utils/format";
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadows } from "../constants/theme";
import type { MomentFeedItem } from "../types/api";

function getPrivacyLabel(level: number): string {
  switch (level) {
    case 0:
      return "仅自己";
    case 1:
      return "好友";
    case 2:
      return "互关";
    case 3:
      return "公开";
    default:
      return "";
  }
}

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

interface MomentCardProps {
  item: MomentFeedItem;
  onPress: () => void;
  onLikeToggle: () => void;
  onAuthorPress?: () => void;
  likePending: boolean;
}

export function MomentCard({
  item,
  onPress,
  onLikeToggle,
  onAuthorPress,
  likePending,
}: MomentCardProps) {
  const truncatedContent =
    item.content && item.content.length > 80
      ? item.content.slice(0, 80) + "…"
      : item.content;

  const displayName = item.author_nickname || "用户";
  const avatarChar = getInitial(displayName);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* ── Author Row ── */}
      <TouchableOpacity
        style={styles.authorRow}
        activeOpacity={0.6}
        onPress={onAuthorPress}
        disabled={!onAuthorPress}
      >
        <View style={styles.authorLeft}>
          {item.author_avatar_url ? (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{avatarChar}</Text>
            </View>
          ) : (
            <Ionicons name="person-circle" size={32} color={Colors.textTertiary} />
          )}
          <Text style={styles.authorNickname} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <Text style={styles.time}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </TouchableOpacity>

      {/* ── Mood + Privacy Header ── */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {item.mood && <Text style={styles.mood}>{item.mood}</Text>}
        </View>
        <View style={styles.privacyBadge}>
          <Ionicons
            name={
              item.privacy_level >= 3 ? "globe-outline" : "lock-closed"
            }
            size={11}
            color={Colors.textTertiary}
          />
          <Text style={styles.privacyText}>
            {getPrivacyLabel(item.privacy_level)}
          </Text>
        </View>
      </View>

      {/* Title */}
      {item.title && (
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
      )}

      {/* Content */}
      {truncatedContent && (
        <Text style={styles.content} numberOfLines={2}>
          {truncatedContent}
        </Text>
      )}

      {/* AI Tags */}
      {item.ai_tags && item.ai_tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.ai_tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Stats + Like */}
      <View style={styles.cardFooter}>
        {/* Like button */}
        <TouchableOpacity
          style={styles.stat}
          onPress={onLikeToggle}
          disabled={likePending}
          activeOpacity={0.6}
        >
          <Ionicons
            name={item.is_liked ? "heart" : "heart-outline"}
            size={14}
            color={item.is_liked ? Colors.error : Colors.textTertiary}
          />
          <Text
            style={[
              styles.statText,
              item.is_liked && { color: Colors.error },
            ]}
          >
            {item.like_count}
          </Text>
        </TouchableOpacity>

        <View style={styles.stat}>
          <Ionicons
            name="chatbubble-outline"
            size={14}
            color={Colors.textTertiary}
          />
          <Text style={styles.statText}>{item.comment_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    ...Shadows.sm,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  authorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  authorNickname: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    maxWidth: 160,
  },
  time: {
    fontSize: FontSize.small,
    color: Colors.textTertiary,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  mood: {
    fontSize: FontSize.body,
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  privacyText: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
  },
  cardTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  content: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: FontSize.small,
    color: Colors.textTertiary,
  },
});
