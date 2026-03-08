interface InsightsListProps {
  insights: string[];
}

export function InsightsList({ insights }: InsightsListProps) {
  if (insights.length === 0) {
    return (
      <p className="text-gray-500">No insights yet. Keep using Copilot to generate insights!</p>
    );
  }

  return (
    <ul className="space-y-3">
      {insights.map((insight, index) => (
        <li
          key={index}
          className="flex items-start p-4 bg-purple-50 rounded-lg"
        >
          <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
            {index + 1}
          </span>
          <p className="text-gray-700">{insight}</p>
        </li>
      ))}
    </ul>
  );
}
