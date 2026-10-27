package com.copilotanalytics.settings

import com.intellij.openapi.components.*
import com.intellij.openapi.project.Project

@Service(Service.Level.PROJECT)
@State(
    name = "CopilotAnalyticsSettings",
    storages = [Storage("copilotAnalytics.xml")]
)
class PluginSettings : PersistentStateComponent<PluginSettings.State> {

    data class State(
        var enabled: Boolean = true,
        var supabaseUrl: String = "",
        var supabaseAnonKey: String = "",
        var userEmail: String = ""
    )

    private var myState = State()

    override fun getState(): State = myState

    override fun loadState(state: State) {
        myState = state
    }

    var enabled: Boolean
        get() = myState.enabled
        set(value) { myState.enabled = value }

    var supabaseUrl: String
        get() = myState.supabaseUrl
        set(value) { myState.supabaseUrl = value }

    var supabaseAnonKey: String
        get() = myState.supabaseAnonKey
        set(value) { myState.supabaseAnonKey = value }

    var userEmail: String
        get() = myState.userEmail
        set(value) { myState.userEmail = value }

    companion object {
        fun getInstance(project: Project): PluginSettings =
            project.getService(PluginSettings::class.java)
    }
}
