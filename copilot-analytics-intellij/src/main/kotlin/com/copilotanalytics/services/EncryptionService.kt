package com.copilotanalytics.services

import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.security.Security
import javax.crypto.Cipher
import javax.crypto.spec.SecretKeySpec
import java.util.Base64
import java.nio.charset.StandardCharsets

class EncryptionService {

    init {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(BouncyCastleProvider())
        }
    }

    // TODO: In production, load this from a secure keystore or environment variable
    // For now, we use a placeholder that must be configured
    private val key = System.getenv("ENCRYPTION_KEY") ?: "12345678901234567890123456789012"

    fun encrypt(data: String): String {
        try {
            val secretKey = SecretKeySpec(key.toByteArray(StandardCharsets.UTF_8), "AES")
            val cipher = Cipher.getInstance("AES/ECB/PKCS7Padding", "BC")
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            val encryptedBytes = cipher.doFinal(data.toByteArray(StandardCharsets.UTF_8))
            return Base64.getEncoder().encodeToString(encryptedBytes)
        } catch (e: Exception) {
            e.printStackTrace()
            return ""
        }
    }
}
