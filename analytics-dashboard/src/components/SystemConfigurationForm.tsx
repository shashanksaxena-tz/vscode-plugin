"use client";

import { useState } from "react";
import { updateSystemSetting } from "@/app/actions/settings";

export function SystemConfigurationForm({ initialProvider }: { initialProvider: string }) {
  const [provider, setProvider] = useState(initialProvider);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ text: "", type: "" });
    const result = await updateSystemSetting("LLM_PROVIDER", provider);

    if (result.error) {
      setMessage({ text: result.error, type: "error" });
    } else {
      setMessage({ text: "Settings saved successfully.", type: "success" });
    }
    setIsSaving(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">System Configuration</h2>

      <div className="space-y-4 max-w-md">
        <div>
          <label htmlFor="llm-provider" className="block text-sm font-medium text-gray-700 mb-1">
            Active LLM Provider
          </label>
          <select
            id="llm-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="gemini">Google (Gemini)</option>
          </select>
          <p className="mt-2 text-sm text-gray-500">
            This determines which AI model the batch processor uses for generating insights.
          </p>
        </div>

        <div className="pt-2 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>

          {message.text && (
            <span className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
