/**
 * Named landmark indices for MediaPipe Face Landmarker (478 points including irises),
 * Hand Landmarker (21 points) and Pose Landmarker (33 points).
 *
 * Naming is subject centric: `LEFT` means the person's left side, which appears on the
 * right half of an unmirrored camera image.
 */

export const FACE = {
  NOSE_TIP: 1,
  NOSE_BRIDGE: 168,
  /** Between the eyebrows. */
  GLABELLA: 9,
  /** Top center of the forehead, near the hairline. */
  FOREHEAD: 10,
  CHIN: 152,
  /** Face edge next to the right ear (tragus area). */
  RIGHT_FACE_EDGE: 234,
  /** Face edge next to the left ear (tragus area). */
  LEFT_FACE_EDGE: 454,
  /** Jaw corner below the right ear, used to estimate the ear lobe. */
  RIGHT_JAW: 132,
  /** Jaw corner below the left ear, used to estimate the ear lobe. */
  LEFT_JAW: 361,
  RIGHT_CHEEK: 205,
  LEFT_CHEEK: 425,
  RIGHT_EYE_OUTER: 33,
  RIGHT_EYE_INNER: 133,
  LEFT_EYE_OUTER: 263,
  LEFT_EYE_INNER: 362,
  UPPER_LIP_CENTER: 13,
  LOWER_LIP_CENTER: 14,
  MOUTH_RIGHT: 61,
  MOUTH_LEFT: 291,
  /** Iris landmarks exist only in the 478 point model. Center then 4 ring points. */
  RIGHT_IRIS: [468, 469, 470, 471, 472],
  LEFT_IRIS: [473, 474, 475, 476, 477],
} as const;

/** Closed polygons (ordered rings) used by the makeup renderer. */
export const FACE_REGIONS = {
  /** Outer lip contour, clockwise starting at the right mouth corner. */
  LIPS_OUTER: [
    61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146,
  ],
  /** Inner lip contour (mouth opening). Teeth stay untouched. */
  LIPS_INNER: [
    78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
  ],
  RIGHT_EYE: [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
  LEFT_EYE: [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249],
  /** Upper lash line, outer corner to inner corner. Used by eyeliner. */
  RIGHT_UPPER_LASH: [33, 246, 161, 160, 159, 158, 157, 173, 133],
  LEFT_UPPER_LASH: [263, 466, 388, 387, 386, 385, 384, 398, 362],
  /** Lower brow edge, outer to inner. Upper limit of the eyeshadow region. */
  RIGHT_BROW_LOWER: [46, 53, 52, 65, 55],
  LEFT_BROW_LOWER: [276, 283, 282, 295, 285],
  /** Full brow outline (upper edge outer to inner, then lower edge inner to outer). */
  RIGHT_BROW: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  LEFT_BROW: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  /** Face oval, clockwise from the forehead. */
  FACE_OVAL: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
    148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
  ],
} as const;

export const HAND = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

/** Base and first joint of each finger, used to place rings. */
export const FINGER_SEGMENTS = {
  index: [HAND.INDEX_MCP, HAND.INDEX_PIP],
  middle: [HAND.MIDDLE_MCP, HAND.MIDDLE_PIP],
  ring: [HAND.RING_MCP, HAND.RING_PIP],
  pinky: [HAND.PINKY_MCP, HAND.PINKY_PIP],
} as const;

export const POSE = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;
