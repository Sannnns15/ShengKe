import React from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../constants/theme'

export interface CommentComposerProps {
  onSubmit: (content: string) => void
  replyTo?: { commentId: string; nickname: string } | null
  onCancelReply?: () => void
  isLoading?: boolean
}

export function CommentComposer({
  onSubmit,
  replyTo,
  onCancelReply,
  isLoading = false,
}: CommentComposerProps) {
  const [text, setText] = React.useState('')
  const inputRef = React.useRef<TextInput>(null)

  // Focus input when replying
  React.useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus()
    }
  }, [replyTo])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setText('')
  }

  return (
    <View style={styles.container}>
      {replyTo && (
        <View style={styles.replyBanner}>
          <Text style={styles.replyText} numberOfLines={1}>
            回复 @{replyTo.nickname}
          </Text>
          <TouchableOpacity onPress={onCancelReply} activeOpacity={0.6}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={replyTo ? '输入回复...' : '输入评论...'}
          placeholderTextColor={Colors.textTertiary}
          multiline
          maxLength={500}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSubmit}
          disabled={!text.trim() || isLoading}
          activeOpacity={0.6}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <Ionicons name="send" size={18} color={Colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
    paddingBottom: Spacing.sm,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.page,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.bgSecondary,
  },
  replyText: {
    fontSize: FontSize.small,
    color: Colors.secondary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.page,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.small,
    color: Colors.textPrimary,
    backgroundColor: Colors.bg,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
})
