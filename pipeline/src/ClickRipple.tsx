import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

interface ClickRippleProps {
  /** X coordinate of the click point. */
  x: number;
  /** Y coordinate of the click point. */
  y: number;
  /** Frame at which the ripple starts. */
  startFrame: number;
}

const RIPPLE_DURATION_FRAMES = 10;
const MAX_RADIUS = 40;

/**
 * Renders a circular ripple animation expanding outward from a click
 * point. Lasts 10 frames, fading out as it grows.
 */
export const ClickRipple: React.FC<ClickRippleProps> = ({
  x,
  y,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0 || localFrame >= RIPPLE_DURATION_FRAMES) {
    return null;
  }

  const progress = localFrame / RIPPLE_DURATION_FRAMES;

  const radius = interpolate(progress, [0, 1], [0, MAX_RADIUS], {
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(progress, [0, 0.3, 1], [0.7, 0.5, 0], {
    easing: Easing.linear,
  });

  const borderWidth = interpolate(progress, [0, 1], [3, 1], {
    easing: Easing.linear,
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: x - radius,
        top: y - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: '50%',
        border: `${borderWidth}px solid rgba(59, 130, 246, ${opacity})`,
        backgroundColor: `rgba(59, 130, 246, ${opacity * 0.15})`,
        pointerEvents: 'none',
      }}
    />
  );
};
