/**
 * Timeline JSON contract between the Playwright capture layer and the
 * Remotion compositor.
 *
 * Layer 1 (Playwright) emits a DemoTimeline JSON file alongside the raw
 * screen recording. Layer 3 (Remotion) consumes both to produce a
 * polished demo with zoom, highlight, caption, and click-ripple effects.
 */

/** Bounding box of a DOM element at the time of the action. */
export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A single beat in the demo timeline.
 *
 * Each beat maps to one user action captured by the Playwright script.
 * The compositor decides which visual effects to apply based on the
 * action type:
 *
 *  - click    → ZoomEffect toward elementBounds + ClickRipple at center
 *  - type     → ZoomEffect toward elementBounds
 *  - navigate → full viewport, no zoom
 *  - scroll   → (reserved) no special effect yet
 *  - hover    → HighlightOverlay around elementBounds
 *  - wait     → CaptionOverlay if caption is present
 */
export interface TimelineBeat {
  /** Timestamp within the recording when this action occurs (ms). */
  timeMs: number;

  /** The kind of user action. */
  action: 'click' | 'type' | 'navigate' | 'scroll' | 'hover' | 'wait';

  /** Bounding box of the target element, if applicable. */
  elementBounds?: ElementBounds;

  /** Optional caption text to display during this beat. */
  caption?: string;

  /** How long this beat lasts (ms). Defaults to gap until the next beat. */
  durationMs?: number;
}

/**
 * Top-level timeline descriptor emitted by the Playwright capture layer.
 */
export interface DemoTimeline {
  /** Human-readable title for the demo. */
  title: string;

  /** Short description of what the demo shows. */
  description: string;

  /** Viewport dimensions used during capture. */
  viewportWidth: number;
  viewportHeight: number;

  /** Total duration of the raw recording (ms). */
  totalDurationMs: number;

  /** Relative path to the raw Playwright screen recording. */
  videoFile: string;

  /** Ordered list of beats that drive the compositor effects. */
  beats: TimelineBeat[];
}
