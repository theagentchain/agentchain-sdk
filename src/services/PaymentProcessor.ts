import {
  PaymentRequest,
  Payment,
  PaymentStatus,
  PaymentError,
  NetworkError,
  AgentChainError
} from '../types';
import { WalletService } from './WalletService';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';

export interface PaymentProcessorConfig {
  walletService: WalletService;
  feeRecipient?: string; // Platform fee recipient address
  platformFeePercent?: number; // Platform fee percentage (0-100)
}

export interface ProcessPaymentOptions {
  agentId?: string;
  metadata?: Record<string, any>;
  retryAttempts?: number;
}

export class PaymentProcessor {
  private walletService: WalletService;
  private config: PaymentProcessorConfig;
  private payments: Map<string, Payment> = new Map();

  constructor(config: PaymentProcessorConfig) {
    this.config = config;
    this.walletService = config.walletService;
    logger.setPrefix('PaymentProcessor');
  }

  /**
   * Create a payment request
   */
  async createPaymentRequest(
    amount: number,
    currency: string = 'SOL',
    recipient: string,
    options?: {
      reference?: string;
      memo?: string;
      expiresAt?: Date;
    }
  ): Promise<PaymentRequest> {
    try {
      logger.info('Creating payment request', {
        amount,
        currency,
        recipient: recipient.substring(0, 8) + '...'
      });

      const paymentRequest: PaymentRequest = {
        amount,
        currency,
        recipient,
        reference: options?.reference || this.generateReference(),
        memo: options?.memo,
        expiresAt: options?.expiresAt || new Date(Date.now() + 30 * 60 * 1000) // 30 minutes default
      };

      // Cache the payment request
      cache.set(
        `payment-request:${paymentRequest.reference}`,
        paymentRequest,
        30 * 60 * 1000 // 30 minutes
      );

      logger.info('Payment request created', {
        reference: paymentRequest.reference
      });

      return paymentRequest;

    } catch (error) {
      logger.error('Failed to create payment request', error);
      throw new PaymentError(
        'Failed to create payment request',
        error
      );
    }
  }

