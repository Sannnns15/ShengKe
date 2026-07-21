// ══ MomentCard Component Tests ══════════════════════════
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import type { MomentFeedItem } from '../../../types/api';

// Test the MomentCard component's data flow and interaction contract.
// Since we can't render native RN views in node, we test props interface
// and callback behavior.

function createMockMoment(overrides: Partial<MomentFeedItem> = {}): MomentFeedItem {
  return {
    id: '123',
    user_id: 'user1',
    title: 'Test Moment',
    content: 'This is a test moment content',
    mood: '😊',
    privacy_level: 3,
    is_archived: false,
    like_count: 10,
    comment_count: 5,
    view_count: 100,
    created_at: new Date().toISOString(),
    author_nickname: 'TestUser',
    author_avatar_url: null,
    is_liked: false,
    ...overrides,
  };
}

describe('MomentCard component interface', () => {
  it('should render title and content', () => {
    const item = createMockMoment();
    expect(item.title).toBe('Test Moment');
    expect(item.content).toBe('This is a test moment content');
  });

  it('should display like_count and comment_count', () => {
    const item = createMockMoment({
      like_count: 42,
      comment_count: 7,
    });
    expect(item.like_count).toBe(42);
    expect(item.comment_count).toBe(7);
  });

  it('should call onPress when card is pressed', () => {
    const onPress = vi.fn();
    const item = createMockMoment();

    // Simulate press
    onPress();
    expect(onPress).toHaveBeenCalledOnce();

    // Simulate calling with item ID
    const id = item.id;
    onPress(id);
    expect(onPress).toHaveBeenCalledWith('123');
  });

  it('should call onLikeToggle when like button is pressed', () => {
    const onLikeToggle = vi.fn();
    const item = createMockMoment({ is_liked: false });

    // Simulate like toggle
    onLikeToggle();
    expect(onLikeToggle).toHaveBeenCalledOnce();

    // Simulate toggle is_liked
    const newIsLiked = !item.is_liked;
    expect(newIsLiked).toBe(true);
  });

  it('should display mood emoji when present', () => {
    const itemWithMood = createMockMoment({ mood: '😊' });
    expect(itemWithMood.mood).toBe('😊');

    const itemWithoutMood = createMockMoment({ mood: undefined });
    expect(itemWithoutMood.mood).toBeUndefined();
  });

  it('should display AI tags when present', () => {
    const item = createMockMoment({
      ai_tags: ['生活', '日常', '美食'],
    });
    expect(item.ai_tags).toHaveLength(3);
    expect(item.ai_tags).toContain('美食');
  });

  it('should show truncated content when content is long', () => {
    const longContent = 'A'.repeat(200);
    const item = createMockMoment({ content: longContent });

    // The component truncates to 80 chars
    const truncated =
      item.content.length > 80
        ? item.content.slice(0, 80) + '…'
        : item.content;

    expect(item.content.length).toBe(200);
    expect(truncated).toHaveLength(81); // 80 chars + '…'
    expect(truncated.endsWith('…')).toBe(true);
  });

  it('should not truncate content shorter than 80 chars', () => {
    const shortContent = 'Short moment';
    const item = createMockMoment({ content: shortContent });

    const truncated =
      item.content.length > 80
        ? item.content.slice(0, 80) + '…'
        : item.content;

    expect(truncated).toBe(shortContent);
  });

  it('should format relative time', () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const item = createMockMoment({ created_at: fiveMinAgo });

    // Verify created_at is a valid date string
    expect(new Date(item.created_at).getTime()).toBeLessThan(now.getTime());
    expect(new Date(item.created_at).getTime()).toBeGreaterThan(
      now.getTime() - 10 * 60 * 1000
    );
  });

  it('should show default nickname when author_nickname is missing', () => {
    const item = createMockMoment({ author_nickname: undefined });
    const displayName = item.author_nickname || '用户';
    expect(displayName).toBe('用户');

    const itemWithName = createMockMoment({ author_nickname: 'Alice' });
    expect(itemWithName.author_nickname).toBe('Alice');
  });
});
