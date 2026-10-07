# @tryonit/react-native

## 0.2.0

### Minor Changes

- [#9](https://github.com/ArbabNaseer82/try-it-on/pull/9) [`1d29f2b`](https://github.com/ArbabNaseer82/try-it-on/commit/1d29f2b4172880d96f71f3825c4647f94b56fa56) Thanks [@ArbabNaseer82](https://github.com/ArbabNaseer82)! - Add fitted mode for `clothing.top`. Mark the neckline, armpits, sleeve openings and waist on the garment image and it now follows the body: sleeves turn with the upper arms, the sides follow the body outline measured from the pose segmentation mask, and the light and folds under the garment show through (`fit` and `shading` fields). Clothing also works in waist up framing, when the hips are just below the frame. Four point garments render as before.

### Patch Changes

- [#9](https://github.com/ArbabNaseer82/try-it-on/pull/9) [`1d29f2b`](https://github.com/ArbabNaseer82/try-it-on/commit/1d29f2b4172880d96f71f3825c4647f94b56fa56) Thanks [@ArbabNaseer82](https://github.com/ArbabNaseer82)! - Fix watches sitting on the palm side of the wrist. The wrist frame now points out of the back of the hand for both hands, and depth noise from a single camera is damped so the watch face stays centered on the wrist.
- Updated dependencies [[`1d29f2b`](https://github.com/ArbabNaseer82/try-it-on/commit/1d29f2b4172880d96f71f3825c4647f94b56fa56), [`1d29f2b`](https://github.com/ArbabNaseer82/try-it-on/commit/1d29f2b4172880d96f71f3825c4647f94b56fa56)]:
  - @tryonit/core@0.2.0

## 0.1.1

### Patch Changes

- [#7](https://github.com/ArbabNaseer82/try-it-on/pull/7) [`b54701d`](https://github.com/ArbabNaseer82/try-it-on/commit/b54701db6e50fd46108255ad7ac2da7f18378696) Thanks [@ArbabNaseer82](https://github.com/ArbabNaseer82)! - Update the embedded try-on runtime to include the head occluder fix, so the middle of glasses frames is no longer hidden on React Native.
- Updated dependencies [[`276e084`](https://github.com/ArbabNaseer82/try-it-on/commit/276e084f7365262a6ebf81fb1b643f1b824d0f82)]:
  - @tryonit/core@0.1.1
