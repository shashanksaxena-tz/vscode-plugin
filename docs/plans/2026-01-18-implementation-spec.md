# Implementation Specification - Copilot Analytics Platform

**Date**: January 18, 2026
**Purpose**: Detailed code examples and implementation guide for any agent to start working without ambiguity.

---

## Table of Contents
1. [VS Code Extension (Copilot)](#1-vs-code-extension-copilot)
2. [Cursor Hooks Configuration](#2-cursor-hooks-configuration)
3. [JetBrains IDEA Plugin (Java)](#3-jetbrains-idea-plugin-java)
4. [Supabase Backend](#4-supabase-backend)
5. [Next.js Dashboard](#5-nextjs-dashboard)
6. [Batch Processor](#6-batch-processor)

---

## 1. VS Code Extension (Copilot)

### Project Structure
```
copilot-analytics-vscode/
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts           # Entry point
│   ├── providers/
│   │   └── completionTracker.ts
│   ├── services/
│   │   ├── telemetry.ts       # Data collection
│   │   ├── encryption.ts      # Client-side encryption
│   │   └── supabase.ts        # Backend client
│   ├── types/
│   │   └── events.ts
│   └── utils/
│       └── context.ts
└── .vsix                       # Built extension
```

### package.json
```json
{
  "name": "copilot-analytics",
  "displayName": "Copilot Analytics",
  "version": "1.0.0",
  "engines": { "vscode": "^1.105.0" },
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      { "command": "copilot-analytics.showScore", "title": "Show My Copilot Score" }
    ],
    "configuration": {
      "title": "Copilot Analytics",
      "properties": {
        "copilotAnalytics.enabled": { "type": "boolean", "default": true },
        "copilotAnalytics.supabaseUrl": { "type": "string" },
        "copilotAnalytics.supabaseAnonKey": { "type": "string" }
      }
    }
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.79.0",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.105.0",
    "typescript": "^5.4.0",
    "esbuild": "^0.20.0"
  }
}
```

### src/extension.ts
```typescript
import * as vscode from 'vscode';
import { TelemetryService } from './services/telemetry';
import { SupabaseService } from './services/supabase';
import { CompletionTracker } from './providers/completionTracker';

let telemetryService: TelemetryService;

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('copilotAnalytics');

  if (!config.get('enabled')) return;

  // Initialize Supabase client
  const supabase = new SupabaseService(
    config.get('supabaseUrl') as string,
    config.get('supabaseAnonKey') as string
  );

  // Authenticate user via VS Code auth
  const session = await vscode.authentication.getSession('github', ['user:email'], { createIfNone: true });
  await supabase.authenticate(session.accessToken);

  // Initialize telemetry
  telemetryService = new TelemetryService(supabase, session.account.id);

  // Track inline completions
  const tracker = new CompletionTracker(telemetryService);

  // Register inline completion provider wrapper
  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**' },
      tracker
    )
  );

  // Track document changes after completions
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      tracker.onDocumentChange(event);
    })
  );

  // Track active editor context
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) telemetryService.updateContext(editor);
    })
  );

  // Command to show score
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-analytics.showScore', async () => {
      const score = await supabase.getMyScore();
      vscode.window.showInformationMessage(`Your Copilot Score: ${score}/100`);
    })
  );

  console.log('Copilot Analytics activated');
}

export function deactivate() {
  telemetryService?.flush();
}
```

### src/providers/completionTracker.ts
```typescript
import * as vscode from 'vscode';
import { TelemetryService } from '../services/telemetry';
import { TelemetryEvent, EventType } from '../types/events';

export class CompletionTracker implements vscode.InlineCompletionItemProvider {
  private pendingCompletions: Map<string, { text: string; timestamp: number }> = new Map();

  constructor(private telemetry: TelemetryService) {}

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | null> {

    // Record that a completion was requested
    const completionId = `${document.uri.toString()}-${position.line}-${Date.now()}`;

    await this.telemetry.record({
      event_type: EventType.COMPLETION_REQUESTED,
      timestamp: new Date().toISOString(),
      metadata: {
        file_type: this.getFileExtension(document.fileName),
        line_number: position.line,
        context_files: this.telemetry.getOpenFileCount(),
        trigger_kind: context.triggerKind,
      }
    });

    // Let Copilot handle actual completion - we just observe
    return null;
  }

  onDocumentChange(event: vscode.TextDocumentChangeEvent) {
    // Detect if this looks like an accepted completion
    for (const change of event.contentChanges) {
      if (this.looksLikeAcceptedCompletion(change)) {
        this.telemetry.record({
          event_type: EventType.COMPLETION_ACCEPTED,
          timestamp: new Date().toISOString(),
          metadata: {
            file_type: this.getFileExtension(event.document.fileName),
            inserted_length: change.text.length,
            range_length: change.rangeLength,
          }
        });
      }
    }
  }

  private looksLikeAcceptedCompletion(change: vscode.TextDocumentContentChangeEvent): boolean {
    // Heuristic: Multi-line or substantial single-line insertions
    return change.text.length > 20 || change.text.includes('\n');
  }

  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop() || 'unknown';
  }
}
```

### src/services/telemetry.ts
```typescript
import * as vscode from 'vscode';
import { SupabaseService } from './supabase';
import { EncryptionService } from './encryption';
import { TelemetryEvent } from '../types/events';

export class TelemetryService {
  private buffer: TelemetryEvent[] = [];
  private sessionId: string;
  private encryption: EncryptionService;
  private flushInterval: NodeJS.Timeout;

  constructor(
    private supabase: SupabaseService,
    private userId: string
  ) {
    this.sessionId = this.generateSessionId();
    this.encryption = new EncryptionService();

    // Flush buffer every 30 seconds
    this.flushInterval = setInterval(() => this.flush(), 30000);
  }

  async record(event: Partial<TelemetryEvent>) {
    const fullEvent: TelemetryEvent = {
      user_id: this.userId,
      session_id: this.sessionId,
      platform: 'copilot',
      timestamp: new Date().toISOString(),
      ...event,
    } as TelemetryEvent;

    // Encrypt sensitive fields
    if (fullEvent.prompt_data) {
      fullEvent.prompt_encrypted = this.encryption.encrypt(fullEvent.prompt_data);
      delete fullEvent.prompt_data;
    }

    this.buffer.push(fullEvent);

    // Flush if buffer is large
    if (this.buffer.length >= 50) {
      await this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      await this.supabase.insertEvents(events);
    } catch (error) {
      // Re-add to buffer on failure
      this.buffer.unshift(...events);
      console.error('Failed to flush telemetry:', error);
    }
  }

  updateContext(editor: vscode.TextEditor) {
    // Track context for metadata enrichment
  }

  getOpenFileCount(): number {
    return vscode.workspace.textDocuments.filter(d => !d.isUntitled).length;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  dispose() {
    clearInterval(this.flushInterval);
    this.flush();
  }
}
```

### src/services/supabase.ts
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TelemetryEvent } from '../types/events';
import { Database } from '../types/database';

export class SupabaseService {
  private client: SupabaseClient<Database>;

  constructor(url: string, anonKey: string) {
    this.client = createClient<Database>(url, anonKey);
  }

  async authenticate(githubToken: string) {
    const { error } = await this.client.auth.signInWithIdToken({
      provider: 'github',
      token: githubToken,
    });
    if (error) throw error;
  }

  async insertEvents(events: TelemetryEvent[]) {
    const { error } = await this.client
      .from('events')
      .insert(events.map(e => ({
        user_id: e.user_id,
        session_id: e.session_id,
        timestamp: e.timestamp,
        event_type: e.event_type,
        platform: e.platform,
        model: e.model,
        prompt_encrypted: e.prompt_encrypted,
        response_encrypted: e.response_encrypted,
        metadata: e.metadata,
      })));

    if (error) throw error;
  }

  async getMyScore(): Promise<number> {
    const { data, error } = await this.client
      .from('quality_scores')
      .select('overall_score')
      .order('week_start_date', { ascending: false })
      .limit(1)
      .single();

    if (error) return 0;
    return data?.overall_score || 0;
  }
}
```

### src/types/events.ts
```typescript
export enum EventType {
  COMPLETION_REQUESTED = 'completion_requested',
  COMPLETION_SHOWN = 'completion_shown',
  COMPLETION_ACCEPTED = 'completion_accepted',
  COMPLETION_REJECTED = 'completion_rejected',
  PROMPT_SUBMITTED = 'prompt_submitted',
  RESPONSE_RECEIVED = 'response_received',
  EDIT_AFTER_ACCEPT = 'edit_after_accept',
}

export interface TelemetryEvent {
  user_id: string;
  session_id: string;
  timestamp: string;
  event_type: EventType;
  platform: 'copilot' | 'cursor';
  model?: string;
  prompt_data?: string;
  prompt_encrypted?: string;
  response_data?: string;
  response_encrypted?: string;
  metadata: {
    file_type?: string;
    context_files?: number;
    context_size_tokens?: number;
    response_tokens?: number;
    latency_ms?: number;
    retry_count?: number;
    line_number?: number;
    inserted_length?: number;
    trigger_kind?: number;
    [key: string]: unknown;
  };
}
```

---

## 2. Cursor Hooks Configuration

### Project Structure
```
cursor-analytics-hooks/
├── hooks.json                  # Cursor hooks config
├── package.json
├── src/
│   ├── handlers/
│   │   ├── beforeSubmitPrompt.ts
│   │   ├── afterMCPExecution.ts
│   │   ├── afterFileEdit.ts
│   │   └── sessionEnd.ts
│   ├── services/
│   │   ├── supabase.ts
│   │   └── encryption.ts
│   └── index.ts
└── dist/
    └── hooks.js                # Compiled handler
```

### .cursor/hooks.json
```json
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      {
        "command": "node",
        "args": ["./cursor-analytics-hooks/dist/hooks.js", "beforeSubmitPrompt"]
      }
    ],
    "afterMCPExecution": [
      {
        "command": "node",
        "args": ["./cursor-analytics-hooks/dist/hooks.js", "afterMCPExecution"]
      }
    ],
    "afterFileEdit": [
      {
        "command": "node",
        "args": ["./cursor-analytics-hooks/dist/hooks.js", "afterFileEdit"]
      }
    ],
    "sessionEnd": [
      {
        "command": "node",
        "args": ["./cursor-analytics-hooks/dist/hooks.js", "sessionEnd"]
      }
    ]
  }
}
```

### src/index.ts (Hook Entry Point)
```typescript
import { handleBeforeSubmitPrompt } from './handlers/beforeSubmitPrompt';
import { handleAfterMCPExecution } from './handlers/afterMCPExecution';
import { handleAfterFileEdit } from './handlers/afterFileEdit';
import { handleSessionEnd } from './handlers/sessionEnd';

const hookType = process.argv[2];

// Read JSON input from stdin
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });

