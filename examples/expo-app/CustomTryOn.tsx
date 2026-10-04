import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TryOnView, useTryOn, type TryOnPhoto, type Variant } from '@tryonit/react-native';
import { lipstick } from './products';

/** A fully custom React Native UI: the camera view has no built in controls. */
export function CustomTryOn() {
  const tryOn = useTryOn();
  const [photo, setPhoto] = useState<TryOnPhoto | null>(null);
  const variants = (tryOn.state?.asset?.variants ?? []) as Variant[];
  const faceVisible = tryOn.state?.tracking.faceVisible ?? false;

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <TryOnView {...tryOn.viewProps} controls="none" asset={lipstick} />
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>
            {tryOn.status === 'running'
              ? faceVisible
                ? 'Face found'
                : 'Look at the camera'
              : tryOn.status}
          </Text>
        </View>
        {tryOn.error && <Text style={styles.error}>{tryOn.error.message}</Text>}
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.swatches}
        showsHorizontalScrollIndicator={false}
      >
        {variants.map((v) => (
          <Pressable
            key={v.id}
            accessibilityRole="radio"
            accessibilityLabel={v.name ?? v.id}
            accessibilityState={{ checked: tryOn.state?.variantId === v.id }}
            onPress={() => tryOn.setVariant(v.id)}
            style={[
              styles.swatch,
              { backgroundColor: v.swatch ?? '#999' },
              tryOn.state?.variantId === v.id && styles.swatchActive,
            ]}
          />
        ))}
      </ScrollView>

      <View style={styles.toolbar}>
        <Pressable style={styles.button} onPress={() => tryOn.switchCamera()}>
          <Text style={styles.buttonText}>Flip</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.shutter]}
          onPress={async () => setPhoto(await tryOn.capture({ type: 'image/jpeg', quality: 0.85 }))}
        >
          <Text style={styles.buttonText}>Snap</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => tryOn.setIntensity(0.5)}>
          <Text style={styles.buttonText}>50%</Text>
        </Pressable>
      </View>

      {photo && (
        <Pressable style={styles.preview} onPress={() => setPhoto(null)}>
          <Image source={{ uri: photo.dataUrl }} style={styles.previewImage} resizeMode="contain" />
          <Text style={styles.buttonText}>
            {photo.width} x {photo.height}, tap to close
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  stage: { flex: 1 },
  badge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: '#fff', fontSize: 13 },
  error: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    color: '#fca5a5',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  swatches: { gap: 12, padding: 12 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#000' },
  swatchActive: { borderColor: '#fff' },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 24,
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#1f2937',
  },
  shutter: { backgroundColor: '#6d28d9', paddingHorizontal: 28 },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  preview: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  previewImage: { flex: 1 },
});
