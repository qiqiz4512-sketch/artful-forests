import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPlant: (imageData: string) => void;
}

type BrushType = 'watercolor' | 'crayon' | 'pen';

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
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0].value);
  const [brush, setBrush] = useState<BrushType>('watercolor');
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, 300, 300);
      setHasDrawn(false);
    }
  }, [isOpen]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    lastPoint.current = getPos(e);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);
    const last = lastPoint.current || pos;

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

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, 300, 300);
    setHasDrawn(false);
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

    const pad = 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const cropped = document.createElement('canvas');
    cropped.width = cropW;
    cropped.height = cropH;
    cropped.getContext('2d')!.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return cropped.toDataURL('image/png');
  }, []);

  const handlePlant = useCallback(() => {
    if (!canvasRef.current || !hasDrawn) return;
    const data = autoCrop(canvasRef.current);
    onPlant(data);
  }, [hasDrawn, onPlant, autoCrop]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 80 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed z-50 bottom-24 right-4 sm:right-8"
          style={{
            background: 'linear-gradient(145deg, rgba(255,252,245,0.97), rgba(245,240,230,0.97))',
            borderRadius: '12px 16px 10px 18px',
            boxShadow: '4px 6px 20px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
            border: '2px solid rgba(180, 170, 150, 0.3)',
            padding: '16px',
          }}
        >
          {/* Torn paper top edge */}
          <svg width="100%" height="8" className="absolute -top-2 left-0 right-0" preserveAspectRatio="none">
            <path d="M0,8 Q10,0 20,6 T40,5 T60,7 T80,4 T100,6 T120,5 T140,7 T160,4 T180,6 T200,5 T220,7 T240,4 T260,6 T280,5 T300,7 T320,4 L320,8 Z"
              fill="rgba(255,252,245,0.97)" />
          </svg>

          <div className="flex flex-col gap-3">
            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="rounded-sm cursor-crosshair touch-none"
              style={{
                border: '1.5px dashed rgba(160,150,130,0.4)',
                borderRadius: '4px 8px 6px 10px',
              }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />

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
                  disabled={!hasDrawn}
                  className="px-4 py-1.5 text-sm font-ui transition-all"
                  style={{
                    background: hasDrawn ? 'hsl(122, 38%, 63%)' : 'rgba(200,195,185,0.3)',
                    color: hasDrawn ? '#fff' : 'rgba(150,145,135,0.6)',
                    borderRadius: '6px 8px 5px 9px',
                    cursor: hasDrawn ? 'pointer' : 'not-allowed',
                  }}
                >
                  🌱 播种
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
