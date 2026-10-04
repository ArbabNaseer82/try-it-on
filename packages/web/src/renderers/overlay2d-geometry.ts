import {
  computeHomography,
  warpGrid,
  type Anchor2D,
  type ClothingAnchors,
  type TorsoQuad,
  type Vec2,
} from '@tryonit/core';

export interface OverlayMesh {
  /** Triangle list positions in normalized image coordinates. */
  positions: Float32Array;
  /** Texture coordinates. */
  uvs: Float32Array;
}

/**
 * Quad for a flat face sticker. Size is relative to the face width, the image keeps its
 * aspect ratio, and the quad rotates with head roll.
 */
export function stickerQuad(
  anchor: Anchor2D,
  options: {
    scale: number;
    offset: Vec2;
    imageAspect: number;
    frameWidth: number;
    frameHeight: number;
  },
): OverlayMesh {
  const { frameWidth: W, frameHeight: H } = options;
  const width = anchor.size * W * options.scale;
  const height = width / options.imageAspect;
  const cos = Math.cos(anchor.angle);
  const sin = Math.sin(anchor.angle);
  const ox = options.offset[0] * anchor.size * W;
  const oy = options.offset[1] * anchor.size * W;
  const cx = anchor.x * W + ox * cos - oy * sin;
  const cy = anchor.y * H + ox * sin + oy * cos;
  const corner = (u: number, v: number): Vec2 => {
    const lx = (u - 0.5) * width;
    const ly = (v - 0.5) * height;
    return [(cx + lx * cos - ly * sin) / W, (cy + lx * sin + ly * cos) / H];
  };
  const uv: Vec2[] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [0, 1],
    [1, 0],
    [1, 1],
  ];
  return {
    positions: new Float32Array(uv.flatMap(([u, v]) => corner(u, v))),
    uvs: new Float32Array(uv.flat()),
  };
}

/**
 * Garment mesh: a homography maps the four garment anchor points (image pixels) onto the
 * detected torso quad, sampled on an 8 by 8 grid.
 */
export function garmentMesh(
  anchors: ClothingAnchors,
  torso: TorsoQuad,
  imageWidth: number,
  imageHeight: number,
  segments = 8,
): OverlayMesh | null {
  const h = computeHomography(
    [anchors.leftShoulder, anchors.rightShoulder, anchors.rightHip, anchors.leftHip],
    [torso.leftShoulder, torso.rightShoulder, torso.rightHip, torso.leftHip],
  );
  if (!h) return null;
  const grid = warpGrid(h, imageWidth, imageHeight, segments);
  const positions = new Float32Array(grid.indices.length * 2);
  const uvs = new Float32Array(grid.indices.length * 2);
  grid.indices.forEach((index, i) => {
    positions[i * 2] = grid.positions[index * 2] ?? 0;
    positions[i * 2 + 1] = grid.positions[index * 2 + 1] ?? 0;
    uvs[i * 2] = grid.uvs[index * 2] ?? 0;
    uvs[i * 2 + 1] = grid.uvs[index * 2 + 1] ?? 0;
  });
  return { positions, uvs };
}
