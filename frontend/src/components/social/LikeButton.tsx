import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, FontSize } from '../../constants/theme'

export interface LikeButtonProps {
  count: number
  isLiked: boolean
  onPress: () => void
  disabled?: boolean
}

export function LikeButton({
  count,
  isLiked,
  onPress,
  disabled = false,
}: LikeButtonProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Ionicons
        name={isLiked ? 'heart' : 'heart-outline'}
        size={14}
        color={isLiked ? Colors.error : Colors.textTertiary}
      />
      <Text style={[styles.count, isLiked && { color: Colors.error }]}>
        {count}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  count: {
    fontSize: FontSize.small,
    color: Colors.textTertiary,
  },
})
