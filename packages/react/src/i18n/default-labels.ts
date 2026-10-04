/** Every user facing string. Override any of them through the `labels` prop. */
export interface Labels {
  open: string;
  close: string;
  dialogTitle: string;
  start: string;
  capture: string;
  switchCamera: string;
  uploadPhoto: string;
  retry: string;
  retake: string;
  download: string;
  share: string;
  compare: string;
  intensity: string;
  products: string;
  shades: string;
  previous: string;
  next: string;
  loading: string;
  looking: string;
  ready: string;
  noFace: string;
  noHand: string;
  noBody: string;
  permissionTitle: string;
  permissionBody: string;
  privacyNote: string;
  experimental: string;
  captured: string;
  errors: {
    INSECURE_CONTEXT: string;
    CAMERA_DENIED: string;
    CAMERA_NOT_FOUND: string;
    CAMERA_IN_USE: string;
    WEBGL_UNSUPPORTED: string;
    MODEL_LOAD_FAILED: string;
    ASSET_INVALID: string;
    ASSET_LOAD_FAILED: string;
    TRACKER_FAILED: string;
    UNKNOWN: string;
  };
}

export type LabelsInput = Partial<Omit<Labels, 'errors'>> & { errors?: Partial<Labels['errors']> };

export const defaultLabels: Labels = {
  open: 'Try it on',
  close: 'Close',
  dialogTitle: 'Virtual try-on',
  start: 'Start camera',
  capture: 'Take photo',
  switchCamera: 'Switch camera',
  uploadPhoto: 'Upload a photo',
  retry: 'Try again',
  retake: 'Retake',
  download: 'Download',
  share: 'Share',
  compare: 'Compare before and after',
  intensity: 'Intensity',
  products: 'Products',
  shades: 'Shades',
  previous: 'Previous',
  next: 'Next',
  loading: 'Loading try-on',
  looking: 'Looking for you',
  ready: 'Ready',
  noFace: 'Look at the camera',
  noHand: 'Show the back of your hand to the camera',
  noBody: 'Step back so your upper body is visible',
  permissionTitle: 'See it on you',
  permissionBody: 'Allow camera access to try this product on in real time.',
  privacyNote: 'Your camera feed never leaves this device.',
  experimental: 'Experimental',
  captured: 'Photo captured',
  errors: {
    INSECURE_CONTEXT: 'The camera only works on secure (HTTPS) pages.',
    CAMERA_DENIED:
      'Camera access was blocked. Allow it in your browser settings, or upload a photo instead.',
    CAMERA_NOT_FOUND: 'No camera was found. You can upload a photo instead.',
    CAMERA_IN_USE: 'Your camera is being used by another app. Close it and try again.',
    WEBGL_UNSUPPORTED: 'Your browser does not support the graphics features try-on needs.',
    MODEL_LOAD_FAILED: 'Try-on could not load. Check your connection and try again.',
    ASSET_INVALID: 'This product cannot be tried on right now.',
    ASSET_LOAD_FAILED: 'This product could not be loaded. Please try again.',
    TRACKER_FAILED: 'Tracking stopped unexpectedly. Please try again.',
    UNKNOWN: 'Something went wrong. Please try again.',
  },
};

export function mergeLabels(input?: LabelsInput): Labels {
  if (!input) return defaultLabels;
  return { ...defaultLabels, ...input, errors: { ...defaultLabels.errors, ...input.errors } };
}
