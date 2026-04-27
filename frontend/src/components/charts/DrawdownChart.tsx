import { useEffect, useRef } from "react";
import { createChart, type IChartApi } from "lightweight-charts";

interface DrawdownPoint {
  time: number;
  value: number;
}

interface Props {
  data: DrawdownPoint[];
}

export function DrawdownChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#0f172a" }, textColor: "#cbd5e1" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      width: containerRef.current.clientWidth,
      height: 200,
    });

    const series = chart.addAreaSeries({
      lineColor: '#ef4444',
      topColor: 'rgba(239, 68, 68, 0.3)',
      bottomColor: 'rgba(239, 68, 68, 0)',
    });
    series.setData(data.map(p => ({ time: p.time as any, value: p.value })));
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current && chartRef.current)
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [data]);

  if (data.length === 0) return (
    <div className="flex h-[200px] items-center justify-center text-slate-500">No drawdown data</div>
  );

  return <div ref={containerRef} className="w-full overflow-hidden" />;
}
