import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { SceneInteractionEvent } from '@/types/forest';

type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
type BirdStyle = 'blue' | 'pink' | 'yellow' | 'green';

interface SceneTree {
  id: string;
  x: number;
  y: number;
  size: number;
}

interface Props {
  season: SeasonType;
  trees: SceneTree[];
  interactionEvent?: SceneInteractionEvent | null;
}

interface BirdSpot {
  key: string;
  treeId: string;
  x: number;
  y: number;
  scale: number;
  facing: 'left' | 'right';
  delay: number;
  style: BirdStyle;
  scatterX: number;
  scatterY: number;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export default function TreePerchedBirds({ season, trees, interactionEvent = null }: Props) {
  const [scatterToken, setScatterToken] = useState<number | null>(null);

  useEffect(() => {
    if (!interactionEvent || interactionEvent.phase !== 'trigger') return;
    setScatterToken(interactionEvent.token);
    const timer = window.setTimeout(() => setScatterToken((current) => (current === interactionEvent.token ? null : current)), 1700);
    return () => window.clearTimeout(timer);
  }, [interactionEvent]);

  if (season !== 'spring' && season !== 'summer') return null;

  const visibleSpots = useMemo(() => {
    const spots: BirdSpot[] = [];
    for (const tree of trees) {
      const hash = hashString(tree.id);
      const chance = (hash % 1000) / 1000;
      if (chance > 0.02) continue;

      const side = ((hash >> 3) % 2) === 0 ? -1 : 1;
      const topLift = 0.18 + (((hash >> 5) % 12) / 100);
      const xOffsetRatio = 0.08 + (((hash >> 7) % 16) / 100);
      const scale = 0.72 + (((hash >> 9) % 20) / 100);
      const styleRoll = (hash >> 13) % 2;
      const style: BirdStyle = season === 'spring'
        ? styleRoll === 0 ? 'pink' : 'yellow'
        : styleRoll === 0 ? 'blue' : 'green';

      spots.push({
        key: `perch-${tree.id}`,
        treeId: tree.id,
        x: tree.x + tree.size * (0.5 + side * xOffsetRatio),
        y: tree.y + tree.size * topLift,
        scale,
        facing: side < 0 ? 'left' : 'right',
        delay: ((hash >> 11) % 1600) / 1000,
        style,
        scatterX: side * (22 + ((hash >> 15) % 36)),
        scatterY: -30 - ((hash >> 17) % 24),
      });
    }

    return spots.slice(0, 16);
  }, [season, trees]);

  const targetTree = interactionEvent ? trees.find((tree) => tree.id === interactionEvent.targetTreeId) : null;

  return (
    <div className="tree-perched-birds" aria-hidden="true">
      {visibleSpots.map((spot) => {
        const isTriggered = Boolean(scatterToken && interactionEvent?.phase === 'trigger' && targetTree);
        const distance = targetTree
          ? Math.hypot((spot.x - targetTree.x), (spot.y - targetTree.y))
          : Number.POSITIVE_INFINITY;
        const shouldScatter = isTriggered && distance < 220;

        return (
        <motion.span
          key={spot.key}
          className="tree-perched-bird"
          initial={false}
          animate={shouldScatter
            ? {
                x: [0, spot.scatterX * 0.35, spot.scatterX],
                y: [0, spot.scatterY * 0.45, spot.scatterY],
                scale: [spot.scale, spot.scale * 1.08, spot.scale * 0.94],
                rotate: [0, spot.facing === 'left' ? -14 : 14, spot.facing === 'left' ? -20 : 20],
                opacity: [1, 1, 0],
              }
            : {
                x: 0,
                y: [0, -1.5, 0],
                scale: spot.scale,
                rotate: [0, spot.facing === 'left' ? -1.5 : 1.5, 0],
                opacity: 1,
              }}
          transition={shouldScatter
            ? { duration: 1.35, ease: 'easeOut' }
            : { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: spot.delay }}
          style={{
            left: `${spot.x}px`,
            top: `${spot.y}px`,
            transform: `translate(-50%, -50%) scale(${spot.facing === 'left' ? -spot.scale : spot.scale}, ${spot.scale})`,
            animationDelay: `${spot.delay}s`,
          }}
        >
          <PerchedBirdSvg styleType={spot.style} />
        </motion.span>
      );})}
    </div>
  );
}

function PerchedBirdSvg({ styleType }: { styleType: BirdStyle }) {
  const body = styleType === 'pink'
    ? '#f8bddc'
    : styleType === 'yellow'
      ? '#f6e171'
      : styleType === 'green'
        ? '#b9df6f'
        : '#4bc6f2';
  const head = styleType === 'pink'
    ? '#fbc8e4'
    : styleType === 'yellow'
      ? '#f8e983'
      : styleType === 'green'
        ? '#c8e886'
        : '#5ad2fb';
  const wing = styleType === 'pink'
    ? '#f08bbc'
    : styleType === 'yellow'
      ? '#f2c149'
      : styleType === 'green'
        ? '#66ba64'
        : '#2f95ea';
  const beak = styleType === 'blue' ? '#ff7f82' : '#ef8f45';

  return (
    <svg viewBox="0 0 64 48" className="tree-perched-bird-svg" role="presentation" focusable="false">
      {styleType === 'yellow' && (
        <path d="M8 41 C16 38 25 38 35 40 C43 42 50 42 58 41" stroke="#936844" strokeWidth="3" strokeLinecap="round" />
      )}
      {styleType === 'green' && (
        <path d="M9 17 C15 8 23 6 30 10" stroke="#8a623b" strokeWidth="2.8" strokeLinecap="round" />
      )}
      <ellipse cx="26" cy="27" rx="18" ry="13" fill={body} />
      <ellipse cx="41" cy="22" rx="9" ry="8" fill={head} />
      <path d="M47 21 L57 24 L48 28 Z" fill={beak} />
      <ellipse cx="42" cy="22" rx="2.4" ry="2.4" fill="#17181a" />
      <ellipse cx="36" cy="26" rx="4.4" ry="3.8" fill={styleType === 'pink' ? '#f4a4c8' : '#ffc9a7'} opacity="0.8" />
      <path d="M17 26 C9 19 8 12 14 9 C22 5 29 12 30 19 C26 22 22 24 17 26 Z" fill={wing} />
      <path d="M11 31 C5 32 3 35 4 39 C9 38 13 36 17 33 Z" fill={styleType === 'green' ? '#5cb357' : wing} />
      {styleType === 'pink' && (
        <>
          <circle cx="55" cy="25" r="2.9" fill="#d53244" />
          <circle cx="58" cy="28" r="2.8" fill="#e83b4f" />
        </>
      )}
      {styleType === 'green' && (
        <>
          <ellipse cx="13" cy="13" rx="3.6" ry="2" transform="rotate(-20 13 13)" fill="#65b547" />
          <ellipse cx="17" cy="10" rx="3.2" ry="1.8" transform="rotate(10 17 10)" fill="#6fbf52" />
        </>
      )}
      {styleType === 'yellow' && (
        <>
          <ellipse cx="31" cy="42" rx="3.3" ry="2.5" fill="#8dc3ec" />
          <ellipse cx="36" cy="42" rx="3.1" ry="2.3" fill="#f2de75" />
        </>
      )}
      <line x1="27" y1="37" x2="25" y2="45" stroke="#1d1f22" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="33" y1="37" x2="35" y2="45" stroke="#1d1f22" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
