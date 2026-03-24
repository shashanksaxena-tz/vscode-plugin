"use client";

import { Database } from "@/types/database";
import { useState } from "react";
import { CohortModal, Cohort } from "./CohortModal";
import Link from "next/link";

type User = Database["public"]["Tables"]["users"]["Row"];
type QualityScore = Database["public"]["Tables"]["quality_scores"]["Row"];

export interface TeamMember extends User {
  latest_score?: QualityScore | null;
  cohorts?: Cohort[];
}

interface TeamTableProps {
  members: TeamMember[];
}

export function TeamTable({ members }: TeamTableProps) {
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateClick = () => {
    setSelectedCohort(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleCohortClick = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedCohort(null);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Team Members</h2>
        <button
          onClick={handleCreateClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create Cohort
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cohorts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Overall Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Effectiveness
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Efficiency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-0">
                      <div className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                        <Link href={`/dashboard/team/${member.id}`}>
                          {member.name || member.email}
                        </Link>
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.department || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {member.cohorts && member.cohorts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {member.cohorts.map((cohort, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleCohortClick(cohort)}
                          className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                        >
                          {cohort.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {member.latest_score ? (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.latest_score.overall_score >= 80 ? 'bg-green-100 text-green-800' :
                      member.latest_score.overall_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {member.latest_score.overall_score}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.latest_score?.effectiveness_score ?? "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.latest_score?.efficiency_score ?? "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(member.last_active).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No team members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CohortModal
        isOpen={isModalOpen}
        onClose={handleClose}
        cohort={selectedCohort}
        initialMode={modalMode}
      />
    </>
  );
}
