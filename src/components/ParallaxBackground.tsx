import { useRef, useEffect, useState } from 'react';
import { ThemeColors, TimeTheme } from '@/hooks/useTimeTheme';
import { WorldEcologyAtmosphere } from '@/lib/worldEcology';
import type { WeatherType } from '@/components/Particles';

type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

interface Props {
  theme: TimeTheme;
  colors: ThemeColors;
  season: SeasonType;
  weather: WeatherType;
  scrollX: number;
  cameraZoom: number;
  atmosphere: WorldEcologyAtmosphere;
}

export default function ParallaxBackground({ colors, season, weather, scrollX, theme, cameraZoom, atmosphere }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const isAutumnSeason = season === 'autumn';
  const isSummerSeason = season === 'summer';
  const isWinterSeason = season === 'winter';
  const isDusk = theme === 'dusk';
  const glowStrength = weather === 'rain' ? 0.66 : weather === 'snow' ? 0.58 : 1;
  const autumnPalette = getAutumnPalette(theme);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d')!;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, size.h);
    if (isAutumnSeason) {
      skyGrad.addColorStop(0, autumnPalette.skyTop);
      skyGrad.addColorStop(0.45, autumnPalette.skyMid);
      skyGrad.addColorStop(1, autumnPalette.skyBottom);
    } else if (isWinterSeason) {
      if (theme === 'dawn') {
        skyGrad.addColorStop(0, '#8fb3cf');
        skyGrad.addColorStop(0.5, '#c8dff1');
        skyGrad.addColorStop(1, '#edf6fd');
      } else if (theme === 'day') {
        skyGrad.addColorStop(0, '#7aa6cb');
        skyGrad.addColorStop(0.5, '#bbd8ef');
        skyGrad.addColorStop(1, '#e8f3fc');
      } else if (theme === 'dusk') {
        skyGrad.addColorStop(0, '#d98f6c');
        skyGrad.addColorStop(0.56, '#edb18e');
        skyGrad.addColorStop(1, '#f8dcc2');
      } else {
        skyGrad.addColorStop(0, '#3f5e7b');
        skyGrad.addColorStop(0.58, '#6d8ba9');
        skyGrad.addColorStop(1, '#a8c0d6');
      }
    } else if (isSummerSeason) {
      if (theme === 'dawn') {
        skyGrad.addColorStop(0, '#a1c4fd');
        skyGrad.addColorStop(1, '#c2e9fb');
      } else if (theme === 'day') {
        skyGrad.addColorStop(0, '#4facfe');
        skyGrad.addColorStop(1, '#00f2fe');
      } else if (theme === 'dusk') {
        skyGrad.addColorStop(0, '#ff9a9e');
        skyGrad.addColorStop(0.56, '#fecfef');
        skyGrad.addColorStop(1, '#feada6');
      } else {
        skyGrad.addColorStop(0, '#09203f');
        skyGrad.addColorStop(1, '#537895');
      }
    } else {
      skyGrad.addColorStop(0, colors.gradientStart);
      skyGrad.addColorStop(1, colors.gradientEnd);
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, size.w, size.h);

    if (isDusk) {
      const duskOverlay = ctx.createLinearGradient(0, 0, 0, size.h);
      if (isWinterSeason) {
        duskOverlay.addColorStop(0, 'rgba(231, 140, 88, 0.32)');
        duskOverlay.addColorStop(0.55, 'rgba(246, 178, 124, 0.2)');
        duskOverlay.addColorStop(1, 'rgba(255, 222, 180, 0.08)');
      } else if (isSummerSeason) {
        duskOverlay.addColorStop(0, 'rgba(255, 137, 92, 0.3)');
        duskOverlay.addColorStop(0.52, 'rgba(255, 186, 129, 0.19)');
        duskOverlay.addColorStop(1, 'rgba(255, 224, 182, 0.09)');
      } else if (isAutumnSeason) {
        duskOverlay.addColorStop(0, 'rgba(215, 118, 68, 0.36)');
        duskOverlay.addColorStop(0.55, 'rgba(238, 161, 97, 0.24)');
        duskOverlay.addColorStop(1, 'rgba(249, 210, 152, 0.11)');
      } else {
        duskOverlay.addColorStop(0, 'rgba(226, 135, 88, 0.3)');
        duskOverlay.addColorStop(0.55, 'rgba(244, 177, 120, 0.18)');
        duskOverlay.addColorStop(1, 'rgba(252, 220, 172, 0.09)');
      }
      ctx.fillStyle = duskOverlay;
      ctx.fillRect(0, 0, size.w, size.h);
    }

    const skyOverlay = ctx.createRadialGradient(size.w * 0.72, size.h * 0.16, 0, size.w * 0.72, size.h * 0.16, size.w * 0.7);
    skyOverlay.addColorStop(0, atmosphere.glowColor);
    skyOverlay.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = skyOverlay;
    ctx.fillRect(0, 0, size.w, size.h);

    ctx.fillStyle = atmosphere.skyOverlay;
    ctx.fillRect(0, 0, size.w, size.h);

    if (isAutumnSeason) {
      const topGlow = ctx.createRadialGradient(size.w * 0.5, size.h * 0.02, 0, size.w * 0.5, size.h * 0.02, size.w * 0.52);
      topGlow.addColorStop(0, withAlpha(autumnPalette.glowTop, 0.4 * glowStrength));
      topGlow.addColorStop(1, 'rgba(255, 217, 136, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, size.w, size.h);

      const edgeGlowLeft = ctx.createRadialGradient(size.w * 0.06, size.h * 0.24, 0, size.w * 0.06, size.h * 0.24, size.w * 0.36);
      edgeGlowLeft.addColorStop(0, withAlpha(autumnPalette.glowEdge, 0.24 * glowStrength));
      edgeGlowLeft.addColorStop(1, 'rgba(255, 190, 105, 0)');
      ctx.fillStyle = edgeGlowLeft;
      ctx.fillRect(0, 0, size.w, size.h);

      const edgeGlowRight = ctx.createRadialGradient(size.w * 0.94, size.h * 0.2, 0, size.w * 0.94, size.h * 0.2, size.w * 0.4);
      edgeGlowRight.addColorStop(0, withAlpha(autumnPalette.glowEdge, 0.2 * glowStrength));
      edgeGlowRight.addColorStop(1, 'rgba(255, 176, 88, 0)');
      ctx.fillStyle = edgeGlowRight;
      ctx.fillRect(0, 0, size.w, size.h);
    }

    // Far mountains (slowest parallax)
    drawMountains(ctx, size.w, size.h, scrollX * 0.1, theme, cameraZoom, atmosphere, isAutumnSeason, autumnPalette);

    // Mid hills
    drawHills(ctx, size.w, size.h, scrollX * 0.3, theme, cameraZoom, atmosphere, isAutumnSeason, autumnPalette);

    // Foreground grass
    drawGrass(ctx, size.w, size.h, scrollX * 0.5, theme, season, atmosphere, isAutumnSeason, autumnPalette);

    if (isAutumnSeason) {
      drawAutumnTreeBand(ctx, size.w, size.h, scrollX * 0.55, cameraZoom, autumnPalette);
    }
  }, [atmosphere, autumnPalette, cameraZoom, colors, glowStrength, isAutumnSeason, isSummerSeason, isWinterSeason, scrollX, size, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: 0,
        width: size.w,
        height: size.h,
        zIndex: 0,
      }}
    />
  );
}

