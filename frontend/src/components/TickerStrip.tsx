// Static/mock data for the homepage hero. Real symbols from the actual
// watchlist (frontend/src/lib/watchlist.ts) with plausible prices - not
// wired to the live feed yet, that's a separate future step.
interface TickerItem {
  symbol: string;
  price: string;
  changePct: string;
  isUp: boolean;
}

const TICKER_ITEMS: TickerItem[] = [
  { symbol: "MSFT", price: "481.87", changePct: "+0.34%", isUp: true },
  { symbol: "NVDA", price: "220.35", changePct: "+1.12%", isUp: true },
  { symbol: "AAPL", price: "310.42", changePct: "-0.18%", isUp: false },
  { symbol: "GOOGL", price: "343.91", changePct: "+0.22%", isUp: true },
  { symbol: "JPM", price: "360.05", changePct: "-0.41%", isUp: false },
  { symbol: "BAC", price: "63.78", changePct: "+0.09%", isUp: true },
  { symbol: "KO", price: "88.76", changePct: "+0.05%", isUp: true },
  { symbol: "MCD", price: "268.71", changePct: "-0.12%", isUp: false },
  { symbol: "XOM", price: "164.42", changePct: "+0.31%", isUp: true },
  { symbol: "CVX", price: "204.65", changePct: "-0.08%", isUp: false },
];

function TickerRow() {
  return (
    <div className="flex shrink-0 items-center">
      {TICKER_ITEMS.map((item, index) => (
        <div key={index} className="flex items-baseline gap-2 whitespace-nowrap px-6">
          <span className="font-mono text-sm font-medium text-ink">{item.symbol}</span>
          <span className="font-mono text-sm text-slate">{item.price}</span>
          <span className={`font-mono text-xs ${item.isUp ? "text-signal" : "text-flag"}`}>
            {item.changePct}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TickerStrip() {
  return (
    <div
      className="w-full overflow-hidden border-y border-hairline bg-paper py-3"
      aria-label="Sample watchlist prices, not live data"
    >
      <div className="animate-scroll flex w-max [animation-duration:32s]">
        <TickerRow />
        <TickerRow />
      </div>
    </div>
  );
}