process.stdin.on('end', async () => {
  const input = JSON.parse(inputData);
  let output: object;

  switch (hookType) {
    case 'beforeSubmitPrompt':
      output = await handleBeforeSubmitPrompt(input);
      break;
    case 'afterMCPExecution':
      output = await handleAfterMCPExecution(input);
      break;
    case 'afterFileEdit':
      output = await handleAfterFileEdit(input);
      break;
    case 'sessionEnd':
      output = await handleSessionEnd(input);
      break;
    default:
      output = {};
  }

  // Write JSON output to stdout
  process.stdout.write(JSON.stringify(output));
});
```

### src/handlers/beforeSubmitPrompt.ts
```typescript
import { SupabaseService } from '../services/supabase';
import { EncryptionService } from '../services/encryption';

interface BeforeSubmitPromptInput {
  conversation_id: string;
  generation_id: string;
  model: string;
  user_email: string;
  cursor_version: string;
  workspace_roots: string[];
  prompt: string;
  context_files: string[];
}

interface BeforeSubmitPromptOutput {
  permission: 'allow' | 'deny' | 'ask';
  user_message?: string;
}

const supabase = new SupabaseService();
const encryption = new EncryptionService();

export async function handleBeforeSubmitPrompt(
  input: BeforeSubmitPromptInput
): Promise<BeforeSubmitPromptOutput> {

  // Record the prompt submission
  await supabase.insertEvent({
    user_id: input.user_email,
    session_id: input.conversation_id,
    timestamp: new Date().toISOString(),
    event_type: 'prompt_submitted',
    platform: 'cursor',
    model: input.model,
    prompt_encrypted: encryption.encrypt(input.prompt),
    metadata: {
      context_files: input.context_files.length,
      prompt_length: input.prompt.length,
      workspace_roots: input.workspace_roots,
    }
  });

  // Always allow - we're just observing
  return { permission: 'allow' };
}
```

### src/handlers/afterMCPExecution.ts
```typescript
import { SupabaseService } from '../services/supabase';
import { EncryptionService } from '../services/encryption';

