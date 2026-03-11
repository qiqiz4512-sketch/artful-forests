import { motion } from 'framer-motion';
import { WeatherType } from '@/components/Particles';

interface Props {
  weather: WeatherType;
  onCycle: () => void;
}

const WEATHER_ICONS: Record<WeatherType, string> = {
  sunny: '☀️',
  rain: '🌧️',
  snow: '❄️',
};

const WEATHER_LABELS: Record<WeatherType, string> = {
  sunny: '晴天',
  rain: '雨天',
  snow: '雪天',
};

export default function WeatherToggle({ weather, onCycle }: Props) {
  return (
    <motion.button
      onClick={onCycle}
      className="fixed top-6 left-20 z-40 flex items-center gap-1.5 font-ui text-xs"
      style={{
        background: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(8px)',
        borderRadius: '20px',
        border: '1.5px solid rgba(255,255,255,0.3)',
        padding: '6px 14px',
        color: 'hsl(152, 30%, 25%)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-base">{WEATHER_ICONS[weather]}</span>
      <span>{WEATHER_LABELS[weather]}</span>
    </motion.button>
  );
}
