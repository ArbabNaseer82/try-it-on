import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { requestCameraPermission } from './permissions';
import { DEFAULT_PRIMARY } from './theme';
import { TryOnModal, type TryOnModalProps } from './TryOnModal';

export interface TryOnButtonProps extends Omit<TryOnModalProps, 'visible' | 'onClose'> {
  /** Button text. Default "Try it on". */
  label?: string;
  children?: ReactNode;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  /** Ask for camera permission on Android before opening. Default true. */
  requestPermission?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Drop in "Try it on" button that opens the camera try-on in a modal.
 *
 * @example
 * <TryOnButton asset="https://cdn.example.com/tryon/lipstick.json" />
 */
export function TryOnButton({
  label = 'Try it on',
  children,
  buttonStyle,
  textStyle,
  disabled,
  requestPermission = true,
  onOpenChange,
  ...modalProps
}: TryOnButtonProps) {
  const [open, setOpen] = useState(false);
  const colors = modalProps.theme?.colors;
  const setVisible = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        onPress={async () => {
          // A denied permission still opens the view, which then offers the photo upload.
          if (requestPermission) await requestCameraPermission().catch(() => false);
          setVisible(true);
        }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors?.primary ?? DEFAULT_PRIMARY,
            borderRadius: modalProps.theme?.radius ?? 999,
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          },
          buttonStyle,
        ]}
      >
        {children ?? (
          <Text style={[styles.text, { color: colors?.onPrimary ?? '#fff' }, textStyle]}>
            {label}
          </Text>
        )}
      </Pressable>
      <TryOnModal {...modalProps} visible={open} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16, fontWeight: '600' },
});
