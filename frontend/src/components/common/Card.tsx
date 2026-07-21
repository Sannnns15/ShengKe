import React, { type ReactNode } from 'react'
import { View, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native'
import { Colors, Radius, Shadows } from '../../constants/theme'

export interface CardProps {
  children: ReactNode
  onPress?: () => void
  style?: ViewStyle
}

export function Card({ children, onPress, style }: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        activeOpacity={0.7}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    )
  }

  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: 16,
    ...Shadows.sm,
  },
})
