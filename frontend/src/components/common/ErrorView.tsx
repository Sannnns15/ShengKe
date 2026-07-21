import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, FontWeight } from '../../constants/theme'
import { Button } from './Button'

export interface ErrorViewProps {
  message?: string
  onRetry?: () => void
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
      <Text style={styles.message}>
        {message || '加载失败，请稍后重试'}
      </Text>
      {onRetry && (
        <Button
          title="重试"
          onPress={onRetry}
          variant="outline"
          size="sm"
          style={styles.retryButton as any}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  message: {
    fontSize: FontSize.body,
    color: Colors.error,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.sm,
  },
})
