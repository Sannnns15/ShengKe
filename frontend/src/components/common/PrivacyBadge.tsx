import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../constants/theme'

export interface PrivacyBadgeProps {
  level: number
}

function getPrivacyLabel(level: number): string {
  switch (level) {
    case 0:
      return '仅自己'
    case 1:
      return '好友'
    case 2:
      return '互关'
    case 3:
      return '公开'
    default:
      return ''
  }
}

export function PrivacyBadge({ level }: PrivacyBadgeProps) {
  const iconName = level >= 3 ? 'globe-outline' : 'lock-closed'

  return (
    <View style={styles.badge}>
      <Ionicons name={iconName} size={11} color={Colors.textTertiary} />
      <Text style={styles.text}>{getPrivacyLabel(level)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  text: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
  },
})
