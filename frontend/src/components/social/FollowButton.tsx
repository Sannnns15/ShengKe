import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../constants/theme'

export interface FollowButtonProps {
  isFollowing: boolean
  onPress: () => void
  loading?: boolean
}

export function FollowButton({
  isFollowing,
  onPress,
  loading = false,
}: FollowButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isFollowing ? styles.following : styles.notFollowing,
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isFollowing ? Colors.textPrimary : Colors.textInverse}
        />
      ) : (
        <Text
          style={[
            styles.text,
            isFollowing ? styles.followingText : styles.notFollowingText,
          ]}
        >
          {isFollowing ? '已关注' : '关注'}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFollowing: {
    backgroundColor: Colors.primary,
  },
  following: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
  },
  notFollowingText: {
    color: Colors.textInverse,
  },
  followingText: {
    color: Colors.textPrimary,
  },
})
