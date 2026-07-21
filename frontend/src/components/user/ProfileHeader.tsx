import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, FontSize, FontWeight } from '../../constants/theme'
import { Avatar, type AvatarProps } from '../common/Avatar'

export interface ProfileHeaderProps {
  avatar: AvatarProps
  nickname: string
  bio?: string
  stats: {
    moments: number
    followers: number
    following: number
  }
}

export function ProfileHeader({
  avatar,
  nickname,
  bio,
  stats,
}: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <Avatar
        uri={avatar.uri}
        name={avatar.name}
        size={avatar.size ?? 80}
        onPress={avatar.onPress}
      />

      <Text style={styles.nickname} numberOfLines={1}>
        {nickname}
      </Text>

      {bio ? (
        <Text style={styles.bio} numberOfLines={3}>
          {bio}
        </Text>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.moments}</Text>
          <Text style={styles.statLabel}>记录</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.followers}</Text>
          <Text style={styles.statLabel}>粉丝</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.following}</Text>
          <Text style={styles.statLabel}>关注</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.page,
  },
  nickname: {
    fontSize: FontSize.heading2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  bio: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
    lineHeight: FontSize.body * 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: 0,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  statValue: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 0.5,
    height: 24,
    backgroundColor: Colors.divider,
  },
})
