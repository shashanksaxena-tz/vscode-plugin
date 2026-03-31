"use client";

import { useState } from "react";
import { CohortModal, Cohort } from "./CohortModal";

interface CohortListProps {
  cohorts: Cohort[];
}

export function CohortList({ cohorts }: CohortListProps) {
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateClick = () => {
    setSelectedCohort(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditClick = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleViewClick = (cohort: Cohort) => {
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
        <h2 className="text-xl font-semibold text-gray-800">All Cohorts</h2>
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
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Members
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coaching Plan
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cohorts.map((cohort) => (
              <tr key={cohort.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleViewClick(cohort)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-900 text-left"
                  >
                    {cohort.name}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {cohort.description || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {cohort.member_count ?? 0}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {cohort.coaching_plan || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEditClick(cohort)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {cohorts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No cohorts found. Create one to get started.
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
