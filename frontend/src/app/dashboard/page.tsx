"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "../../components/RequireAuth";
import { PriceChart } from "../../components/PriceChart";
import { RsiChart } from "../../components/RsiChart";
import { MacdChart } from "../../components/MacdChart";
import { ComplianceBadge } from "../../components/ComplianceBadge";
import { LivePrice } from "../../components/LivePrice";
import { clearToken, getToken } from "../../lib/token";
import {
  IndicatorsResult,
  indicatorsRequest,
  priceHistoryRequest,
  PricePoint,
  screenerRequest,
  ScreeningResult,
} from "../../lib/api";
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
  const [indicators, setIndicators] = useState<IndicatorsResult | null>(null);
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(true);
  const [indicatorsError, setIndicatorsError] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    async function loadIndicators() {
      setIsLoadingIndicators(true);
      setIndicatorsError(null);
      setIndicators(null);

      const token = getToken();
      if (!token) {
        return;
      }

      try {
        const result = await indicatorsRequest(symbol, token);
        if (!cancelled) {
          setIndicators(result);
        }
      } catch (err) {
        if (!cancelled) {
          setIndicatorsError(err instanceof Error ? err.message : "Something went wrong loading indicators.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingIndicators(false);
        }
      }
    }

    loadIndicators();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex w-full items-center justify-between border-b border-hairline px-6 py-4 sm:px-8">
        <span className="font-display text-lg text-ink">Market Pulse</span>
        <div className="flex items-center gap-3">
          <label htmlFor="symbol" className="sr-only">
            Symbol
          </label>
          <select
            id="symbol"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="rounded border border-hairline bg-paper px-3 py-1.5 font-mono text-sm text-ink outline-offset-2 focus:outline focus:outline-2 focus:outline-ink"
          >
            {WATCHLIST.map((watchlistSymbol) => (
              <option key={watchlistSymbol} value={watchlistSymbol}>
                {watchlistSymbol}
              </option>
            ))}
          </select>
          <button
            onClick={handleLogout}
            className="rounded border border-hairline px-3 py-1.5 text-sm text-ink outline-offset-2 transition-colors hover:border-ink focus:outline focus:outline-2 focus:outline-ink"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="w-full border-b border-hairline px-6 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <LivePrice symbol={symbol} trade={latestTrades[symbol]} status={tradeStreamStatus} />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-8 sm:px-8 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          {isLoadingPrices && <p className="text-sm text-slate">Loading price history...</p>}
          {!isLoadingPrices && priceError && <p className="text-sm text-flag">{priceError}</p>}
          {!isLoadingPrices && !priceError && prices.length > 0 && (
            <PriceChart data={prices} sma={indicators?.sma} />
          )}
        </div>
        <div className="lg:col-span-1">
          <ComplianceBadge result={screeningResult} isLoading={isLoadingScreening} error={screeningError} />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 pb-8 sm:px-8 lg:grid-cols-2 lg:gap-8">
        {isLoadingIndicators && <p className="text-sm text-slate">Loading indicators...</p>}
        {!isLoadingIndicators && indicatorsError && <p className="text-sm text-flag">{indicatorsError}</p>}
        {!isLoadingIndicators && !indicatorsError && indicators && (
          <>
            <RsiChart dates={indicators.dates} rsi={indicators.rsi} />
            <MacdChart dates={indicators.dates} macd={indicators.macd} />
          </>
        )}
      </section>
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
