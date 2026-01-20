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
        mockEmailService = new EmailService();
        (EmailService as any).mockImplementation(() => mockEmailService);
        mockEmailService.sendEmail = jest.fn();
    });

    it("should send an email when a user is added to a cohort", async () => {
        // Setup mocks (using the fluent helper pattern or simpler if possible)
        const createFluentMock = (finalData: any) => {
            const builder: any = {};
            builder.select = jest.fn(() => builder);
            builder.eq = jest.fn(() => builder);
            builder.gte = jest.fn(() => builder);
            builder.update = jest.fn(() => builder);
            builder.delete = jest.fn(() => builder);
            builder.then = (resolve: any, reject: any) => Promise.resolve(finalData).then(resolve, reject);
            builder.single = jest.fn(() => Promise.resolve(finalData));
            builder.upsert = jest.fn(() => Promise.resolve({ error: null }));
            builder.insert = jest.fn(() => Promise.resolve({ error: null }));
            return builder;
        };

        mockSupabase.from.mockImplementation((table: string) => {
             if (table === 'daily_metrics') {
                return createFluentMock({
                    data: [{
                        user_id: "user_new@example.com", // Valid email
                        date: "2024-01-01",
                        total_prompts: 100, // High prompts
                        accepted_count: 5,  // Low acceptance -> Over-prompter
                        retry_count: 10,
                        context_avg_files: 1
                    }]
                });
            }
            if (table === 'cohorts') {
                return createFluentMock({
                    data: { id: 1, name: "Over-prompters", coaching_plan: "Plan A" }
                });
            }
            if (table === 'cohort_members') {
                // When we check for existing members, return { data: null } to simulate NEW member
                // The issue before was `finalData` was `null`, so `await supabase...` returned `null`.
                // But destructuring `const { data } = null` throws error.
                // It should return `{ data: null }`.

                const builder = createFluentMock({ data: null });
                return builder;
            }
            return createFluentMock({});
        });

        await cohortDetection();

        expect(mockEmailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: "user_new@example.com",
            subject: expect.stringContaining("Over-prompters"),
        }));
    });
});
