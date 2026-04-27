import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  CrosshairMode,
} from "lightweight-charts";

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Props {
  bars: Bar[];
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  openTime: number;
  closeTime: number | null;
  side: string;
}

export function TradeCandlestickChart({ bars, entryPrice, exitPrice, stopLoss, takeProfit, openTime, closeTime, side }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0f172a" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1e293b" },
      timeScale: { borderColor: "#1e293b", timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: 380,
    });

    // Candlestick series
    const candleSeries: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candleSeries.setData(bars.map(b => ({ time: b.time as any, open: b.open, high: b.high, low: b.low, close: b.close })));

    // Price lines — entry
    candleSeries.createPriceLine({
      price: entryPrice,
      color: "#3b82f6",
      lineWidth: 2,
      lineStyle: 0, // solid
      axisLabelVisible: true,
      title: `Entry ${side.toUpperCase()}`,
    });

    // Exit
    if (exitPrice) {
      const exitColor = exitPrice > entryPrice
        ? (side === "buy" ? "#22c55e" : "#ef4444")
        : (side === "buy" ? "#ef4444" : "#22c55e");

      candleSeries.createPriceLine({
        price: exitPrice,
        color: exitColor,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "Exit",
      });
    }

    // Stop Loss
    if (stopLoss) {
      candleSeries.createPriceLine({
        price: stopLoss,
        color: "#ef4444",
        lineWidth: 1,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: "SL",
      });
    }

    // Take Profit
    if (takeProfit) {
      candleSeries.createPriceLine({
        price: takeProfit,
        color: "#22c55e",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP",
      });
    }

    // Highlight trade range with vertical lines via markers
    if (openTime) {
      candleSeries.setMarkers([
        {
          time: openTime as any,
          position: side === "buy" ? "belowBar" : "aboveBar",
          color: "#3b82f6",
          shape: side === "buy" ? "arrowUp" : "arrowDown",
          text: "Entry",
          size: 2,
        },
        ...(closeTime
          ? [{
              time: closeTime as any,
              position: "aboveBar" as const,
              color: exitPrice && exitPrice !== entryPrice
                ? (exitPrice > entryPrice ? (side === "buy" ? "#22c55e" : "#ef4444") : (side === "buy" ? "#ef4444" : "#22c55e"))
                : "#64748b",
              shape: "circle" as const,
              text: "Exit",
              size: 2,
            }]
          : []),
      ]);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current && chartRef.current)
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [bars, entryPrice, exitPrice, stopLoss, takeProfit, openTime, closeTime, side]);

  if (bars.length === 0) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-xl border border-slate-800 text-slate-500">
        No chart data available — ensure MT5 is running and the symbol is active.
      </div>
    );
  }

  return <div ref={containerRef} className="w-full overflow-hidden" />;
}
