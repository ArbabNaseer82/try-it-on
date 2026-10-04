// Generates deterministic synthetic landmark frames for anchor math tests.
// These are NOT camera recordings: key landmarks are placed at anatomically plausible
// positions for a frontal face, a raised right hand and an upper body, so the math can be
// tested without a camera. Run: node test/fixtures/generate-fixtures.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const round = (v) => Math.round(v * 1e5) / 1e5;
const lm = (x, y, z = 0, visibility) => {
  const p = { x: round(x), y: round(y), z: round(z) };
  if (visibility !== undefined) p.visibility = visibility;
  return p;
};

// Face: centered, face width 0.3 of the image width, frontal pose.
const face = Array.from({ length: 478 }, () => lm(0.5, 0.5, 0));
const setF = (i, x, y, z = 0) => (face[i] = lm(x, y, z));
setF(1, 0.5, 0.55, -0.08); // nose tip
setF(168, 0.5, 0.44, -0.04); // nose bridge
setF(9, 0.5, 0.41, -0.035);
setF(10, 0.5, 0.3, -0.02); // forehead
setF(152, 0.5, 0.74, -0.02); // chin
setF(234, 0.35, 0.47, 0.06); // right face edge (image left)
setF(454, 0.65, 0.47, 0.06); // left face edge (image right)
setF(132, 0.37, 0.6, 0.05);
setF(361, 0.63, 0.6, 0.05);
setF(205, 0.42, 0.56, -0.03);
setF(425, 0.58, 0.56, -0.03);
setF(33, 0.42, 0.45, -0.02);
setF(133, 0.47, 0.45, -0.025);
setF(263, 0.58, 0.45, -0.02);
setF(362, 0.53, 0.45, -0.025);
setF(13, 0.5, 0.62, -0.05);
setF(14, 0.5, 0.635, -0.05);
// Irises: diameter 0.0234 image width units, so 11.7 mm per 0.0234 units.
const iris = (c, cx, cy) => {
  const r = 0.0117;
  setF(c, cx, cy, -0.02);
  setF(c + 1, cx + r, cy, -0.02);
  setF(c + 2, cx, cy - r * (4 / 3), -0.02); // vertical scaled by aspect (4:3 image)
  setF(c + 3, cx - r, cy, -0.02);
  setF(c + 4, cx, cy + r * (4 / 3), -0.02);
};
iris(468, 0.445, 0.45);
iris(473, 0.555, 0.45);

// Matrix: identity rotation, head origin 50 cm in front of the camera.
const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -50, 1];

// Hand: right hand (MediaPipe label "Left" for unmirrored input), back facing camera, fingers up.
const handImg = Array.from({ length: 21 }, () => lm(0.5, 0.5, 0));
const handWorld = Array.from({ length: 21 }, () => lm(0, 0, 0));
const setH = (i, x, y, wx, wy, wz = 0) => {
  handImg[i] = lm(x, y, 0);
  handWorld[i] = lm(wx, wy, wz);
};
setH(0, 0.5, 0.8, 0, 0.04); // wrist
setH(5, 0.45, 0.62, -0.035, -0.045); // index mcp (viewer left)
setH(6, 0.445, 0.56, -0.036, -0.075);
setH(9, 0.5, 0.61, 0, -0.05);
setH(10, 0.5, 0.54, 0, -0.085);
setH(13, 0.54, 0.62, 0.02, -0.045);
setH(14, 0.545, 0.56, 0.021, -0.078);
setH(17, 0.57, 0.64, 0.035, -0.04);
setH(18, 0.575, 0.59, 0.036, -0.065);

// Pose: upper body facing the camera.
const pose = Array.from({ length: 33 }, () => lm(0.5, 0.5, 0, 0.99));
pose[11] = lm(0.65, 0.4, 0, 0.98); // left shoulder (image right)
pose[12] = lm(0.35, 0.4, 0, 0.98);
pose[23] = lm(0.6, 0.8, 0, 0.9);
pose[24] = lm(0.4, 0.8, 0, 0.9);

writeFileSync(
  join(here, 'face-frontal.json'),
  JSON.stringify({ aspect: 4 / 3, landmarks: face, matrix }),
);
writeFileSync(
  join(here, 'hand-right-back.json'),
  JSON.stringify({
    aspect: 4 / 3,
    landmarks: handImg,
    worldLandmarks: handWorld,
    handedness: 'Left',
  }),
);
writeFileSync(
  join(here, 'pose-upper-body.json'),
  JSON.stringify({ aspect: 4 / 3, landmarks: pose, worldLandmarks: pose }),
);
console.log('fixtures written');
