import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Finish } from "./components";
import { loadFonts } from "./fonts";
import { ramp } from "./lib";
import { S1Opening } from "./scenes/S1Opening";
import { S2Dashboard } from "./scenes/S2Dashboard";
import { S3Connect } from "./scenes/S3Connect";
import { S4Analysis } from "./scenes/S4Analysis";
import { S5Macro } from "./scenes/S5Macro";
import { S6Coach } from "./scenes/S6Coach";
import { S7Ecosystem } from "./scenes/S7Ecosystem";
import { S8Finale } from "./scenes/S8Finale";

loadFonts();

/** The whole film on one absolute timeline (frames match timeline.json and the audio cues). */
export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const bg = ramp(f, 0, 120) * (1 - ramp(f, 3280, 3350));
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity: bg }}>
        <Backdrop />
      </AbsoluteFill>
      <S1Opening />
      <S2Dashboard />
      <S3Connect />
      <S4Analysis />
      <S5Macro />
      <S6Coach />
      <S7Ecosystem />
      <S8Finale />
      <Finish />
      <Audio src={staticFile("audio/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
