import Stripe from 'stripe';
import { storage } from './storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' as any,
});

/**
 * Payment Service for ShareBuddy
 * Handles all payment operations between storage providers and renters
 */
export class PaymentService {
  /**
   * Create a payment intent for a storage reservation
   * @param userId User ID of the renter
   * @param amount Amount in rupees (₹)
   * @param description Description of the payment
   */
  static async createPaymentIntent(userId: number, amount: number, description: string) {
    try {
      // Convert rupees to paise (smallest unit in INR)
      const amountInPaise = Math.round(amount * 100);
      
      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInPaise,
        currency: 'inr',
        description: `ShareBuddy: ${description}`,
        metadata: {
          userId: userId.toString(),
          type: 'storage_reservation'
        }
      });
      
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
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
      
      // Create payment intent
      const { clientSecret, paymentIntentId } = await this.createPaymentIntent(
        renterId,
        amount,
        description
      );
      
      // Track the transaction in your database
      // In a real implementation, you would create a transaction record
      
      return {
        clientSecret,
        paymentIntentId,
        amount,
        storageAmount
      };
    } catch (error: any) {
      console.error('Error processing storage rental payment:', error);
      throw new Error(`Storage rental payment failed: ${error.message}`);
    }
  }
  
  /**
   * Confirm storage provider earnings after successful payment
   * @param paymentIntentId The payment intent ID from Stripe
   * @param providerId The provider's user ID
   */
  static async confirmProviderEarnings(paymentIntentId: string, providerId: number) {
    try {
      // Retrieve the payment intent from Stripe to confirm it's successful
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment not successful: ${paymentIntent.status}`);
      }
      
      // Calculate provider earnings (platform fee is 10%)
      const platformFeePercent = 0.10;
      const totalAmount = paymentIntent.amount / 100; // Convert from paise to rupees
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
      
      // Create or retrieve Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      
      if (!stripeCustomerId) {
        // Create a new customer in Stripe
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName || user.username,
          metadata: {
            userId: user.id.toString()
          }
        });
        
        stripeCustomerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(userId, {
          stripeCustomerId
        });
      }
      
      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [
          { price: planId }
        ],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      });
      
      // Update user with subscription ID
      await storage.updateUser(userId, {
        stripeSubscriptionId: subscription.id
      });
      
      // Return client secret for payment confirmation
      // Access payment intent from expanded subscription data
      try {
        const invoice = subscription.latest_invoice as any;
        const paymentIntent = invoice?.payment_intent as any;
        
        return {
          subscriptionId: subscription.id,
          clientSecret: paymentIntent?.client_secret || null
        };
      } catch (error) {
        // Fallback if the payment intent isn't available
        return {
          subscriptionId: subscription.id,
          clientSecret: null
        };
      }
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  }
}