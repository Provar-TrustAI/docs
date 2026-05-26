import React from 'react';
import { Composition } from 'remotion';
import { DemoComposition } from './DemoComposition';
import type { DemoTimeline } from './types';
import exampleTimeline from '../example-timeline.json';

const FPS = 30;

/**
 * Remotion Root component. Registers the DemoComposition with default
 * props from the example timeline so Remotion Studio can preview it
 * without a real recording.
 */
export const RemotionRoot: React.FC = () => {
  const timeline = exampleTimeline as DemoTimeline;
  const durationInFrames = Math.ceil((timeline.totalDurationMs / 1000) * FPS);

  return (
    <>
      <Composition
        id="DemoComposition"
        component={DemoComposition}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={timeline.viewportWidth}
        height={timeline.viewportHeight}
        defaultProps={{
          videoFile: timeline.videoFile,
          timeline,
        }}
      />
    </>
  );
};
