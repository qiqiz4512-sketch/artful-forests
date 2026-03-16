import { useEffect, useRef } from 'react';
import { ThemeColors } from '@/hooks/useTimeTheme';
import { WorldEcologyAtmosphere } from '@/lib/worldEcology';

export type WeatherType = 'sunny' | 'rain' | 'snow';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
type AutumnLeafShape = 'maple' | 'oak' | 'ginkgo';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  phase: number;
  hue: number;
  length?: number; // for rain streaks
  spin?: number;
  sway?: number;
  leafShape?: AutumnLeafShape;
  leafColor?: string;
}

interface Props {
  colors: ThemeColors;
  weather: WeatherType;
  season: SeasonType;
  emissionRateMultiplier?: number;
  atmosphere: WorldEcologyAtmosphere;
}

export default function Particles({ colors, weather, season, emissionRateMultiplier = 1, atmosphere }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const emissionMulRef = useRef(emissionRateMultiplier);
  emissionMulRef.current = emissionRateMultiplier;
  const autumnSunny = season === 'autumn' && weather === 'sunny';
  const noPetalSeason = (season === 'summer' || season === 'winter') && weather === 'sunny' && colors.particleType === 'petal';

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const count = getParticleCount(colors.particleType, weather, emissionMulRef.current, autumnSunny, noPetalSeason);
    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(canvas.width, canvas.height, colors.particleType, weather, atmosphere, autumnSunny, noPetalSeason)
    );
    if (weather === 'snow') {
      particlesRef.current.forEach((p) => {
        p.y = Math.random() * canvas.height;
      });
    }

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Rain overlay tint
      if (weather === 'rain') {
        ctx.fillStyle = atmosphere.rainTint;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      particlesRef.current.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.phase += 0.02;

        // Reset when out of bounds
        if (p.y > canvas.height + 30 || p.x > canvas.width + 30 || p.x < -30) {
          Object.assign(p, createParticle(canvas.width, canvas.height, colors.particleType, weather, atmosphere, autumnSunny, noPetalSeason));
          p.y = -10 - Math.random() * 40;
          if (weather === 'rain') p.x = Math.random() * canvas.width;
        }

        if (autumnSunny) {
          p.x += Math.sin(p.phase * 0.75) * (p.sway ?? 0.3);
        }

        // Firefly (night, non-weather)
        if (colors.particleType === 'firefly' && weather === 'sunny') {
          const glow = 0.3 + Math.sin(p.phase) * 0.7;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${atmosphere.fireflyHue}, 88%, 76%, ${glow * p.opacity})`;
          ctx.shadowColor = `hsla(${atmosphere.fireflyHue}, 92%, 72%, 0.8)`;
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.shadowBlur = 0;
          return;
        }

        // Rain
        if (weather === 'rain') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.speedX * 2, p.y + (p.length || 12));
          ctx.strokeStyle = `rgba(178, 208, 255, ${Math.min(0.82, p.opacity * 0.82)})`;
          ctx.lineWidth = Math.max(0.8, p.size * 0.72);
          ctx.lineCap = 'round';
          ctx.stroke();

          // Splash at bottom
          if (p.y > canvas.height - 30 && Math.random() < 0.03) {
            ctx.beginPath();
            ctx.arc(p.x, canvas.height - 5, 2, 0, Math.PI, true);
            ctx.strokeStyle = `rgba(180, 200, 220, 0.3)`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
          return;
        }

        // Snow
        if (weather === 'snow') {
          // Gentle horizontal drift
          p.x += Math.sin(p.phase * 0.3) * 0.18;
          ctx.globalAlpha = p.opacity * 0.9;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.phase);
          ctx.strokeStyle = 'rgba(220, 235, 255, 0.95)';
          ctx.lineWidth = p.size * 0.18;
          ctx.shadowColor = 'rgba(180, 210, 255, 0.5)';
          ctx.shadowBlur = p.size * 1.5;
          const r = p.size;
          // 6 main arms
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const ax = Math.cos(angle) * r;
            const ay = Math.sin(angle) * r;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(ax, ay);
            ctx.stroke();
            // two side branches per arm
            const bLen = r * 0.42;
            const bAngle = Math.PI / 5;
            for (const sign of [-1, 1]) {
              const bx = Math.cos(angle + sign * bAngle) * bLen;
              const by = Math.sin(angle + sign * bAngle) * bLen;
              ctx.beginPath();
              ctx.moveTo(ax * 0.5, ay * 0.5);
              ctx.lineTo(ax * 0.5 + bx, ay * 0.5 + by);
              ctx.stroke();
            }
          }
          // center dot
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.15, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(220, 235, 255, 0.95)';
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
          ctx.globalAlpha = 1;
          return;
        }

        if (autumnSunny) {
          drawAutumnLeaf(ctx, p);
          return;
        }

        // Default: petals (sunny daytime)
        ctx.globalAlpha = p.opacity * (0.5 + Math.sin(p.phase) * 0.3);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.phase);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 60%, 80%, 0.7)`;
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      });

      // Dynamically adjust particle count without restarting animation
      const targetCount = getParticleCount(colors.particleType, weather, emissionMulRef.current, autumnSunny, noPetalSeason);
      if (particlesRef.current.length < targetCount) {
        particlesRef.current.push(
          createParticle(canvas.width, canvas.height, colors.particleType, weather, atmosphere, autumnSunny, noPetalSeason)
        );
      } else if (particlesRef.current.length > targetCount) {
        particlesRef.current.pop();
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [atmosphere, autumnSunny, colors, noPetalSeason, season, weather]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 8,
      }}
    />
  );
}

