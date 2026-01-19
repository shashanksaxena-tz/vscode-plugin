package com.copilotanalytics.services

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.concurrent.CopyOnWriteArrayList

class TelemetryServiceTest {

    // Mock SupabaseClient
    class MockSupabaseClient : SupabaseClient("https://example.com", "dummy-key") {
        val insertedEvents = CopyOnWriteArrayList<List<DbEvent>>()

        override suspend fun insertEvents(events: List<DbEvent>) {
            insertedEvents.add(events)
        }

        override suspend fun authenticate(email: String, password: String) {
            // No-op
        }

        override suspend fun getMyScore(): Int {
            return 100
        }
    }

    @Test
    fun `test record buffers events`() = runBlocking {
        val service = TelemetryService()
        val mockClient = MockSupabaseClient()
        service.setClientForTest(mockClient)
        service.setUserIdForTest("test-user")

        val event = TelemetryEvent(
            eventType = EventType.COMPLETION_REQUESTED,
            timestamp = System.currentTimeMillis(),
            metadata = mapOf("file_type" to "kt")
        )

        service.record(event)

        // Should not be flushed immediately (buffer size < 50)
        assertEquals(0, mockClient.insertedEvents.size)

        // Manually flush
        service.flush()

        assertEquals(1, mockClient.insertedEvents.size)
        val flushedBatch = mockClient.insertedEvents[0]
        assertEquals(1, flushedBatch.size)
        assertEquals("completion_requested", flushedBatch[0].event_type)
        assertEquals("test-user", flushedBatch[0].user_id)

        service.dispose()
    }

    @Test
    fun `test auto flush on buffer size limit`() = runBlocking {
        val service = TelemetryService()
        val mockClient = MockSupabaseClient()
        service.setClientForTest(mockClient)
        service.setUserIdForTest("test-user")

        // Record 50 events
        repeat(50) {
            service.record(TelemetryEvent(
                eventType = EventType.COMPLETION_ACCEPTED,
                timestamp = System.currentTimeMillis()
            ))
        }

        // Wait a bit for the coroutine to launch flush
        kotlinx.coroutines.delay(500)

        // Should be flushed
        assert(mockClient.insertedEvents.size >= 1)

        service.dispose()
    }
}
