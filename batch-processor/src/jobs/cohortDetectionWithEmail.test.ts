import { cohortDetection } from "./cohortDetection";
import { EmailService } from "../services/email";
import { createClient } from "../utils/supabase";

// Mock Supabase
const mockSupabase = {
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

// Mock EmailService
jest.mock("../services/email");

describe("Cohort Detection with Email", () => {
    let mockEmailService: any;

    beforeEach(() => {
        jest.clearAllMocks();
        // Since EmailService is mocked, we need to ensure the constructor returns our spy object
        mockEmailService = {
            sendEmail: jest.fn().mockResolvedValue(true)
        };
        (EmailService as unknown as jest.Mock).mockImplementation(() => mockEmailService);
    });

    it("should send an email when a user is added to a cohort", async () => {
        // Simple fluent mock helper
        const createFluentMock = (responseData: any) => {
            const builder: any = {};
            // Chain methods
            builder.select = jest.fn(() => builder);
            builder.eq = jest.fn(() => builder);
            builder.gte = jest.fn(() => builder);
            builder.update = jest.fn(() => builder);
            builder.delete = jest.fn(() => builder);
            builder.single = jest.fn(() => Promise.resolve(responseData));
            builder.upsert = jest.fn(() => Promise.resolve({ error: null }));
            builder.insert = jest.fn(() => Promise.resolve({ data: { id: 'new-cohort-id' }, error: null }));

            // To support direct await on the builder (e.g. for .select().gte())
            builder.then = (resolve: any, reject: any) => Promise.resolve(responseData).then(resolve, reject);

            return builder;
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'daily_metrics') {
                return createFluentMock({
                    data: [{
                        user_id: "user_new@example.com",
                        date: "2024-01-01",
                        total_prompts: 100,
                        accepted_count: 5,  // Low acceptance -> Over-prompter
                        retry_count: 10,
                        context_avg_files: 1
                    }],
                    error: null
                });
            }
            if (table === 'users') {
                 // Return UUID mapping for the test user
                 return createFluentMock({
                     data: [{ email: "user_new@example.com", id: "uuid-new" }],
                     error: null
                 });
             }
            if (table === 'cohorts') {
                // Return existing cohort
                return createFluentMock({
                    data: { id: 'cohort-id', name: "Over-prompters", coaching_plan: "Plan A" },
                    error: null
                });
            }
            if (table === 'cohort_members') {
                // Simulate NEW member (not found)
                return createFluentMock({ data: null, error: { code: 'PGRST116' } });
            }
            return createFluentMock({ data: [], error: null });
        });

        await cohortDetection();

        expect(mockEmailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: "user_new@example.com",
            subject: expect.stringContaining("Over-prompters"),
        }));
    });
});
