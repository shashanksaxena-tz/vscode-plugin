package com.copilotanalytics.services

import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.security.MessageDigest
import java.security.Security
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import java.util.Base64
import java.nio.charset.StandardCharsets

class EncryptionService {

    init {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(BouncyCastleProvider())
        }
    }

    private val keyBytes: ByteArray

    init {
        val keyStr = System.getenv("ENCRYPTION_KEY") ?: "default-dev-key-do-not-use-in-prod"
        keyBytes = if (keyStr.matches(Regex("^[0-9a-fA-F]{64}$"))) {
             hexStringToByteArray(keyStr)
        } else {
             // Fallback: SHA-256 hash of string
             val digest = MessageDigest.getInstance("SHA-256")
             digest.digest(keyStr.toByteArray(StandardCharsets.UTF_8))
        }
    }

    fun encrypt(data: String): String {
        try {
            val secretKey = SecretKeySpec(keyBytes, "AES")

            // Generate random 16-byte IV
            val iv = ByteArray(16)
            SecureRandom().nextBytes(iv)
            val ivSpec = IvParameterSpec(iv)

            val cipher = Cipher.getInstance("AES/CBC/PKCS7Padding", "BC")
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivSpec)

            val encryptedBytes = cipher.doFinal(data.toByteArray(StandardCharsets.UTF_8))

            // Combine IV + Ciphertext
            val combined = ByteArray(iv.size + encryptedBytes.size)
            System.arraycopy(iv, 0, combined, 0, iv.size)
            System.arraycopy(encryptedBytes, 0, combined, iv.size, encryptedBytes.size)

            return Base64.getEncoder().encodeToString(combined)
        } catch (e: Exception) {
            e.printStackTrace()
            return ""
        }
    }

    private fun hexStringToByteArray(s: String): ByteArray {
        val len = s.length
        val data = ByteArray(len / 2)
        var i = 0
        while (i < len) {
            data[i / 2] = ((Character.digit(s[i], 16) shl 4) + Character.digit(s[i + 1], 16)).toByte()
            i += 2
        }
        return data
    }
}
