import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimeTheme } from '@/hooks/useTimeTheme';
import ParallaxBackground from '@/components/ParallaxBackground';
import Particles from '@/components/Particles';
import SeedButton from '@/components/SeedButton';
import DrawingPanel from '@/components/DrawingPanel';
import WindChime from '@/components/WindChime';
import PlantedTree from '@/components/PlantedTree';
import PlantingGhost from '@/components/PlantingGhost';

interface TreeData {
  id: string;
  imageData: string;
  x: number;
  y: number;
  size: number;
}

export default function Index() {
  const { theme, colors } = useTimeTheme();
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [trees, setTrees] = useState<TreeData[]>([]);
  const [plantingImage, setPlantingImage] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollX, setScrollX] = useState(0);
  const [newTreeId, setNewTreeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef(0);
  const scrollStart = useRef(0);

  // Horizontal drag-to-scroll
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (plantingImage) return;
    isDragging.current = true;
    dragStart.current = e.clientX;
    scrollStart.current = scrollX;
  }, [scrollX, plantingImage]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!isDragging.current) return;
    const dx = (e.clientX - dragStart.current) * 0.6; // damping
    setScrollX(scrollStart.current + dx);
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Handle planting
  const handlePlant = useCallback((imageData: string) => {
    setDrawingOpen(false);
    setPlantingImage(imageData);
  }, []);

  const handlePlace = useCallback((x: number, y: number) => {
    if (!plantingImage) return;
    const h = window.innerHeight;
    // Clamp to lower portion (grass area)
    const clampedY = Math.max(h * 0.55, Math.min(h * 0.85, y));
    const size = 60 + Math.random() * 40;
    const id = Date.now().toString();

    // Play wood chime sound
    try {
      const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 523.25;
      gain.gain.setValueAtTime(0.15, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 1.5);
    } catch {}

    setTrees((prev) => [...prev, {
      id,
      imageData: plantingImage,
      x: x - size / 2 - scrollX,
      y: clampedY - size,
      size,
    }]);
    setNewTreeId(id);
    setPlantingImage(null);
    setTimeout(() => setNewTreeId(null), 3500);
  }, [plantingImage, scrollX]);

  // Initial sample trees
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const sampleTrees: TreeData[] = [];
    // Create a few procedural "trees" using canvas
    for (let i = 0; i < 5; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 120;
      const ctx = canvas.getContext('2d')!;
      
      const treeColors = ['#81C784', '#66BB6A', '#A5D6A7', '#4CAF50', '#388E3C'];
      const trunkColor = '#A1887F';
      
      // Trunk
      ctx.fillStyle = trunkColor;
      ctx.fillRect(42, 70, 16, 50);
      
      // Canopy (watercolor-ish blobs)
      ctx.globalAlpha = 0.6;
      const c = treeColors[i % treeColors.length];
      for (let j = 0; j < 8; j++) {
        ctx.beginPath();
        ctx.fillStyle = c;
        ctx.arc(
          50 + (Math.random() - 0.5) * 40,
          40 + (Math.random() - 0.5) * 35,
          12 + Math.random() * 15,
          0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      sampleTrees.push({
        id: `sample-${i}`,
        imageData: canvas.toDataURL(),
        x: w * 0.1 + i * (w * 0.18),
        y: h * 0.6 + Math.random() * (h * 0.12),
        size: 70 + Math.random() * 30,
      });
    }
    setTrees(sampleTrees);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ cursor: plantingImage ? 'none' : isDragging.current ? 'grabbing' : 'grab' }}
    >
      {/* Watercolor wash entry */}
      <div className="watercolor-wash fixed inset-0" style={{ zIndex: -1 }} />

      {/* Parallax Background */}
      <ParallaxBackground theme={theme} colors={colors} scrollX={scrollX} />

      {/* Trees layer */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 10,
          transform: `translateX(${scrollX * 0.5}px)`,
        }}
      >
        {trees.map((tree) => (
          <PlantedTree
            key={tree.id}
            imageData={tree.imageData}
            x={tree.x}
            y={tree.y}
            size={tree.size}
            isNew={tree.id === newTreeId}
          />
        ))}
      </div>

      {/* Particles */}
      <Particles colors={colors} />

      {/* Planting ghost */}
      {plantingImage && (
        <PlantingGhost
          imageData={plantingImage}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          onPlace={handlePlace}
        />
      )}

      {/* Wind Chime */}
      <WindChime />

      {/* Seed Button */}
      <SeedButton onClick={() => setDrawingOpen(!drawingOpen)} isOpen={drawingOpen} />

      {/* Drawing Panel */}
      <DrawingPanel
        isOpen={drawingOpen}
        onClose={() => setDrawingOpen(false)}
        onPlant={handlePlant}
      />
    </div>
  );
}
