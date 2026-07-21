import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * useImagePicker — 封装 expo-image-picker 的拍照/相册选择 hook
 *
 * 提供两个操作：
 * - pickFromCamera() — 拍照
 * - pickFromGallery() — 从相册选择
 *
 * 返回 { uri, pickFromCamera, pickFromGallery, isLoading }
 */
export function useImagePicker() {
  const [uri, setUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pickFromCamera = useCallback(async (): Promise<string | null> => {
    // 请求相机权限
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("需要权限", "请在设置中允许访问相机");
      return null;
    }

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const selectedUri = result.assets[0].uri;
        setUri(selectedUri);
        return selectedUri;
      }
      return null;
    } catch (err) {
      console.error("Camera picker error:", err);
      Alert.alert("拍照失败", "无法打开相机，请稍后重试");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    // 请求相册权限
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("需要权限", "请在设置中允许访问相册");
      return null;
    }

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const selectedUri = result.assets[0].uri;
        setUri(selectedUri);
        return selectedUri;
      }
      return null;
    } catch (err) {
      console.error("Gallery picker error:", err);
      Alert.alert("选择失败", "无法打开相册，请稍后重试");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { uri, pickFromCamera, pickFromGallery, isLoading };
}
