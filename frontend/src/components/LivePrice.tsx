import { LiveTrade, TradeStreamStatus } from "../lib/useTradeStream";

interface LivePriceProps {
  symbol: string;
  trade: LiveTrade | undefined;
  status: TradeStreamStatus;
}

export function LivePrice({ symbol, trade, status }: LivePriceProps) {
  if (status === "auth-error") {
    return <p className="text-sm text-flag">Live stream unavailable: your session is invalid.</p>;
  }

  if (!trade) {
    return (
      <p className="font-mono text-sm text-slate">
        {status === "open" ? `Waiting for a live trade on ${symbol}...` : "Connecting to live stream..."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-3 sm:gap-4">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 self-center rounded-full ${
          status === "open" ? "animate-pulse bg-signal" : "bg-slate"
        }`}
      />
      <span className="font-mono text-xl text-ink sm:text-2xl">{symbol}</span>
      <span className="font-mono text-4xl font-medium text-ink sm:text-5xl">${trade.price.toFixed(2)}</span>
      <span className="font-mono text-xs text-slate sm:text-sm">
        as of {new Date(trade.tradedAt).toLocaleTimeString()}
      </span>
    </div>
  );
}
