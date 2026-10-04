import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { TryOnView } from './TryOnView';
import type { TryOnViewProps } from './types';

export interface TryOnModalProps extends TryOnViewProps {
  visible: boolean;
  onClose: () => void;
  /** Header title. Default "Virtual try-on". */
  title?: string;
  /** Accessibility label of the close button. Default "Close". */
  closeLabel?: string;
  headerStyle?: StyleProp<ViewStyle>;
}

/**
 * Full screen try-on dialog. iOS uses a page sheet (swipe down to close), Android a full screen
 * modal (back button closes). Closing it unmounts the camera.
 */
export function TryOnModal({
  visible,
  onClose,
  title = 'Virtual try-on',
  closeLabel = 'Close',
  headerStyle,
  ...viewProps
}: TryOnModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[styles.header, headerStyle]}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            hitSlop={12}
            onPress={onClose}
            style={styles.close}
          >
            <Text style={styles.closeText}>{'✕'}</Text>
          </Pressable>
        </View>
        {visible && <TryOnView {...viewProps} style={styles.view} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '600', flexShrink: 1 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  closeText: { color: '#fff', fontSize: 16 },
  view: { flex: 1 },
});
