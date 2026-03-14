interface TreeDepthMetrics {
  clampedY: number;
  normalizedDepth: number;
  perspectiveScale: number;
  blurPx: number;
  saturation: number;
  zIndex: number;
  treeShadowOpacity: number;
  treeShadowBlur: number;
  treeShadowOffsetY: number;
  groundShadowOpacity: number;
  groundShadowWidth: number;
  groundShadowHeight: number;
  groundShadowOffsetX: number;
  growDuration: number;
  swayAmplitude: number;
  swayDuration: number;
  phraseCompensationScale: number;
  phraseShadowOpacity: number;
  phraseTop: number;
  ghostShadowOpacity: number;
  ghostShadowBlur: number;
  ghostShadowOffsetX: number;
  ghostShadowOffsetY: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function getTreeDepthMetrics(depthY: number, minY: number, maxY: number): TreeDepthMetrics {
  const clampedY = clamp(depthY, minY, maxY);
  const range = Math.max(1, maxY - minY);
  const normalizedDepth = Math.min(1, Math.max(0, (clampedY - minY) / range));

  return {
    clampedY,
    normalizedDepth,
    perspectiveScale: 0.4 + normalizedDepth * (1.2 - 0.4),
    blurPx: normalizedDepth < 0.35 ? (0.35 - normalizedDepth) * (0.5 / 0.35) : 0,
    saturation: 0.82 + normalizedDepth * 0.28,
    zIndex: Math.floor(clampedY),
    treeShadowOpacity: 0.05 + normalizedDepth * 0.16,
    treeShadowBlur: 2 + normalizedDepth * 5,
    treeShadowOffsetY: 1 + normalizedDepth * 3,
    groundShadowOpacity: 0.06 + normalizedDepth * 0.16,
    groundShadowWidth: 62 + normalizedDepth * 24,
    groundShadowHeight: 5 + normalizedDepth * 5,
    groundShadowOffsetX: 0.5 + normalizedDepth * 5,
    growDuration: 2.2 + (1 - normalizedDepth) * 1.2,
    swayAmplitude: 0.8 + normalizedDepth * 2.4,
    swayDuration: 2.4 - normalizedDepth * 0.7,
    phraseCompensationScale: 1 / (0.92 + normalizedDepth * 0.22),
    phraseShadowOpacity: 0.06 + normalizedDepth * 0.07,
    phraseTop: -44 - normalizedDepth * 10,
    ghostShadowOpacity: 0.2 + normalizedDepth * 0.3,
    ghostShadowBlur: 6 + normalizedDepth * 10,
    ghostShadowOffsetX: 0.5 + normalizedDepth * 3,
    ghostShadowOffsetY: 1 + normalizedDepth * 2,
  };
}
