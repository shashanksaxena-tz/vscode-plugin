
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
        const createFluentMock = (finalData: any) => {
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
            builder.then = (resolve: any, reject: any) => Promise.resolve(finalData).then(resolve, reject);
            builder.single = jest.fn(() => Promise.resolve(finalData));
            builder.upsert = jest.fn(() => Promise.resolve({ error: null }));
            builder.insert = jest.fn(() => Promise.resolve({ error: null }));
            return builder;
        };

        // We need to route `.from(table)` to the correct response
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'events') {
                 // Used in ruleBasedScoring to get users
                 return createFluentMock({ data: [{ user_id: 'user_1' }] });
            }
            if (table === 'daily_metrics') {
                return createFluentMock({
                    data: [{
                        user_id: "user_1",
                        date: "2024-01-01",
                        total_prompts: 10,
                        accepted_count: 8,
                        retry_count: 1,
                        avg_response_time_ms: 500,
                        total_tokens_used: 5000,
                    }]
                });
            }
            if (table === 'quality_scores') {
                const builder = createFluentMock({ data: null }); // Default for single

                // Override for select-all case (cohort detection)
                 const scoreData = {
                    user_id: "user_1",
                    week_start_date: "2024-01-01",
                    overall_score: 80,
                    effectiveness_score: 85,
                    efficiency_score: 75,
                    best_practices_score: 50
                };

                const listBuilder = createFluentMock({ data: [scoreData] });

                // Special handling for single()
                listBuilder.single = jest.fn(() => Promise.resolve({ data: null }));

                return listBuilder;
            }
            if (table === 'cohorts') {
                return createFluentMock({
                    data: [
                        { id: 1, name: "Over-prompters", description: "..." },
                        { id: 2, name: "Context-light users", description: "..." },
                        { id: 3, name: "Retry loopers", description: "..." }
                    ]
                });
            }
            if (table === 'cohort_members') {
                return createFluentMock({ data: [] });
            }
            return createFluentMock({ data: [] });
        });

        mockSupabase.rpc.mockResolvedValue({ error: null });

        // Run Aggregation
        await aggregateMetrics();
        expect(mockSupabase.rpc).toHaveBeenCalledWith("aggregate_daily_metrics", expect.any(Object));

        // Run Scoring
        await ruleBasedScoring();
        expect(mockSupabase.from).toHaveBeenCalledWith('quality_scores');

        // Run Cohort Detection
        await cohortDetection();
        expect(mockSupabase.from).toHaveBeenCalledWith('cohorts');
        expect(mockSupabase.from).toHaveBeenCalledWith('cohort_members');

        console.log("Full E2E simulation passed successfully");
    });
});
