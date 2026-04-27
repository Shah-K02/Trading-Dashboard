import { useEffect, useRef } from "react";
import { createChart, type IChartApi } from "lightweight-charts";

const candles = [
  { time: "2026-02-01", open: 1.25, high: 1.27, low: 1.24, close: 1.26 },
  { time: "2026-02-02", open: 1.26, high: 1.28, low: 1.255, close: 1.275 },
  { time: "2026-02-03", open: 1.275, high: 1.281, low: 1.26, close: 1.265 },
  { time: "2026-02-04", open: 1.265, high: 1.29, low: 1.262, close: 1.286 },
  { time: "2026-02-05", open: 1.286, high: 1.295, low: 1.28, close: 1.292 },
];

export function TradeChart() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
      height: 420,
    });

    const series = chart.addCandlestickSeries();
    series.setData(candles);

    series.setMarkers([
      {
        time: "2026-02-02",
        position: "belowBar",
        color: "#22c55e",
        shape: "arrowUp",
        text: "Entry",
      },
      {
        time: "2026-02-05",
        position: "aboveBar",
        color: "#ef4444",
        shape: "arrowDown",
        text: "Exit",
      },
    ]);

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
  }, []);

  return <div ref={containerRef} className="w-full overflow-hidden rounded-2xl border border-slate-800" />;
}
