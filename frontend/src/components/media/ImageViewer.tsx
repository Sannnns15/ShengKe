import React from 'react'
import { Image, type ImageStyle } from 'react-native'

export interface ImageViewerProps {
  uri: string
  style?: ImageStyle
}

/**
 * ImageViewer — 占位组件
 * 目前直接使用 React Native Image，后续可扩展为带手势缩放/轮播的图片查看器。
 */
export function ImageViewer({ uri, style }: ImageViewerProps) {
  return <Image source={{ uri }} style={style} />
}
