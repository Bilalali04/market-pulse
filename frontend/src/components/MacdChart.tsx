"use client";

import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MacdSeries } from "../lib/api";

// Mirrors the hex values in globals.css - see PriceChart.tsx for why.
const INK = "#10192E";
const SLATE = "#445068";
const HAIRLINE = "#C9C4B6";
const PAPER = "#F1F0EA";
const SIGNAL = "#1FAE6D";
const FLAG = "#E4572E";
const MONO_FONT = "IBM Plex Mono, monospace";

interface MacdChartProps {
  dates: string[];
  macd: MacdSeries;
}

export function MacdChart({ dates, macd }: MacdChartProps) {
  // histogram is the last of the three series to warm up (null until both
  // macdLine and signalLine are non-null), and once a value here goes
  // non-null it stays non-null for the rest of the array - so this index
  // is where all three series become gap-free through the end. Trimming
  // to it avoids plotting a long flat empty region before the indicator
  // existed.
  const firstValidIndex = macd.histogram.findIndex((value) => value !== null);

  if (firstValidIndex === -1) {
    return (
      <div className="rounded border border-hairline p-4">
        <p className="text-sm text-slate">Not enough price history to compute MACD.</p>
      </div>
    );
  }

  const chartData = dates.slice(firstValidIndex).map((date, i) => {
    const originalIndex = firstValidIndex + i;
    return {
      date,
      macdLine: macd.macdLine[originalIndex],
      signalLine: macd.signalLine[originalIndex],
      histogram: macd.histogram[originalIndex],
    };
  });

  return (
    <div>
      <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-slate">MACD (12, 26, 9)</h3>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData}>
          <CartesianGrid stroke={HAIRLINE} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fontFamily: MONO_FONT, fill: SLATE }}
            stroke={HAIRLINE}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 11, fontFamily: MONO_FONT, fill: SLATE }}
            stroke={HAIRLINE}
            width={40}
          />
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
          {/* barSize is required, not cosmetic: with ~1000 daily categories
              packed into a chart this wide, Recharts' auto-computed bar
              width resolves to sub-pixel and it silently skips drawing
              every bar's shape (confirmed directly - without this, all
              bar elements mount with zero shape children). isAnimationActive
              is off since entrance animation is pointless at this density
              and only adds a source of flicker on re-render. */}
          <Bar dataKey="histogram" name="Histogram" barSize={2} isAnimationActive={false}>
            {chartData.map((entry, i) => (
              <Cell key={entry.date + i} fill={entry.histogram !== null && entry.histogram >= 0 ? SIGNAL : FLAG} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="macdLine" name="MACD" stroke={INK} dot={false} connectNulls={false} strokeWidth={1.5} />
          <Line
            type="monotone"
            dataKey="signalLine"
            name="Signal"
            stroke={SLATE}
            strokeDasharray="4 4"
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
