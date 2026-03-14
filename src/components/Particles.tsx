import { useEffect, useRef } from 'react';
import { ThemeColors } from '@/hooks/useTimeTheme';
import { WorldEcologyAtmosphere } from '@/lib/worldEcology';

export type WeatherType = 'sunny' | 'rain' | 'snow';

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
}

interface Props {
  colors: ThemeColors;
  weather: WeatherType;
  emissionRateMultiplier?: number;
  atmosphere: WorldEcologyAtmosphere;
}

export default function Particles({ colors, weather, emissionRateMultiplier = 1, atmosphere }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const count = getParticleCount(colors.particleType, weather, emissionRateMultiplier);
    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(canvas.width, canvas.height, colors.particleType, weather, atmosphere)
    );

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
          Object.assign(p, createParticle(canvas.width, canvas.height, colors.particleType, weather, atmosphere));
          p.y = -10 - Math.random() * 40;
          if (weather === 'rain') p.x = Math.random() * canvas.width;
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
          ctx.strokeStyle = `rgba(180, 200, 220, ${p.opacity * 0.6})`;
          ctx.lineWidth = p.size * 0.4;
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
          p.x += Math.sin(p.phase * 0.5) * 0.3;
          ctx.globalAlpha = p.opacity * 0.85;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          // Soft white with slight blue tint
          const brightness = 240 + Math.floor(Math.random() * 15);
          ctx.fillStyle = `rgba(${brightness}, ${brightness}, 255, 0.9)`;
          ctx.shadowColor = 'rgba(200, 210, 240, 0.4)';
          ctx.shadowBlur = p.size * 2;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
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

      animRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [atmosphere, colors, emissionRateMultiplier, weather]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 30,
      }}
    />
  );
}

function getParticleCount(type: string, weather: WeatherType, emissionRateMultiplier: number): number {
  const base = weather === 'rain' ? 120 : weather === 'snow' ? 60 : type === 'firefly' ? 25 : 20;
  return Math.max(8, Math.round(base * Math.max(0.5, emissionRateMultiplier)));
}

function createParticle(
  w: number,
  h: number,
  type: string,
  weather: WeatherType,
  atmosphere: WorldEcologyAtmosphere,
): Particle {
  if (weather === 'rain') {
    return {
      x: Math.random() * w,
      y: -10 - Math.random() * h,
      size: 1 + Math.random() * 1.5,
      speedX: -1 - Math.random() * 0.5,
      speedY: 10 + Math.random() * 8,
      opacity: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      hue: 210,
      length: 8 + Math.random() * 14,
    };
  }

  if (weather === 'snow') {
    return {
      x: Math.random() * w,
      y: -10 - Math.random() * 100,
      size: 1.5 + Math.random() * 3.5,
      speedX: (Math.random() - 0.5) * 0.6,
      speedY: 0.4 + Math.random() * 1.2,
      opacity: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      hue: 0,
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
