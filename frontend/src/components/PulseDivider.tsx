// The page's one signature element: a thin, continuously scrolling
// seismograph-style trace, used as the divider between the hero and the
// "how it works" section instead of a plain hairline rule. Animation
// respects prefers-reduced-motion via the .animate-scroll rule in
// globals.css (no animation runs at all when reduced motion is set, the
// line just sits still).
const UNIT_WIDTH = 120;
const REPEATS = 10;
const HEIGHT = 40;
const BASELINE = HEIGHT / 2;
const SEGMENT_WIDTH = UNIT_WIDTH * REPEATS;

function buildWaveformPath(startX: number): string {
  const points = [`M${startX},${BASELINE}`];
  for (let i = 0; i < REPEATS; i++) {
    const x = startX + i * UNIT_WIDTH;
    points.push(
      `L${x + 40},${BASELINE}`,
      `L${x + 46},${BASELINE - 14}`,
      `L${x + 52},${BASELINE + 18}`,
      `L${x + 58},${BASELINE - 8}`,
      `L${x + 64},${BASELINE}`,
      `L${x + UNIT_WIDTH},${BASELINE}`
    );
  }
  return points.join(" ");
}

const PATH_D = `${buildWaveformPath(0)} ${buildWaveformPath(SEGMENT_WIDTH)}`;

export function PulseDivider() {
  return (
    <div className="w-full overflow-hidden" aria-hidden="true">
      <svg
        viewBox={`0 0 ${SEGMENT_WIDTH * 2} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="animate-scroll h-8 w-[200%] [animation-duration:14s]"
      >
        <path
          d={PATH_D}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity={0.55}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