function drawMountains(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  offset: number,
  theme: TimeTheme,
  cameraZoom: number,
  atmosphere: WorldEcologyAtmosphere,
  isAutumnSeason: boolean,
  autumnPalette: AutumnPalette,
) {
  const baseY = h * 0.45;
  const extraLayers = Math.min(2, Math.max(0, Math.floor((cameraZoom - 1) / 0.12)));
  const layerCount = 2 + extraLayers;
  const mountainColors = isAutumnSeason
    ? [withAlpha(autumnPalette.mountainA, 0.42), withAlpha(autumnPalette.mountainB, 0.35)]
    : theme === 'night'
    ? ['rgba(26, 35, 126, 0.5)', 'rgba(40, 53, 147, 0.4)']
    : theme === 'dusk'
      ? ['rgba(188, 143, 143, 0.4)', 'rgba(200, 160, 140, 0.3)']
      : ['rgba(144, 202, 180, 0.35)', 'rgba(165, 214, 195, 0.25)'];

  for (let layer = 0; layer < layerCount; layer++) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    const layerOffset = offset * (1 + layer * 0.3);
    const layerHeightShift = Math.max(0, layer - 1) * 26;
    for (let x = 0; x <= w; x += 3) {
      const y = baseY + layer * 40 - layerHeightShift
        + Math.sin((x + layerOffset) * 0.003 + layer) * 60
        + Math.sin((x + layerOffset) * 0.007 + layer * 2) * 30
        + Math.sin((x + layerOffset) * 0.001) * 80;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const baseColor = mountainColors[Math.min(layer, mountainColors.length - 1)];
    const opacityBoost = layer > 1 ? 0.04 * (layer - 1) : 0;
    ctx.fillStyle = baseColor.replace(/0\.(\d+)\)/, (_m, d) => {
      const current = Number(`0.${d}`);
      return `${Math.min(0.65, current + opacityBoost).toFixed(2)})`;
    });
    ctx.fill();

    ctx.fillStyle = atmosphere.mountainTint;
    ctx.fill();
  }
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  offset: number,
  theme: TimeTheme,
  cameraZoom: number,
  atmosphere: WorldEcologyAtmosphere,
  isAutumnSeason: boolean,
  autumnPalette: AutumnPalette,
) {
  const baseY = h * 0.65;
  const color = isAutumnSeason
    ? withAlpha(autumnPalette.hill, 0.52)
    : theme === 'night'
    ? 'rgba(27, 38, 100, 0.6)'
    : theme === 'dusk'
      ? 'rgba(180, 160, 130, 0.5)'
      : 'rgba(120, 190, 140, 0.45)';

  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 2) {
    const y = baseY
      + Math.sin((x + offset) * 0.005) * 40
      + Math.sin((x + offset) * 0.012) * 20;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = atmosphere.hillTint;
  ctx.fill();

  // Grass tufts
  const grassColor = isAutumnSeason
    ? withAlpha(autumnPalette.grass, 0.52)
    : theme === 'night' ? 'rgba(30, 45, 100, 0.7)' : 'rgba(100, 170, 110, 0.5)';
  const tuftCount = Math.min(180, 30 + Math.round((cameraZoom - 1) * 26));
  for (let i = 0; i < tuftCount; i++) {
    const gx = ((i * 137 + offset * 0.5) % (w + 200)) - 100;
    const gy = baseY + Math.sin((gx + offset) * 0.005) * 40 + Math.sin((gx + offset) * 0.012) * 20 - 5;
    drawGrassTuft(ctx, gx, gy, grassColor);
  }
}

