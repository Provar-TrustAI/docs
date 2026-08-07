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
 * Clamp one axis of the pan so the scaled frame still covers the viewport.
 *
 * Without this the zoom pans the recording clean off the edge whenever the
 * target sits near a border — and every click in a right-anchored fly-in does.
 * Scaling about the target's centre `c` maps the content edges to
 * `c(1-s)+t` and `c(1-s)+Ls+t`, so covering `[0, L]` means
 * `t ∈ [(c-L)(s-1), c(s-1)]`. Outside that window the composition's own
 * background renders as a black band beside the frame, which reads as a
 * broken render rather than a zoom. At `s === 1` the window collapses to
 * `0`, so an un-zoomed frame is never nudged.
 */
function clampPan(desired: number, center: number, length: number, scale: number): number {
  const min = (center - length) * (scale - 1);
  const max = center * (scale - 1);
  return Math.min(Math.max(desired, min), max);
}

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
  const translateX = clampPan(
    maxTranslateX * translateFactor,
    targetCenterX,
    viewportWidth,
    scale,
  );
  const translateY = clampPan(
    maxTranslateY * translateFactor,
    targetCenterY,
    viewportHeight,
    scale,
  );

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
