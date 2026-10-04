import type { AssetManifest, AssetSource } from '@tryonit/react-native';

/**
 * Hosted sample assets from this repository, served by jsDelivr. Replace with your own CDN.
 * Files must use absolute https URLs in React Native.
 */
export const SAMPLES = 'https://cdn.jsdelivr.net/gh/ArbabNaseer82/try-it-on@main/samples';

/** Makeup needs no files: a manifest object is enough. */
export const lipstick: AssetManifest = {
  version: 1,
  id: 'velvet-lipstick',
  type: 'makeup.lips',
  name: 'Velvet Lipstick',
  color: '#B0123A',
  finish: 'satin',
  variants: [
    { id: 'ruby', name: 'Ruby', swatch: '#B0123A' },
    {
      id: 'nude',
      name: 'Nude',
      swatch: '#C48A7A',
      overrides: { color: '#C48A7A', finish: 'matte' },
    },
    {
      id: 'coral',
      name: 'Coral Gloss',
      swatch: '#E2584D',
      overrides: { color: '#E2584D', finish: 'gloss' },
    },
    { id: 'berry', name: 'Berry', swatch: '#6E1E4A', overrides: { color: '#6E1E4A' } },
  ],
};

export const softGlam: AssetManifest = {
  version: 1,
  id: 'filter-soft-glam',
  type: 'makeup.look',
  name: 'Soft Glam filter',
  layers: [
    { type: 'makeup.foundation', color: '#D9A98A', opacity: 0.3, coverage: 0.5 },
    { type: 'makeup.blush', color: '#D9707A', opacity: 0.3 },
    { type: 'makeup.eyeshadow', color: '#9C6B3C', opacity: 0.45, finish: 'shimmer' },
    { type: 'makeup.eyeliner', color: '#1A1A1A', thickness: 0.3, wing: true },
    { type: 'makeup.lips', color: '#B0123A', finish: 'gloss' },
  ],
};

export interface Product {
  title: string;
  subtitle: string;
  asset: AssetSource;
}

export const PRODUCTS: Product[] = [
  { title: 'Velvet Lipstick', subtitle: '4 shades, manifest object', asset: lipstick },
  { title: 'Soft Glam filter', subtitle: 'Complete makeup look', asset: softGlam },
  {
    title: 'Aviator Sunglasses',
    subtitle: '3D model from a URL',
    asset: `${SAMPLES}/glasses-aviator.json`,
  },
  {
    title: 'Round Frames',
    subtitle: '3D model from a URL',
    asset: `${SAMPLES}/glasses-round.json`,
  },
  { title: 'Pearl Drops', subtitle: 'Earrings', asset: `${SAMPLES}/earrings.json` },
  { title: 'Moustache', subtitle: 'Fun face sticker', asset: `${SAMPLES}/moustache.json` },
  { title: 'Hair Color', subtitle: '3 colors', asset: `${SAMPLES}/hair.json` },
];
