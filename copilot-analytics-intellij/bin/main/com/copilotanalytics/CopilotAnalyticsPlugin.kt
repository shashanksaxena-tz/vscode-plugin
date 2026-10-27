package com.copilotanalytics

import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity
import com.copilotanalytics.services.TelemetryService
import com.intellij.openapi.components.service

class CopilotAnalyticsStartup : ProjectActivity {
    override suspend fun execute(project: Project) {
        val telemetryService = service<TelemetryService>()
        telemetryService.initialize(project)

        println("Copilot Analytics initialized for project: ${project.name}")
    }
}