  /**
   * Process a payment
   */
  async processPayment(
    paymentRequest: PaymentRequest,
    userId: string,
    options: ProcessPaymentOptions = {}
  ): Promise<Payment> {
    try {
      logger.info('Processing payment', {
        reference: paymentRequest.reference,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency
      });

      // Validate payment request
      this.validatePaymentRequest(paymentRequest);

      // Check if wallet is connected
      if (!this.walletService.isWalletConnected()) {
        throw new PaymentError('Wallet not connected');
      }

      let txSignature: string;

      if (paymentRequest.currency === 'SOL') {
        // Process SOL payment
        txSignature = await this.processSOLPayment(paymentRequest);
      } else {
        // Process SPL token payment
        txSignature = await this.processSPLTokenPayment(paymentRequest);
      }

      // Create payment record
      const payment: Payment = {
        id: this.generatePaymentId(),
        agentId: options.agentId,
        userId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        txSignature,
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        metadata: options.metadata
      };

      // Store payment
      this.payments.set(payment.id, payment);

      // Cache payment
      cache.set(`payment:${payment.id}`, payment, 60 * 60 * 1000); // 1 hour

      // Start confirmation monitoring
      this.monitorPaymentConfirmation(payment.id);

      logger.info('Payment processed', {
        paymentId: payment.id,
        signature: txSignature
      });

      return payment;

    } catch (error) {
      logger.error('Failed to process payment', error);
      throw new PaymentError(
        'Failed to process payment',
        error
      );
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment | null> {
    try {
      // Try cache first
      const cached = cache.get<Payment>(`payment:${paymentId}`);
      if (cached) {
        return cached;
      }

      // Fallback to in-memory store
      const payment = this.payments.get(paymentId) || null;
      
      if (payment) {
        // Update cache
        cache.set(`payment:${paymentId}`, payment, 60 * 60 * 1000);
      }

      return payment;

    } catch (error) {
      logger.error('Failed to get payment', { paymentId, error });
      throw new PaymentError(
        'Failed to get payment',
        error
      );
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentId: string): Promise<Payment> {
    try {
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        throw new PaymentError('Payment not found');
      }

      logger.debug('Verifying payment', {
        paymentId,
        signature: payment.txSignature
      });

      // Check transaction status on blockchain
      const connection = this.walletService.getConnection();
      const signature = payment.txSignature;

      const status = await connection.getSignatureStatus(signature);
      
      if (status.value?.confirmationStatus === 'confirmed' || 
          status.value?.confirmationStatus === 'finalized') {
        
        // Update payment status
        const updatedPayment: Payment = {
          ...payment,
          status: PaymentStatus.CONFIRMED,
          confirmedAt: new Date()
        };

        this.payments.set(paymentId, updatedPayment);
        cache.set(`payment:${paymentId}`, updatedPayment, 60 * 60 * 1000);

        logger.info('Payment confirmed', { paymentId, signature });
        return updatedPayment;

      } else if (status.value?.err) {
        // Payment failed
        const updatedPayment: Payment = {
          ...payment,
          status: PaymentStatus.FAILED
        };

        this.payments.set(paymentId, updatedPayment);
        cache.set(`payment:${paymentId}`, updatedPayment, 60 * 60 * 1000);

        logger.warn('Payment failed', { paymentId, signature, error: status.value.err });
        return updatedPayment;
      }

      // Still pending
      logger.debug('Payment still pending', { paymentId, signature });
      return payment;

    } catch (error) {
      logger.error('Failed to verify payment', { paymentId, error });
      throw new PaymentError(
        'Failed to verify payment',
        error
      );
    }
  }

  /**
   * List payments for a user or agent
   */
  async listPayments(options: {
    userId?: string;
    agentId?: string;
    status?: PaymentStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<Payment[]> {
    try {
      const {
        userId,
        agentId,
        status,
        limit = 50,
        offset = 0
      } = options;

      let payments = Array.from(this.payments.values());

      // Apply filters
      if (userId) {
        payments = payments.filter(p => p.userId === userId);
      }
      if (agentId) {
        payments = payments.filter(p => p.agentId === agentId);
      }
      if (status) {
        payments = payments.filter(p => p.status === status);
      }

      // Sort by creation date (newest first)
      payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination
      const paginatedPayments = payments.slice(offset, offset + limit);

      logger.debug('Payments listed', {
        total: payments.length,
        returned: paginatedPayments.length,
        filters: { userId, agentId, status }
      });

      return paginatedPayments;

    } catch (error) {
      logger.error('Failed to list payments', error);
      throw new PaymentError(
        'Failed to list payments',
        error
      );
    }
  }

  /**
   * Calculate platform fee
   */
  calculatePlatformFee(amount: number): number {
    const feePercent = this.config.platformFeePercent || 0;
    return amount * (feePercent / 100);
  }

  /**
   * Process SOL payment
   */
  private async processSOLPayment(paymentRequest: PaymentRequest): Promise<string> {
    try {
      const recipientPublicKey = WalletService.publicKeyFromString(
        paymentRequest.recipient
      );

      const result = await this.walletService.sendSOL(
        recipientPublicKey,
        paymentRequest.amount,
        paymentRequest.memo
      );

      if (!result.confirmed) {
        throw new PaymentError('Transaction failed to confirm');
      }

      return result.signature;

    } catch (error) {
      logger.error('Failed to process SOL payment', error);
      throw new PaymentError(
        'Failed to process SOL payment',
        error
      );
    }
  }

  /**
   * Process SPL token payment
   */
  private async processSPLTokenPayment(paymentRequest: PaymentRequest): Promise<string> {
    // Note: This would require SPL token integration
    // For now, throw an error indicating it's not implemented
    throw new PaymentError(
      'SPL token payments not yet implemented',
      { currency: paymentRequest.currency }
    );
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(paymentRequest: PaymentRequest): void {
    if (paymentRequest.amount <= 0) {
      throw new PaymentError('Payment amount must be greater than 0');
    }

    if (paymentRequest.expiresAt && paymentRequest.expiresAt < new Date()) {
      throw new PaymentError('Payment request has expired');
    }

    if (!paymentRequest.recipient) {
      throw new PaymentError('Payment recipient is required');
    }

    // Validate recipient address format
    try {
      this.walletService.constructor.publicKeyFromString(paymentRequest.recipient);
    } catch (error) {
      throw new PaymentError('Invalid recipient address format');
    }
  }

  /**
   * Monitor payment confirmation
   */
  private async monitorPaymentConfirmation(paymentId: string): Promise<void> {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    const checkConfirmation = async () => {
      try {
        const payment = await this.verifyPayment(paymentId);
        
        if (payment.status === PaymentStatus.CONFIRMED || 
            payment.status === PaymentStatus.FAILED) {
          return; // Stop monitoring
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkConfirmation, 10000); // Check again in 10 seconds
        } else {
          logger.warn('Payment confirmation monitoring timed out', { paymentId });
        }

      } catch (error) {
        logger.error('Error monitoring payment confirmation', { paymentId, error });
      }
    };

    // Start monitoring after a short delay
    setTimeout(checkConfirmation, 5000);
  }

  /**
   * Generate a unique payment reference
   */
  private generateReference(): string {
    return 'pay_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate a unique payment ID
   */
  private generatePaymentId(): string {
    return 'payment_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
} 