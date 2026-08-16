import { ScreeningResult } from "../lib/api";

interface ComplianceBadgeProps {
  result: ScreeningResult | null;
  isLoading: boolean;
  error: string | null;
}

export function ComplianceBadge({ result, isLoading, error }: ComplianceBadgeProps) {
  if (isLoading) {
    return <p className="text-sm text-gray-600">Loading compliance screen...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!result) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <span
        className={`inline-block w-fit rounded px-3 py-1 text-sm font-medium text-white ${
          result.compliant ? "bg-green-600" : "bg-red-600"
        }`}
      >
        {result.compliant ? "Halal compliant" : "Not compliant"}
      </span>
      {result.reasons.length > 0 && (
        <ul className="list-inside list-disc text-sm text-gray-700">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
