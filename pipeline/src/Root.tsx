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
      const t = props.timeline as DemoTimeline;
      return {
        durationInFrames: Math.ceil((t.totalDurationMs / 1000) * FPS),
        width: t.viewportWidth,
        height: t.viewportHeight,
        props,
      };
    }}
  />
);
