import { ScreeningResult } from "../lib/api";

// Tailwind's bg-signal/5 opacity-modifier syntax doesn't resolve against
// our hex-based CSS variables (it needs RGB-channel tokens for that,
// which the shared token system doesn't use), so the subtle card tint is
// mixed directly via CSS color-mix() instead.
const COMPLIANT_CARD =
  "border-[color-mix(in_srgb,var(--signal)_35%,var(--paper))] bg-[color-mix(in_srgb,var(--signal)_8%,var(--paper))]";
const NON_COMPLIANT_CARD =
  "border-[color-mix(in_srgb,var(--flag)_35%,var(--paper))] bg-[color-mix(in_srgb,var(--flag)_8%,var(--paper))]";

interface ComplianceBadgeProps {
  result: ScreeningResult | null;
  isLoading: boolean;
  error: string | null;
}

export function ComplianceBadge({ result, isLoading, error }: ComplianceBadgeProps) {
  if (isLoading) {
    return (
      <div className="rounded border border-hairline p-4">
        <p className="text-sm text-slate">Loading compliance screen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-hairline p-4">
        <p className="text-sm text-flag">{error}</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-3 rounded border p-4 ${result.compliant ? COMPLIANT_CARD : NON_COMPLIANT_CARD}`}>
      <span
        className={`inline-block w-fit rounded px-3 py-1 text-sm font-medium text-paper ${
          result.compliant ? "bg-signal" : "bg-flag"
        }`}
      >
        {result.compliant ? "Halal compliant" : "Not compliant"}
      </span>
      {result.reasons.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm text-slate">
          {result.reasons.map((reason) => (
            <li key={reason} className="leading-relaxed">
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
