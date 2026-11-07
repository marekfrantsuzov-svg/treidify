import { Composition } from "remotion";
import { Film } from "./Film";
import tl from "../timeline.json";
import { Commercial } from "./v2/Commercial";
import ctl from "../commercial.json";

/**
 * The film is laid out on a 1920x1080 canvas at 60 fps. All interface plates are 3840x2160 captures, so
 * rendering with --scale=2 produces a true 3840x2160 master with native-resolution UI (no upscaling).
 */
export const Root: React.FC = () => (
  <>
    <Composition id="TreidifyFilm" component={Film} durationInFrames={tl.durationInFrames} fps={tl.fps} width={1920} height={1080} />
    <Composition id="TreidifyStill" component={Film} durationInFrames={tl.durationInFrames} fps={tl.fps} width={1920} height={1080} />
    <Composition id="TreidifyCommercial" component={Commercial} durationInFrames={ctl.durationInFrames} fps={ctl.fps} width={1920} height={1080} defaultProps={{ qa: false, audio: true }} />
  </>
);
