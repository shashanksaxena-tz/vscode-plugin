package com.copilotanalytics.services

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.gotrue.GoTrue
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.ktor.client.engine.okhttp.*
import io.github.jan.supabase.gotrue.gotrue

class SupabaseClient(
    private val url: String,
    private val anonKey: String
) {
    private val client = createSupabaseClient(
        supabaseUrl = url,
        supabaseKey = anonKey
    ) {
        install(Postgrest)
        install(GoTrue)

        httpEngine = OkHttp.create()
    }

    suspend fun authenticate(email: String, password: String) {
        client.gotrue.signInWith(Email) {
            this.email = email
            this.password = password
        }
    }

    suspend fun insertEvents(events: List<DbEvent>) {
        client.from("events").insert(events)
    }

    suspend fun getMyScore(): Int {
        val result = client.from("quality_scores")
            .select {
                filter { eq("user_id", client.gotrue.currentUserOrNull()?.id ?: "") }
                order("week_start_date", io.github.jan.supabase.postgrest.query.Order.DESCENDING)
                limit(1)
            }
            .decodeSingleOrNull<QualityScore>()

        return result?.overall_score ?: 0
    }
}

@kotlinx.serialization.Serializable
data class QualityScore(
    val user_id: String,
    val week_start_date: String,
    val overall_score: Int,
    val effectiveness_score: Int,
    val best_practices_score: Int,
    val efficiency_score: Int
)