function getParticleCount(type: string, weather: WeatherType, emissionRateMultiplier: number, autumnSunny: boolean, noPetalSeason: boolean): number {
  if (noPetalSeason) return 0;
  const base = weather === 'rain' ? 140 : weather === 'snow' ? 80 : autumnSunny ? 30 : type === 'firefly' ? 25 : 20;
  return Math.max(8, Math.round(base * Math.max(0.5, emissionRateMultiplier)));
}

function createParticle(
  w: number,
  h: number,
  type: string,
  weather: WeatherType,
  atmosphere: WorldEcologyAtmosphere,
  autumnSunny: boolean,
  noPetalSeason: boolean,
): Particle {
  if (noPetalSeason) {
    return {
      x: -1000,
      y: -1000,
      size: 0,
      speedX: 0,
      speedY: 0,
      opacity: 0,
      phase: 0,
      hue: 0,
    };
  }

  if (weather === 'rain') {
    return {
      x: Math.random() * w,
      y: -10 - Math.random() * h,
      size: 1 + Math.random() * 1.6,
      speedX: -1 - Math.random() * 0.5,
      speedY: 10 + Math.random() * 6,
      opacity: 0.42 + Math.random() * 0.36,
      phase: Math.random() * Math.PI * 2,
      hue: 210,
      length: 10 + Math.random() * 14,
    };
  }

  if (weather === 'snow') {
    return {
      x: Math.random() * w,
      y: -10 - Math.random() * 80,
      size: 2.2 + Math.random() * 4.2,
      speedX: (Math.random() - 0.5) * 0.4,
        speedY: 0.6 + Math.random() * 0.2,
      opacity: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      hue: 0,
    };
  }

  if (autumnSunny) {
    const leafShapes: AutumnLeafShape[] = ['maple', 'oak', 'ginkgo'];
    const leafColors = ['#E2A53B', '#CC7A2B', '#A6402C', '#9B713D'];
    return {
      x: Math.random() * w,
      y: -20 - Math.random() * 120,
      size: 5 + Math.random() * 6,
      speedX: (Math.random() - 0.5) * 0.9,
      speedY: 0.75 + Math.random() * 1.1,
      opacity: 0.58 + Math.random() * 0.32,
      phase: Math.random() * Math.PI * 2,
      hue: 32,
      spin: (Math.random() - 0.5) * 0.06,
      sway: 0.14 + Math.random() * 0.36,
      leafShape: leafShapes[Math.floor(Math.random() * leafShapes.length)],
      leafColor: leafColors[Math.floor(Math.random() * leafColors.length)],
    };
  }

  // Default (sunny): petals or fireflies
  return {
    x: Math.random() * w,
    y: type === 'firefly' ? Math.random() * h : -10 - Math.random() * 100,
    size: type === 'firefly' ? 2 + Math.random() * 3 : 3 + Math.random() * 4,
    speedX: type === 'firefly' ? (Math.random() - 0.5) * 0.5 : 0.3 + Math.random() * 0.5,
    speedY: type === 'firefly' ? (Math.random() - 0.5) * 0.3 : 0.5 + Math.random() * 1,
    opacity: 0.4 + Math.random() * 0.6,
    phase: Math.random() * Math.PI * 2,
    hue: type === 'firefly'
      ? atmosphere.fireflyHue
      : atmosphere.particleHues[Math.floor(Math.random() * atmosphere.particleHues.length)],
  };
}

