package com.copilotanalytics.services

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.util.concurrent.ConcurrentLinkedDeque
import com.copilotanalytics.settings.PluginSettings
import org.jetbrains.annotations.VisibleForTesting

@Service(Service.Level.APP)
class TelemetryService {

    private val eventBuffer = ConcurrentLinkedDeque<TelemetryEvent>()
    private var supabaseClient: SupabaseClient? = null
    private var userId: String = ""
    private var sessionId: String = ""
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val encryption = EncryptionService()

    companion object {
        private const val MAX_BUFFER_SIZE = 1000
    }

    fun initialize(project: Project) {
        val settings = project.getService(PluginSettings::class.java)

        if (supabaseClient == null) {
            supabaseClient = SupabaseClient(
                url = settings.supabaseUrl,
                anonKey = settings.supabaseAnonKey
            )
        }

        userId = settings.userEmail
        sessionId = "${System.currentTimeMillis()}-${(Math.random() * 100000).toInt()}"

        // Start flush timer
        scope.launch {
            while (isActive) {
                delay(30_000) // 30 seconds
                flush()
            }
        }
    }

    @VisibleForTesting
    fun setClientForTest(client: SupabaseClient) {
        this.supabaseClient = client
    }

    @VisibleForTesting
    fun setUserIdForTest(id: String) {
        this.userId = id
        this.sessionId = "test-session"
    }

    fun record(event: TelemetryEvent) {
        val enrichedEvent = event.copy(
            userId = userId,
            sessionId = sessionId,
            platform = "copilot-intellij"
        )

        while (eventBuffer.size >= MAX_BUFFER_SIZE) {
            eventBuffer.poll()
        }
        eventBuffer.add(enrichedEvent)

        // Flush if buffer is large
        if (eventBuffer.size >= 50) {
            scope.launch { flush() }
        }
    }

    suspend fun flush() {
        if (eventBuffer.isEmpty()) return

        val events = mutableListOf<TelemetryEvent>()
        while (eventBuffer.isNotEmpty()) {
            eventBuffer.poll()?.let { events.add(it) }
        }

        try {
            supabaseClient?.insertEvents(events.map { it.toDbEvent(encryption) })
        } catch (e: Exception) {
            // Re-add to buffer on failure, respecting limit and order
            val iterator = events.listIterator(events.size)
            while (iterator.hasPrevious()) {
                val event = iterator.previous()
                if (eventBuffer.size < MAX_BUFFER_SIZE) {
                    eventBuffer.addFirst(event)
                }
            }
            println("Failed to flush telemetry: ${e.message}")
        }
    }

    fun dispose() {
        runBlocking { flush() }
        scope.cancel()
    }
}

enum class EventType {
    COMPLETION_REQUESTED,
    COMPLETION_SHOWN,
    COMPLETION_ACCEPTED,
    COMPLETION_REJECTED,
    PROMPT_SUBMITTED,
    RESPONSE_RECEIVED,
    EDIT_AFTER_ACCEPT
}

@Serializable
data class TelemetryEvent(
    val eventType: EventType,
    val timestamp: Long,
    val userId: String = "",
    val sessionId: String = "",
    val platform: String = "",
    val model: String? = null,
    val promptData: String? = null,
    val responseData: String? = null,
    val metadata: Map<String, String> = emptyMap()
) {
    fun toDbEvent(encryption: EncryptionService): DbEvent {
        return DbEvent(
            user_id = userId,
            session_id = sessionId,
            timestamp = java.time.Instant.ofEpochMilli(timestamp).toString(),
            event_type = eventType.name.lowercase(),
            platform = platform,
            model = model,
            prompt_encrypted = promptData?.let { encryption.encrypt(it) },
            response_encrypted = responseData?.let { encryption.encrypt(it) },
            metadata = buildJsonObject {
                metadata.forEach { (k, v) ->
                    put(k, JsonPrimitive(v))
                }
            }
        )
    }
}

@Serializable
data class DbEvent(
    val user_id: String,
    val session_id: String,
    val timestamp: String,
    val event_type: String,
    val platform: String,
    val model: String?,
    val prompt_encrypted: String?,
    val response_encrypted: String?,
    val metadata: JsonObject
)
