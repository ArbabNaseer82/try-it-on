import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { AssetManifest, AssetSource, TryOnError } from '@tryonit/web';
import { EnsureProvider, type TryOnProviderProps } from '../../provider/TryOnProvider';
import { useTryOnContext } from '../../provider/contexts';
import { useTryOnState } from '../../hooks/useTryOnState';
import { cx } from '../../utils/cx';
import { renderSlot } from '../../utils/slots';
import { useLatest } from '../../utils/useLatest';
import { CameraSwitch } from '../CameraSwitch/CameraSwitch';
import { CaptureButton } from '../CaptureButton/CaptureButton';
import { CompareSlider } from '../CompareSlider/CompareSlider';
import { IntensitySlider } from '../IntensitySlider/IntensitySlider';
import { PermissionPrompt } from '../PermissionPrompt/PermissionPrompt';
import { ProductSwitcher } from '../ProductSwitcher/ProductSwitcher';
import { ShadeSwatches } from '../ShadeSwatches/ShadeSwatches';
import { StatusOverlay } from '../StatusOverlay/StatusOverlay';
import { TryOnModal } from '../TryOnModal/TryOnModal';
import { TryOnView } from '../TryOnView/TryOnView';
import { Loader } from '../shared/Loader';
import { PhotoUpload } from '../shared/PhotoUpload';
import { CapturePreview } from './CapturePreview';
import type { ToolbarSlotProps, TryOnClassNames, TryOnSlots } from './types';
import { useResolvedAssets } from './useResolvedAssets';

export type TryOnLayout = 'modal' | 'inline' | 'fullscreen';

export interface TryOnProps extends Omit<TryOnProviderProps, 'children'> {
  /** A single product. */
  asset?: AssetSource;
  /** Several products, shown in the product switcher. */
  assets?: AssetSource[];
  /** Id of the product selected first. Defaults to the first asset. */
  defaultAssetId?: string;
  /** `inline` (default) renders in place, `modal` and `fullscreen` open a dialog. */
  layout?: TryOnLayout;
  /** Dialog visibility for `modal` and `fullscreen`. Default true. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Dialog title. */
  title?: string;
  /** Start the camera automatically. Default true. When false a permission prompt is shown. */
  autoStart?: boolean;
  /** Removes default visual styles, keeps layout and accessibility. */
  unstyled?: boolean;
  classNames?: TryOnClassNames;
  slots?: Partial<TryOnSlots>;
  /** Show the before and after control. Default: makeup and hair only. */
  showCompare?: boolean;
  /** Show the intensity slider. Default: makeup and hair only. */
  showIntensity?: boolean;
  /** Show the photo upload button in the toolbar. Default true. */
  showUpload?: boolean;
  /** Show a preview with download and share after capture. Default true. */
  showCapturePreview?: boolean;
  onCapture?: (blob: Blob) => void;
  onError?: (error: TryOnError) => void;
  onAssetChange?: (asset: AssetManifest) => void;
  className?: string;
  style?: CSSProperties;
}

const DefaultToolbar = ({ className, children }: ToolbarSlotProps) => (
  <div className={cx('toi-toolbar', className)}>{children}</div>
);

const isAdjustable = (asset: AssetManifest | null) =>
  !!asset && (asset.type.startsWith('makeup.') || asset.type === 'hair.color');

