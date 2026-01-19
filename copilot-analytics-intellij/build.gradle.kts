plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.22"
    id("org.jetbrains.intellij.platform") version "2.2.1"
    id("org.jetbrains.kotlin.plugin.serialization") version "1.9.22"
}

group = "com.copilotanalytics"
version = "1.0.0"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.1")
        bundledPlugin("com.intellij.java")
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }

    // Supabase client for JVM
    implementation("io.github.jan-tennert.supabase:postgrest-kt:3.0.0")
    implementation("io.github.jan-tennert.supabase:gotrue-kt:3.0.0")
    implementation("io.ktor:ktor-client-okhttp:3.0.0")

    // Encryption
    implementation("org.bouncycastle:bcprov-jdk18on:1.78")

    // JSON
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.0")

    testImplementation("junit:junit:4.13.2")
}

intellijPlatform {
    pluginConfiguration {
        name = "Copilot Analytics"
        version = project.version.toString()
        ideaVersion {
            sinceBuild = "241"
            untilBuild = "251.*"
        }
    }
}

kotlin {
    jvmToolchain(17)
}