function drawGrassTuft(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 3, y);
    ctx.quadraticCurveTo(x + i * 5, y - 15, x + i * 6, y - 20);
    ctx.stroke();
  }
}

function drawGrass(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  offset: number,
  theme: TimeTheme,
  season: SeasonType,
  atmosphere: WorldEcologyAtmosphere,
  isAutumnSeason: boolean,
  autumnPalette: AutumnPalette,
) {
  const baseY = h * 0.78;
  const grassGrad = ctx.createLinearGradient(0, baseY, 0, h);

  if (isAutumnSeason) {
    grassGrad.addColorStop(0, withAlpha(autumnPalette.grassLight, 0.7));
    grassGrad.addColorStop(1, withAlpha(autumnPalette.grassDeep, 0.9));
  } else if (theme === 'night') {
    grassGrad.addColorStop(0, 'rgba(20, 35, 80, 0.8)');
    grassGrad.addColorStop(1, 'rgba(15, 25, 60, 0.95)');
  } else if (theme === 'dusk') {
    if (season === 'spring' || season === 'summer') {
      grassGrad.addColorStop(0, 'rgba(108, 156, 118, 0.72)');
      grassGrad.addColorStop(1, 'rgba(82, 130, 96, 0.86)');
    } else {
      grassGrad.addColorStop(0, 'rgba(150, 140, 100, 0.7)');
      grassGrad.addColorStop(1, 'rgba(130, 120, 80, 0.85)');
    }
  } else {
    grassGrad.addColorStop(0, 'rgba(100, 180, 110, 0.65)');
    grassGrad.addColorStop(1, 'rgba(80, 155, 90, 0.8)');
  }

  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 2) {
    const y = baseY
      + Math.sin((x + offset) * 0.008) * 15
      + Math.sin((x + offset) * 0.02) * 8;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = grassGrad;
  ctx.fill();

  ctx.fillStyle = atmosphere.grassTint;
  ctx.fill();
}

function drawAutumnTreeBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  offset: number,
  cameraZoom: number,
  autumnPalette: AutumnPalette,
) {
  const trunkColors = [autumnPalette.trunkA, autumnPalette.trunkB, autumnPalette.trunkC];
  const canopyColors = [autumnPalette.canopyA, autumnPalette.canopyB, autumnPalette.canopyC, autumnPalette.canopyD];
  const treeCount = 16 + Math.min(10, Math.round((cameraZoom - 1) * 12));
  const bandY = h * 0.76;

  for (let i = 0; i < treeCount; i++) {
    const x = ((i * 153 + offset * 0.65) % (w + 240)) - 120;
    const trunkH = 28 + (i % 4) * 6;
    const trunkW = 6 + (i % 3) * 1.5;
    const y = bandY + Math.sin((x + offset) * 0.007) * 8;

    ctx.fillStyle = trunkColors[i % trunkColors.length];
    ctx.fillRect(x - trunkW * 0.5, y - trunkH, trunkW, trunkH + 6);

    const crownR = 14 + (i % 5) * 2.6;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = canopyColors[i % canopyColors.length];
    ctx.beginPath();
    ctx.arc(x, y - trunkH - 6, crownR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.72;
    ctx.fillStyle = canopyColors[(i + 2) % canopyColors.length];
    ctx.beginPath();
    ctx.arc(x - crownR * 0.45, y - trunkH - 2, crownR * 0.72, 0, Math.PI * 2);
    ctx.arc(x + crownR * 0.45, y - trunkH - 1, crownR * 0.68, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

interface AutumnPalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  glowTop: string;
  glowEdge: string;
  mountainA: string;
  mountainB: string;
  hill: string;
  grass: string;
  grassLight: string;
  grassDeep: string;
  trunkA: string;
  trunkB: string;
  trunkC: string;
  canopyA: string;
  canopyB: string;
  canopyC: string;
  canopyD: string;
}

function getAutumnPalette(theme: TimeTheme): AutumnPalette {
  if (theme === 'dawn') {
    return {
      skyTop: '#FDE2B2',
      skyMid: '#EAB978',
      skyBottom: '#A06A3E',
      glowTop: 'rgb(255, 214, 150)',
      glowEdge: 'rgb(255, 187, 120)',
      mountainA: 'rgb(163, 108, 62)',
      mountainB: 'rgb(190, 132, 76)',
      hill: 'rgb(176, 116, 69)',
      grass: 'rgb(168, 106, 58)',
      grassLight: 'rgb(186, 133, 78)',
      grassDeep: 'rgb(137, 95, 55)',
      trunkA: '#865833',
      trunkB: '#906038',
      trunkC: '#734924',
      canopyA: '#E8AF53',
      canopyB: '#D78637',
      canopyC: '#C1583B',
      canopyD: '#A7773D',
    };
  }

  if (theme === 'day') {
    return {
      skyTop: '#F7D089',
      skyMid: '#E7A65A',
      skyBottom: '#8E5A31',
      glowTop: 'rgb(255, 217, 136)',
      glowEdge: 'rgb(255, 186, 101)',
      mountainA: 'rgb(138, 88, 46)',
      mountainB: 'rgb(168, 114, 64)',
      hill: 'rgb(159, 104, 58)',
      grass: 'rgb(163, 104, 50)',
      grassLight: 'rgb(172, 122, 66)',
      grassDeep: 'rgb(124, 84, 46)',
      trunkA: '#805431',
      trunkB: '#8A5A33',
      trunkC: '#714526',
      canopyA: '#E0A040',
      canopyB: '#CF7A2D',
      canopyC: '#B64833',
      canopyD: '#9D6B35',
    };
  }

  if (theme === 'dusk') {
    return {
      skyTop: '#F2B46D',
      skyMid: '#C9793E',
      skyBottom: '#673A24',
      glowTop: 'rgb(255, 182, 105)',
      glowEdge: 'rgb(244, 141, 79)',
      mountainA: 'rgb(120, 72, 44)',
      mountainB: 'rgb(148, 92, 56)',
      hill: 'rgb(136, 82, 50)',
      grass: 'rgb(136, 84, 48)',
      grassLight: 'rgb(152, 98, 58)',
      grassDeep: 'rgb(102, 64, 40)',
      trunkA: '#72472B',
      trunkB: '#7E4D2D',
      trunkC: '#64391F',
      canopyA: '#D4893A',
      canopyB: '#BA662E',
      canopyC: '#9F3E31',
      canopyD: '#8B5A2E',
    };
  }

  return {
    skyTop: '#6F4A3A',
    skyMid: '#4A2F2C',
    skyBottom: '#241A22',
    glowTop: 'rgb(199, 139, 87)',
    glowEdge: 'rgb(161, 96, 66)',
    mountainA: 'rgb(92, 58, 45)',
    mountainB: 'rgb(110, 70, 52)',
    hill: 'rgb(101, 62, 49)',
    grass: 'rgb(97, 61, 44)',
    grassLight: 'rgb(115, 76, 55)',
    grassDeep: 'rgb(66, 44, 39)',
    trunkA: '#5D3B25',
    trunkB: '#67422A',
    trunkC: '#50311F',
    canopyA: '#B97937',
    canopyB: '#9F5E2D',
    canopyC: '#8A3730',
    canopyD: '#6E4B2A',
  };
}

function withAlpha(rgb: string, alpha: number): string {
  return rgb.replace('rgb(', 'rgba(').replace(')', `, ${Math.max(0, Math.min(1, alpha))})`);
}
