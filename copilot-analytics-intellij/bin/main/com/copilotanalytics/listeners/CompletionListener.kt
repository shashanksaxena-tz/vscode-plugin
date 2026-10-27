package com.copilotanalytics.listeners

import com.intellij.codeInsight.completion.*
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.openapi.components.service
import com.intellij.patterns.PlatformPatterns
import com.intellij.util.ProcessingContext
import com.copilotanalytics.services.TelemetryService
import com.copilotanalytics.services.TelemetryEvent
import com.copilotanalytics.services.EventType

class CompletionListener : CompletionContributor() {

    init {
        // Register for all completion types to observe
        extend(
            CompletionType.BASIC,
            PlatformPatterns.psiElement(),
            CompletionObserver()
        )
    }

    private class CompletionObserver : CompletionProvider<CompletionParameters>() {
        override fun addCompletions(
            parameters: CompletionParameters,
            context: ProcessingContext,
            result: CompletionResultSet
        ) {
            val telemetry = service<TelemetryService>()
            val position = parameters.position
            val file = parameters.originalFile

            // Record completion request
            telemetry.record(TelemetryEvent(
                eventType = EventType.COMPLETION_REQUESTED,
                timestamp = System.currentTimeMillis(),
                metadata = mapOf(
                    "file_type" to (file.fileType.defaultExtension),
                    "line_number" to position.textOffset.toString(),
                    "completion_type" to parameters.completionType.name,
                    "is_auto_popup" to parameters.isAutoPopup.toString()
                )
            ))

            // Add result listener to track acceptance
            result.addLookupAdvertisement("Tracked by Copilot Analytics")

            result.runRemainingContributors(parameters) { completionResult ->
                val element = completionResult.lookupElement

                // Wrap element to track selection
                val wrappedElement = LookupElementBuilder
                    .create(element.lookupString)
                    .withInsertHandler { insertionContext, item ->
                        // Original insert
                        element.handleInsert(insertionContext)

                        // Track acceptance
                        telemetry.record(TelemetryEvent(
                            eventType = EventType.COMPLETION_ACCEPTED,
                            timestamp = System.currentTimeMillis(),
                            metadata = mapOf(
                                "lookup_string" to item.lookupString,
                                "file_type" to file.fileType.defaultExtension,
                                "inserted_length" to item.lookupString.length.toString()
                            )
                        ))
                    }

                result.passResult(completionResult.withLookupElement(wrappedElement))
            }
        }
    }
}
