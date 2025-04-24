import Razorpay from 'razorpay';
import { storage } from './storage';
import crypto from 'crypto';

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Missing Razorpay API keys. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
}

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Payment Service for ShareBuddy using Razorpay
 * Handles all payment operations between storage providers and renters
 */
export class PaymentService {
  /**
   * Create a payment order for storage rental
   * @param userId User ID of the renter
   * @param amount Amount in rupees (₹)
   * @param description Description of the payment
   */
  static async createPaymentOrder(userId: number, amount: number, description: string) {
    try {
      // Convert rupees to paise (smallest unit in INR)
      const amountInPaise = Math.round(amount * 100);
      
      // Create a unique receipt ID
      const receiptId = `sharebuddy_${userId}_${Date.now()}`;
      
      // Create payment order with Razorpay
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          userId: userId.toString(),
          type: 'storage_reservation',
          description
        }
      });
      
      const amountInRupees = Number(order.amount) / 100; // Convert to number before division
      
      return {
        orderId: order.id,
        amount: amountInRupees, // Convert back to rupees for display
        currency: order.currency,
        receipt: order.receipt
      };
    } catch (error: any) {
      console.error('Error creating payment order:', error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }
  
  /**
   * Process a storage rental payment
   * @param renterId Renter's user ID
   * @param providerId Provider's user ID
   * @param storageAmount Storage amount in MB
   * @param pricePerGB Price per GB in rupees
   */
  static async processStorageRental(
    renterId: number, 
    providerId: number, 
    storageAmount: number, 
    pricePerGB: number
  ) {
    try {
      // Calculate payment amount (convert MB to GB for pricing)
      const storageInGB = storageAmount / 1024;
      const amount = storageInGB * pricePerGB;
      
      // Create description
      const description = `${storageAmount}MB storage rental`;
      
      // Create payment order
      const order = await this.createPaymentOrder(
        renterId,
        amount,
        description
      );
      
      return {
        ...order,
        providerId,
        storageAmount
      };
    } catch (error: any) {
      console.error('Error processing storage rental payment:', error);
      throw new Error(`Storage rental payment failed: ${error.message}`);
    }
  }
  
  /**
   * Verify Razorpay payment signature
   * @param orderId Razorpay Order ID
   * @param paymentId Razorpay Payment ID
   * @param signature Razorpay Signature from webhook or client
   */
  static verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    try {
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(orderId + '|' + paymentId)
        .digest('hex');
      
      return generated_signature === signature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }
  
  /**
   * Confirm storage provider earnings after successful payment
   * @param paymentData Payment data including orderId, paymentId, signature
   * @param providerId The provider's user ID
   */
  static async confirmProviderEarnings(paymentData: any, providerId: number) {
    try {
      const { orderId, paymentId, signature, amount } = paymentData;
      
      // Verify the payment signature
      const isValid = this.verifyPaymentSignature(orderId, paymentId, signature);
      
      if (!isValid) {
        throw new Error('Invalid payment signature');
      }
      
      // Get payment details from Razorpay (optional additional verification)
      const payment = await razorpay.payments.fetch(paymentId);
      
      if (payment.status !== 'captured') {
        throw new Error(`Payment not captured: ${payment.status}`);
      }
      
      // Calculate provider earnings (platform fee is 10%)
      const platformFeePercent = 0.10;
      const totalAmount = amount; // Amount is already in rupees
      const platformFee = totalAmount * platformFeePercent;
      const providerEarnings = totalAmount - platformFee;
      
      // Update provider earnings in the database
      const provider = await storage.getUser(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }
      
      const currentEarnings = provider.earnings || 0;
      await storage.updateUser(providerId, {
        earnings: currentEarnings + providerEarnings
      });
      
      return {
        success: true,
        earnings: providerEarnings,
        totalAmount,
        platformFee
      };
    } catch (error: any) {
      console.error('Error confirming provider earnings:', error);
      throw new Error(`Failed to confirm provider earnings: ${error.message}`);
    }
  }
  
  /**
   * Process a subscription payment for ShareBuddy premium services
   */
  static async createSubscription(userId: number, planId: string) {
    try {
      // Get user data
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Set up subscription parameters
      const subscriptionParams = {
        plan_id: planId,
        customer_notify: 1 as 1, // Type assertion to satisfy TypeScript
        total_count: 12, // 12 months/cycles
        notes: {
          userId: userId.toString()
        }
      };
      
      // Create subscription
      const subscription = await razorpay.subscriptions.create(subscriptionParams);
      
      // Update user with subscription ID
      await storage.updateUser(userId, {
        stripeSubscriptionId: subscription.id // Reusing the same field for now
      });
      
      return {
        subscriptionId: subscription.id,
        planId: subscription.plan_id,
        status: subscription.status
      };
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  }
}