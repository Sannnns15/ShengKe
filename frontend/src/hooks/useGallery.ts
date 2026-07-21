import { useState, useCallback } from 'react'

export interface GalleryOptions {
  images: string[]
  initialIndex?: number
}

/**
 * useGallery — 管理图片画廊的打开/关闭状态
 *
 * Usage:
 *   const gallery = useGallery()
 *   gallery.open({ images: ['url1', 'url2'], initialIndex: 1 })
 *   <GalleryViewer visible={gallery.visible} ... onClose={gallery.close} />
 */
export function useGallery() {
  const [visible, setVisible] = useState(false)
  const [options, setOptions] = useState<GalleryOptions | null>(null)

  const open = useCallback((opts: GalleryOptions) => {
    setOptions(opts)
    setVisible(true)
  }, [])

  const close = useCallback(() => {
    setVisible(false)
    // Keep options briefly for exit animation, then clear
    setTimeout(() => setOptions(null), 300)
  }, [])

  return { visible, options, open, close }
}
