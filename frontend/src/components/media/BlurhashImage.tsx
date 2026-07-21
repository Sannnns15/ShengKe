import React, { useState } from "react";
import { Image, View, StyleSheet, type ImageStyle } from "react-native";

interface BlurhashImageProps {
  uri: string;
  blurhash?: string | null;
  style?: ImageStyle;
  resizeMode?: "cover" | "contain";
}

/**
 * BlurhashImage — 带模糊占位的图片组件
 *
 * MVP 版本使用灰色占位 + Image 加载后渐入过渡。
 * 生产环境可集成 expo-blurhash 替换灰色占位为真实的 Blurhash 渲染。
 */
export function BlurhashImage({
  uri,
  blurhash,
  style,
  resizeMode = "cover",
}: BlurhashImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {/* Blurhash placeholder: show grey bg when no blurhash */}
      {!loaded && (
        <View style={[styles.placeholder, style]}>
          <View
            style={[
              styles.placeholderInner,
              blurhash ? { backgroundColor: "#D0D0D0" } : undefined,
            ]}
          />
        </View>
      )}
      <Image
        source={{ uri }}
        style={[styles.image, style, !loaded && styles.hidden]}
        onLoad={() => setLoaded(true)}
        resizeMode={resizeMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  placeholder: {
    backgroundColor: "#E8E8E8",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  placeholderInner: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  hidden: {
    opacity: 0,
  },
});
