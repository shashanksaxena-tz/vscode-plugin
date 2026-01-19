interface ScoreCardProps {
  title: string;
  score: number;
  maxScore: number;
  color: "blue" | "green" | "purple" | "red";
}

const colorClasses = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
};

export function ScoreCard({ title, score, maxScore, color }: ScoreCardProps) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase">{title}</h3>
      <div className="mt-2 flex items-baseline">
        <span className="text-4xl font-bold text-gray-900">{score}</span>
        <span className="ml-2 text-gray-500">/ {maxScore}</span>
      </div>
      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
