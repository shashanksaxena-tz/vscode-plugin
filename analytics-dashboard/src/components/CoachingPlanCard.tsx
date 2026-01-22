import { Database } from "@/types/database";

type Cohort = Database["public"]["Tables"]["cohorts"]["Row"];

interface CoachingPlanCardProps {
  cohorts: Pick<Cohort, "name" | "description" | "coaching_plan">[];
}

export function CoachingPlanCard({ cohorts }: CoachingPlanCardProps) {
  if (!cohorts || cohorts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Your Coaching Plan</h2>
      <div className="space-y-6">
        {cohorts.map((cohort, index) => (
          <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50 rounded-r-md">
            <h3 className="font-bold text-lg text-indigo-900">{cohort.name}</h3>
            {cohort.description && (
              <p className="text-sm text-indigo-700 mt-1 mb-2 italic">
                {cohort.description}
              </p>
            )}
            <div className="text-gray-800 prose prose-sm max-w-none whitespace-pre-line">
              {cohort.coaching_plan || "No specific coaching plan assigned."}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
