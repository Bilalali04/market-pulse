"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "../../components/RequireAuth";
import { PriceChart } from "../../components/PriceChart";
import { ComplianceBadge } from "../../components/ComplianceBadge";
import { LivePrice } from "../../components/LivePrice";
import { clearToken, getToken } from "../../lib/token";
import { priceHistoryRequest, PricePoint, screenerRequest, ScreeningResult } from "../../lib/api";
import { useTradeStream } from "../../lib/useTradeStream";
import { WATCHLIST } from "../../lib/watchlist";

function DashboardContent() {
  const router = useRouter();
  const [symbol, setSymbol] = useState(WATCHLIST[0]);
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [isLoadingScreening, setIsLoadingScreening] = useState(true);
  const [screeningError, setScreeningError] = useState<string | null>(null);
  const { latestTrades, status: tradeStreamStatus } = useTradeStream();

  useEffect(() => {
    let cancelled = false;

    async function loadPrices() {
      setIsLoadingPrices(true);
      setPriceError(null);
      setPrices([]);

      const token = getToken();
      if (!token) {
        return;
      }

      try {
        const result = await priceHistoryRequest(symbol, token);
        if (!cancelled) {
          setPrices(result.prices);
        }
      } catch (err) {
        if (!cancelled) {
          setPriceError(err instanceof Error ? err.message : "Something went wrong loading price history.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPrices(false);
        }
      }
    }

    loadPrices();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;

    async function loadScreening() {
      setIsLoadingScreening(true);
      setScreeningError(null);
      setScreeningResult(null);

      const token = getToken();
      if (!token) {
        return;
      }

      try {
        const result = await screenerRequest(symbol, token);
        if (!cancelled) {
          setScreeningResult(result);
        }
      } catch (err) {
        if (!cancelled) {
          setScreeningError(
            err instanceof Error ? err.message : "Something went wrong loading the compliance screen."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingScreening(false);
        }
      }
    }

    loadScreening();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <button onClick={handleLogout} className="rounded bg-blue-600 px-3 py-2 text-white">
          Log out
        </button>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-4">
        <label htmlFor="symbol" className="text-sm font-medium">
          Symbol
        </label>
        <select
          id="symbol"
          value={symbol}
          onChange={(event) => setSymbol(event.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          {WATCHLIST.map((watchlistSymbol) => (
            <option key={watchlistSymbol} value={watchlistSymbol}>
              {watchlistSymbol}
            </option>
          ))}
        </select>

        <LivePrice symbol={symbol} trade={latestTrades[symbol]} status={tradeStreamStatus} />

        <ComplianceBadge result={screeningResult} isLoading={isLoadingScreening} error={screeningError} />

        {isLoadingPrices && <p className="text-sm text-gray-600">Loading price history...</p>}
        {!isLoadingPrices && priceError && <p className="text-sm text-red-600">{priceError}</p>}
        {!isLoadingPrices && !priceError && prices.length > 0 && <PriceChart data={prices} />}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
