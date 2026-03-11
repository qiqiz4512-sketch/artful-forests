import { useEffect, useRef } from 'react';
import { ThemeColors } from '@/hooks/useTimeTheme';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  phase: number;
  hue: number;
}

interface Props {
  colors: ThemeColors;
}

export default function Particles({ colors }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const count = colors.particleType === 'firefly' ? 25 : 20;
    particlesRef.current = Array.from({ length: count }, () => createParticle(canvas.width, canvas.height, colors.particleType));

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.phase += 0.02;

        if (p.y > canvas.height + 20 || p.x > canvas.width + 20 || p.x < -20) {
          Object.assign(p, createParticle(canvas.width, canvas.height, colors.particleType));
          p.y = -10;
        }

        if (colors.particleType === 'firefly') {
          const glow = 0.3 + Math.sin(p.phase) * 0.7;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 245, 157, ${glow * p.opacity})`;
          ctx.shadowColor = 'rgba(255, 245, 157, 0.8)';
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.globalAlpha = p.opacity * (0.5 + Math.sin(p.phase) * 0.3);
          ctx.beginPath();
          // Draw petal shape
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.phase);
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 60%, 80%, 0.7)`;
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      });
      animRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [colors]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 30 }}
    />
  );
}

function createParticle(w: number, h: number, type: string): Particle {
  return {
    x: Math.random() * w,
    y: type === 'firefly' ? Math.random() * h : -10 - Math.random() * 100,
    size: type === 'firefly' ? 2 + Math.random() * 3 : 3 + Math.random() * 4,
    speedX: type === 'firefly' ? (Math.random() - 0.5) * 0.5 : 0.3 + Math.random() * 0.5,
    speedY: type === 'firefly' ? (Math.random() - 0.5) * 0.3 : 0.5 + Math.random() * 1,
    opacity: 0.4 + Math.random() * 0.6,
    phase: Math.random() * Math.PI * 2,
    hue: type === 'firefly' ? 54 : [340, 330, 15, 120][Math.floor(Math.random() * 4)],
  };
}
