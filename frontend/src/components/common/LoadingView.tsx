import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { Colors, Spacing, FontSize } from '../../constants/theme'

export interface LoadingViewProps {
  message?: string
  size?: 'small' | 'large'
}

export function LoadingView({ message, size = 'large' }: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={Colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  message: {
    marginTop: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.textTertiary,
  },
})
