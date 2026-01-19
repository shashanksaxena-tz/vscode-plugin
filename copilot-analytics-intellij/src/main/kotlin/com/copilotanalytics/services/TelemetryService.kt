package com.copilotanalytics.services

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.util.concurrent.ConcurrentLinkedQueue
import com.copilotanalytics.settings.PluginSettings

@Service(Service.Level.APP)
class TelemetryService {

    private val eventBuffer = ConcurrentLinkedQueue<TelemetryEvent>()
    private var supabaseClient: SupabaseClient? = null
    private var userId: String = ""
    private var sessionId: String = ""
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val encryption = EncryptionService()

    fun initialize(project: Project) {
        val settings = project.getService(PluginSettings::class.java)

        supabaseClient = SupabaseClient(
            url = settings.supabaseUrl,
            anonKey = settings.supabaseAnonKey
        )

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

    fun record(event: TelemetryEvent) {
        val enrichedEvent = event.copy(
            userId = userId,
            sessionId = sessionId,
            platform = "copilot-intellij"
        )
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
            // Re-add to buffer on failure
            events.forEach { eventBuffer.add(it) }
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
    val metadata: Map<String, Any?> = emptyMap()
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
            metadata = Json.encodeToString(
                kotlinx.serialization.json.JsonObject.serializer(),
                kotlinx.serialization.json.buildJsonObject {
                    metadata.forEach { (k, v) ->
                        when (v) {
                            is String -> put(k, kotlinx.serialization.json.JsonPrimitive(v))
                            is Number -> put(k, kotlinx.serialization.json.JsonPrimitive(v))
                            is Boolean -> put(k, kotlinx.serialization.json.JsonPrimitive(v))
                            else -> put(k, kotlinx.serialization.json.JsonPrimitive(v.toString()))
                        }
                    }
                }
            )
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
    val metadata: String
)
