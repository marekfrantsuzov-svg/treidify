import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../fonts";
import { Filters, Finish, OverlapQA, PAPER } from "./kit";
import { S1, S2, S3, S4 } from "./ScenesA";
import { S5, S6, S7, S8 } from "./ScenesB";
import { ramp } from "../lib";

loadFonts();

export const Commercial: React.FC<{ qa?: boolean; audio?: boolean }> = ({ qa = false, audio = true }) => {
  const f = useCurrentFrame();
  const dark = f < 420 ? 1 : f > 3170 && f < 3600 ? 1 : 0;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Filters />
      <S1 />
      <S2 />
      <S3 />
      <S4 />
      <S5 />
      <S6 />
      <S7 />
      <S8 />
      <Finish dark={dark} />
      {audio && <Audio src={staticFile("audio2/mix.wav")} />}
      {qa && <OverlapQA />}
    </AbsoluteFill>
  );
};
