import React from 'react';
import Svg, { Ellipse, Rect, Circle, Line, Path } from 'react-native-svg';

interface TekyIconProps {
  size?: number;
}

const FUR       = '#5b8ea6';
const FUR_LIGHT = '#7aafca';
const FUR_DARK  = '#3a6d87';
const FUR_DEEP  = '#2c5470';
const EYES      = '#1c1008';
const GLASS     = '#d4854d';
const NOSE_TIP  = '#2a4f65';
const CHEEK     = '#e8a87a';

export function TekyIcon({ size = 52 }: TekyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Left ear */}
      <Ellipse cx={22} cy={26} rx={14} ry={11} fill={FUR_DEEP} />
      <Ellipse cx={22} cy={27} rx={8} ry={6.5} fill={FUR_LIGHT} />
      {/* Right ear */}
      <Ellipse cx={78} cy={26} rx={14} ry={11} fill={FUR_DEEP} />
      <Ellipse cx={78} cy={27} rx={8} ry={6.5} fill={FUR_LIGHT} />
      {/* Head */}
      <Ellipse cx={50} cy={52} rx={40} ry={36} fill={FUR} />
      {/* Lighter face area */}
      <Ellipse cx={50} cy={58} rx={28} ry={24} fill={FUR_LIGHT} opacity={0.35} />
      {/* Snout */}
      <Rect x={22} y={62} width={56} height={26} rx={14} fill={FUR_LIGHT} />
      {/* Nostrils */}
      <Ellipse cx={40} cy={71} rx={5.5} ry={4} fill={NOSE_TIP} />
      <Ellipse cx={60} cy={71} rx={5.5} ry={4} fill={NOSE_TIP} />
      <Ellipse cx={39} cy={69.5} rx={2} ry={1.2} fill="rgba(255,255,255,0.2)" />
      <Ellipse cx={59} cy={69.5} rx={2} ry={1.2} fill="rgba(255,255,255,0.2)" />
      {/* Cheek blush */}
      <Ellipse cx={26} cy={62} rx={7} ry={4.5} fill={CHEEK} opacity={0.25} />
      <Ellipse cx={74} cy={62} rx={7} ry={4.5} fill={CHEEK} opacity={0.25} />
      {/* Whisker dots */}
      <Circle cx={27} cy={73} r={1.5} fill={FUR_DARK} opacity={0.5} />
      <Circle cx={27} cy={78} r={1.5} fill={FUR_DARK} opacity={0.5} />
      <Circle cx={73} cy={73} r={1.5} fill={FUR_DARK} opacity={0.5} />
      <Circle cx={73} cy={78} r={1.5} fill={FUR_DARK} opacity={0.5} />
      {/* Eyes */}
      <Circle cx={37} cy={50} r={7} fill={EYES} />
      <Circle cx={63} cy={50} r={7} fill={EYES} />
      <Circle cx={39.5} cy={47.5} r={2.8} fill="rgba(255,255,255,0.65)" />
      <Circle cx={65.5} cy={47.5} r={2.8} fill="rgba(255,255,255,0.65)" />
      <Circle cx={35} cy={52} r={1.2} fill="rgba(255,255,255,0.3)" />
      <Circle cx={61} cy={52} r={1.2} fill="rgba(255,255,255,0.3)" />
      {/* Glasses — terracotta frames */}
      <Circle cx={37} cy={50} r={11} fill="none" stroke={GLASS} strokeWidth={3.2} />
      <Circle cx={63} cy={50} r={11} fill="none" stroke={GLASS} strokeWidth={3.2} />
      <Line x1={48} y1={50} x2={52} y2={50} stroke={GLASS} strokeWidth={2.8} strokeLinecap="round" />
      <Line x1={26} y1={48} x2={18} y2={45} stroke={GLASS} strokeWidth={2.4} strokeLinecap="round" />
      <Line x1={74} y1={48} x2={82} y2={45} stroke={GLASS} strokeWidth={2.4} strokeLinecap="round" />
      {/* Smile */}
      <Path d="M 42 80 Q 50 85 58 80" fill="none" stroke={FUR_DEEP} strokeWidth={1.8} strokeLinecap="round" />
      {/* Chin shadow */}
      <Ellipse cx={50} cy={87} rx={26} ry={5} fill={FUR_DEEP} opacity={0.25} />
    </Svg>
  );
}
