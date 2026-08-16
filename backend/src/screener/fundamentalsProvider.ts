export interface Fundamentals {
  sector: string;
  debtToMarketCap: number | null;
}

export interface FundamentalsProvider {
  getFundamentals(symbol: string): Promise<Fundamentals | null>;
}
