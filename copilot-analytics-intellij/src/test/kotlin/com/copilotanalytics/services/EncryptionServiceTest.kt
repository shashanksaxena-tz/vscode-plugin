package com.copilotanalytics.services

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Base64

class EncryptionServiceTest {

    @Test
    fun `test encryption produces different output for same input`() {
        val service = EncryptionService("1234567890123456789012345678901234567890123456789012345678901234") // 64 hex chars
        val input = "test-input"

        val output1 = service.encrypt(input)
        val output2 = service.encrypt(input)

        assertNotEquals(input, output1)
        assertNotEquals(input, output2)
        assertNotEquals(output1, output2) // Different IVs should produce different outputs
    }

    @Test
    fun `test valid hex key usage`() {
        // Valid 64-char hex key (32 bytes)
        val hexKey = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"
        val service = EncryptionService(hexKey)
        val input = "secret-message"
        val encrypted = service.encrypt(input)

        assertTrue(encrypted.isNotEmpty())
    }
}
