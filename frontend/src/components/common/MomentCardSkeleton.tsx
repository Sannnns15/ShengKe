import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Skeleton } from './Skeleton'
import { Colors, Spacing, Radius } from '../../constants/theme'

export function MomentCardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <Skeleton width={120} height={14} />
      </View>
      {/* Title */}
      <Skeleton width="60%" height={18} style={{ marginTop: Spacing.sm }} />
      {/* Content */}
      <Skeleton width="100%" height={14} style={{ marginTop: Spacing.sm }} />
      <Skeleton width="80%" height={14} style={{ marginTop: Spacing.xs }} />
      {/* Tags */}
      <View style={styles.tagsRow}>
        <Skeleton width={50} height={22} borderRadius={11} />
        <Skeleton width={60} height={22} borderRadius={11} />
      </View>
      {/* Footer */}
      <View style={styles.footer}>
        <Skeleton width={40} height={14} />
        <Skeleton width={40} height={14} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.cardPadding,
    marginHorizontal: Spacing.page,
    marginBottom: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
})
