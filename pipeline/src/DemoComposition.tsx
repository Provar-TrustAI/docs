import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  Video,
  staticFile,
} from 'remotion';
import type { DemoTimeline, TimelineBeat } from './types';
import { ZoomEffect } from './ZoomEffect';
import { HighlightOverlay } from './HighlightOverlay';
import { CaptionOverlay } from './CaptionOverlay';
import { ClickRipple } from './ClickRipple';

interface DemoCompositionProps {
  /** Path to the raw Playwright screen recording. */
  videoFile: string;
  /** The timeline descriptor driving compositor effects. */
  timeline: DemoTimeline;
}

/** Convert a millisecond timestamp to a frame number. */
function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/**
 * Compute the duration of a beat in frames. Uses the explicit durationMs
 * if provided; otherwise uses the gap until the next beat (or 1 second
 * for the last beat).
 */
function beatDurationFrames(
  beat: TimelineBeat,
  index: number,
  beats: TimelineBeat[],
  fps: number,
): number {
  if (beat.durationMs != null) {
    return msToFrame(beat.durationMs, fps);
  }
  const nextBeat = beats[index + 1];
  if (nextBeat) {
    return msToFrame(nextBeat.timeMs - beat.timeMs, fps);
  }
  // Last beat: default 1 second
  return fps;
}

/**
 * Main composition component. Renders the background video overlaid with
 * zoom, highlight, caption, and click-ripple effects driven by the
 * timeline beats.
 */
export const DemoComposition: React.FC<DemoCompositionProps> = ({
  videoFile,
  timeline,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { beats, viewportWidth, viewportHeight } = timeline;

  // Determine which beat is currently "active" for the zoom effect.
  // We only apply zoom for beats that have elementBounds and are click/type.
  const activeZoomBeat = beats.find((beat, i) => {
    if (!beat.elementBounds) return false;
    if (beat.action !== 'click' && beat.action !== 'type') return false;

    const start = msToFrame(beat.timeMs, fps);
    const dur = beatDurationFrames(beat, i, beats, fps);
    return frame >= start && frame < start + dur;
  });

  // The video layer — potentially wrapped in a zoom transform
  const videoLayer = (
    <Video
      src={staticFile(videoFile)}
      style={{
        width: viewportWidth,
        height: viewportHeight,
        objectFit: 'cover',
      }}
    />
  );

  const zoomBeatIndex = activeZoomBeat
    ? beats.indexOf(activeZoomBeat)
    : -1;

  const wrappedVideo =
    activeZoomBeat && activeZoomBeat.elementBounds ? (
      <ZoomEffect
        targetBounds={activeZoomBeat.elementBounds}
        startFrame={msToFrame(activeZoomBeat.timeMs, fps)}
        durationFrames={beatDurationFrames(
          activeZoomBeat,
          zoomBeatIndex,
          beats,
          fps,
        )}
        viewportWidth={viewportWidth}
        viewportHeight={viewportHeight}
      >
        {videoLayer}
      </ZoomEffect>
    ) : (
      videoLayer
    );

  return (
    <div
      style={{
        width,
        height,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0f172a',
      }}
    >
      {wrappedVideo}

      {/* Overlay effects for each beat */}
      {beats.map((beat, i) => {
        const startFrame = msToFrame(beat.timeMs, fps);
        const durationFrames = beatDurationFrames(beat, i, beats, fps);

        return (
          <React.Fragment key={`${beat.action}-${beat.timeMs}`}>
            {/* Click ripple */}
            {beat.action === 'click' && beat.elementBounds && (
              <ClickRipple
                x={
                  beat.elementBounds.x + beat.elementBounds.width / 2
                }
                y={
                  beat.elementBounds.y + beat.elementBounds.height / 2
                }
                startFrame={startFrame}
              />
            )}

            {/* Hover highlight */}
            {beat.action === 'hover' && beat.elementBounds && (
              <HighlightOverlay
                elementBounds={beat.elementBounds}
                startFrame={startFrame}
                durationFrames={durationFrames}
                viewportWidth={viewportWidth}
                viewportHeight={viewportHeight}
              />
            )}

            {/* Caption for any beat with caption text */}
            {beat.caption && (
              <CaptionOverlay
                text={beat.caption}
                position="bottom"
                startFrame={startFrame}
                durationFrames={durationFrames}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
