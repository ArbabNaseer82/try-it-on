---
'@tryonit/core': minor
'@tryonit/web': minor
'@tryonit/react-native': minor
---

Add fitted mode for `clothing.top`. Mark the neckline, armpits, sleeve openings and waist on the garment image and it now follows the body: sleeves turn with the upper arms, the sides follow the body outline measured from the pose segmentation mask, and the light and folds under the garment show through (`fit` and `shading` fields). Clothing also works in waist up framing, when the hips are just below the frame. Four point garments render as before.
