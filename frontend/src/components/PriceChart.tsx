"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PricePoint } from "../lib/api";

// Recharts renders stroke/fill as raw SVG attributes, not real CSS, so
// var(--token) custom properties aren't reliable here - these mirror the
// hex values in globals.css directly.
const INK = "#10192E";
const SLATE = "#445068";
const HAIRLINE = "#C9C4B6";
const PAPER = "#F1F0EA";
const MONO_FONT = "IBM Plex Mono, monospace";

interface PriceChartProps {
  data: PricePoint[];
}

export function PriceChart({ data }: PriceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid stroke={HAIRLINE} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fontFamily: MONO_FONT, fill: SLATE }}
          stroke={HAIRLINE}
          minTickGap={40}
        />
        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12, fontFamily: MONO_FONT, fill: SLATE }} stroke={HAIRLINE} />
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
        <Line type="monotone" dataKey="closePrice" stroke={INK} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
