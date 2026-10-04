import type { ComponentType, ReactNode, SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export type IconName =
  | 'camera'
  | 'capture'
  | 'switchCamera'
  | 'close'
  | 'compare'
  | 'download'
  | 'share'
  | 'retry'
  | 'warning'
  | 'check'
  | 'chevronLeft'
  | 'chevronRight';

export type Icons = Record<IconName, ComponentType<IconProps>>;

function icon(paths: ReactNode, filled = false): ComponentType<IconProps> {
  const Icon = ({ size = 24, ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths}
    </svg>
  );
  return Icon;
}

/** Built in icons. Replace any of them with the `icons` prop on `TryOnProvider`. */
export const defaultIcons: Icons = {
  camera: icon(
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>,
  ),
  capture: icon(<circle cx="12" cy="12" r="9" />, true),
  switchCamera: icon(
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <path d="m9 13 2-2 2 2M15 13l-2 2-2-2" />
    </>,
  ),
  close: icon(<path d="M6 6l12 12M18 6 6 18" />),
  compare: icon(<path d="M12 3v18M5 7l-3 5 3 5M19 7l3 5-3 5" />),
  download: icon(<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />),
  share: icon(<path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v7h14v-7" />),
  retry: icon(<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5" />),
  warning: icon(<path d="M12 4 2.5 20h19zM12 10v4M12 17.5v.5" />),
  check: icon(<path d="m5 12.5 4.5 4.5L19 7.5" />),
  chevronLeft: icon(<path d="m15 5-7 7 7 7" />),
  chevronRight: icon(<path d="m9 5 7 7-7 7" />),
};
