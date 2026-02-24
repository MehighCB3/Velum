import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Path,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import { AvatarParams } from '../types';

interface AvatarSVGProps {
  params: AvatarParams;
  size?: number;
}

// Color interpolation: cold gray → warm gold
function lerpColor(t: number): { primary: string; secondary: string; bg: string } {
  // t=0: cool gray/blue, t=1: warm gold/accent
  const r1 = Math.round(181 + (196 - 181) * t); // #b5 → #c4
  const g1 = Math.round(176 + (149 - 176) * t); // #b0 → #95
  const b1 = Math.round(168 + (106 - 168) * t); // #a8 → #6a

  const r2 = Math.round(160 + (232 - 160) * t); // secondary warmer
  const g2 = Math.round(155 + (168 - 155) * t);
  const b2 = Math.round(147 + (92 - 147) * t);

  // Background shifts from cool to warm
  const rb = Math.round(240 + (250 - 240) * t);
  const gb = Math.round(238 + (245 - 238) * t);
  const bb = Math.round(235 + (237 - 235) * t);

  return {
    primary: `rgb(${r1},${g1},${b1})`,
    secondary: `rgb(${r2},${g2},${b2})`,
    bg: `rgb(${rb},${gb},${bb})`,
  };
}

// Expression data: eye and mouth paths
function getExpressionPaths(expression: AvatarParams['expression'], cx: number, cy: number) {
  const eyeY = cy - 12;
  const eyeSpread = 16;
  const mouthY = cy + 16;

  switch (expression) {
    case 'neutral':
      return {
        leftEye: { rx: 4, ry: 4 },
        rightEye: { rx: 4, ry: 4 },
        mouth: `M ${cx - 8} ${mouthY} L ${cx + 8} ${mouthY}`,
        eyeY,
        eyeSpread,
      };
    case 'curious':
      return {
        leftEye: { rx: 4, ry: 5 },
        rightEye: { rx: 5, ry: 5 },
        mouth: `M ${cx - 6} ${mouthY} Q ${cx} ${mouthY + 4} ${cx + 6} ${mouthY}`,
        eyeY: eyeY - 1,
        eyeSpread,
      };
    case 'happy':
      return {
        leftEye: { rx: 4, ry: 3 },
        rightEye: { rx: 4, ry: 3 },
        mouth: `M ${cx - 10} ${mouthY - 2} Q ${cx} ${mouthY + 8} ${cx + 10} ${mouthY - 2}`,
        eyeY,
        eyeSpread,
      };
    case 'proud':
      return {
        leftEye: { rx: 4.5, ry: 3.5 },
        rightEye: { rx: 4.5, ry: 3.5 },
        mouth: `M ${cx - 12} ${mouthY - 3} Q ${cx} ${mouthY + 10} ${cx + 12} ${mouthY - 3}`,
        eyeY: eyeY + 1,
        eyeSpread: eyeSpread + 1,
      };
    case 'glowing':
      return {
        leftEye: { rx: 5, ry: 4 },
        rightEye: { rx: 5, ry: 4 },
        mouth: `M ${cx - 13} ${mouthY - 4} Q ${cx} ${mouthY + 12} ${cx + 13} ${mouthY - 4}`,
        eyeY: eyeY + 1,
        eyeSpread: eyeSpread + 2,
      };
  }
}

export function AvatarSVG({ params, size = 200 }: AvatarSVGProps) {
  const { warmth, energy, expression, glow } = params;
  const breathAnim = useRef(new Animated.Value(0)).current;

  // Breathing animation — speed driven by energy
  useEffect(() => {
    const duration = 3000 - energy * 1500; // 3s (still) → 1.5s (vibrant)
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [energy, breathAnim]);

  const scale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1 + energy * 0.04], // subtle 0–4% scale
  });

  const colors = lerpColor(warmth);
  const cx = size / 2;
  const cy = size / 2;
  const headRadius = size * 0.28;
  const expr = getExpressionPaths(expression, cx, cy);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            {/* Glow gradient */}
            <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={glow * 0.4} />
              <Stop offset="70%" stopColor={colors.primary} stopOpacity={glow * 0.15} />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
            </RadialGradient>
            {/* Head gradient */}
            <LinearGradient id="headGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colors.secondary} />
              <Stop offset="100%" stopColor={colors.primary} />
            </LinearGradient>
            {/* Inner light */}
            <RadialGradient id="innerLight" cx="45%" cy="40%" r="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.2 + warmth * 0.15} />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Outer glow — only visible at level 3+ */}
          {glow > 0 && (
            <Circle
              cx={cx}
              cy={cy}
              r={headRadius * 1.8}
              fill="url(#glowGrad)"
            />
          )}

          {/* Body — subtle shoulders */}
          <Ellipse
            cx={cx}
            cy={cy + headRadius * 1.15}
            rx={headRadius * 1.1}
            ry={headRadius * 0.45}
            fill={colors.primary}
            opacity={0.5}
          />

          {/* Head */}
          <Circle
            cx={cx}
            cy={cy}
            r={headRadius}
            fill="url(#headGrad)"
          />

          {/* Inner highlight */}
          <Circle
            cx={cx}
            cy={cy}
            r={headRadius}
            fill="url(#innerLight)"
          />

          {/* Eyes */}
          <G>
            <Ellipse
              cx={cx - expr.eyeSpread}
              cy={expr.eyeY}
              rx={expr.leftEye.rx}
              ry={expr.leftEye.ry}
              fill="#2d2a26"
              opacity={0.85}
            />
            <Ellipse
              cx={cx + expr.eyeSpread}
              cy={expr.eyeY}
              rx={expr.rightEye.rx}
              ry={expr.rightEye.ry}
              fill="#2d2a26"
              opacity={0.85}
            />
            {/* Eye highlights */}
            <Circle
              cx={cx - expr.eyeSpread + 1.5}
              cy={expr.eyeY - 1.5}
              r={1.5}
              fill="#ffffff"
              opacity={0.7 + warmth * 0.3}
            />
            <Circle
              cx={cx + expr.eyeSpread + 1.5}
              cy={expr.eyeY - 1.5}
              r={1.5}
              fill="#ffffff"
              opacity={0.7 + warmth * 0.3}
            />
          </G>

          {/* Mouth */}
          <Path
            d={expr.mouth}
            stroke="#2d2a26"
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            opacity={0.7}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
