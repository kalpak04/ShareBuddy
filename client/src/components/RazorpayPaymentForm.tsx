import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Declare Razorpay as a global variable since it's loaded via script tag
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentFormProps {
  providerId: number;
  storageAmount: number;
  onPaymentSuccess: (result: any) => void;
  onCancel: () => void;
}

export default function RazorpayPaymentForm({
  providerId,
  storageAmount,
  onPaymentSuccess,
  onCancel,
}: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('Razorpay SDK loaded');
      // Proceed with initializing payment once script is loaded
      initializePayment();
    };
    script.onerror = () => {
      setError('Failed to load Razorpay SDK. Please try again later.');
      setIsLoading(false);
    };
    document.body.appendChild(script);
    
    return () => {
      // Clean up script when component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);
  
  const initializePayment = async () => {
    try {
      setIsLoading(true);
      // Create order on the server
      const response = await apiRequest('POST', '/api/payments/storage-rental', {
        providerId,
        storageAmount,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment order');
      }
      
      const data = await response.json();
      
      if (!data.orderId) {
        throw new Error('Invalid payment response from server');
      }
      
      console.log('Razorpay Key ID:', import.meta.env.VITE_RAZORPAY_KEY_ID);
      
      // Initialize Razorpay payment
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: data.amount * 100, // Amount in paise
        currency: data.currency || 'INR',
        name: 'ShareBuddy',
        description: `${storageAmount}MB Storage Rental`,
        order_id: data.orderId,
        handler: function(response: any) {
          handlePaymentSuccess(response, data);
        },
        prefill: {
          name: 'ShareBuddy User',
          email: 'user@example.com',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed');
            setIsLoading(false);
          }
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setIsLoading(false);
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      setError(err.message || 'Failed to initialize payment');
      setIsLoading(false);
      
      toast({
        title: 'Payment Setup Failed',
        description: err.message || 'An error occurred while setting up payment',
        variant: 'destructive',
      });
    }
  };
  
  const handlePaymentSuccess = async (razorpayResponse: any, orderData: any) => {
    try {
      // Notify server about payment success
      const confirmResponse = await apiRequest('POST', '/api/payments/confirm', {
        providerId,
        orderId: orderData.orderId,
        paymentId: razorpayResponse.razorpay_payment_id,
        signature: razorpayResponse.razorpay_signature,
        amount: orderData.amount,
        storageAmount,
      });
      
      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.message || 'Failed to confirm payment');
      }
      
      const result = await confirmResponse.json();
      
      toast({
        title: 'Payment Successful',
        description: 'Your storage space has been reserved!',
      });
      
      onPaymentSuccess(result);
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      
      toast({
        title: 'Payment Verification Failed',
        description: err.message || 'An error occurred while verifying payment',
        variant: 'destructive',
      });
    }
  };
  
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
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Setting up payment...</p>
        </div>
      ) : (
        <div className="flex justify-between mt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={initializePayment}
          >
            Proceed to Payment
          </Button>
        </div>
      )}
    </Card>
  );
}