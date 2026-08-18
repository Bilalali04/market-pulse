import Link from "next/link";
import { TickerStrip } from "../components/TickerStrip";
import { PulseDivider } from "../components/PulseDivider";

const STEPS = [
  {
    number: "01",
    title: "Create an account",
    body: "Register with an email and password. No approval process, no waitlist.",
  },
  {
    number: "02",
    title: "Get watchlist access",
    body: "Every account gets the full watchlist and full real-time stream. No paid tier gating live data.",
  },
  {
    number: "03",
    title: "Watch prices and compliance status update live",
    body: "Trade prices and each symbol's halal-compliance screen update as new data arrives, not on a page refresh.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-paper">
      <section className="flex flex-col">
        <TickerStrip />

        <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-6 py-20 sm:px-10">
          <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
            Real-time market data, screened for halal compliance.
          </h1>
          <p className="max-w-xl text-base text-slate sm:text-lg">
            Live prices and a rules-based halal-compliance screen for your watchlist, updated in real time.
            Requires an account.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-slate"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded border border-hairline px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <PulseDivider />

      <section className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
        <h2 className="font-display text-2xl text-ink">How it works</h2>
        <ol className="mt-8 flex flex-col gap-8">
          {STEPS.map((step) => (
            <li key={step.number} className="flex gap-4">
              <span className="font-mono text-sm text-slate">{step.number}</span>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium text-ink">{step.title}</h3>
                <p className="text-sm text-slate">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