function drawAutumnLeaf(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = Math.min(0.9, p.opacity * (0.72 + Math.sin(p.phase * 0.8) * 0.22));
  ctx.translate(p.x, p.y);
  ctx.rotate(p.phase + (p.spin ?? 0));
  ctx.fillStyle = p.leafColor || '#CC7A2B';
  ctx.strokeStyle = 'rgba(90, 58, 34, 0.45)';
  ctx.lineWidth = 0.9;

  const size = p.size;
  const shape = p.leafShape || 'oak';

  if (shape === 'ginkgo') {
    ctx.beginPath();
    ctx.moveTo(0, size * 0.2);
    ctx.quadraticCurveTo(size * 1.1, 0, size * 0.8, -size * 0.8);
    ctx.quadraticCurveTo(0, -size * 1.3, -size * 0.8, -size * 0.8);
    ctx.quadraticCurveTo(-size * 1.1, 0, 0, size * 0.2);
    ctx.closePath();
  } else if (shape === 'maple') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.2);
    ctx.lineTo(size * 0.28, -size * 0.45);
    ctx.lineTo(size * 0.9, -size * 0.7);
    ctx.lineTo(size * 0.48, -size * 0.12);
    ctx.lineTo(size * 1.08, size * 0.25);
    ctx.lineTo(size * 0.32, size * 0.28);
    ctx.lineTo(0, size * 1.05);
    ctx.lineTo(-size * 0.32, size * 0.28);
    ctx.lineTo(-size * 1.08, size * 0.25);
    ctx.lineTo(-size * 0.48, -size * 0.12);
    ctx.lineTo(-size * 0.9, -size * 0.7);
    ctx.lineTo(-size * 0.28, -size * 0.45);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.05);
    ctx.bezierCurveTo(size * 0.92, -size * 0.88, size * 0.95, -size * 0.08, size * 0.28, size * 0.24);
    ctx.bezierCurveTo(size * 0.82, size * 0.45, size * 0.7, size * 1.05, 0, size * 1.08);
    ctx.bezierCurveTo(-size * 0.7, size * 1.05, -size * 0.82, size * 0.45, -size * 0.28, size * 0.24);
    ctx.bezierCurveTo(-size * 0.95, -size * 0.08, -size * 0.92, -size * 0.88, 0, -size * 1.05);
    ctx.closePath();
  }

  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -size * 0.86);
  ctx.lineTo(0, size * 0.88);
  ctx.strokeStyle = 'rgba(85, 52, 30, 0.42)';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.restore();
  ctx.globalAlpha = 1;
}
