/**
 * Remotion entry point.
 *
 * This file did not exist, which is why `pnpm render` could never run — the scripts
 * pointed at src/Root.tsx, but Remotion requires the module that calls registerRoot().
 */
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
