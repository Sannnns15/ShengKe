import React, { useState, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { searchUsers } from '../../services/search'
import type { SearchUserItem } from '../../services/search'
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../constants/theme'
import { Avatar } from '../common/Avatar'

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
  const [text, setText] = useState('')
  const inputRef = useRef<TextInput>(null)

  // ── @mention state ──
  const [showMentionPanel, setShowMentionPanel] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [selection, setSelection] = useState({ start: 0, end: 0 })

  // Focus input when replying
  React.useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus()
    }
  }, [replyTo])

  // ── Debounced user search ──
  const { data: mentionResults, isLoading: mentionLoading } = useQuery({
    queryKey: ['mentionUsers', mentionQuery],
    queryFn: () => searchUsers(mentionQuery, 1, 5),
    enabled: showMentionPanel && mentionQuery.length >= 1,
    staleTime: 30_000,
  })

  const mentionItems = useMemo(() => mentionResults?.items ?? [], [mentionResults])

  // ── Detect "@" at cursor position ──
  const detectMention = useCallback((val: string, sel: { start: number; end: number }) => {
    const cursorPos = sel.start
    if (cursorPos === 0) {
      setShowMentionPanel(false)
      return
    }
    const beforeCursor = val.slice(0, cursorPos)
    const atIndex = beforeCursor.lastIndexOf('@')
    if (atIndex === -1) {
      setShowMentionPanel(false)
      return
    }
    const afterAt = beforeCursor.slice(atIndex + 1, cursorPos)
    if (afterAt.includes(' ') || afterAt.includes('\n')) {
      setShowMentionPanel(false)
      return
    }
    setShowMentionPanel(true)
    setMentionQuery(afterAt)
  }, [])

  const handleSelectionChange = useCallback(
    (e: any) => {
      const newSel = e.nativeEvent.selection
      setSelection(newSel)
      detectMention(text, newSel)
    },
    [text, detectMention]
  )

  const handleChangeText = useCallback(
    (val: string) => {
      setText(val)
      const newSel = { start: val.length, end: val.length }
      detectMention(val, newSel)
      setSelection(newSel)
    },
    [detectMention]
  )

  // ── Select a user from mention panel ──
  const handleSelectMention = useCallback(
    (user: SearchUserItem) => {
      const cursorPos = selection.start
      const beforeCursor = text.slice(0, cursorPos)
      const afterCursor = text.slice(cursorPos)
      const atIndex = beforeCursor.lastIndexOf('@')
      if (atIndex === -1) {
        setShowMentionPanel(false)
        return
      }
      const newText = beforeCursor.slice(0, atIndex) + `@${user.nickname} ` + afterCursor
      setText(newText)
      setShowMentionPanel(false)
      setMentionQuery('')
      inputRef.current?.focus()
    },
    [text, selection.start]
  )

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setText('')
  }

  // ── Render mention panel ──
  const renderMentionPanel = () => {
    if (!showMentionPanel) return null

    return (
      <View style={styles.mentionPanel}>
        {mentionLoading && (
          <View style={styles.mentionLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}
        {!mentionLoading && mentionItems.length === 0 && mentionQuery.length >= 1 && (
          <Text style={styles.mentionEmpty}>未找到用户</Text>
        )}
        <FlatList
          data={mentionItems}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.mentionItem}
              onPress={() => handleSelectMention(item)}
              activeOpacity={0.6}
            >
              <Avatar uri={item.avatar_url} name={item.nickname} size={24} />
              <Text style={styles.mentionNickname} numberOfLines={1}>
                {item.nickname}
              </Text>
            </TouchableOpacity>
          )}
          style={{ maxHeight: 160 }}
        />
      </View>
    )
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
        <View style={styles.inputWrapper}>
          {renderMentionPanel()}
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={handleChangeText}
            onSelectionChange={handleSelectionChange}
            placeholder={replyTo ? '输入回复...' : '输入评论...'}
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={500}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
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
    color: Colors.primary,
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
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
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
  // ── Mention Panel ──
  mentionPanel: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  mentionLoading: {
    padding: Spacing.sm,
    alignItems: 'center',
  },
  mentionEmpty: {
    padding: Spacing.sm,
    textAlign: 'center',
    fontSize: FontSize.small,
    color: Colors.textTertiary,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  mentionNickname: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    flex: 1,
  },
})
