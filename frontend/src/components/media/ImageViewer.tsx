import React, { useState, useRef, useCallback } from 'react'
import {
  View,
  Image,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Text,
  useWindowDimensions,
  type ImageStyle,
  type ListRenderItemInfo,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native'
import { GestureHandlerRootView, PinchGestureHandler, type PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../constants/theme'

export interface ImageViewerProps {
  uri: string
  style?: ImageStyle
}

/**
 * Basic single-image viewer (for inline display).
 */
export function ImageViewer({ uri, style }: ImageViewerProps) {
  return <Image source={{ uri }} style={style} />
}

// ── Fullscreen Gallery Viewer ─────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export interface GalleryViewerProps {
  visible: boolean
  images: string[]
  initialIndex?: number
  onClose: () => void
}

/**
 * GalleryViewer — 全屏图片画廊
 * - 左右滑动切换（FlatList horizontal pagingEnabled）
 * - 手势缩放（PinchGestureHandler + Reanimated）
 * - 关闭按钮
 * - 图片计数器 "2/5"
 */
export function GalleryViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: GalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const flatListRef = useRef<FlatList<string>>(null)
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)

  if (!visible) return null;

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
      setCurrentIndex(Math.min(index, images.length - 1))
      // Reset zoom when switching images
      scale.value = withTiming(1, { duration: 200 })
      savedScale.value = 1
    },
    [images.length, scale, savedScale]
  )

  const onPinchEvent = useCallback(
    (event: PinchGestureHandlerGestureEvent) => {
      if (event.nativeEvent.scale) {
        scale.value = savedScale.value * event.nativeEvent.scale
      }
    },
    [scale, savedScale]
  )

  const onPinchEnd = useCallback(() => {
    // Clamp scale between 1 and 3
    if (scale.value < 1) {
      scale.value = withTiming(1, { duration: 200 })
      savedScale.value = 1
    } else if (scale.value > 3) {
      scale.value = withTiming(3, { duration: 200 })
      savedScale.value = 3
    } else {
      savedScale.value = scale.value
    }
  }, [scale, savedScale])

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <PinchGestureHandler
        onGestureEvent={onPinchEvent}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === 5) onPinchEnd()
        }}
      >
        <Animated.View style={styles.imageContainer}>
          <AnimatedImage uri={item} scale={scale} />
        </Animated.View>
      </PinchGestureHandler>
    ),
    [onPinchEvent, onPinchEnd, scale]
  )

  const keyExtractor = useCallback((item: string, index: number) => `${item}-${index}`, [])

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  )

  return (
    <GestureHandlerRootView style={styles.overlay}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
        <Ionicons name="close" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Image counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {currentIndex + 1}/{images.length}
        </Text>
      </View>

      {/* Image carousel */}
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleScrollEnd}
        bounces={false}
      />
    </GestureHandlerRootView>
  )
}

// ── Animated image with pinch zoom ─────────────────────

function AnimatedImage({
  uri,
  scale,
}: {
  uri: string
  scale: SharedValue<number>
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.Image
      source={{ uri }}
      style={[styles.image, animatedStyle]}
      resizeMode="contain"
    />
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 9999,
  },
  closeButton: {
    position: 'absolute',
    top: 54,
    right: Spacing.lg,
    zIndex: 10000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    position: 'absolute',
    top: 54,
    left: Spacing.lg,
    zIndex: 10000,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  counterText: {
    fontSize: FontSize.body,
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
})
