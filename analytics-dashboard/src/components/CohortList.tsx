import { Database } from "@/types/database";

type Cohort = Database["public"]["Tables"]["cohorts"]["Row"];

interface CohortListProps {
  cohorts: Cohort[];
}

export function CohortList({ cohorts }: CohortListProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Detected Cohorts</h2>
        <p className="text-sm text-gray-500 mt-1">Groups of developers identified by usage patterns.</p>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cohort Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Member Count
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Coaching Plan
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {cohorts.map((cohort) => (
            <tr key={cohort.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-indigo-600">
                  {cohort.name}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{cohort.description}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {cohort.member_count} members
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-500 italic">{cohort.coaching_plan}</div>
              </td>
            </tr>
          ))}
          {cohorts.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                No cohorts detected yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
