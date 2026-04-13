import { View } from 'react-native';
import Svg, { Rect, Polyline } from 'react-native-svg';

interface MiniChartProps {
  data: number[];
  type?: 'bar' | 'line';
  color?: string;
  height?: number;
  width?: number;
}

export default function MiniChart({
  data,
  type = 'bar',
  color = '#2563eb',
  height = 40,
  width = 80,
}: MiniChartProps) {
  if (!data || data.length === 0) return <View style={{ height, width }} />;

  const max = Math.max(...data, 1);
  const count = data.length;

  if (type === 'bar') {
    const barWidth = (width / count) * 0.7;
    const gap = (width / count) * 0.3;
    return (
      <Svg width={width} height={height}>
        {data.map((v, i) => {
          const barH = (v / max) * height;
          const x = i * (barWidth + gap);
          const y = height - barH;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={2}
              fill={color}
              opacity={0.85}
            />
          );
        })}
      </Svg>
    );
  }

  // line chart
  const stepX = count > 1 ? width / (count - 1) : width;
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