interface AfterMCPExecutionInput {
  conversation_id: string;
  generation_id: string;
  model: string;
  user_email: string;
  tool_name: string;
  tool_input: string;
  result_json: string;
  duration: number;
}

const supabase = new SupabaseService();
const encryption = new EncryptionService();

export async function handleAfterMCPExecution(
  input: AfterMCPExecutionInput
): Promise<object> {

  await supabase.insertEvent({
    user_id: input.user_email,
    session_id: input.conversation_id,
    timestamp: new Date().toISOString(),
    event_type: 'response_received',
    platform: 'cursor',
    model: input.model,
    response_encrypted: encryption.encrypt(input.result_json),
    metadata: {
      tool_name: input.tool_name,
      latency_ms: input.duration,
      result_length: input.result_json.length,
    }
  });

  return {};
}
```

---

## 3. JetBrains IDEA Plugin (Java/Kotlin)

### Project Structure
```
copilot-analytics-intellij/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── src/main/
│   ├── kotlin/
│   │   └── com/copilotanalytics/
│   │       ├── CopilotAnalyticsPlugin.kt
│   │       ├── listeners/
│   │       │   ├── CompletionListener.kt
│   │       │   ├── EditorTypingListener.kt
│   │       │   └── DocumentChangeListener.kt
│   │       ├── services/
│   │       │   ├── TelemetryService.kt
│   │       │   ├── SupabaseClient.kt
│   │       │   └── EncryptionService.kt
│   │       └── settings/
│   │           └── PluginSettings.kt
│   └── resources/
│       └── META-INF/
│           └── plugin.xml
└── src/test/kotlin/
```

### build.gradle.kts
```kotlin
plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "2.0.21"
    id("org.jetbrains.intellij.platform") version "2.2.1"
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
        intellijIdeaCommunity("2024.3")
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
            sinceBuild = "243"
            untilBuild = "251.*"
        }
    }
}

