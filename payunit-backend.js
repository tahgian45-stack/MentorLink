/**
 * PayUnit Payment Backend Helper - Node.js/Express
 *
 * This file provides backend payment verification and webhook handling
 * for the RgSkillBridge PayUnit integration.
 *
 * Usage:
 * import { PayUnitPaymentBackend } from './payunit-backend.js';
 * const paymentBackend = new PayUnitPaymentBackend();
 */

import crypto from "crypto";
import axios from "axios";

export class PayUnitPaymentBackend {
  constructor(config = {}) {
    this.config = {
      apiUsername: process.env.PAYUNIT_USERNAME,
      apiPassword: process.env.PAYUNIT_PASSWORD,
      apiBaseUrl: process.env.PAYUNIT_API_URL || "https://payunit.net/api",
      webhookSecret:
        process.env.PAYUNIT_WEBHOOK_SECRET || "rgsb_webhook_secret",
      ...config,
    };

    this.apiClient = axios.create({
      baseURL: this.config.apiBaseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Verify payment with PayUnit API
   *
   * @param {string} orderId - Order ID from payment
   * @param {string} transactionRef - Transaction reference from PayUnit
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(orderId, transactionRef) {
    try {
      const response = await this.apiClient.post("/verify", {
        apiUsername: this.config.apiUsername,
        apiPassword: this.config.apiPassword,
        orderId: orderId,
        transactionRef: transactionRef,
      });

      if (response.data.success || response.data.status === "success") {
        return {
          verified: true,
          status: "success",
          amount: response.data.amount,
          currency: response.data.currency || "XAF",
          timestamp: response.data.timestamp,
        };
      }

      return {
        verified: false,
        status: response.data.status || "unknown",
        error: response.data.message || "Payment verification failed",
      };
    } catch (error) {
      console.error("[PayUnit Backend] Verification error:", error.message);
      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify webhook signature from PayUnit
   *
   * @param {Object} payload - Webhook payload from PayUnit
   * @param {string} signature - Signature header from PayUnit
   * @returns {boolean} Whether signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    try {
      // Create canonical payload string
      const canonicalPayload = JSON.stringify(payload);

      // Create HMAC signature
      const computedSignature = crypto
        .createHmac("sha256", this.config.webhookSecret)
        .update(canonicalPayload)
        .digest("hex");

      // Compare signatures in constant time to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature),
      );
    } catch (error) {
      console.error("[PayUnit Backend] Signature verification error:", error);
      return false;
    }
  }

  /**
   * Process payment webhook from PayUnit
   *
   * @param {Object} webhookData - Data from PayUnit webhook
   * @param {string} signature - Webhook signature
   * @param {Function} onSuccess - Callback for successful payment
   * @param {Function} onFailed - Callback for failed payment
   * @returns {Promise<Object>} Processing result
   */
  async processWebhook(webhookData, signature, onSuccess, onFailed) {
    try {
      // Verify webhook authenticity
      if (!this.verifyWebhookSignature(webhookData, signature)) {
        console.warn("[PayUnit Backend] Invalid webhook signature");
        return {
          success: false,
          error: "Invalid webhook signature",
        };
      }

      const { orderId, status, transactionRef, amount, currency } = webhookData;

      console.log("[PayUnit Backend] Processing webhook:", {
        orderId,
        status,
        amount,
        currency,
      });

      if (status === "success" || status === "completed") {
        // Verify payment with PayUnit API
        const verification = await this.verifyPayment(orderId, transactionRef);

        if (verification.verified) {
          // Call success callback (should update Firebase)
          if (onSuccess) {
            await onSuccess({
              orderId,
              transactionRef,
              amount,
              currency,
              status: "completed",
            });
          }

          return {
            success: true,
            status: "processed",
            message: "Payment processed successfully",
          };
        } else {
          console.error("[PayUnit Backend] Payment verification failed");
          return {
            success: false,
            error: "Payment verification failed",
          };
        }
      } else if (status === "pending") {
        console.log("[PayUnit Backend] Payment pending:", orderId);
        return {
          success: true,
          status: "pending",
          message: "Payment is pending",
        };
      } else {
        // Payment failed or cancelled
        if (onFailed) {
          await onFailed({
            orderId,
            transactionRef,
            status: status || "failed",
          });
        }

        return {
          success: true,
          status: "failed",
          message: `Payment ${status || "failed"}`,
        };
      }
    } catch (error) {
      console.error("[PayUnit Backend] Webhook processing error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Refund a payment
   *
   * @param {string} transactionRef - Original transaction reference
   * @param {number} amount - Amount to refund
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(transactionRef, amount = null) {
    try {
      const payload = {
        apiUsername: this.config.apiUsername,
        apiPassword: this.config.apiPassword,
        transactionRef: transactionRef,
      };

      if (amount) {
        payload.refundAmount = amount; // Partial refund
      }

      const response = await this.apiClient.post("/refund", payload);

      if (response.data.success || response.data.status === "success") {
        return {
          success: true,
          refundId: response.data.refundId,
          amount: response.data.refundAmount,
          status: response.data.status,
        };
      }

      return {
        success: false,
        error: response.data.message || "Refund failed",
      };
    } catch (error) {
      console.error("[PayUnit Backend] Refund error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get payment status
   *
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(orderId) {
    try {
      const response = await this.apiClient.post("/status", {
        apiUsername: this.config.apiUsername,
        apiPassword: this.config.apiPassword,
        orderId: orderId,
      });

      return {
        success: true,
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency,
        timestamp: response.data.timestamp,
      };
    } catch (error) {
      console.error("[PayUnit Backend] Status check error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Log payment transaction for audit
   *
   * @param {Object} transactionData - Transaction details
   */
  logTransaction(transactionData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      orderId: transactionData.orderId,
      amount: transactionData.amount,
      currency: transactionData.currency,
      status: transactionData.status,
      userId: transactionData.userId,
      ...transactionData,
    };

    console.log("[PayUnit Transaction Log]", JSON.stringify(logEntry));

    // In production, save to database or logging service
    // Example: save to MongoDB, CloudWatch, Sentry, etc.
  }

  /**
   * Create payment hash for verification
   *
   * @param {Object} paymentData - Payment details
   * @returns {string} Payment hash
   */
  createPaymentHash(paymentData) {
    const { orderId, amount, currency, customerId } = paymentData;
    const dataString = `${orderId}${amount}${currency}${customerId}${this.config.apiPassword}`;

    return crypto.createHash("sha256").update(dataString).digest("hex");
  }

  /**
   * Express middleware for webhook verification
   *
   * @returns {Function} Express middleware
   */
  webhookMiddleware() {
    return (req, res, next) => {
      const signature = req.headers["x-payunit-signature"];

      if (!signature) {
        return res.status(400).json({
          success: false,
          error: "Missing signature header",
        });
      }

      // Verify signature
      if (!this.verifyWebhookSignature(req.body, signature)) {
        return res.status(401).json({
          success: false,
          error: "Invalid signature",
        });
      }

      next();
    };
  }
}

/**
 * Express Route Handler Example
 *
 * @example
 * import express from 'express';
 * import { PayUnitPaymentBackend } from './payunit-backend.js';
 * import { updateTransaction, creditUser } from './firebase.js';
 *
 * const router = express.Router();
 * const paymentBackend = new PayUnitPaymentBackend();
 *
 * // Webhook endpoint
 * router.post('/api/payment-webhook',
 *   paymentBackend.webhookMiddleware(),
 *   async (req, res) => {
 *     const result = await paymentBackend.processWebhook(
 *       req.body,
 *       req.headers['x-payunit-signature'],
 *
 *       // onSuccess callback
 *       async (paymentData) => {
 *         await updateTransaction(paymentData.orderId, 'completed');
 *         await creditUser(paymentData.userId, paymentData.amount);
 *       },
 *
 *       // onFailed callback
 *       async (paymentData) => {
 *         await updateTransaction(paymentData.orderId, paymentData.status);
 *       }
 *     );
 *
 *     res.json(result);
 *   }
 * );
 *
 * // Payment verification endpoint
 * router.post('/api/verify-payment', async (req, res) => {
 *   const { orderId, transactionRef } = req.body;
 *
 *   const result = await paymentBackend.verifyPayment(orderId, transactionRef);
 *   res.json(result);
 * });
 *
 * // Refund endpoint
 * router.post('/api/refund-payment', async (req, res) => {
 *   const { transactionRef, amount } = req.body;
 *
 *   const result = await paymentBackend.refundPayment(transactionRef, amount);
 *   res.json(result);
 * });
 *
 * export default router;
 */

export default PayUnitPaymentBackend;
