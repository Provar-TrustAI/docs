import React from 'react';
import { Composition } from 'remotion';
import { DemoComposition } from './DemoComposition';
import type { DemoTimeline } from './types';
import exampleTimeline from '../example-timeline.json';

const FPS = 30;

/**
 * Which timeline renders is chosen at the CLI, not hardcoded here.
 *
 * This file previously imported the example timeline directly, so the pipeline could
 * only ever render one demo. The cycle budgets four Tier-2 artifacts (D1–D4), so the
 * timeline arrives as props:
 *
 *   npx remotion render src/index.ts DemoComposition out/d1.mp4 \
 *     --props=public/d1-salesforce-authorize.json
 *
 * Duration and viewport are derived from those props via calculateMetadata, so a longer
 * recording does not need a code change. The example timeline remains the default so
 * `remotion studio` still previews without a recording.
 */
export const RemotionRoot: React.FC = () => (
  <Composition
    id="DemoComposition"
    component={DemoComposition}
    fps={FPS}
    durationInFrames={Math.ceil((exampleTimeline.totalDurationMs / 1000) * FPS)}
    width={exampleTimeline.viewportWidth}
    height={exampleTimeline.viewportHeight}
    defaultProps={{
      videoFile: exampleTimeline.videoFile,
      timeline: exampleTimeline as DemoTimeline,
    }}
    calculateMetadata={({ props }) => {
      // `--props=public/<slug>.json` passes a BARE DemoTimeline — the shape
      // every recorder emits and the shape the README documents. The nested
      // `{ videoFile, timeline }` form is what `defaultProps` carries so
      // Remotion Studio previews without a recording.
      //
      // Order matters here. Remotion MERGES `--props` over `defaultProps`,
      // so a bare timeline arrives as `{...exampleShape, ...yourTimeline}` —
      // it still carries the example's `timeline` key. Checking `props.timeline`
      // first therefore picks the EXAMPLE every time: the render completed at
      // the example's 240 frames pointing at the example's missing video,
      // regardless of which demo you asked for. Detect the bare shape by its
      // own marker (`beats` at the top level) and prefer it.
      const maybe = props as unknown as DemoTimeline & { timeline?: DemoTimeline };
      const t: DemoTimeline = Array.isArray(maybe.beats) ? maybe : (maybe.timeline as DemoTimeline);

      if (!t?.totalDurationMs || !t.viewportWidth || !t.viewportHeight) {
        throw new Error(
          'Timeline props are missing totalDurationMs / viewportWidth / viewportHeight. ' +
            'Pass a recorder-emitted timeline: --props=public/<slug>.json',
        );
      }

      return {
        durationInFrames: Math.ceil((t.totalDurationMs / 1000) * FPS),
        width: t.viewportWidth,
        height: t.viewportHeight,
        props: { videoFile: t.videoFile, timeline: t },
      };
    }}
  />
);
