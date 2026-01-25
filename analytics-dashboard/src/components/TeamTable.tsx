"use client";

import { Database } from "@/types/database";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCohort, createCohort, deleteCohort } from "@/app/actions/cohorts";

type User = Database["public"]["Tables"]["users"]["Row"];
type QualityScore = Database["public"]["Tables"]["quality_scores"]["Row"];
type Json = Database["public"]["Tables"]["cohorts"]["Row"]["criteria"];

interface Cohort {
  id: string;
  name: string;
  coaching_plan: string | null;
  description: string | null;
  criteria: Json;
}

export interface TeamMember extends User {
  latest_score?: QualityScore | null;
  cohorts?: Cohort[];
}

interface TeamTableProps {
  members: TeamMember[];
}

export function TeamTable({ members }: TeamTableProps) {
  const router = useRouter();
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; description: string; coaching_plan: string }>({
    name: "",
    description: "",
    coaching_plan: ""
  });

  const handleCreateClick = () => {
    setEditForm({
      name: "",
      description: "",
      coaching_plan: ""
    });
    setIsCreating(true);
    // Use a dummy cohort for the modal to render
    setSelectedCohort({
      id: "new",
      name: "New Cohort",
      description: "",
      coaching_plan: "",
      criteria: {}
    });
    setIsEditing(true);
  };

  const handleEditClick = () => {
    if (selectedCohort) {
      setEditForm({
        name: selectedCohort.name,
        description: selectedCohort.description || "",
        coaching_plan: selectedCohort.coaching_plan || ""
      });
      setIsEditing(true);
    }
  };

  const handleClose = () => {
    setSelectedCohort(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!selectedCohort) return;

    try {
      if (isCreating) {
        await createCohort(editForm);
      } else {
        await updateCohort(selectedCohort.id, editForm);
      }

      setSelectedCohort(isCreating ? null : {
        ...selectedCohort,
        ...editForm
      });
      setIsEditing(false);
      setIsCreating(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to save cohort:", error);
      alert("Failed to save cohort. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!selectedCohort || isCreating) return;

    if (!confirm("Are you sure you want to delete this cohort? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteCohort(selectedCohort.id);
      setSelectedCohort(null);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete cohort:", error);
      alert("Failed to delete cohort. Please try again.");
    }
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
                      <div className="text-sm font-medium text-gray-900">
                        {member.name || member.email}
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
                          onClick={() => setSelectedCohort(cohort)}
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

      {selectedCohort && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={handleClose}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  {isEditing ? (
                    <>
                      <div>
                        <label htmlFor="cohort-name" className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          name="cohort-name"
                          id="cohort-name"
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div className="mt-4">
                        <label htmlFor="cohort-description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          id="cohort-description"
                          rows={3}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                      </div>
                      <div className="mt-4">
                        <label htmlFor="cohort-plan" className="block text-sm font-medium text-gray-700">Coaching Plan</label>
                        <textarea
                          id="cohort-plan"
                          rows={5}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                          value={editForm.coaching_plan}
                          onChange={(e) => setEditForm({ ...editForm, coaching_plan: e.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        {selectedCohort.name}
                      </h3>
                      <div className="mt-4 space-y-4">
                        {selectedCohort.description && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Description</h4>
                            <p className="text-sm text-gray-700 mt-1">{selectedCohort.description}</p>
                          </div>
                        )}

                        {selectedCohort.coaching_plan && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Coaching Plan</h4>
                            <p className="text-sm text-gray-700 mt-1 bg-blue-50 p-3 rounded-md border border-blue-100">{selectedCohort.coaching_plan}</p>
                          </div>
                        )}

                        {selectedCohort.criteria && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Criteria</h4>
                            <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-3 rounded-md overflow-x-auto">
                              {JSON.stringify(selectedCohort.criteria, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={handleSave}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => {
                        setIsEditing(false);
                        if (isCreating) handleClose();
                      }}
                    >
                      Cancel
                    </button>
                    {!isCreating && (
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:mr-auto sm:w-auto sm:text-sm"
                        onClick={handleDelete}
                      >
                        Delete
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={handleClose}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={handleEditClick}
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
