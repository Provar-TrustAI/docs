import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

interface CaptionOverlayProps {
  /** The caption text to display. */
  text: string;
  /** Where to position the caption. */
  position: 'top' | 'bottom';
  /** Frame at which the caption fades in. */
  startFrame: number;
  /** Total number of frames for the caption (including fade in/out). */
  durationFrames: number;
}

const FADE_FRAMES = 8;

/**
 * Renders a text caption in a pill-shaped container at the top or bottom
 * of the viewport. Fades in, holds, then fades out.
 *
 * Uses Inter font to match the docs site typography.
 */
export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({
  text,
  position,
  startFrame,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0 || localFrame >= durationFrames) {
    return null;
  }

  // Fade in over FADE_FRAMES, hold, then fade out over FADE_FRAMES
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

  const opacity = Math.min(fadeIn, fadeOut);

  // Slight vertical slide for a polished feel
  const translateY = interpolate(localFrame, [0, FADE_FRAMES], [8, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const positionStyle =
    position === 'top' ? { top: 32 } : { bottom: 32 };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity,
        transform: `translateY(${position === 'top' ? translateY : -translateY}px)`,
        ...positionStyle,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontSize: 18,
          fontWeight: 500,
          lineHeight: 1.4,
          padding: '10px 24px',
          borderRadius: 999,
          maxWidth: '80%',
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {text}
      </div>
    </div>
  );
};
