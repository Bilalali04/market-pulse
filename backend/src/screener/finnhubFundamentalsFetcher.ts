const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
// Finnhub free tier caps at 60 calls/minute. 1.1s between calls keeps us
// safely under that even across two calls per symbol.
const THROTTLE_MS = 1_100;

export interface FetchedFundamentals {
  sector: string;
  debtToMarketCap: number | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Profile2Response {
  finnhubIndustry?: string;
  marketCapitalization?: number;
  shareOutstanding?: number;
}

interface MetricResponse {
  metric?: {
    bookValuePerShareQuarterly?: number;
    "totalDebt/totalEquityQuarterly"?: number;
  };
}

export class FinnhubFundamentalsFetcher {
  constructor(private readonly apiKey: string) {}

  async fetch(symbol: string): Promise<FetchedFundamentals> {
    const profile = await this.get<Profile2Response>("/stock/profile2", { symbol });
    await sleep(THROTTLE_MS);
    const metric = await this.get<MetricResponse>("/stock/metric", { symbol, metric: "all" });
    await sleep(THROTTLE_MS);

    return {
      sector: profile.finnhubIndustry ?? "Unknown",
      debtToMarketCap: deriveDebtToMarketCap(profile, metric.metric ?? {}),
    };
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(FINNHUB_BASE_URL + path);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("token", this.apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Finnhub request failed: ${path} -> ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}

// Finnhub's free tier doesn't expose a raw total-debt dollar figure, only
// debt/equity ratios and per-share book value. We reconstruct total equity
// from bookValuePerShareQuarterly x shareOutstanding (both real reported
// figures from Finnhub, same units convention as marketCapitalization),
// then apply the reported debt/equity ratio to get total debt. This is a
// derivation from real data, not a fabricated number: if any input is
// missing, the result is null rather than guessed.
function deriveDebtToMarketCap(
  profile: Profile2Response,
  metric: NonNullable<MetricResponse["metric"]>
): number | null {
  const marketCap = profile.marketCapitalization;
  const shareOutstanding = profile.shareOutstanding;
  const bookValuePerShare = metric.bookValuePerShareQuarterly;
  const debtToEquity = metric["totalDebt/totalEquityQuarterly"];

  if (
    typeof marketCap !== "number" ||
    marketCap <= 0 ||
    typeof shareOutstanding !== "number" ||
    typeof bookValuePerShare !== "number" ||
    typeof debtToEquity !== "number"
  ) {
    return null;
  }

  const totalEquity = bookValuePerShare * shareOutstanding;
  const totalDebt = debtToEquity * totalEquity;
  return totalDebt / marketCap;
}
