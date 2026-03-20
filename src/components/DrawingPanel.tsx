import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DrawingData, DrawingStroke, DrawingBrushType } from '@/types/forest';

const PERSONALITY_OPTIONS = ['温柔', '睿智', '顽皮', '活泼', '社恐'] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPlant: (imageData: string, drawingData: DrawingData, treeName: string, personality: string) => void;
}

export type BrushType = DrawingBrushType;

const COLORS = [
  { name: '森绿', value: '#81C784' },
  { name: '暖褐', value: '#A1887F' },
  { name: '樱粉', value: '#F48FB1' },
  { name: '天蓝', value: '#81D4FA' },
  { name: '暮紫', value: '#B39DDB' },
  { name: '麦黄', value: '#FFD54F' },
];

const BRUSH_LABELS: Record<BrushType, string> = {
  watercolor: '水彩',
  crayon: '蜡笔',
  pen: '勾线',
};

export default function DrawingPanel({ isOpen, onClose, onPlant }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0].value);
  const [brush, setBrush] = useState<BrushType>('watercolor');
  const [hasDrawn, setHasDrawn] = useState(false);
  // 是否已展开"灵魂注入"区域（阶段二）
  const [soulExpanded, setSoulExpanded] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [drawingData, setDrawingData] = useState<DrawingData>({
    timestamp: 0,
    strokes: [],
    width: 300,
    height: 300,
  });
  const [treeName, setTreeName] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState('');
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  const strokeStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, 300, 300);
      setHasDrawn(false);
      setSoulExpanded(false);
      setTreeName('');
      setSelectedPersonality('');
      setDrawingData({
        timestamp: Date.now(),
        strokes: [],
        width: 300,
        height: 300,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    document.body.classList.toggle('drawing-mode-active', isOpen);
    window.dispatchEvent(new CustomEvent('drawing-mode-change', { detail: { isOpen } }));

    return () => {
      document.body.classList.remove('drawing-mode-active');
      window.dispatchEvent(new CustomEvent('drawing-mode-change', { detail: { isOpen: false } }));
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const panel = panelRef.current;
      const target = event.target as Node | null;
      if (!panel || (target && panel.contains(target))) return;
      onClose();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (activePointerIdRef.current !== null) return;

    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

    const pos = getPos(e);
    setIsDrawing(true);
    setHasDrawn(true);
    lastPoint.current = pos;
    
    // 初始化新笔划
    strokeStartTimeRef.current = Date.now();
    currentStrokeRef.current = {
      startPoint: pos,
      points: [pos],
      color,
      brush,
      timestamp: strokeStartTimeRef.current,
      duration: 0,
    };
  }, [getPos, color, brush]);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);
    const last = lastPoint.current || pos;

    // 记录笔划点
    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(pos);
    }

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);

    if (brush === 'watercolor') {
      ctx.strokeStyle = color + '66';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'multiply';
    } else if (brush === 'crayon') {
      ctx.strokeStyle = color + 'AA';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
      // Add texture by drawing multiple offset lines
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(last.x + (Math.random() - 0.5) * 3, last.y + (Math.random() - 0.5) * 3);
        ctx.lineTo(pos.x + (Math.random() - 0.5) * 3, pos.y + (Math.random() - 0.5) * 3);
        ctx.stroke();
      }
      lastPoint.current = pos;
      return;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    lastPoint.current = pos;
  }, [isDrawing, color, brush, getPos]);

  const endDraw = useCallback((e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e && activePointerIdRef.current !== e.pointerId) return;

    if (e && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    activePointerIdRef.current = null;
    setIsDrawing(false);
    lastPoint.current = null;
    
    // 完成笔划记录
    if (currentStrokeRef.current) {
      const shouldRevealSoulSection = !soulExpanded && currentStrokeRef.current.points.length > 1;
      currentStrokeRef.current.duration = Date.now() - strokeStartTimeRef.current;
      setDrawingData((prev) => ({
        ...prev,
        strokes: [...prev.strokes, currentStrokeRef.current!],
      }));
      if (shouldRevealSoulSection) {
        setSoulExpanded(true);
      }
      currentStrokeRef.current = null;
    }
  }, [soulExpanded]);

  const clearCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, 300, 300);
    setHasDrawn(false);
    setSoulExpanded(false);
    setTreeName('');
    setSelectedPersonality('');
    activePointerIdRef.current = null;
    lastPoint.current = null;
    currentStrokeRef.current = null;
    setDrawingData({
      timestamp: Date.now(),
      strokes: [],
      width: 300,
      height: 300,
    });
  }, []);

  const autoCrop = useCallback((canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    let minX = width, minY = height, maxX = 0, maxY = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return canvas.toDataURL('image/png');

    const padX = 4;
    const padTop = 4;
    const padBottom = 0;
    minX = Math.max(0, minX - padX);
    minY = Math.max(0, minY - padTop);
    maxX = Math.min(width - 1, maxX + padX);
    maxY = Math.min(height - 1, maxY + padBottom);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const cropped = document.createElement('canvas');
    cropped.width = cropW;
    cropped.height = cropH;
    cropped.getContext('2d')!.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return cropped.toDataURL('image/png');
  }, []);

  const canPlant = hasDrawn && treeName.trim().length > 0 && selectedPersonality.length > 0;

  const handlePlant = useCallback(() => {
    if (!canvasRef.current || !canPlant) return;
    const data = autoCrop(canvasRef.current);
    onPlant(data, drawingData, treeName.trim(), selectedPersonality);
  }, [canPlant, onPlant, autoCrop, drawingData, treeName, selectedPersonality]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.82, y: 22 }}
          transition={{ duration: 0.22, ease: [0.2, 0.9, 0.2, 1] }}
          className="drawing-panel-cursor fixed z-50 bottom-24 right-4 sm:right-8"
          data-brush={brush}
          style={{
            background: 'linear-gradient(145deg, rgba(255,252,245,0.97), rgba(245,240,230,0.97))',
            borderRadius: '12px 16px 10px 18px',
            boxShadow: '4px 6px 20px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
            border: '2px solid rgba(180, 170, 150, 0.3)',
            padding: '16px',
            width: 'min(332px, calc(100vw - 2rem))',
          }}
        >
          {/* Torn paper top edge */}
          <svg width="100%" height="8" className="absolute -top-2 left-0 right-0" preserveAspectRatio="none">
            <path d="M0,8 Q10,0 20,6 T40,5 T60,7 T80,4 T100,6 T120,5 T140,7 T160,4 T180,6 T200,5 T220,7 T240,4 T260,6 T280,5 T300,7 T320,4 L320,8 Z"
              fill="rgba(255,252,245,0.97)" />
          </svg>

          <div className="flex flex-col gap-2.5">
            {/* Canvas */}
            <div className="w-full max-w-[300px] self-center">
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                className={`rounded-sm touch-none drawing-brush-${brush} block w-full h-auto`}
                style={{
                  border: '1.5px dashed rgba(160,150,130,0.4)',
                  borderRadius: '4px 8px 6px 10px',
                  background: 'repeating-conic-gradient(rgba(200,195,185,0.15) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px',
                }}
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerCancel={endDraw}
              />
            </div>

            <AnimatePresence initial={false} mode="wait">
              {!soulExpanded ? (
                <motion.div
                  key="soul-cta"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex items-center justify-between gap-3 px-1"
                >
                  <div
                    className="font-ui text-[11px] leading-relaxed"
                    style={{ color: 'rgba(98, 99, 88, 0.78)' }}
                  >
                    先自由画一棵树。落下第一笔后，或直接下一步，就能为它注入名字与性格。
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoulExpanded(true)}
                    className="shrink-0 px-3 py-1.5 text-xs font-ui transition-all"
                    style={{
                      background: 'rgba(200,195,185,0.24)',
                      color: 'hsl(152, 26%, 28%)',
                      borderRadius: '7px 10px 6px 10px',
                      border: '1px solid rgba(170, 161, 141, 0.28)',
                    }}
                  >
                    下一步
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="soul-fields"
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 px-0.5 pb-0.5">
                    <input
                      type="text"
                      value={treeName}
                      onChange={(e) => setTreeName(e.target.value.slice(0, 6))}
                      maxLength={6}
                      placeholder="给你的树起个名字..."
                      className="font-ui text-sm text-center outline-none w-full"
                      style={{
                        background: 'transparent',
                        borderBottom: '1.5px dashed rgba(160,150,130,0.5)',
                        padding: '5px 2px 6px',
                        color: 'hsl(152, 30%, 25%)',
                      }}
                    />

                    <div className="flex gap-1.5 flex-wrap justify-center">
                      {PERSONALITY_OPTIONS.map((p) => {
                        const active = selectedPersonality === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setSelectedPersonality(active ? '' : p)}
                            className="px-2.5 py-1 text-xs font-ui transition-all"
                            style={{
                              background: active ? '#A8D1A1' : '#F3F4F6',
                              color: active ? '#24452C' : 'hsl(152, 16%, 36%)',
                              borderRadius: '6px 8px 5px 9px',
                              border: active ? '1px solid rgba(97, 146, 95, 0.42)' : '1px solid rgba(200,195,185,0.35)',
                              boxShadow: active ? '0 0 0 1px rgba(168,209,161,0.22), 0 0 12px rgba(168,209,161,0.42)' : 'none',
                            }}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Brushes */}
            <div className="flex gap-2 items-center">
              {(Object.keys(BRUSH_LABELS) as BrushType[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBrush(b)}
                  className="px-2.5 py-1 text-xs font-ui transition-all"
                  style={{
                    background: brush === b ? 'hsl(122, 38%, 63%)' : 'rgba(200,195,185,0.3)',
                    color: brush === b ? '#fff' : 'hsl(152, 30%, 30%)',
                    borderRadius: '6px 8px 5px 9px',
                    border: brush === b ? '1.5px solid hsl(122, 38%, 50%)' : '1.5px solid transparent',
                  }}
                >
                  {BRUSH_LABELS[b]}
                </button>
              ))}
            </div>

            {/* Colors */}
            <div className="flex gap-2 items-center justify-center">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className="w-7 h-7 transition-transform"
                  style={{
                    background: c.value,
                    borderRadius: '50%',
                    border: color === c.value ? '3px solid hsl(152, 30%, 30%)' : '2px solid rgba(0,0,0,0.1)',
                    transform: color === c.value ? 'scale(1.2)' : 'scale(1)',
                  }}
                  title={c.name}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-between">
              <button
                onClick={clearCanvas}
                className="px-3 py-1.5 text-sm font-ui text-muted-foreground"
                style={{
                  background: 'rgba(200,195,185,0.2)',
                  borderRadius: '5px 7px 6px 8px',
                }}
              >
                清除
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm font-ui text-muted-foreground"
                  style={{
                    background: 'rgba(200,195,185,0.2)',
                    borderRadius: '5px 7px 6px 8px',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handlePlant}
                  disabled={!canPlant}
                  className="px-4 py-1.5 text-sm font-ui transition-all"
                  style={{
                    background: canPlant ? '#A8D1A1' : 'rgba(200,195,185,0.3)',
                    color: canPlant ? '#fff' : 'rgba(150,145,135,0.6)',
                    borderRadius: '6px 8px 5px 9px',
                    boxShadow: canPlant ? '0 0 14px rgba(168,209,161,0.38)' : 'none',
                    cursor: canPlant ? 'pointer' : 'not-allowed',
                  }}
                >
                  🌱 播种
                </button>
              </div>
            </div>

            {/* 画好提示 */}
            <AnimatePresence>
              {canPlant && (
                <motion.div
                  key="return-hint"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="text-center font-ui text-[11px] leading-relaxed"
                  style={{ color: 'rgba(98, 120, 88, 0.72)' }}
                >
                  🍂 在图鉴中轻点落叶，让树木化作灵感养分，归还大地。
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
