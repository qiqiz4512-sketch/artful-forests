import { useRef, useEffect, useState } from 'react';
import { ThemeColors, TimeTheme } from '@/hooks/useTimeTheme';
import { WorldEcologyAtmosphere } from '@/lib/worldEcology';

interface Props {
  theme: TimeTheme;
  colors: ThemeColors;
  scrollX: number;
  cameraZoom: number;
  atmosphere: WorldEcologyAtmosphere;
}

export default function ParallaxBackground({ colors, scrollX, theme, cameraZoom, atmosphere }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

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
    skyGrad.addColorStop(0, colors.gradientStart);
    skyGrad.addColorStop(1, colors.gradientEnd);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, size.w, size.h);

    const skyOverlay = ctx.createRadialGradient(size.w * 0.72, size.h * 0.16, 0, size.w * 0.72, size.h * 0.16, size.w * 0.7);
    skyOverlay.addColorStop(0, atmosphere.glowColor);
    skyOverlay.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = skyOverlay;
    ctx.fillRect(0, 0, size.w, size.h);

    ctx.fillStyle = atmosphere.skyOverlay;
    ctx.fillRect(0, 0, size.w, size.h);

    // Far mountains (slowest parallax)
    drawMountains(ctx, size.w, size.h, scrollX * 0.1, theme, cameraZoom, atmosphere);

    // Mid hills
    drawHills(ctx, size.w, size.h, scrollX * 0.3, theme, cameraZoom, atmosphere);

    // Foreground grass
    drawGrass(ctx, size.w, size.h, scrollX * 0.5, theme, atmosphere);
  }, [atmosphere, cameraZoom, colors, scrollX, size, theme]);

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
) {
  const baseY = h * 0.45;
  const extraLayers = Math.min(2, Math.max(0, Math.floor((cameraZoom - 1) / 0.12)));
  const layerCount = 2 + extraLayers;
  const mountainColors = theme === 'night'
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
) {
  const baseY = h * 0.65;
  const color = theme === 'night'
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
  const grassColor = theme === 'night' ? 'rgba(30, 45, 100, 0.7)' : 'rgba(100, 170, 110, 0.5)';
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
  atmosphere: WorldEcologyAtmosphere,
) {
  const baseY = h * 0.78;
  const grassGrad = ctx.createLinearGradient(0, baseY, 0, h);

  if (theme === 'night') {
    grassGrad.addColorStop(0, 'rgba(20, 35, 80, 0.8)');
    grassGrad.addColorStop(1, 'rgba(15, 25, 60, 0.95)');
  } else if (theme === 'dusk') {
    grassGrad.addColorStop(0, 'rgba(150, 140, 100, 0.7)');
    grassGrad.addColorStop(1, 'rgba(130, 120, 80, 0.85)');
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
