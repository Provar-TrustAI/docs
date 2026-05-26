import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import type { ElementBounds } from './types';

interface ZoomEffectProps {
  /** Bounding box of the element to zoom toward. */
  targetBounds: ElementBounds;
  /** Frame at which the zoom begins. */
  startFrame: number;
  /** Total number of frames for the zoom (in + hold + out). */
  durationFrames: number;
  /** The content to wrap with the zoom transform. */
  children: React.ReactNode;
  /** Viewport width for centering calculations. */
  viewportWidth: number;
  /** Viewport height for centering calculations. */
  viewportHeight: number;
}

const ZOOM_SCALE = 1.5;
const EASE_FRAMES = 15;

/**
 * Wraps its children with a CSS transform that smoothly zooms from 1x
 * to 1.5x scale, centered on the target element's bounding box. Holds
 * the zoom for the beat duration, then eases back out.
 */
export const ZoomEffect: React.FC<ZoomEffectProps> = ({
  targetBounds,
  startFrame,
  durationFrames,
  children,
  viewportWidth,
  viewportHeight,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  // Outside the effect window — render children unmodified
  if (localFrame < 0 || localFrame >= durationFrames) {
    return <>{children}</>;
  }

  // Phase 1: ease in (0 → EASE_FRAMES)
  // Phase 2: hold  (EASE_FRAMES → durationFrames - EASE_FRAMES)
  // Phase 3: ease out (durationFrames - EASE_FRAMES → durationFrames)
  const zoomIn = interpolate(localFrame, [0, EASE_FRAMES], [1, ZOOM_SCALE], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  const zoomOut = interpolate(
    localFrame,
    [durationFrames - EASE_FRAMES, durationFrames],
    [ZOOM_SCALE, 1],
    {
      extrapolateLeft: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    },
  );

  const scale = localFrame < durationFrames - EASE_FRAMES ? zoomIn : zoomOut;

  // Calculate the translation needed to center the target element
  const targetCenterX = targetBounds.x + targetBounds.width / 2;
  const targetCenterY = targetBounds.y + targetBounds.height / 2;

  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;

  // When zoomed, translate so the target center aligns with the viewport center
  const maxTranslateX = viewportCenterX - targetCenterX;
  const maxTranslateY = viewportCenterY - targetCenterY;

  const translateFactor = interpolate(scale, [1, ZOOM_SCALE], [0, 1]);
  const translateX = maxTranslateX * translateFactor;
  const translateY = maxTranslateY * translateFactor;

  return (
    <div
      style={{
        width: viewportWidth,
        height: viewportHeight,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: `${targetCenterX}px ${targetCenterY}px`,
          width: viewportWidth,
          height: viewportHeight,
        }}
      >
        {children}
      </div>
    </div>
  );
};
