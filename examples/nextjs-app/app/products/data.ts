/** Mock product catalog. Manifests live in /public/assets and are served by /api/assets/[id]. */
export const PRODUCTS = [
  {
    id: 'glasses-aviator',
    name: 'Aviator Sunglasses',
    price: '$129',
    thumb: '/assets/thumbs/glasses-aviator.svg',
  },
  {
    id: 'glasses-round',
    name: 'Round Frames',
    price: '$99',
    thumb: '/assets/thumbs/glasses-round.svg',
  },
  { id: 'lipstick', name: 'Velvet Lipstick', price: '$19', thumb: '/assets/thumbs/look.svg' },
  { id: 'earrings', name: 'Pearl Drops', price: '$59', thumb: '/assets/thumbs/earrings.svg' },
  { id: 'cap', name: 'Classic Cap', price: '$29', thumb: '/assets/thumbs/cap.svg' },
  { id: 'watch', name: 'Classic Watch', price: '$189', thumb: '/assets/thumbs/watch.svg' },
] as const;
