"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Mirrors the hex values in globals.css - see PriceChart.tsx for why
// (recharts needs raw values, not CSS custom properties).
const INK = "#10192E";
const SLATE = "#445068";
const HAIRLINE = "#C9C4B6";
const PAPER = "#F1F0EA";
const SIGNAL = "#1FAE6D";
const FLAG = "#E4572E";
const MONO_FONT = "IBM Plex Mono, monospace";

interface RsiChartProps {
  dates: string[];
  rsi: (number | null)[];
}

export function RsiChart({ dates, rsi }: RsiChartProps) {
  const hasData = rsi.some((value) => value !== null);

  if (!hasData) {
    return (
      <div className="rounded border border-hairline p-4">
        <p className="text-sm text-slate">Not enough price history to compute RSI.</p>
      </div>
    );
  }

  const chartData = dates.map((date, i) => ({ date, rsi: rsi[i] }));

  return (
    <div>
      <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-slate">RSI (14)</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <CartesianGrid stroke={HAIRLINE} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fontFamily: MONO_FONT, fill: SLATE }}
            stroke={HAIRLINE}
            minTickGap={40}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 30, 70, 100]}
            tick={{ fontSize: 11, fontFamily: MONO_FONT, fill: SLATE }}
            stroke={HAIRLINE}
            width={32}
          />
          <ReferenceLine y={70} stroke={FLAG} strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke={SIGNAL} strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{
              backgroundColor: PAPER,
              border: `1px solid ${HAIRLINE}`,
              borderRadius: 4,
              fontFamily: MONO_FONT,
              fontSize: 12,
            }}
            labelStyle={{ color: INK }}
            itemStyle={{ color: INK }}
          />
          <Line type="monotone" dataKey="rsi" name="RSI" stroke={INK} dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
