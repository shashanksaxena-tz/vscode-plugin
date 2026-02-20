
import { aggregateMetrics } from "./aggregateMetrics";
import { ruleBasedScoring } from "./ruleBasedScoring";
import { cohortDetection } from "./cohortDetection";
import { createClient } from "../utils/supabase";

// Mock Supabase client
const mockSupabase = {
    rpc: jest.fn(),
    from: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    single: jest.fn(),
    upsert: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
};

jest.mock("../utils/supabase", () => ({
    createClient: jest.fn(() => mockSupabase),
}));

describe("End-to-End Simulation Flow", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should run the full pipeline", async () => {
        // --- Setup Helper for Fluent API ---
        const createFluentMock = (responseData: any) => {
            const builder: any = {};
            // Return self for chaining
            builder.select = jest.fn(() => builder);
            builder.eq = jest.fn(() => builder);
            builder.gte = jest.fn(() => builder);
            builder.lte = jest.fn(() => builder);
            builder.order = jest.fn(() => builder);
            builder.limit = jest.fn(() => builder);
            builder.update = jest.fn(() => builder);

            // Delete needs to return a builder that allows chaining `eq` (for delete filters)
            builder.delete = jest.fn(() => builder);

            // Terminal methods return promises
            // FIX: Wrap responseData in { data: ... } structure expected by Supabase client
            builder.then = (resolve: any, reject: any) =>
                Promise.resolve({ data: responseData, error: null }).then(resolve, reject);

            builder.single = jest.fn(() => Promise.resolve({ data: Array.isArray(responseData) ? responseData[0] : responseData, error: null }));
            builder.upsert = jest.fn(() => Promise.resolve({ error: null }));
            builder.insert = jest.fn(() => Promise.resolve({ error: null }));
            return builder;
        };

        // We need to route `.from(table)` to the correct response
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'events') {
                 return createFluentMock([{ user_id: 'user_1' }]);
            }
            if (table === 'daily_metrics') {
                return createFluentMock([{
                        user_id: "user_1",
                        date: new Date().toISOString().split('T')[0], // Use TODAY's date
                        total_prompts: 10,
                        accepted_count: 8,
                        retry_count: 1,
                        avg_response_time_ms: 500,
                        total_tokens_used: 5000,
                        context_avg_files: 5,
                    }]);
            }
            if (table === 'users') {
                 return createFluentMock([{ email: "user_1", id: "uuid-1" }]);
            }
            if (table === 'quality_scores') {
                return createFluentMock([{
                    user_id: "user_1",
                    week_start_date: "2024-01-01",
                    overall_score: 80,
                    effectiveness_score: 85,
                    efficiency_score: 75,
                    best_practices_score: 50
                }]);
            }
            if (table === 'cohorts') {
                return createFluentMock([
                    { id: 1, name: "Over-prompters", description: "..." },
                    { id: 2, name: "Context-light users", description: "..." },
                    { id: 3, name: "Retry loopers", description: "..." }
                ]);
            }
            if (table === 'cohort_members') {
                return createFluentMock([]);
            }
            return createFluentMock([]);
        });

        mockSupabase.rpc.mockResolvedValue({ error: null });

        // Run Aggregation
        await aggregateMetrics();
        expect(mockSupabase.rpc).toHaveBeenCalledWith("aggregate_daily_metrics", expect.any(Object));

        // Run Scoring
        await ruleBasedScoring();
        expect(mockSupabase.from).toHaveBeenCalledWith('events');

        // Run Cohort Detection
        await cohortDetection();

        expect(mockSupabase.from).toHaveBeenCalledWith('cohort_members');

        console.log("Full E2E simulation passed successfully");
    });
});
