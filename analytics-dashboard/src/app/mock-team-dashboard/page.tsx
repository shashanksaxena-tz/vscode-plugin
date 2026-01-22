import { TeamTable, TeamMember } from "@/components/TeamTable";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function MockTeamDashboardPage() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_ROUTES !== 'true') {
    notFound();
  }

  const members: TeamMember[] = [
    {
      id: "1",
      email: "alice@example.com",
      name: "Alice",
      department: "Engineering",
      role: "developer",
      created_at: "2024-01-01",
      last_active: "2024-01-22",
      latest_score: {
        id: "s1",
        user_id: "alice@example.com",
        week_start_date: "2024-01-15",
        effectiveness_score: 85,
        best_practices_score: 90,
        efficiency_score: 88,
        overall_score: 87,
        insights: {},
        suggestions: {},
        created_at: "2024-01-22"
      },
      cohort_names: ["Senior Devs"]
    },
    {
      id: "2",
      email: "bob@example.com",
      name: "Bob",
      department: "Engineering",
      role: "developer",
      created_at: "2024-01-05",
      last_active: "2024-01-20",
      latest_score: null,
      cohort_names: []
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Analytics (Mock)</h1>
        <p className="text-gray-600">Department: Engineering</p>
      </header>

      <TeamTable members={members} />
    </div>
  );
}
