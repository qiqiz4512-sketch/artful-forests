import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { DrawingData } from '@/types/forest';

interface Props {
  drawingData: DrawingData;
  onClose: () => void;
}

/**
 * 延时摄影回放绘画过程
 */
export default function DrawingPlayback({ drawingData, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0-1
  const [duration, setDuration] = useState(0); // 毫秒
  const [currentTime, setCurrentTime] = useState(0); // 毫秒
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // 计算总时长
  useEffect(() => {
    if (drawingData.strokes.length === 0) {
      setDuration(0);
      return;
    }

    const first = drawingData.strokes[0];
    const last = drawingData.strokes[drawingData.strokes.length - 1];
    const totalDuration = last.timestamp + last.duration - first.timestamp;
    setDuration(totalDuration);
  }, [drawingData]);

  // 动画循环
  useEffect(() => {
    if (!isPlaying || duration === 0) return;

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const speedup = 3; // 3倍速回放
      const newTime = (currentTime + (elapsed / speedup)) % duration;

      setCurrentTime(newTime);
      setProgress(newTime / duration);

      rafRef.current = requestAnimationFrame(animate);
    };

    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, duration, currentTime]);

  // 绘制回放内容
  useEffect(() => {
    if (!canvasRef.current || drawingData.strokes.length === 0) return;

    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, drawingData.width, drawingData.height);

    const baseTime = drawingData.strokes[0].timestamp;

    for (const stroke of drawingData.strokes) {
      const strokeStart = stroke.timestamp - baseTime;
      const strokeEnd = strokeStart + stroke.duration;

      // 跳过还未开始的笔划
      if (currentTime < strokeStart) continue;

      // 计算笔划的进度
      const strokeProgress = Math.min(1, (currentTime - strokeStart) / stroke.duration);
      const pointCount = Math.ceil(stroke.points.length * strokeProgress);

      // 绘制笔划
      ctx.beginPath();

      // 笔刷样式
      if (stroke.brush === 'watercolor') {
        ctx.strokeStyle = stroke.color + '66';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'multiply';
      } else if (stroke.brush === 'crayon') {
        ctx.strokeStyle = stroke.color + 'AA';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
      }

      // 移动到起点
      if (pointCount > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        // 绘制到当前进度的点
        for (let i = 1; i < pointCount; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }

        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
    }
  }, [currentTime, drawingData]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setCurrentTime(Math.max(0, Math.min(duration, ratio * duration)));
  }, [duration]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const millis = Math.floor((ms % 1000) / 100);
    return `${seconds}.${millis}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">🎬 绘画延时摄影</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={drawingData.width}
          height={drawingData.height}
          className="w-full border border-gray-300 rounded-lg mb-4"
          style={{ backgroundColor: '#fafaf5' }}
        />

        {/* Controls */}
        <div className="space-y-3">
          {/* Progress bar */}
          <div
            className="h-1 bg-gray-200 rounded-full cursor-pointer hover:h-2 transition-all"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Time display */}
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Play button */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setCurrentTime(0);
                setProgress(0);
              }}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
            >
              ⏮️ 重新开始
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
            >
              {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
            </button>
          </div>

          {/* Info */}
          <div className="text-center text-xs text-gray-500 mt-3">
            {drawingData.strokes.length} 笔划 • 速度 3x
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
