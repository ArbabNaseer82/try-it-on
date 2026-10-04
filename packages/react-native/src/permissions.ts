import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Asks for camera permission on Android before opening the camera view. On iOS the system
 * prompt appears automatically (the app needs NSCameraUsageDescription, added by the Expo
 * config plugin). Resolves true when the camera can be used.
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
  if (await PermissionsAndroid.check(permission)) return true;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
