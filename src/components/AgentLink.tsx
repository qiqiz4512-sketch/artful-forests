import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForestStore } from '@/stores/useForestStore';
import { TreeAgent } from '@/types/forest';

interface Props {
  agents: TreeAgent[];
  offsetX?: number;
}

const ENERGY_LINK_RANGE = 760;
const ENERGY_MIN_LINKS = 6;
const DIVINE_VISUAL_FALLBACK_MS = 10_000;

function ChatBubble({ x, y, message }: { x: number; y: number; message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.9 }}
      className="absolute pointer-events-none whitespace-nowrap text-xs font-ui"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        padding: '6px 10px',
        borderRadius: '999px',
        border: '1px solid rgba(167,243,208,0.65)',
        background: 'rgba(246,255,251,0.86)',
        color: 'hsl(157, 35%, 24%)',
        boxShadow: '0 4px 14px rgba(80, 180, 140, 0.2)',
        backdropFilter: 'blur(3px)',
        maxWidth: 260,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {message}
    </motion.div>
  );
}

export default function AgentLink({ agents, offsetX = 0 }: Props) {
  const activeChat = useForestStore((state) => state.activeChat);
  const silenceUntil = useForestStore((state) => state.globalEffects.silenceUntil);
  const divineSurgeUntil = useForestStore((state) => state.globalEffects.divineSurgeUntil);
  const [ghostChat, setGhostChat] = useState(activeChat);
  const [isFadingBySilence, setIsFadingBySilence] = useState(false);
  const [, setDivineTick] = useState(0);
  const fadeTimerRef = useRef<number | null>(null);
  const now = Date.now();
  const isSilent = now < silenceUntil;
  const divineSurgeActive = now < divineSurgeUntil;
  const manualTree = [...agents]
    .reverse()
    .find((agent) => agent.isManual || agent.personality === '神启');
  const manualTreeCreatedAt = manualTree?.isManual ? Number.parseInt(manualTree.id, 10) : NaN;
  const manualTreeFallbackActive =
    Number.isFinite(manualTreeCreatedAt) && (now - manualTreeCreatedAt) < DIVINE_VISUAL_FALLBACK_MS;
  const divineVisualActive = divineSurgeActive || manualTreeFallbackActive;

  useEffect(() => {
    if (activeChat) {
      setGhostChat(activeChat);
      setIsFadingBySilence(false);
      return;
    }

    if (!isSilent || !ghostChat) return;

    setIsFadingBySilence(true);
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
    }
    fadeTimerRef.current = window.setTimeout(() => {
      setGhostChat(null);
      setIsFadingBySilence(false);
      fadeTimerRef.current = null;
    }, 340);
  }, [activeChat, ghostChat, isSilent]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  // Force one rerender exactly when surge window ends, so visuals disappear on time.
  useEffect(() => {
    const fallbackExpireAt = Number.isFinite(manualTreeCreatedAt)
      ? manualTreeCreatedAt + DIVINE_VISUAL_FALLBACK_MS
      : 0;
    const nextExpireAt = Math.max(divineSurgeUntil, fallbackExpireAt);
    if (nextExpireAt <= Date.now()) return;
    const timer = window.setTimeout(() => {
      setDivineTick((v) => v + 1);
    }, Math.max(0, nextExpireAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [divineSurgeUntil, manualTreeCreatedAt]);

  const devotionLinks = manualTree && divineVisualActive
    ? agents
        .filter((agent) => agent.id !== manualTree.id)
        .map((agent) => {
          const dx = agent.position.x - manualTree.position.x;
          const dy = agent.position.y - manualTree.position.y;
          return {
            agent,
            distance: Math.hypot(dx, dy),
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .filter((entry, index) => entry.distance <= ENERGY_LINK_RANGE || index < ENERGY_MIN_LINKS)
        .slice(0, 8)
    : [];

  if (!activeChat && !ghostChat && devotionLinks.length === 0) return null;

  const chatToRender = activeChat ?? ghostChat;
  const chatA = chatToRender ? agents.find((agent) => agent.id === chatToRender.treeAId) : null;
  const chatB = chatToRender ? agents.find((agent) => agent.id === chatToRender.treeBId) : null;

  const hasRenderableChat = Boolean(chatToRender && chatA && chatB);
  const a = chatA;
  const b = chatB;

  const ax = a ? a.position.x + offsetX : 0;
  const ay = a ? a.position.y : 0;
  const bx = b ? b.position.x + offsetX : 0;
  const by = b ? b.position.y : 0;

  const mx = (ax + bx) / 2;
  const minY = Math.min(ay, by);
  const distance = Math.hypot(bx - ax, by - ay);
  const controlY = minY - Math.min(120, 40 + distance * 0.18);

  const path = `M ${ax} ${ay} Q ${mx} ${controlY} ${bx} ${by}`;
  const energyGradientId = 'divine-energy-gradient';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 28 }}
      >
        <svg className="absolute inset-0 w-full h-full" aria-hidden>
          <defs>
            <linearGradient id={energyGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 228, 136, 0.95)" />
              <stop offset="55%" stopColor="rgba(255, 244, 210, 0.98)" />
              <stop offset="100%" stopColor="rgba(165, 245, 232, 0.95)" />
            </linearGradient>
          </defs>

          {manualTree && devotionLinks.map(({ agent, distance }, index) => {
            const intensity = Math.max(0.35, 1 - distance / 560);
            const mxEnergy = (manualTree.position.x + agent.position.x) * 0.5 + (index % 2 === 0 ? 8 : -8);
            const myEnergy = Math.min(manualTree.position.y, agent.position.y) - Math.max(18, distance * 0.05);
            const energyPath = `M ${manualTree.position.x + offsetX} ${manualTree.position.y} Q ${mxEnergy + offsetX} ${myEnergy} ${agent.position.x + offsetX} ${agent.position.y}`;
            const sourceX = manualTree.position.x + offsetX;
            const sourceY = manualTree.position.y;
            const targetX = agent.position.x + offsetX;
            const targetY = agent.position.y;

            return (
              <g key={`divine-energy-${manualTree.id}-${agent.id}`}>
                <motion.path
                  d={energyPath}
                  fill="none"
                  stroke={`url(#${energyGradientId})`}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  animate={{ opacity: [0.32, 0.82 * intensity, 0.32] }}
                  transition={{ duration: 2.1 + (index % 3) * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.65))' }}
                />
                <motion.path
                  d={energyPath}
                  fill="none"
                  stroke="rgba(255, 244, 202, 0.96)"
                  strokeWidth={1.65}
                  strokeLinecap="round"
                  strokeDasharray="4 5"
                  animate={{ strokeDashoffset: [0, -20], opacity: [0.62, 1 * intensity, 0.62] }}
                  transition={{ duration: 2.3 + (index % 3) * 0.35, repeat: Infinity, ease: 'linear' }}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(255, 224, 128, 0.9))' }}
                />
                <motion.circle
                  cx={sourceX}
                  cy={sourceY}
                  r={2.4}
                  fill="rgba(255, 230, 160, 0.95)"
                  animate={{ r: [1.8, 3.6, 1.8], opacity: [0.66, 1, 0.66] }}
                  transition={{ duration: 1.25 + (index % 2) * 0.18, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(255, 223, 126, 0.85))' }}
                />
                <motion.circle
                  cx={targetX}
                  cy={targetY}
                  r={2.2}
                  fill="rgba(181, 255, 241, 0.95)"
                  animate={{ r: [1.6, 3.2, 1.6], opacity: [0.6, 0.96, 0.6] }}
                  transition={{ duration: 1.15 + (index % 3) * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(133, 246, 228, 0.82))' }}
                />
              </g>
            );
          })}

          {hasRenderableChat && (!isSilent || isFadingBySilence) && (
            <motion.path
              d={path}
              fill="none"
              stroke="#A7F3D0"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="7 6"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1, strokeDashoffset: [0, -26], opacity: isFadingBySilence ? 0 : 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{
                pathLength: { duration: 0.4, ease: 'easeOut' },
                strokeDashoffset: { duration: 1.15, repeat: Infinity, ease: 'linear' },
                opacity: { duration: 0.28, ease: 'easeOut' },
              }}
              style={{ filter: 'drop-shadow(0 0 6px rgba(167,243,208,0.6))' }}
            />
          )}
        </svg>

        {hasRenderableChat && (!isSilent || isFadingBySilence) && chatToRender && (
          <>
            <motion.div
              animate={{ opacity: isFadingBySilence ? 0 : 1, y: isFadingBySilence ? -5 : 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <ChatBubble x={ax} y={ay - 10} message={chatToRender.message} />
            </motion.div>
            <motion.div
              animate={{ opacity: isFadingBySilence ? 0 : 1, y: isFadingBySilence ? -5 : 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <ChatBubble x={bx} y={by - 10} message="......" />
            </motion.div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
