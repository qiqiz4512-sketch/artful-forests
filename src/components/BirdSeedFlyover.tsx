import { useEffect, useRef, useState } from 'react';

type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

interface Props {
  season: SeasonType;
}

type BirdStyle = 'blue' | 'pink' | 'yellow' | 'green';

interface BirdFlight {
  id: number;
  direction: 'ltr' | 'rtl';
  top: number;
  duration: number;
  size: number;
  seedCount: number;
  seedStart: number;
  style: BirdStyle;
}

export default function BirdSeedFlyover({ season }: Props) {
  const active = season === 'spring' || season === 'summer';
  const [flights, setFlights] = useState<BirdFlight[]>([]);
  const timeoutsRef = useRef<number[]>([]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    const clearAllTimers = () => {
      timeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
      timeoutsRef.current = [];
    };

    if (!active) {
      setFlights([]);
      clearAllTimers();
      return;
    }

    const scheduleBird = () => {
      const id = nextIdRef.current++;
      const duration = 7.2 + Math.random() * 2.8;
      const flight: BirdFlight = {
        id,
        direction: Math.random() < 0.5 ? 'ltr' : 'rtl',
        top: 6 + Math.random() * 18,
        duration,
        size: 82 + Math.random() * 28,
        seedCount: 3 + Math.floor(Math.random() * 3),
        seedStart: 1.4 + Math.random() * 1.1,
        style: pickBirdStyle(season),
      };

      setFlights((current) => [...current, flight]);

      const removeTimer = window.setTimeout(() => {
        setFlights((current) => current.filter((item) => item.id !== id));
      }, duration * 1000 + 1200);
      timeoutsRef.current.push(removeTimer);

      const gap = 2200 + Math.random() * 1800;
      const nextTimer = window.setTimeout(scheduleBird, gap);
      timeoutsRef.current.push(nextTimer);
    };

    const initialTimer = window.setTimeout(scheduleBird, 1000);
    timeoutsRef.current.push(initialTimer);

    return () => {
      clearAllTimers();
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="season-bird-layer" aria-hidden="true">
      {flights.map((flight) => (
        <div
          key={flight.id}
          className={`season-bird season-bird--${flight.direction}`}
          style={{
            top: `${flight.top}%`,
            animationDuration: `${flight.duration}s`,
            ['--bird-size' as string]: `${flight.size}px`,
          }}
        >
          <HandPaintBird styleType={flight.style} />
          <div className="season-bird-seeds">
            {Array.from({ length: flight.seedCount }, (_, index) => {
              const jitter = (index - (flight.seedCount - 1) / 2) * 8;
              return (
                <span
                  key={`${flight.id}-seed-${index}`}
                  className="season-bird-seed"
                  style={{
                    left: `${16 + jitter}px`,
                    animationDelay: `${flight.seedStart + index * 0.2}s`,
                    ['--seed-drift' as string]: `${3 + index * 2}px`,
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function pickBirdStyle(_season: SeasonType): BirdStyle {
  return 'yellow';
}

function HandPaintBird({ styleType }: { styleType: BirdStyle }) {
  if (styleType === 'pink') {
    return (
      <svg className="season-bird-svg" viewBox="0 0 120 92" role="presentation" focusable="false">
        <ellipse cx="56" cy="50" rx="35" ry="25" fill="#f8b9da" />
        <ellipse cx="80" cy="43" rx="16" ry="14" fill="#fbc3e2" />
        <path d="M91 41 L108 46 L92 53 Z" fill="#f4ae33" />
        <ellipse cx="84" cy="43" rx="4.1" ry="4.1" fill="#151517" />
        <ellipse cx="73" cy="51" rx="7.4" ry="6.8" fill="#f6a9ca" opacity="0.88" />
        <path d="M34 49 C20 38 18 24 28 18 C40 12 53 23 56 36 C52 40 45 45 34 49 Z" fill="#f58bc2" />
        <path d="M48 46 C35 34 35 19 45 14 C57 9 67 21 68 34 C62 39 56 43 48 46 Z" fill="#f17bb8" />
        <path d="M23 59 C13 60 8 66 9 73 C18 71 25 69 32 64 Z" fill="#ef80bb" />
        <circle cx="101" cy="49" r="5.2" fill="#d53244" />
        <circle cx="106" cy="54" r="5" fill="#e83b4f" />
        <circle cx="99" cy="56" r="4.6" fill="#c9293c" />
        <line x1="95" y1="46" x2="89" y2="44" stroke="#554329" strokeWidth="2" strokeLinecap="round" />
        <line x1="57" y1="73" x2="53" y2="84" stroke="#202022" strokeWidth="2.7" strokeLinecap="round" />
        <line x1="66" y1="73" x2="70" y2="84" stroke="#202022" strokeWidth="2.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (styleType === 'yellow') {
    return (
      <svg className="season-bird-svg" viewBox="0 0 120 92" role="presentation" focusable="false">
        <ellipse cx="56" cy="49" rx="34" ry="25" fill="#f6e06d" />
        <ellipse cx="80" cy="41" rx="16" ry="14" fill="#f8e87d" />
        <path d="M91 39 L108 45 L92 52 Z" fill="#f48b43" />
        <ellipse cx="84" cy="41" rx="4.1" ry="4.1" fill="#151517" />
        <ellipse cx="74" cy="50" rx="8" ry="7" fill="#ffcf9f" opacity="0.9" />
        <path d="M34 49 C20 38 18 24 28 18 C40 12 53 23 56 36 C52 40 45 45 34 49 Z" fill="#f5cc55" />
        <path d="M48 46 C35 34 35 19 45 14 C57 9 67 21 68 34 C62 39 56 43 48 46 Z" fill="#f2c149" />
        <path d="M23 59 C13 60 8 66 9 73 C18 71 25 69 32 64 Z" fill="#eebc3f" />
        <path d="M98 45 C102 42 106 39 110 37" stroke="#5ea343" strokeWidth="2.4" strokeLinecap="round" />
        <ellipse cx="111" cy="36" rx="4.8" ry="2.8" transform="rotate(-26 111 36)" fill="#65b547" />
        <line x1="57" y1="73" x2="53" y2="84" stroke="#202022" strokeWidth="2.7" strokeLinecap="round" />
        <line x1="66" y1="73" x2="70" y2="84" stroke="#202022" strokeWidth="2.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (styleType === 'green') {
    return (
      <svg className="season-bird-svg" viewBox="0 0 120 92" role="presentation" focusable="false">
        <ellipse cx="56" cy="49" rx="34" ry="25" fill="#b9df6f" />
        <ellipse cx="80" cy="41" rx="16" ry="14" fill="#c5e984" />
        <path d="M91 39 L108 45 L92 52 Z" fill="#ef8f45" />
        <ellipse cx="84" cy="41" rx="4.1" ry="4.1" fill="#151517" />
        <ellipse cx="74" cy="50" rx="8" ry="7" fill="#f3be9a" opacity="0.86" />
        <path d="M34 49 C20 38 18 24 28 18 C40 12 53 23 56 36 C52 40 45 45 34 49 Z" fill="#76c772" />
        <path d="M48 46 C35 34 35 19 45 14 C57 9 67 21 68 34 C62 39 56 43 48 46 Z" fill="#63b862" />
        <path d="M23 59 C13 60 8 66 9 73 C18 71 25 69 32 64 Z" fill="#57ae57" />
        <line x1="96" y1="46" x2="108" y2="32" stroke="#8e633a" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="57" y1="73" x2="53" y2="84" stroke="#202022" strokeWidth="2.7" strokeLinecap="round" />
        <line x1="66" y1="73" x2="70" y2="84" stroke="#202022" strokeWidth="2.7" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className="season-bird-svg" viewBox="0 0 120 92" role="presentation" focusable="false">
      <ellipse cx="56" cy="49" rx="34" ry="25" fill="#43c8ef" />
      <ellipse cx="80" cy="41" rx="16" ry="14" fill="#46d0f6" />
      <path d="M91 39 L108 45 L92 52 Z" fill="#ff7a7a" />
      <ellipse cx="84" cy="41" rx="4.1" ry="4.1" fill="#151517" />
      <ellipse cx="74" cy="50" rx="8" ry="7" fill="#ffd2df" opacity="0.9" />
      <path d="M34 49 C20 38 18 24 28 18 C40 12 53 23 56 36 C52 40 45 45 34 49 Z" fill="#2a8fe9" />
      <path d="M48 46 C35 34 35 19 45 14 C57 9 67 21 68 34 C62 39 56 43 48 46 Z" fill="#247fdf" />
      <path d="M23 59 C13 60 8 66 9 73 C18 71 25 69 32 64 Z" fill="#2f93eb" />
      <line x1="57" y1="73" x2="53" y2="84" stroke="#202022" strokeWidth="2.7" strokeLinecap="round" />
      <line x1="66" y1="73" x2="70" y2="84" stroke="#202022" strokeWidth="2.7" strokeLinecap="round" />
      <line x1="53" y1="84" x2="48" y2="88" stroke="#202022" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="53" y1="84" x2="58" y2="88" stroke="#202022" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="70" y1="84" x2="65" y2="88" stroke="#202022" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="70" y1="84" x2="75" y2="88" stroke="#202022" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
