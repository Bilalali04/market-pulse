import { LiveTrade, TradeStreamStatus } from "../lib/useTradeStream";

interface LivePriceProps {
  symbol: string;
  trade: LiveTrade | undefined;
  status: TradeStreamStatus;
}

export function LivePrice({ symbol, trade, status }: LivePriceProps) {
  if (status === "auth-error") {
    return <p className="text-sm text-red-600">Live stream unavailable: your session is invalid.</p>;
  }

  if (!trade) {
    return (
      <p className="text-sm text-gray-600">
        {status === "open" ? `Waiting for a live trade on ${symbol}...` : "Connecting to live stream..."}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${status === "open" ? "animate-pulse bg-green-500" : "bg-gray-400"}`}
      />
      <span className="text-sm font-medium">Live</span>
      <span className="text-lg font-semibold">${trade.price.toFixed(2)}</span>
      <span className="text-xs text-gray-500">as of {new Date(trade.tradedAt).toLocaleTimeString()}</span>
    </div>
  );
}
