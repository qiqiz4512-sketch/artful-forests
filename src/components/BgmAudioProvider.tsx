import { createContext, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type PropsWithChildren, type RefObject, type SetStateAction } from 'react';

interface BgmAudioContextValue {
  audioRef: RefObject<HTMLAudioElement>;
  isAutoplayBlocked: boolean;
  setIsAutoplayBlocked: Dispatch<SetStateAction<boolean>>;
}

const BgmAudioContext = createContext<BgmAudioContextValue | null>(null);

interface BgmAudioProviderProps extends PropsWithChildren {
  audioUrl: string;
  autoPlay?: boolean;
}

export function BgmAudioProvider({ audioUrl, autoPlay = false, children }: BgmAudioProviderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const contextValue = useMemo(
    () => ({ audioRef, isAutoplayBlocked, setIsAutoplayBlocked }),
    [isAutoplayBlocked],
  );

  // 在 Provider 层尽早发起静音播放：比 BgmMushroom 更早执行，
  // 利用浏览器对 muted autoplay 的白名单机制确保播放启动。
  useEffect(() => {
    if (!autoPlay) return;
    
    // setTimeout 确保 DOM 完全渲染和同步
    const timerId = window.setTimeout(() => {
      const audio = audioRef.current;
      if (!audio || !audio.src) return;

      // 设置播放参数
      audio.muted = true;
      audio.defaultMuted = true;
      audio.volume = 0;
      audio.loop = true;
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');

      // 直接尝试播放
      // muted + preload 时，浏览器白名单允许自动播放而无需用户交互
      void audio.play().catch(() => {
        // 播放失败（如 iOS），由 BgmMushroom 兜底处理
      });
    }, 10); // 小延迟确保 DOM 同步

    return () => {
      window.clearTimeout(timerId);
    };
  }, [autoPlay, audioUrl]);

  return (
    <BgmAudioContext.Provider value={contextValue}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        loop
        playsInline
        className="hidden"
        aria-hidden="true"
      />
      {children}
    </BgmAudioContext.Provider>
  );
}

export function useBgmAudio() {
  return useContext(BgmAudioContext);
}