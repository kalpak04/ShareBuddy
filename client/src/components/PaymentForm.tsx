import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';

// Initialize Stripe with public key
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing Stripe public key');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentFormProps {
  providerId: number;
  storageAmount: number;
  onPaymentSuccess: (result: any) => void;
  onCancel: () => void;
}

// Checkout form component that uses Stripe Elements
function CheckoutForm({ 
  providerId, 
  storageAmount, 
  onPaymentSuccess, 
  onCancel 
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred while processing your payment');
        toast({
          title: 'Payment Failed',
          description: error.message || 'An error occurred',
          variant: 'destructive',
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful, notify the server to update provider earnings
        const result = await apiRequest('POST', '/api/payments/confirm', {
          paymentIntentId: paymentIntent.id,
          providerId,
          storageAmount,
        });

        const confirmationData = await result.json();
        
        toast({
          title: 'Payment Successful',
          description: 'Your storage space has been reserved!',
        });
        
        onPaymentSuccess(confirmationData);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred');
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
      )}
      
      <div className="flex justify-between mt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ₹${(storageAmount / 1024).toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  );
}

// Main payment form container
export default function PaymentForm({
  providerId,
  storageAmount,
  onPaymentSuccess,
  onCancel,
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('POST', '/api/payments/storage-rental', {
          providerId,
          storageAmount,
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create payment intent');
        }
        
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setError(err.message || 'An error occurred while setting up the payment');
        toast({
          title: 'Payment Setup Failed',
          description: err.message || 'An error occurred',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [providerId, storageAmount, toast]);

  if (isLoading) {
    return (
      <Card className="p-6 w-full max-w-md mx-auto">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Setting up payment...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 w-full max-w-md mx-auto">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Payment Setup Failed</h3>
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={onCancel}>Go Back</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 w-full max-w-md mx-auto">
      <h3 className="text-lg font-medium mb-4">Complete Your Payment</h3>
      
      <div className="mb-6 p-3 bg-muted rounded-md">
        <div className="flex justify-between mb-2">
          <span>Storage Amount:</span>
          <span className="font-medium">{storageAmount} MB</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Price per GB:</span>
          <span className="font-medium">₹1.00</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total:</span>
          <span>₹{(storageAmount / 1024).toFixed(2)}</span>
        </div>
      </div>
      
      {clientSecret && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
            },
          }}
        >
          <CheckoutForm
            providerId={providerId}
            storageAmount={storageAmount}
            onPaymentSuccess={onPaymentSuccess}
            onCancel={onCancel}
          />
        </Elements>
      )}
    </Card>
  );
}