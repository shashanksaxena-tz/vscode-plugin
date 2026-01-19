package com.copilotanalytics.services

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.ktor.client.engine.okhttp.*
import io.github.jan.supabase.auth.auth

open class SupabaseClient(
    private val url: String,
    private val anonKey: String
) {
    private val client = createSupabaseClient(
        supabaseUrl = url,
        supabaseKey = anonKey
    ) {
        install(Postgrest)
        install(Auth)

        httpEngine = OkHttp.create()
    }

    open suspend fun authenticate(email: String, password: String) {
        client.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
    }

    open suspend fun insertEvents(events: List<DbEvent>) {
        client.from("events").insert(events)
    }

    open suspend fun getMyScore(): Int {
        val result = client.from("quality_scores")
            .select {
                filter { eq("user_id", client.auth.currentUserOrNull()?.id ?: "") }
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
