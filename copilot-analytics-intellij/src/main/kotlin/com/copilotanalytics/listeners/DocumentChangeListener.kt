package com.copilotanalytics.listeners

import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.copilotanalytics.services.TelemetryService
import com.copilotanalytics.services.TelemetryEvent
import com.copilotanalytics.services.EventType

class DocumentChangeListener : DocumentListener {

    private var lastLargeInsertTime: Long = 0

    override fun documentChanged(event: DocumentEvent) {
        val telemetry = service<TelemetryService>()
        val document = event.document
        val file = FileDocumentManager.getInstance().getFile(document)

        // Detect large insertions (likely AI completions)
        val insertedText = event.newFragment.toString()

        if (looksLikeAICompletion(insertedText)) {
            val now = System.currentTimeMillis()

            // Debounce - don't record if we just recorded
            if (now - lastLargeInsertTime > 1000) {
                lastLargeInsertTime = now

                telemetry.record(TelemetryEvent(
                    eventType = EventType.COMPLETION_ACCEPTED,
                    timestamp = now,
                    metadata = mapOf(
                        "file_type" to (file?.extension ?: "unknown"),
                        "inserted_length" to insertedText.length.toString(),
                        "contains_newlines" to insertedText.contains("\n").toString(),
                        "offset" to event.offset.toString()
                    )
                ))
            }
        }
    }

    private fun looksLikeAICompletion(text: String): Boolean {
        // Heuristics for AI-generated code
        return text.length > 30 ||
               (text.contains("\n") && text.length > 10) ||
               text.contains("function") ||
               text.contains("class") ||
               text.contains("def ")
    }
}
