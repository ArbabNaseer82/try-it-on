import { useTryOnContext } from '../../provider/contexts';
import { cx } from '../../utils/cx';
import { PhotoUpload } from '../shared/PhotoUpload';

export interface PermissionPromptProps {
  className?: string;
}

/** Explains why the camera is needed, with a start button and a photo upload alternative. */
export function PermissionPrompt({ className }: PermissionPromptProps) {
  const { holder, labels, images, icons } = useTryOnContext();
  const Camera = icons.camera;
  return (
    <div className={cx('toi-permission', className)}>
      {images.permissionIllustration ? (
        <img className="toi-permission__img" src={images.permissionIllustration} alt="" />
      ) : (
        <Camera className="toi-permission__icon" size={40} />
      )}
      <h3 className="toi-permission__title">{labels.permissionTitle}</h3>
      <p className="toi-permission__body">{labels.permissionBody}</p>
      <div className="toi-status__actions">
        <button
          type="button"
          className="toi-btn toi-btn--primary"
          onClick={() =>
            holder
              .get()
              .start()
              .catch(() => undefined)
          }
        >
          {labels.start}
        </button>
        <PhotoUpload />
      </div>
      <p className="toi-permission__note">{labels.privacyNote}</p>
    </div>
  );
}
