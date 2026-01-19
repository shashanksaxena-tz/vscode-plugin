interface SuggestionsListProps {
  suggestions: string[];
}

export function SuggestionsList({ suggestions }: SuggestionsListProps) {
  if (suggestions.length === 0) {
    return (
      <p className="text-gray-500">No suggestions yet. Keep using Copilot to generate insights!</p>
    );
  }

  return (
    <ul className="space-y-3">
      {suggestions.map((suggestion, index) => (
        <li
          key={index}
          className="flex items-start p-4 bg-blue-50 rounded-lg"
        >
          <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
            {index + 1}
          </span>
          <p className="text-gray-700">{suggestion}</p>
        </li>
      ))}
    </ul>
  );
}