function TryOnPanel(props: TryOnProps) {
  const {
    asset,
    assets,
    defaultAssetId,
    autoStart = true,
    unstyled,
    classNames = {},
    slots = {},
    showCompare,
    showIntensity,
    showUpload = true,
    showCapturePreview = true,
    onCapture,
    onError,
    onAssetChange,
    className,
    style,
    layout = 'inline',
  } = props;
  const ctx = useTryOnContext();
  const { holder, labels, icons, images, rootStyle, dir, themeMode } = ctx;
  const sources = useMemo(() => assets ?? (asset !== undefined ? [asset] : []), [assets, asset]);
  const manifests = useResolvedAssets(sources, (e) => onError?.(e as TryOnError));
  const [selectedId, setSelectedId] = useState<string | null>(defaultAssetId ?? null);
  const [compare, setCompare] = useState(false);
  const [captured, setCaptured] = useState<Blob | null>(null);
  const current = useTryOnState((s) => s.asset);
  const status = useTryOnState((s) => s.status);

  const selected = manifests.find((m) => m.id === selectedId) ?? manifests[0] ?? null;
  useEffect(() => {
    if (!selected) return;
    holder
      .get()
      .setAsset(selected)
      .then((a) => a && onAssetChange?.(a))
      .catch(() => undefined);
    // Only react to a different product, not to callback identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holder, selected]);

  const onErrorRef = useLatest(onError);
  useEffect(() => holder.get().on('error', (e) => onErrorRef.current?.(e)), [holder, onErrorRef]);

  const adjustable = isAdjustable(current);
  const CompareIcon = icons.compare;
  const inDialog = layout !== 'inline';

  const toolbarButtons = (
    <>
      {showUpload && <PhotoUpload className={classNames.uploadButton} />}
      {renderSlot(slots.CaptureButton, CaptureButton, {
        className: classNames.captureButton,
        onCapture: (blob: Blob) => {
          setCaptured(blob);
          onCapture?.(blob);
        },
      })}
      {(showCompare ?? adjustable) && (
        <button
          type="button"
          className={cx('toi-btn', 'toi-icon-btn', classNames.compareButton)}
          aria-label={labels.compare}
          aria-pressed={compare}
          onClick={() => setCompare((v) => !v)}
        >
          <CompareIcon />
        </button>
      )}
      <CameraSwitch className={classNames.cameraSwitch} />
    </>
  );

  return (
    <div
      className={cx(
        'toi-root',
        'toi-tryon',
        unstyled && 'toi-unstyled',
        classNames.root,
        className,
      )}
      style={inDialog ? style : { ...rootStyle, ...style }}
      dir={inDialog ? undefined : dir}
      data-theme-mode={inDialog ? undefined : themeMode}
      data-status={status}
    >
      {images.logo && <img className="toi-logo" src={images.logo} alt="" />}
      <TryOnView
        autoStart={autoStart}
        className="toi-tryon__view"
        stageClassName={classNames.stage}
      >
        {status === 'idle' && !autoStart && <PermissionPrompt className={classNames.permission} />}
        {renderSlot(slots.StatusOverlay, StatusOverlay, {
          className: classNames.status,
          Loader: slots.Loader ?? Loader,
        })}
        {current?.type === 'clothing.top' && (
          <span className={cx('toi-badge', classNames.badge)}>{labels.experimental}</span>
        )}
        {compare && status === 'running' && <CompareSlider className={classNames.compare} />}
        {captured && showCapturePreview && (
          <CapturePreview
            blob={captured}
            className={classNames.preview}
            onClose={() => setCaptured(null)}
          />
        )}
      </TryOnView>
      <div className="toi-controls">
        {(showIntensity ?? adjustable) && <IntensitySlider className={classNames.intensity} />}
        <ShadeSwatches className={classNames.swatches} />
        {renderSlot(slots.ProductSwitcher, ProductSwitcher, {
          assets: manifests,
          selectedId: selected?.id ?? null,
          onSelect: (a: AssetManifest) => setSelectedId(a.id),
          className: classNames.productSwitcher,
        })}
        {renderSlot(slots.Toolbar, DefaultToolbar, {
          className: classNames.toolbar,
          children: toolbarButtons,
        })}
      </div>
    </div>
  );
}

function TryOnInner(props: TryOnProps) {
  const { layout = 'inline', open = true, onOpenChange, title, unstyled, classNames = {} } = props;
  if (layout === 'inline') return <TryOnPanel {...props} />;
  return (
    <TryOnModal
      open={open}
      onClose={() => onOpenChange?.(false)}
      title={title}
      fullscreen={layout === 'fullscreen'}
      unstyled={unstyled}
      className={classNames.backdrop}
      dialogClassName={classNames.modal}
    >
      <TryOnPanel {...props} />
    </TryOnModal>
  );
}

/**
 * All in one try-on experience: camera view, status messages, product switcher, shade
 * swatches, intensity, before and after compare, capture with download and share.
 *
 * @example
 * <TryOn assets={[glasses, lipstick]} layout="inline" onCapture={(blob) => upload(blob)} />
 */
export function TryOn(props: TryOnProps) {
  const { theme, icons, labels, images, engineOptions, dir, engine } = props;
  return (
    <EnsureProvider {...{ theme, icons, labels, images, engineOptions, dir, engine }}>
      <TryOnInner {...props} />
    </EnsureProvider>
  );
}
