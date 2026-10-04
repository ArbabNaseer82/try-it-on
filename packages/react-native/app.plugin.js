// Expo config plugin for @tryonit/react-native.
// app.json: { "expo": { "plugins": [["@tryonit/react-native", { "cameraPermission": "..." }]] } }
// Adds the iOS camera usage description and the Android CAMERA permission for dev builds and
// prebuild. Expo Go already includes both, so the plugin is only needed for your own builds.
const CAMERA = 'android.permission.CAMERA';
const DEFAULT_MESSAGE = 'Allow $(PRODUCT_NAME) to use the camera so you can try products on.';

module.exports = function withTryOnIt(config, props) {
  const options = props || {};
  const ios = config.ios || {};
  const infoPlist = ios.infoPlist || {};
  config.ios = {
    ...ios,
    infoPlist: {
      ...infoPlist,
      NSCameraUsageDescription:
        options.cameraPermission || infoPlist.NSCameraUsageDescription || DEFAULT_MESSAGE,
    },
  };
  const android = config.android || {};
  const permissions = new Set(android.permissions || []);
  permissions.add(CAMERA);
  config.android = { ...android, permissions: Array.from(permissions) };
  return config;
};
