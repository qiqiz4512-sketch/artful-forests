import { useEffect, useRef, useState } from 'react';
import { calculateStereopan, getAudioConfigForZone, getZoneIdFromPosition } from '@/lib/audioEnvironment';

interface AudioEnvironmentHookProps {
  userTreeX: number; // 用户当前拖拽的树木x位置
  worldWidth: number; // 世界总宽度
  isEnabled: boolean; // 音效是否启用
}

/**
 * 管理动态环境音场：根据用户拖拽位置，实时调整立体声和环境音特征
 */
export function useAudioEnvironment({ userTreeX, worldWidth, isEnabled }: AudioEnvironmentHookProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const windOscRef = useRef<OscillatorNode | null>(null);
  const windGainRef = useRef<GainNode | null>(null);
  const birdOscRef = useRef<OscillatorNode | null>(null);
  const birdGainRef = useRef<GainNode | null>(null);
  const [currentZone, setCurrentZone] = useState<string>('mixed-meadow');

  // 初始化音频上下文和节点
  useEffect(() => {
    if (!isEnabled) return;

    const ensureAudioContext = () => {
      if (!audioContextRef.current) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
      }
      return audioContextRef.current;
    };

    const ctx = ensureAudioContext();
    void ctx.resume();

    // 创建立体声panner
    if (!pannerRef.current) {
      pannerRef.current = ctx.createStereoPanner();
      pannerRef.current.connect(ctx.destination);
    }

    // 创建风声通道
    if (!windOscRef.current) {
      const windOsc = ctx.createOscillator();
      const windGain = ctx.createGain();
      windOsc.type = 'sawtooth'; // 锯齿波更像风声
      windGain.gain.value = 0.2;
      windOsc.connect(windGain);
      windGain.connect(pannerRef.current);
      windOsc.start();
      windOscRef.current = windOsc;
      windGainRef.current = windGain;
    }

    // 创建鸟鸣/虫鸣通道
    if (!birdOscRef.current) {
      const birdOsc = ctx.createOscillator();
      const birdGain = ctx.createGain();
      birdOsc.type = 'sine'; // 正弦波更像高频鸟鸣
      birdGain.gain.value = 0.15;
      birdOsc.connect(birdGain);
      birdGain.connect(pannerRef.current);
      birdOsc.start();
      birdOscRef.current = birdOsc;
      birdGainRef.current = birdGain;
    }

    return () => {
      // 销毁时停止振荡器
      if (windOscRef.current) {
        try {
          windOscRef.current.stop();
          windOscRef.current = null;
          windGainRef.current = null;
        } catch (e) {
          // already stopped
        }
      }
      if (birdOscRef.current) {
        try {
          birdOscRef.current.stop();
          birdOscRef.current = null;
          birdGainRef.current = null;
        } catch (e) {
          // already stopped
        }
      }
    };
  }, [isEnabled]);

  // 根据用户树木位置实时更新panning和频率
  useEffect(() => {
    if (!isEnabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const panValue = calculateStereopan(userTreeX, worldWidth);
    const zoneId = getZoneIdFromPosition(userTreeX, worldWidth);
    const config = getAudioConfigForZone(zoneId);

    // 更新zone显示
    setCurrentZone(zoneId);

    // 平滑更新panning
    if (pannerRef.current) {
      pannerRef.current.pan.setTargetAtTime(panValue, ctx.currentTime, 0.3);
    }

    // 更新风声频率和音量
    if (windOscRef.current && windGainRef.current) {
      windOscRef.current.frequency.setTargetAtTime(config.windFrequency, ctx.currentTime, 0.2);
      windGainRef.current.gain.setTargetAtTime(config.windGain, ctx.currentTime, 0.2);
    }

    // 更新鸟鸣频率和音量
    if (birdOscRef.current && birdGainRef.current) {
      birdOscRef.current.frequency.setTargetAtTime(config.birdChirpFrequency, ctx.currentTime, 0.3);
      birdGainRef.current.gain.setTargetAtTime(config.birdChirpGain, ctx.currentTime, 0.3);
    }
  }, [userTreeX, worldWidth, isEnabled]);

  return {
    currentZone,
  };
}
