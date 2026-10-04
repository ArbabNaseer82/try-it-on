import { ErrorCode, TryOnError } from '@tryonit/core';
import type { Object3D, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface ModelLoaderOptions {
  /** Folder with the Draco decoder files (enables Draco compressed meshes). */
  dracoDecoderPath?: string;
  /** Folder with the Basis transcoder files (enables KTX2 textures). */
  ktx2TranscoderPath?: string;
}

const cache = new Map<string, Promise<Object3D>>();
let loaderPromise: Promise<GLTFLoader> | null = null;

async function getLoader(
  renderer: WebGLRenderer,
  options: ModelLoaderOptions,
): Promise<GLTFLoader> {
  if (!loaderPromise) {
    loaderPromise = (async () => {
      const loader = new GLTFLoader();
      loader.setCrossOrigin('anonymous');
      loader.setMeshoptDecoder(MeshoptDecoder);
      if (options.dracoDecoderPath) {
        const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
        loader.setDRACOLoader(new DRACOLoader().setDecoderPath(options.dracoDecoderPath));
      }
      if (options.ktx2TranscoderPath) {
        const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js');
        loader.setKTX2Loader(
          new KTX2Loader().setTranscoderPath(options.ktx2TranscoderPath).detectSupport(renderer),
        );
      }
      return loader;
    })();
  }
  return loaderPromise;
}

/** Loads a glTF/GLB once per URL and returns a fresh clone for each caller. */
export async function loadModel(
  url: string,
  renderer: WebGLRenderer,
  options: ModelLoaderOptions = {},
): Promise<Object3D> {
  let pending = cache.get(url);
  if (!pending) {
    pending = getLoader(renderer, options)
      .then((loader) => loader.loadAsync(url))
      .then((gltf) => gltf.scene)
      .catch((error: unknown) => {
        cache.delete(url);
        throw new TryOnError(ErrorCode.ASSET_LOAD_FAILED, `Failed to load model "${url}".`, {
          cause: error,
        });
      });
    cache.set(url, pending);
  }
  const scene = await pending;
  return scene.clone(true);
}

/** Starts downloading a model without a renderer (used by preloadTryOn). */
export async function prefetchModel(url: string): Promise<void> {
  try {
    await fetch(url, { mode: 'cors' }).then((r) => r.arrayBuffer());
  } catch {
    // Prefetch is best effort.
  }
}