kotlin {
    jvmToolchain(21)
}
```

### src/main/resources/META-INF/plugin.xml
```xml
<idea-plugin>
    <id>com.copilotanalytics.intellij</id>
    <name>Copilot Analytics</name>
    <vendor>Your Organization</vendor>
    <description>Track and analyze GitHub Copilot usage for organizational insights</description>

    <depends>com.intellij.modules.platform</depends>
    <depends>com.intellij.modules.lang</depends>
    <depends optional="true" config-file="java-features.xml">com.intellij.modules.java</depends>

    <extensions defaultExtensionNs="com.intellij">
        <!-- Application-level service for telemetry -->
        <applicationService
            serviceImplementation="com.copilotanalytics.services.TelemetryService"/>

        <!-- Project-level settings -->
        <projectService
            serviceImplementation="com.copilotanalytics.settings.PluginSettings"/>

        <!-- Completion contributor to observe completions -->
        <completion.contributor
            language="any"
            implementationClass="com.copilotanalytics.listeners.CompletionListener"
            order="last"/>

        <!-- Settings UI -->
        <applicationConfigurable
            parentId="tools"
            instance="com.copilotanalytics.settings.PluginConfigurable"
            id="com.copilotanalytics.settings"
            displayName="Copilot Analytics"/>

        <!-- Startup activity -->
        <postStartupActivity
            implementation="com.copilotanalytics.CopilotAnalyticsStartup"/>

        <!-- Status bar widget -->
        <statusBarWidgetFactory
            implementation="com.copilotanalytics.ui.ScoreStatusBarFactory"
            id="CopilotAnalyticsScore"/>
    </extensions>

    <applicationListeners>
        <!-- Listen for editor events -->
        <listener
            class="com.copilotanalytics.listeners.EditorTypingListener"
            topic="com.intellij.openapi.editor.actionSystem.TypedActionHandler"/>
    </applicationListeners>

    <projectListeners>
        <!-- Document change listener -->
        <listener
            class="com.copilotanalytics.listeners.DocumentChangeListener"
            topic="com.intellij.openapi.editor.event.DocumentListener"/>
    </projectListeners>
</idea-plugin>
```

### src/main/kotlin/com/copilotanalytics/CopilotAnalyticsPlugin.kt
```kotlin
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
```

### src/main/kotlin/com/copilotanalytics/listeners/CompletionListener.kt
```kotlin
package com.copilotanalytics.listeners

import com.intellij.codeInsight.completion.*
import com.intellij.codeInsight.lookup.LookupElement
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
                    "line_number" to position.textOffset,
                    "completion_type" to parameters.completionType.name,
                    "is_auto_popup" to parameters.isAutoPopup
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
                                "inserted_length" to item.lookupString.length
                            )
                        ))
                    }

                result.passResult(completionResult.withLookupElement(wrappedElement))
            }
        }
    }
}
```

### src/main/kotlin/com/copilotanalytics/listeners/DocumentChangeListener.kt
```kotlin
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
                        "inserted_length" to insertedText.length,
                        "contains_newlines" to insertedText.contains("\n"),
                        "offset" to event.offset
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
```

### src/main/kotlin/com/copilotanalytics/services/TelemetryService.kt
```kotlin
package com.copilotanalytics.services

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.util.concurrent.ConcurrentLinkedQueue

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
```

### src/main/kotlin/com/copilotanalytics/services/SupabaseClient.kt
```kotlin
package com.copilotanalytics.services

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.gotrue.GoTrue
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.ktor.client.engine.okhttp.*

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
```

### src/main/kotlin/com/copilotanalytics/settings/PluginSettings.kt
```kotlin
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
```

---

*Continued in Part 2...*
