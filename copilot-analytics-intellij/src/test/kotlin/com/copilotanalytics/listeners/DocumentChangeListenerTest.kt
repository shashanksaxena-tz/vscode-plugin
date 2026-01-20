package com.copilotanalytics.listeners

import org.junit.Assert
import org.junit.Test
import com.copilotanalytics.services.TelemetryService
import com.copilotanalytics.services.SupabaseClient
import com.copilotanalytics.services.DbEvent
import java.util.concurrent.CopyOnWriteArrayList

class DocumentChangeListenerTest {

    @Test
    fun `test looksLikeAICompletion heuristic`() {
        val listener = DocumentChangeListener()
        val method = DocumentChangeListener::class.java.getDeclaredMethod("looksLikeAICompletion", String::class.java)
        method.isAccessible = true

        // "fun " is not in the list, but "function" is. Kotlin uses "fun".
        // The implementation checks for "function", "class", "def ".
        // "fun test() {}" is length 13. > 10 but no newline.

        // Let's test what IS supported: "class", "def ", "function" (JS/TS)
        Assert.assertTrue("Class definition should look like AI", method.invoke(listener, "class MyClass {}") as Boolean)
        Assert.assertTrue("Python def should look like AI", method.invoke(listener, "def my_func():") as Boolean)
        Assert.assertTrue("JS function should look like AI", method.invoke(listener, "function test() {}") as Boolean)
        Assert.assertTrue("Python def should look like AI", method.invoke(listener, "def my_func():") as Boolean)

        // Multi-line and length > 10
        Assert.assertTrue("Multi-line code should look like AI", method.invoke(listener, "val x = \n            1000") as Boolean)

        // Long text
        val longText = "a".repeat(31)
        Assert.assertTrue("Long text should look like AI", method.invoke(listener, longText) as Boolean)

        // Negative cases
        Assert.assertFalse("Short text should not look like AI", method.invoke(listener, "val x = 1") as Boolean)
        Assert.assertFalse("Short multiline should not look like AI", method.invoke(listener, "a\nb") as Boolean)
    }
}
