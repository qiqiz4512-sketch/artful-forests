import { useMemo } from 'react';

interface Props {
  personality: string; // 树的主人格
  primaryTraits: Record<string, number>; // 各个维度的评分 (0-100)
  size?: number; // SVG 大小
}

/**
 * 性格雷达图动画组件
 * 根据树的主人格展示 5 个维度的综合评分
 */
export default function PersonalityRadar({ personality, primaryTraits, size = 240 }: Props) {
  // 定义 5 个维度
  const TRAITS = [
    { key: 'wisdom', label: '睿智度', icon: '✦' },
    { key: 'warmth', label: '温柔度', icon: '♥' },
    { key: 'liveliness', label: '活泼度', icon: '✿' },
    { key: 'quirk', label: '顽皮度', icon: '♪' },
    { key: 'mystery', label: '神秘度', icon: '⚡' },
  ];

  // 基于人格类型的默认属性分布
  const traitPresets: Record<string, Record<string, number>> = {
    温柔: { wisdom: 75, warmth: 95, liveliness: 70, quirk: 40, mystery: 60 },
    睿智: { wisdom: 95, warmth: 70, liveliness: 65, quirk: 45, mystery: 75 },
    活泼: { wisdom: 70, warmth: 75, liveliness: 95, quirk: 80, mystery: 55 },
    顽皮: { wisdom: 60, warmth: 50, liveliness: 85, quirk: 95, mystery: 70 },
    社恐: { wisdom: 75, warmth: 60, liveliness: 45, quirk: 50, mystery: 80 },
    神启: { wisdom: 85, warmth: 75, liveliness: 75, quirk: 65, mystery: 95 },
  };

  const defaultTraits = traitPresets[personality] || traitPresets.温柔;
  const finalTraits = { ...defaultTraits, ...primaryTraits };

  const center = size / 2;
  const maxRadius = (size / 2) * 0.8;
  const levels = 5; // 5 个刻度圆
  const angleSlice = (Math.PI * 2) / TRAITS.length;

  // 计算点坐标
  const getCoordinates = (value: number, index: number) => {
    const angle = angleSlice * index - Math.PI / 2;
    const radius = (value / 100) * maxRadius;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y };
  };

  // 生成雷达图多边形路径
  const radarPath = useMemo(() => {
    const points = TRAITS.map((trait, index) =>
      getCoordinates(finalTraits[trait.key as keyof typeof finalTraits] || 0, index),
    );

    const pathString = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ') + ' Z';

    return pathString;
  }, [finalTraits]);

  // 生成背景刻度圆
  const gridCircles = useMemo(() => {
    return Array.from({ length: levels }, (_, i) => {
      const radius = maxRadius * ((i + 1) / levels);
      return { r: radius, value: ((i + 1) / levels) * 100 };
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
        }}
      >
        {/* 背景刻度圆 */}
        {gridCircles.map((circle, i) => (
          <circle
            key={`grid-${i}`}
            cx={center}
            cy={center}
            r={circle.r}
            fill="none"
            stroke="rgba(100, 140, 130, 0.15)"
            strokeWidth={i === levels - 1 ? 2 : 1}
            strokeDasharray={i === levels - 1 ? 'none' : '4,4'}
          />
        ))}

        {/* 维度轴线 */}
        {TRAITS.map((_, index) => {
          const endPoint = getCoordinates(100, index);
          return (
            <line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="rgba(100, 140, 130, 0.2)"
              strokeWidth={1}
            />
          );
        })}

        {/* 雷达数据多边形 */}
        <path
          d={radarPath}
          fill="rgba(129, 199, 132, 0.25)"
          stroke="rgba(100, 140, 130, 0.6)"
          strokeWidth={2}
          style={{
            animation: 'rainbowGlow 3s ease-in-out infinite',
          }}
        />

        {/* 数据点 */}
        {TRAITS.map((trait, index) => {
          const point = getCoordinates(finalTraits[trait.key as keyof typeof finalTraits] || 0, index);
          return (
            <circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r={4}
              fill="rgba(129, 199, 132, 0.8)"
              stroke="white"
              strokeWidth={2}
            />
          );
        })}

        {/* 维度标签 */}
        {TRAITS.map((trait, index) => {
          const labelPoint = getCoordinates(115, index);
          return (
            <g key={`label-${index}`}>
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dy=".3em"
                fontSize={11}
                fontWeight={600}
                fill="rgba(45, 62, 53, 0.8)"
                fontFamily="var(--font-handwritten)"
              >
                {trait.icon}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 维度分值表 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: 12,
          width: '100%',
          maxWidth: size,
        }}
      >
        {TRAITS.map((trait) => {
          const value = finalTraits[trait.key as keyof typeof finalTraits] || 0;
          return (
            <div key={trait.key} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(45, 62, 53, 0.9)',
                  marginBottom: 4,
                  fontFamily: 'var(--font-handwritten)',
                }}
              >
                {trait.label}
              </div>
              <div
                style={{
                  height: 4,
                  background: 'rgba(100, 140, 130, 0.1)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${value}%`,
                    background: 'linear-gradient(90deg, #81c784, #66bb6a)',
                    borderRadius: 2,
                    transition: 'width 0.6s ease-out',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(100, 140, 130, 0.8)',
                  marginTop: 2,
                  fontFamily: 'var(--font-handwritten)',
                }}
              >
                {Math.round(value)}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes rainbowGlow {
          0%, 100% {
            filter: drop-shadow(0 0 4px rgba(129, 199, 132, 0.4));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(129, 199, 132, 0.8));
          }
        }
      `}</style>
    </div>
  );
}
