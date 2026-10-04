import { CylinderGeometry, Mesh, MeshBasicMaterial, SphereGeometry, type Material } from 'three';

/**
 * Invisible depth only material: writes depth but no color, so parts of a model behind the
 * head, wrist or finger are hidden while the camera image stays visible.
 */
export function createOccluderMaterial(): Material {
  const material = new MeshBasicMaterial({ colorWrite: false });
  material.depthWrite = true;
  return material;
}

/** Procedural head occluder: a unit sphere scaled into an ellipsoid by the caller. */
export function createHeadOccluder(): Mesh {
  const mesh = new Mesh(new SphereGeometry(1, 32, 24), createOccluderMaterial());
  mesh.renderOrder = -1;
  mesh.name = 'toi-head-occluder';
  return mesh;
}

/** Unit cylinder along Y (radius 1, height 1), scaled per frame for wrists and fingers. */
export function createLimbOccluder(name: string): Mesh {
  const mesh = new Mesh(new CylinderGeometry(1, 1, 1, 24, 1), createOccluderMaterial());
  mesh.renderOrder = -1;
  mesh.name = name;
  return mesh;
}
