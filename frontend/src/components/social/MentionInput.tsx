import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  type TextInputProps,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "../../services/search";
import type { SearchUserItem } from "../../services/search";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "../../constants/theme";
import { Avatar } from "../common/Avatar";

export interface MentionInputProps extends Omit<TextInputProps, "onChangeText"> {
  value: string;
  onChangeText: (text: string) => void;
  onSelectionChange?: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
}

/**
 * MentionInput — 支持 @提及 的文本输入组件
 *
 * 在输入 "@" 时触发用户搜索，显示下拉选择面板。
 * 选中用户后补全为 "@username "。
 */
export function MentionInput({
  value,
  onChangeText,
  onSelectionChange,
  placeholder,
  maxLength,
  multiline = true,
  ...rest
}: MentionInputProps) {
  const inputRef = useRef<TextInput>(null);

  // ── @mention state ──
  const [showMentionPanel, setShowMentionPanel] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  // ── Selection tracking for @ detection ──
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  // ── Debounced user search ──
  const { data: mentionResults, isLoading: mentionLoading } = useQuery({
    queryKey: ["mentionUsers", mentionQuery],
    queryFn: () => searchUsers(mentionQuery, 1, 5),
    enabled: showMentionPanel && mentionQuery.length >= 1,
    staleTime: 30_000,
  });

  const mentionItems = useMemo(() => {
    return mentionResults?.items ?? [];
  }, [mentionResults]);

  // ── Detect "@" at cursor position ──
  const detectMention = useCallback(
    (text: string, sel: { start: number; end: number }) => {
      const cursorPos = sel.start;
      if (cursorPos === 0) {
        setShowMentionPanel(false);
        return;
      }

      // Look backwards from cursor to find the start of the current word
      const beforeCursor = text.slice(0, cursorPos);
      const atIndex = beforeCursor.lastIndexOf("@");

      if (atIndex === -1) {
        setShowMentionPanel(false);
        return;
      }

      // Check there's no space between @ and cursor
      const afterAt = beforeCursor.slice(atIndex + 1, cursorPos);
      // If there's a space or newline in afterAt, it means the @ was for an earlier word
      if (afterAt.includes(" ") || afterAt.includes("\n")) {
        setShowMentionPanel(false);
        return;
      }

      setShowMentionPanel(true);
      setMentionQuery(afterAt);
    },
    []
  );

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
      // Re-detect mention on text change
      const newSel = { start: text.length, end: text.length };
      detectMention(text, newSel);
      setSelection(newSel);
    },
    [onChangeText, detectMention]
  );

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const newSel = e.nativeEvent.selection;
      setSelection(newSel);
      detectMention(value, newSel);
      onSelectionChange?.(e);
    },
    [value, detectMention, onSelectionChange]
  );

  // ── Select a user from mention panel ──
  const handleSelectMention = useCallback(
    (user: SearchUserItem) => {
      const cursorPos = selection.start;
      const beforeCursor = value.slice(0, cursorPos);
      const afterCursor = value.slice(cursorPos);

      // Find last "@" before cursor
      const atIndex = beforeCursor.lastIndexOf("@");
      if (atIndex === -1) {
        setShowMentionPanel(false);
        return;
      }

      // Replace "@query" with "@username "
      const newText = beforeCursor.slice(0, atIndex) + `@${user.nickname} ` + afterCursor;
      onChangeText(newText);
      setShowMentionPanel(false);
      setMentionQuery("");

      // Focus back on input
      inputRef.current?.focus();
    },
    [value, selection.start, onChangeText]
  );

  // ── Render mention panel ──
  const renderMentionPanel = () => {
    if (!showMentionPanel) return null;

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
              <Avatar uri={item.avatar_url} name={item.nickname} size={28} />
              <Text style={styles.mentionNickname} numberOfLines={1}>
                {item.nickname}
              </Text>
            </TouchableOpacity>
          )}
          style={{ maxHeight: 180 }}
        />
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      {renderMentionPanel()}
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={handleChangeText}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  input: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    lineHeight: FontSize.body * 1.5,
  },
  // ── Mention Panel ──
  mentionPanel: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
    zIndex: 100,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  mentionLoading: {
    padding: Spacing.sm,
    alignItems: "center",
  },
  mentionEmpty: {
    padding: Spacing.sm,
    textAlign: "center",
    fontSize: FontSize.small,
    color: Colors.textTertiary,
  },
  mentionItem: {
    flexDirection: "row",
    alignItems: "center",
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
});
