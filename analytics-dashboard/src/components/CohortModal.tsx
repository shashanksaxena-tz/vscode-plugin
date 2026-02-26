"use client";

import { Database } from "@/types/database";
import { useState, useEffect, useCallback } from "react";
import { updateCohort, createCohort, deleteCohort, addCohortMember, removeCohortMember, getCohortMembers, getAvailableUsers } from "@/app/actions/cohorts";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Json = Database["public"]["Tables"]["cohorts"]["Row"]["criteria"];
type User = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name" | "email" | "department" | "role">;

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

  const [members, setMembers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Reset state when modal opens or cohort changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialMode === 'create') {
        setForm({ name: "", description: "", coaching_plan: "" });
        setMembers([]);
        setAvailableUsers([]);
      } else if (cohort) {
        setForm({
          name: cohort.name,
          description: cohort.description || "",
          coaching_plan: cohort.coaching_plan || ""
        });
      }
    }
  }, [isOpen, cohort, initialMode]);

  const fetchMemberData = useCallback(async () => {
    if (!cohort) return;
    setIsLoadingMembers(true);
    try {
      const [m, a] = await Promise.all([
        getCohortMembers(cohort.id),
        getAvailableUsers(cohort.id)
      ]);
      setMembers(m);
      setAvailableUsers(a);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to fetch cohort members");
    } finally {
      setIsLoadingMembers(false);
    }
  }, [cohort]);

  useEffect(() => {
    if (isOpen && mode === 'edit' && cohort) {
      fetchMemberData();
    }
  }, [isOpen, mode, cohort, fetchMemberData]);

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
        toast.success("Cohort created successfully");
      } catch (error) {
        console.error("Failed to create cohort:", error);
        toast.error("Failed to create cohort.");
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
        toast.success("Cohort updated successfully");
      } catch (error) {
        console.error("Failed to update cohort:", error);
        toast.error("Failed to update cohort.");
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
      toast.success("Cohort deleted successfully");
    } catch (error) {
      console.error("Failed to delete cohort:", error);
      toast.error("Failed to delete cohort.");
    }
  };

  const handleAddMember = async () => {
    if (!cohort || !selectedUserId) return;
    try {
      await addCohortMember(cohort.id, selectedUserId);
      toast.success("Member added");
      setSelectedUserId("");
      fetchMemberData(); // Refresh list
      router.refresh(); // Update parent member counts/lists if needed
    } catch (error) {
      console.error("Failed to add member:", error);
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!cohort) return;
    if (!confirm("Remove this user from the cohort?")) return;
    try {
      await removeCohortMember(cohort.id, userId);
      toast.success("Member removed");
      fetchMemberData(); // Refresh list
      router.refresh();
    } catch (error) {
       console.error("Failed to remove member:", error);
       toast.error("Failed to remove member");
    }
  };

  if (!isOpen) return null;

  // Determine what to display based on mode
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

                  {mode === 'edit' && (
                    <div className="mt-6 border-t pt-4">
                       <h4 className="text-sm font-medium text-gray-900">Cohort Members</h4>
                       {isLoadingMembers ? (
                         <p className="text-sm text-gray-500">Loading members...</p>
                       ) : (
                         <div className="mt-2 space-y-2">
                           <ul className="divide-y divide-gray-200 max-h-40 overflow-y-auto">
                             {members.map(member => (
                               <li key={member.id} className="py-2 flex justify-between items-center">
                                 <div className="text-sm">
                                   <span className="font-medium text-gray-900">{member.name || member.email}</span>
                                   <span className="block text-gray-500 text-xs">{member.email}</span>
                                 </div>
                                 <button
                                   onClick={() => handleRemoveMember(member.id)}
                                   className="text-red-600 hover:text-red-900 text-xs font-medium"
                                 >
                                   Remove
                                 </button>
                               </li>
                             ))}
                             {members.length === 0 && <li className="text-sm text-gray-500 italic">No members</li>}
                           </ul>

                           <div className="mt-4 flex gap-2">
                              <select
                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                              >
                                <option value="">Select user to add...</option>
                                {availableUsers.map(user => (
                                  <option key={user.id} value={user.id}>
                                    {user.name || user.email}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={handleAddMember}
                                disabled={!selectedUserId}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                              >
                                Add
                              </button>
                           </div>
                         </div>
                       )}
                    </div>
                  )}

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
