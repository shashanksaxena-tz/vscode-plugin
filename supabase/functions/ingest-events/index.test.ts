import { handler } from "./index.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Mock Deno.env if not available (for non-Deno environments running this test)
if (typeof Deno === 'undefined') {
  globalThis.Deno = {
    env: {
      get: (key: string) => "mock-value",
    }
  } as any;
} else {
    // If Deno is available, set env vars
    try {
        Deno.env.set("SUPABASE_URL", "http://localhost:54321");
        Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "mock-key");
    } catch (e) {
        // Ignore permission errors
    }
}

Deno.test("handler - OPTIONS request returns CORS headers", async () => {
  const req = new Request("http://localhost:54321/functions/v1/ingest-events", {
    method: "OPTIONS",
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("handler - rejects empty payload", async () => {
  const req = new Request("http://localhost:54321/functions/v1/ingest-events", {
    method: "POST",
    body: JSON.stringify([]),
  });
  const res = await handler(req);
  // It should return 400 because validEvents.length === 0
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "No valid events");
});

Deno.test("handler - rejects invalid events", async () => {
  const req = new Request("http://localhost:54321/functions/v1/ingest-events", {
    method: "POST",
    body: JSON.stringify([{ invalid: "event" }]),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "No valid events");
});

// Note: To test success path, we would need to mock createClient from @supabase/supabase-js.
// This requires using import maps or a dependency injection pattern not currently implemented.
