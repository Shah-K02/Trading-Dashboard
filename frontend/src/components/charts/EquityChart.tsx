import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type Time } from "lightweight-charts";

export interface Point {
  time: Time;
  value: number;
}

interface EquityChartProps {
  data: Point[];
}

export function EquityChart({ data }: EquityChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0f172a" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      width: containerRef.current.clientWidth,
      height: 320,
    });

    const series = chart.addAreaSeries({
      lineColor: '#2563eb',
      topColor: 'rgba(37, 99, 235, 0.4)',
      bottomColor: 'rgba(37, 99, 235, 0)',
    });
    series.setData(data);

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  if (data.length === 0) {
    return <div className="flex h-[320px] items-center justify-center rounded-2xl border border-slate-800 text-slate-500">No equity data available</div>;
  }

  return <div ref={containerRef} className="w-full overflow-hidden rounded-2xl border border-slate-800" />;
}
