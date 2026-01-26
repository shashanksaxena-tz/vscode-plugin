"use client";

import { Database } from "@/types/database";
import { useState, useEffect } from "react";
import { updateCohort, createCohort, deleteCohort } from "@/app/actions/cohorts";
import { useRouter } from "next/navigation";

type Json = Database["public"]["Tables"]["cohorts"]["Row"]["criteria"];

export interface Cohort {
  id: string;
  name: string;
  coaching_plan: string | null;
  description: string | null;
  criteria: Json;
  member_count?: number;
}

interface CohortModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohort: Cohort | null;
  initialMode: 'view' | 'edit' | 'create';
}

export function CohortModal({ isOpen, onClose, cohort, initialMode }: CohortModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(initialMode);
  const [form, setForm] = useState({
    name: "",
    description: "",
    coaching_plan: ""
  });

  // Reset state when modal opens or cohort changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialMode === 'create') {
        setForm({ name: "", description: "", coaching_plan: "" });
      } else if (cohort) {
        setForm({
          name: cohort.name,
          description: cohort.description || "",
          coaching_plan: cohort.coaching_plan || ""
        });
      }
    }
  }, [isOpen, cohort, initialMode]);

  const handleSave = async () => {
    if (mode === 'create') {
      try {
        await createCohort({
            name: form.name,
            description: form.description,
            coaching_plan: form.coaching_plan,
            criteria: {}
        });
        router.refresh();
        onClose();
      } catch (error) {
        console.error("Failed to create cohort:", error);
        alert("Failed to create cohort.");
      }
    } else if (mode === 'edit' && cohort) {
      try {
        await updateCohort(cohort.id, {
            name: form.name,
            description: form.description,
            coaching_plan: form.coaching_plan
        });
        router.refresh();
        onClose();
      } catch (error) {
        console.error("Failed to update cohort:", error);
        alert("Failed to update cohort.");
      }
    }
  };

  const handleDelete = async () => {
    if (!cohort || mode === 'create') return;

    if (!confirm("Are you sure you want to delete this cohort? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteCohort(cohort.id);
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Failed to delete cohort:", error);
      alert("Failed to delete cohort.");
    }
  };

  if (!isOpen) return null;

  // Determine what to display based on mode
  // If mode is view but no cohort, something is wrong, but we can just return null or handle gracefully.
  if ((mode === 'view' || mode === 'edit') && !cohort) return null;

  const currentCohort = cohort || { name: "New Cohort", description: "", coaching_plan: "", criteria: {} };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              {mode === 'edit' || mode === 'create' ? (
                <>
                  <div>
                    <label htmlFor="cohort-name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      name="cohort-name"
                      id="cohort-name"
                      className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="mt-4">
                    <label htmlFor="cohort-description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      id="cohort-description"
                      rows={3}
                      className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="mt-4">
                    <label htmlFor="cohort-plan" className="block text-sm font-medium text-gray-700">Coaching Plan</label>
                    <textarea
                      id="cohort-plan"
                      rows={5}
                      className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                      value={form.coaching_plan}
                      onChange={(e) => setForm({ ...form, coaching_plan: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {currentCohort.name}
                  </h3>
                  <div className="mt-4 space-y-4">
                    {currentCohort.description && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Description</h4>
                        <p className="text-sm text-gray-700 mt-1">{currentCohort.description}</p>
                      </div>
                    )}

                    {currentCohort.coaching_plan && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Coaching Plan</h4>
                        <p className="text-sm text-gray-700 mt-1 bg-blue-50 p-3 rounded-md border border-blue-100">{currentCohort.coaching_plan}</p>
                      </div>
                    )}

                    {currentCohort.criteria && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Criteria</h4>
                        <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-3 rounded-md overflow-x-auto">
                          {JSON.stringify(currentCohort.criteria, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            {mode === 'edit' || mode === 'create' ? (
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
                     if (mode === 'create') onClose();
                     else setMode('view');
                  }}
                >
                  Cancel
                </button>
                {mode === 'edit' && (
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
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setMode('edit')}
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
