import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../constants/theme'

export interface AiChatBubbleProps {
  message: string
  role: 'user' | 'assistant'
  timestamp?: string
}

/**
 * AiChatBubble — 占位组件
 * 展示单条 AI 聊天气泡，分为用户气泡和助手气泡两种样式。
 */
export function AiChatBubble({ message, role, timestamp }: AiChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          isUser ? styles.userText : styles.assistantText,
        ]}
      >
        {message}
      </Text>
      {timestamp && (
        <Text style={styles.timestamp}>{timestamp}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: Radius.sm,
  },
  assistantBubble: {
    backgroundColor: Colors.bgCard,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Radius.sm,
  },
  messageText: {
    fontSize: FontSize.body,
    lineHeight: FontSize.body * 1.5,
  },
  userText: {
    color: Colors.textInverse,
  },
  assistantText: {
    color: Colors.textPrimary,
  },
  timestamp: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
})
