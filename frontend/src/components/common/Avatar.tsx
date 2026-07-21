import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, FontSize, FontWeight, Radius } from '../../constants/theme'

export interface AvatarProps {
  uri?: string | null
  name?: string
  size?: number
  onPress?: () => void
}

function getInitial(name?: string): string {
  return name?.charAt(0)?.toUpperCase() || '?'
}

export function Avatar({ uri, name, size = 40, onPress }: AvatarProps) {
  const content = (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
            {getInitial(name)}
          </Text>
        </View>
      )}
      {!uri && !name && (
        <View
          style={[
            styles.iconFallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Ionicons
            name="person-circle"
            size={size}
            color={Colors.textTertiary}
          />
        </View>
      )}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    )
  }

  return content
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: Colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  initials: {
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
})
