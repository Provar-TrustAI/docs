import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import type { ElementBounds } from './types';

interface HighlightOverlayProps {
  /** Bounding box of the element to highlight. */
  elementBounds: ElementBounds;
  /** Frame at which the highlight fades in. */
  startFrame: number;
  /** Total number of frames for the highlight. */
  durationFrames: number;
  /** Viewport width. */
  viewportWidth: number;
  /** Viewport height. */
  viewportHeight: number;
}

const FADE_FRAMES = 8;
const OVERLAY_OPACITY = 0.45;
const PADDING = 8;
const BORDER_RADIUS = 8;

/**
 * Renders a semi-transparent dark overlay covering the entire viewport
 * except for a rounded rectangle cutout around the highlighted element.
 * Uses an SVG mask for a clean cutout. Fades in and out smoothly.
 */
export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  elementBounds,
  startFrame,
  durationFrames,
  viewportWidth,
  viewportHeight,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0 || localFrame >= durationFrames) {
    return null;
  }

  const fadeIn = interpolate(localFrame, [0, FADE_FRAMES], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const fadeOut = interpolate(
    localFrame,
    [durationFrames - FADE_FRAMES, durationFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      easing: Easing.in(Easing.cubic),
    },
  );

  const opacity = Math.min(fadeIn, fadeOut) * OVERLAY_OPACITY;

  // Cutout bounds with padding
  const cx = elementBounds.x - PADDING;
  const cy = elementBounds.y - PADDING;
  const cw = elementBounds.width + PADDING * 2;
  const ch = elementBounds.height + PADDING * 2;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: viewportWidth,
        height: viewportHeight,
        pointerEvents: 'none',
      }}
    >
      <svg
        width={viewportWidth}
        height={viewportHeight}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <mask id="highlight-mask">
            {/* White = visible (dark overlay shows) */}
            <rect width={viewportWidth} height={viewportHeight} fill="white" />
            {/* Black = hidden (cutout — original content shows through) */}
            <rect
              x={cx}
              y={cy}
              width={cw}
              height={ch}
              rx={BORDER_RADIUS}
              ry={BORDER_RADIUS}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width={viewportWidth}
          height={viewportHeight}
          fill={`rgba(0, 0, 0, ${opacity})`}
          mask="url(#highlight-mask)"
        />
      </svg>

      {/* Subtle border around the highlighted area */}
      <div
        style={{
          position: 'absolute',
          left: cx,
          top: cy,
          width: cw,
          height: ch,
          borderRadius: BORDER_RADIUS,
          border: `2px solid rgba(59, 130, 246, ${Math.min(fadeIn, fadeOut) * 0.6})`,
          boxShadow: `0 0 12px rgba(59, 130, 246, ${Math.min(fadeIn, fadeOut) * 0.2})`,
        }}
      />
    </div>
  );
};
