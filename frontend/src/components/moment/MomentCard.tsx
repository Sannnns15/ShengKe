import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatRelativeTime } from '../../utils/format'
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadows } from '../../constants/theme'
import type { MomentFeedItem } from '../../types/api'
import { Avatar } from '../common/Avatar'
import { PrivacyBadge } from '../common/PrivacyBadge'
import { LikeButton } from '../social/LikeButton'

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || '?'
}

interface MomentCardProps {
  item: MomentFeedItem
  onPress: () => void
  onLikeToggle: () => void
  onAuthorPress?: () => void
  onMediaPress?: (images: string[], initialIndex: number) => void
  likePending: boolean
}

/**
 * Extract media URLs from MomentFeedItem's media_ids or a synthetic media_urls field.
 * The backend may store media_ids as string[] or media_urls.
 * We check item for any existing media_urls field.
 */
function getMediaUrls(item: MomentFeedItem): string[] {
  // If the API returns media_urls directly
  if ((item as any).media_urls && Array.isArray((item as any).media_urls)) {
    return (item as any).media_urls as string[]
  }
  // If media_ids are URLs (OSS direct-upload mode)
  if ((item as any).media_ids && Array.isArray((item as any).media_ids)) {
    const ids = (item as any).media_ids as string[]
    // Heuristic: if they start with http, treat as URLs
    if (ids.length > 0 && ids[0].startsWith('http')) {
      return ids
    }
  }
  return []
}

export const MomentCard = React.memo(function MomentCard({
  item,
  onPress,
  onLikeToggle,
  onAuthorPress,
  onMediaPress,
  likePending,
}: MomentCardProps) {
  const truncatedContent =
    item.content && item.content.length > 80
      ? item.content.slice(0, 80) + '…'
      : item.content

  const displayName = item.author_nickname || '用户'
  const mediaUrls = getMediaUrls(item)
  const hasMedia = mediaUrls.length > 0

  const handleMediaPress = (index: number) => {
    onMediaPress?.(mediaUrls, index)
  }

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
          <Avatar
            uri={item.author_avatar_url}
            name={displayName}
            size={32}
          />
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
        <PrivacyBadge level={item.privacy_level} />
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

      {/* ── Media Gallery (first image preview) ── */}
      {hasMedia && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleMediaPress(0)}
          style={styles.mediaPreview}
        >
          <Image
            source={{ uri: mediaUrls[0] }}
            style={styles.mediaPreviewImage}
            resizeMode="cover"
          />
          {mediaUrls.length > 1 && (
            <View style={styles.mediaCountBadge}>
              <Ionicons name="images" size={14} color="#FFF" />
              <Text style={styles.mediaCountText}>{mediaUrls.length}</Text>
            </View>
          )}
        </TouchableOpacity>
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
        <LikeButton
          count={item.like_count}
          isLiked={item.is_liked ?? false}
          onPress={onLikeToggle}
          disabled={likePending}
        />

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
  )
})

// ── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    ...Shadows.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  authorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mood: {
    fontSize: FontSize.body,
  },
  cardTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  content: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: FontSize.body * 1.5,
    marginTop: Spacing.xs,
  },
  // ── Media Preview ──
  mediaPreview: {
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreviewImage: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgSecondary,
  },
  mediaCountBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  mediaCountText: {
    fontSize: FontSize.caption,
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.primaryLight + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  tagText: {
    fontSize: FontSize.caption,
    color: Colors.primaryDark,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSize.small,
    color: Colors.textTertiary,
  },
})
