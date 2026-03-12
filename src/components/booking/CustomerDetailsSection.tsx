import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, CheckCircle, Shield, User, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import customerDetailsBg from '@/assets/customer-details-warm-bg.jpg';

interface TestItem {
  id: string;
  test_name: string;
  test_code: string;
  body_system: string;
  customer_price: number;
  /** Original UUID for database insertion (without prefixes like 'pkg_') */
  original_id?: string;
  /** Item type: 'test' for individual tests, 'package' for health packages */
  item_type?: 'test' | 'package';
}

interface CustomerDetailsSectionProps {
  cartItems: TestItem[];
  onBookingSuccess?: () => void;
}

/**
 * Check if an error is a transient network error that can be retried.
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  
  const errorObj = error as Record<string, unknown>;
  const message = String(errorObj.message || '').toLowerCase();
  const name = String(errorObj.name || '').toLowerCase();
  
  // Common transient network errors (including iOS Safari "Load failed")
  const retryablePatterns = [
    'load failed',
    'failed to fetch',
    'network error',
    'networkerror',
    'timeout',
    'aborted',
    'connection refused',
    'econnreset',
    'enotfound',
    'dns'
  ];
  
  return retryablePatterns.some(function(pattern) {
    return message.includes(pattern) || name.includes(pattern);
  });
}

/**
 * Parse Supabase error for user-friendly message.
 */
function parseSupabaseError(error: unknown): string {
  if (!error) return 'Unknown error';
  
  if (typeof error === 'string') return error;
  
  const errorObj = error as Record<string, unknown>;
  const errorMessage = String(errorObj.message || '');
  const errorName = String(errorObj.name || '');
  
  // Network/Load failed errors (common on iOS Safari)
  if (errorMessage.toLowerCase().includes('load failed') ||
      errorName.toLowerCase().includes('typeerror')) {
    return 'Network connection issue. Please check your internet and try again.';
  }
  
  // Supabase PostgrestError
  if (errorMessage) {
    // Foreign key constraint
    if (errorMessage.includes('foreign key constraint')) {
      return 'Invalid test reference. Please refresh and try again.';
    }
    
    // Unique constraint
    if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
      return 'This booking may already exist. Please check your dashboard.';
    }
    
    // Permission error
    if (errorMessage.includes('permission denied') || errorObj.code === '42501') {
      return 'Permission denied. Please try logging in again.';
    }
    
    // Connection error
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    return errorMessage;
  }
  
  // Edge function error
  if (errorObj.name === 'FunctionsHttpError') {
    return 'Server error. Please try again.';
  }
  
  return JSON.stringify(error);
}

/**
 * Sleep helper for retry delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

/**
 * Setup dev-only booking debug helpers
 */
function setupBookingDevHelpers(
  getBookingPayload: () => Record<string, unknown> | null,
  lastError: { current: unknown }
): void {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    // Simulate booking payload (for debugging)
    (window as unknown as Record<string, unknown>).__simulateBookingPayload = function() {
      const payload = getBookingPayload();
      console.log('[DEV] Current booking payload:', payload);
      return payload;
    };

    // Get last booking error
    (window as unknown as Record<string, unknown>).__getLastBookingError = function() {
      console.log('[DEV] Last booking error:', lastError.current);
      return lastError.current;
    };

    console.log('[DEV] Booking debug helpers available:');
    console.log('  - window.__simulateBookingPayload() - Show current booking payload');
    console.log('  - window.__getLastBookingError() - Show last booking error');
  }
}

const CustomerDetailsSection = ({ cartItems, onBookingSuccess }: CustomerDetailsSectionProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');
  const [lastErrorRef] = useState<{ current: unknown }>({ current: null });
  const [debugError, setDebugError] = useState<string | null>(null);
  const [smsStatus, setSmsStatus] = useState<{
    sent: boolean;
    error?: string;
    errorCode?: string;
    formattedPhone?: string;
    twilioError?: unknown;
  }>({ sent: false });
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [bookingData, setBookingData] = useState({
    customerName: '',
    customerPhone: '+91 ',
    customerEmail: '',
    customerAge: '',
    customerGender: '',
    address: '',
    preferredDate: undefined as Date | undefined,
    preferredTime: '',
    notes: '',
    couponCode: '',
    discountPercentage: 0
  });

  const [couponStatus, setCouponStatus] = useState<{
    applied: boolean;
    message: string;
    discount: number;
    discount_type: string;
  }>({ applied: false, message: '', discount: 0, discount_type: 'percentage' });

  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const { toast } = useToast();

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + item.customer_price, 0);
  };

  const getDiscountAmount = () => {
    const total = getTotalAmount();
    if (couponStatus.discount_type === 'flat') {
      return Math.min(couponStatus.discount, total);
    }
    return (total * couponStatus.discount) / 100;
  };

  const getFinalAmount = () => {
    return getTotalAmount() - getDiscountAmount();
  };

  // Setup dev helpers
  useEffect(() => {
    const getBookingPayload = () => {
      if (cartItems.length === 0) return null;
      
      const formattedPhone = bookingData.customerPhone.trim().replace(/\D/g, '');
      const phoneWithCode = formattedPhone.length === 10 ? '+91' + formattedPhone : '+' + formattedPhone;
      
      return {
        user_id: user?.id || null,
        customer_name: bookingData.customerName,
        customer_phone: phoneWithCode,
        customer_email: bookingData.customerEmail,
        customer_age: bookingData.customerAge ? parseInt(bookingData.customerAge) : null,
        customer_gender: bookingData.customerGender || null,
        address: bookingData.address,
        preferred_date: bookingData.preferredDate?.toISOString().split('T')[0],
        preferred_time: bookingData.preferredTime,
        total_amount: getTotalAmount(),
        discount_percentage: bookingData.discountPercentage,
        discount_amount: getDiscountAmount(),
        final_amount: getFinalAmount(),
        coupon_code: couponStatus.applied ? bookingData.couponCode : null,
        notes: bookingData.notes || null,
        cart_items: cartItems.map(item => ({
          item_id: item.id,
          item_name: item.test_name,
          unit_price: item.customer_price
        }))
      };
    };
    
    setupBookingDevHelpers(getBookingPayload, lastErrorRef);
  }, [cartItems, bookingData, user, couponStatus.applied, lastErrorRef]);

  // Pre-fill user data if authenticated
  useEffect(() => {
    if (user) {
      // Check if email is a dummy/fake email from phone OTP authentication
      const isFakeEmail = (email: string | undefined): boolean => {
        if (!email) return true;
        return email.endsWith('.local') || email.includes('@phone.');
      };

      setBookingData(prev => {
        const updates: Partial<typeof prev> = {};
        
        // Pre-fill email ONLY if it's a real email (not a fake OTP-generated one)
        if (user.email && !prev.customerEmail && !isFakeEmail(user.email)) {
          updates.customerEmail = user.email;
        }
        
        // Pre-fill phone from user metadata or user.phone if available
        const userPhone = user.user_metadata?.phone || user.phone;
        if (userPhone && prev.customerPhone === '+91 ') {
          let formattedPhone = userPhone.trim();
          if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
          }
          if (!formattedPhone.includes(' ') && formattedPhone.length >= 10) {
            const digits = formattedPhone.replace(/\D/g, '');
            if (digits.length === 10) {
              formattedPhone = '+91 ' + digits;
            } else if (digits.length === 12 && digits.startsWith('91')) {
              formattedPhone = '+91 ' + digits.slice(2);
            }
          }
          if (formattedPhone.startsWith('+91') && formattedPhone.replace(/\D/g, '').length >= 12) {
            updates.customerPhone = formattedPhone.replace('+91', '+91 ');
          }
        }
        
        if (Object.keys(updates).length > 0) {
          return { ...prev, ...updates };
        }
        return prev;
      });
    }
  }, [user]);

  // Home collection slots - only between 6am-11am
  const timeSlots = [
    '06:00 AM - 07:00 AM',
    '07:00 AM - 08:00 AM',
    '08:00 AM - 09:00 AM',
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM'
  ];

  const handleInputChange = (field: string, value: string) => {
    if (field === 'customerPhone') {
      if (!value.startsWith('+91 ')) {
        const digits = value.replace(/\D/g, '');
        if (digits.length === 0) {
          setBookingData(prev => ({ ...prev, [field]: '+91 ' }));
          setIsPhoneValid(false);
          return;
        }
        const phoneDigits = digits.startsWith('91') ? digits.slice(2) : digits;
        if (phoneDigits.length <= 10) {
          setBookingData(prev => ({ ...prev, [field]: `+91 ${phoneDigits}` }));
          setIsPhoneValid(phoneDigits.length === 10);
        }
        return;
      }
      
      const digitsOnly = value.slice(4).replace(/\D/g, '');
      
      if (digitsOnly.length <= 10) {
        setBookingData(prev => ({ ...prev, [field]: `+91 ${digitsOnly}` }));
        setIsPhoneValid(digitsOnly.length === 10);
      }
      return;
    }
    
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const applyCoupon = async (codeOverride?: string) => {
    const couponCode = (codeOverride || bookingData.couponCode).toUpperCase().trim();

    if (!couponCode) {
      setCouponStatus({ applied: false, message: 'Please enter a coupon code', discount: 0, discount_type: 'percentage' });
      return;
    }

    setIsCouponLoading(true);
    try {
      // Call Supabase validate_coupon RPC directly (no admin panel dependency)
      // Using 'as any' because validate_coupon is created via migration, not in generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('validate_coupon', {
        p_code: couponCode,
        p_subtotal: getTotalAmount(),
      });

      if (error) {
        console.error('[Coupon] RPC error:', error);
        setCouponStatus({ applied: false, message: 'Unable to validate coupon. Please try again.', discount: 0, discount_type: 'percentage' });
        return;
      }

      if (data?.valid) {
        const discountValue = Number(data.value) || 0;
        const discountType = data.type === 'flat' ? 'flat' : 'percentage';
        setCouponStatus({
          applied: true,
          message: data.description || 'Coupon applied!',
          discount: discountValue,
          discount_type: discountType,
        });
        setBookingData(prev => ({
          ...prev,
          couponCode: couponCode,
          discountPercentage: discountType === 'flat' ? 0 : discountValue,
        }));
      } else {
        setCouponStatus({
          applied: false,
          message: data?.error || 'Invalid coupon code',
          discount: 0,
          discount_type: 'percentage',
        });
        setBookingData(prev => ({ ...prev, discountPercentage: 0 }));
      }
    } catch (err) {
      console.error('[Coupon] Validation error:', err);
      setCouponStatus({ applied: false, message: 'Unable to validate coupon. Please try again.', discount: 0, discount_type: 'percentage' });
    } finally {
      setIsCouponLoading(false);
    }
  };

  // Auto-apply WELCOME35 coupon on first load
  useEffect(() => {
    if (cartItems.length > 0 && !couponStatus.applied) {
      applyCoupon('WELCOME35');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeCoupon = () => {
    setCouponStatus({ applied: false, message: '', discount: 0, discount_type: 'percentage' });
    setBookingData(prev => ({ ...prev, couponCode: '', discountPercentage: 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (import.meta.env.DEV) {
      console.log('🟢 [Booking] Form submitted');
    }
    
    setDebugError(null);
    lastErrorRef.current = null;
    
    if (cartItems.length === 0) {
      if (import.meta.env.DEV) {
        console.log('❌ [Booking] No tests selected');
      }
      toast({
        title: "No Tests Selected",
        description: "Please select at least one test to proceed.",
        variant: "destructive"
      });
      return;
    }

    if (import.meta.env.DEV) {
      console.log('🟢 [Booking] Starting booking process:', {
        customerName: bookingData.customerName,
        customerPhone: bookingData.customerPhone,
        totalAmount: getTotalAmount(),
        finalAmount: getFinalAmount(),
        cartItemCount: cartItems.length,
        cartItems: cartItems.map(i => ({ id: i.id, name: i.test_name }))
      });
    }

    setIsSubmitting(true);

    let bookingCreated = false;
    let createdBookingId: string | null = null;
    let customBookingId: string | null = null;
    let bookingItemsCreated = false;

    try {
      // Format phone number
      let formattedPhone = bookingData.customerPhone.trim().replace(/\D/g, '');
      if (formattedPhone.length === 10) {
        formattedPhone = '+91' + formattedPhone;
      } else if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) {
        formattedPhone = '+' + formattedPhone;
      } else if (!bookingData.customerPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone;
      } else {
        formattedPhone = bookingData.customerPhone;
      }

      // Convert time range to start time
      let formattedTime: string | null = null;
      if (bookingData.preferredTime) {
        const startTime = bookingData.preferredTime.split(' - ')[0];
        const [time, period] = startTime.split(' ');
        const [hours, minutes] = time.split(':');
        let hour24 = parseInt(hours);
        
        if (period === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hour24 === 12) {
          hour24 = 0;
        }
        
        formattedTime = `${hour24.toString().padStart(2, '0')}:${minutes}:00`;
      }

      // STEP 1: Create booking with retry for network errors
      if (import.meta.env.DEV) {
        console.log('🟢 [Booking] Step 1: Creating booking in database...');
      }
      
      const bookingData_insert = {
        user_id: user?.id || null,
        customer_name: bookingData.customerName,
        customer_phone: formattedPhone,
        customer_email: bookingData.customerEmail,
        customer_age: bookingData.customerAge ? parseInt(bookingData.customerAge) : null,
        customer_gender: bookingData.customerGender || null,
        address: bookingData.address,
        preferred_date: bookingData.preferredDate?.toISOString().split('T')[0],
        preferred_time: formattedTime,
        total_amount: getTotalAmount(),
        discount_percentage: bookingData.discountPercentage,
        discount_amount: getDiscountAmount(),
        final_amount: getFinalAmount(),
        coupon_code: couponStatus.applied ? bookingData.couponCode : null,
        notes: bookingData.notes || null
      };

      // Retry booking creation up to 3 times for network errors
      let booking: { id: string; custom_booking_id: string | null } | null = null;
      let lastBookingError: unknown = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { data, error: bookingError } = await supabase
            .from('bookings')
            .insert(bookingData_insert)
            .select('id, custom_booking_id')
            .single();

          if (bookingError) {
            lastBookingError = bookingError;
            if (!isRetryableError(bookingError) || attempt === 3) {
              throw bookingError;
            }
            if (import.meta.env.DEV) {
              console.log(`⚠️ [Booking] Attempt ${attempt} failed, retrying...`, bookingError);
            }
            await sleep(1500 * attempt);
            continue;
          }
          
          booking = data;
          break;
        } catch (err) {
          lastBookingError = err;
          if (!isRetryableError(err) || attempt === 3) {
            throw err;
          }
          if (import.meta.env.DEV) {
            console.log(`⚠️ [Booking] Attempt ${attempt} error, retrying...`, err);
          }
          await sleep(1500 * attempt);
        }
      }

      if (!booking) {
        throw lastBookingError || new Error('Failed to create booking');
      }
      
      bookingCreated = true;
      createdBookingId = booking.id;
      customBookingId = booking.custom_booking_id;
      
      if (import.meta.env.DEV) {
        console.log('✅ [Booking] Step 1 SUCCESS - Booking created:', booking.id);
      }

      // STEP 2: Create booking items with retry
      if (import.meta.env.DEV) {
        console.log('🟢 [Booking] Step 2: Creating booking items...');
      }
      
      // Helper to extract UUID from cart item ID
      // - If original_id is set (packages), use it directly
      // - If id starts with 'pkg_', strip the prefix to get the UUID
      // - Otherwise, use id as-is (regular tests should have valid UUIDs)
      const getItemUuid = (item: TestItem): string => {
        if (item.original_id) {
          return item.original_id;
        }
        if (item.id.startsWith('pkg_')) {
          return item.id.slice(4); // Remove 'pkg_' prefix
        }
        return item.id;
      };
      
      const bookingItems = cartItems.map(item => ({
        booking_id: booking!.id,
        item_type: item.item_type || 'test',
        item_id: getItemUuid(item),
        item_name: item.test_name,
        quantity: 1,
        unit_price: item.customer_price,
        total_price: item.customer_price
      }));
      
      // Log in both dev AND production for diagnosing insert failures
      console.log('[Booking] Items to insert:', JSON.stringify(bookingItems.map(bi => ({
        item_id: bi.item_id, item_type: bi.item_type, item_name: bi.item_name
      }))));

      let lastItemsError: unknown = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { error: itemsError } = await supabase
            .from('booking_items')
            .insert(bookingItems);

          if (itemsError) {
            // Always log booking_items errors (even in production)
            console.error(`[Booking] booking_items insert attempt ${attempt} failed:`, JSON.stringify(itemsError));
            lastItemsError = itemsError;
            if (!isRetryableError(itemsError) || attempt === 3) {
              throw itemsError;
            }
            await sleep(1500 * attempt);
            continue;
          }

          bookingItemsCreated = true;
          break;
        } catch (err) {
          console.error(`[Booking] booking_items insert attempt ${attempt} error:`, err);
          lastItemsError = err;
          if (!isRetryableError(err) || attempt === 3) {
            throw err;
          }
          await sleep(1500 * attempt);
        }
      }

      if (!bookingItemsCreated) {
        throw lastItemsError || new Error('Failed to create booking items');
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ [Booking] Step 2 SUCCESS - Booking items created:', bookingItems.length, 'items');
      }

      // CRITICAL: Both succeeded - show success UI
      setIsSuccess(true);
      setBookingId(booking.custom_booking_id || booking.id);

      // Clear cart from localStorage after successful booking
      onBookingSuccess?.();

      // Increment coupon usage count (non-blocking)
      if (couponStatus.applied && bookingData.couponCode) {
        supabase
          .from('coupons')
          .select('used_count')
          .eq('code', bookingData.couponCode.toUpperCase().trim())
          .single()
          .then(({ data: coupon }) => {
            if (coupon) {
              supabase
                .from('coupons')
                .update({ used_count: (coupon.used_count || 0) + 1 })
                .eq('code', bookingData.couponCode.toUpperCase().trim())
                .then(() => {});
            }
          })
          .catch((err) => console.error('[Coupon] Usage increment failed:', err));
      }

      // STEP 3: Send SMS (NON-BLOCKING)
      if (import.meta.env.DEV) {
        console.log('🟢 [Booking] Step 3: Sending SMS notification (non-blocking)...');
      }
      
      try {
        const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-booking-sms', {
          body: {
            bookingId: booking.custom_booking_id || booking.id,
            customerName: bookingData.customerName,
            customerPhone: formattedPhone,
            totalAmount: getFinalAmount(),
            scheduledDate: bookingData.preferredDate?.toISOString().split('T')[0],
            scheduledTime: bookingData.preferredTime,
            testNames: cartItems.map(item => item.test_name),
            address: bookingData.address || undefined,
            couponCode: couponStatus.applied ? bookingData.couponCode : undefined,
          }
        });
        
        if (smsError) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ [Booking] Step 3 - SMS sending failed (non-critical):', smsError);
          }
          setSmsStatus({
            sent: false,
            error: smsError.message || 'SMS service error',
            errorCode: (smsError as Record<string, string>).code,
            formattedPhone: formattedPhone
          });
        } else if (smsResult?.success) {
          if (import.meta.env.DEV) {
            console.log('✅ [Booking] Step 3 SUCCESS - SMS sent:', smsResult);
          }
          setSmsStatus({
            sent: true,
            formattedPhone: formattedPhone
          });
        } else {
          if (import.meta.env.DEV) {
            console.warn('⚠️ [Booking] Step 3 - SMS failed with result:', smsResult);
          }
          setSmsStatus({
            sent: false,
            error: smsResult?.error || 'Unknown SMS error',
            errorCode: smsResult?.errorCode,
            twilioError: smsResult?.details,
            formattedPhone: smsResult?.formattedPhone || formattedPhone
          });
        }
      } catch (smsException) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ [Booking] Step 3 - SMS exception (non-critical):', smsException);
        }
        setSmsStatus({
          sent: false,
          error: smsException instanceof Error ? smsException.message : 'Network error',
          formattedPhone: formattedPhone
        });
      }

      toast({
        title: "Booking Confirmed!",
        description: "Your booking has been successfully submitted. We'll contact you soon.",
      });
      
      if (import.meta.env.DEV) {
        console.log('✅ [Booking] COMPLETE - Booking flow finished successfully');
      }
      
    } catch (error) {
      const errorMessage = parseSupabaseError(error);
      
      if (import.meta.env.DEV) {
        console.error('❌ [Booking] ERROR:', {
          error,
          parsedMessage: errorMessage,
          bookingCreated,
          bookingItemsCreated,
          bookingId: createdBookingId
        });
      }
      
      lastErrorRef.current = error;
      setDebugError(import.meta.env.DEV ? errorMessage : null);
      
      if (bookingCreated && !bookingItemsCreated) {
        toast({
          title: "Partial Booking Issue",
          description: `Your booking was created (ID: ${customBookingId || createdBookingId}) but there was an issue adding the test items. Please contact support.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Booking Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendSms = async () => {
    if (!bookingId) return;
    
    if (import.meta.env.DEV) {
      console.log('🔄 [Booking] Resending SMS...');
    }
    
    try {
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-booking-sms', {
        body: {
          bookingId,
          customerName: bookingData.customerName,
          customerPhone: bookingData.customerPhone,
          totalAmount: getFinalAmount(),
          scheduledDate: bookingData.preferredDate?.toISOString().split('T')[0],
          scheduledTime: bookingData.preferredTime
        }
      });
      
      if (smsError) {
        if (import.meta.env.DEV) {
          console.error('❌ [Booking] SMS resend failed:', smsError);
        }
        setSmsStatus(prev => ({
          ...prev,
          sent: false,
          error: smsError.message,
          errorCode: (smsError as Record<string, string>).code
        }));
      } else if (smsResult?.success) {
        if (import.meta.env.DEV) {
          console.log('✅ [Booking] SMS resent successfully');
        }
        setSmsStatus(prev => ({ ...prev, sent: true, error: undefined }));
        toast({
          title: "SMS Sent!",
          description: "SMS confirmation has been sent successfully.",
        });
      } else {
        setSmsStatus(prev => ({
          ...prev,
          sent: false,
          error: smsResult?.error || 'Unknown error'
        }));
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ [Booking] SMS resend error:', error);
      }
      toast({
        title: "Failed to resend SMS",
        description: error instanceof Error ? error.message : 'Network error',
        variant: "destructive"
      });
    }
  };

  const copyOrderLink = () => {
    const orderUrl = `${window.location.origin}/order/${bookingId}`;
    navigator.clipboard.writeText(orderUrl);
    toast({
      title: "Link Copied!",
      description: "Order details link has been copied to clipboard.",
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    const orderUrl = `${window.location.origin}/order/${bookingId}`;
    return (
      <section className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/10 py-8 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: `url(${customerDetailsBg})` }}
        />
        <div className="container mx-auto relative z-10">
          <div className="max-w-2xl mx-auto bg-card/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Booking Confirmed!</h2>
                <p className="text-muted-foreground">
                  Thank you for choosing our medical services. Your tests have been successfully booked.
                </p>
                <p className="text-sm text-muted-foreground">Booking ID: {bookingId}</p>
              </div>

              {/* SMS Status Section */}
              <div className={`rounded-lg p-4 ${smsStatus.sent ? 'bg-green-50' : 'bg-orange-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">SMS Notification</h3>
                  {smsStatus.sent ? (
                    <span className="text-green-600 text-sm">✅ Sent</span>
                  ) : (
                    <span className="text-orange-600 text-sm">⚠️ Failed</span>
                  )}
                </div>
                
                {smsStatus.sent ? (
                  <p className="text-green-700 text-sm">SMS sent to {smsStatus.formattedPhone}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-orange-700 text-sm">
                      SMS could not be sent to {smsStatus.formattedPhone}
                    </p>
                    {smsStatus.error && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        Error: {smsStatus.error}
                        {smsStatus.errorCode && ` (Code: ${smsStatus.errorCode})`}
                      </p>
                    )}
                    {import.meta.env.DEV && smsStatus.twilioError && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-red-600">Twilio Details (dev only)</summary>
                        <pre className="mt-1 p-2 bg-red-50 rounded text-red-700 overflow-auto">
                          {JSON.stringify(smsStatus.twilioError, null, 2)}
                        </pre>
                      </details>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button 
                        onClick={handleResendSms}
                        size="sm"
                        variant="outline"
                      >
                        Retry SMS
                      </Button>
                      <Button 
                        onClick={copyOrderLink}
                        size="sm"
                        variant="outline"
                      >
                        Copy Order Link
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
                <h3 className="font-semibold text-foreground">Order Summary</h3>
                <div className="space-y-2">
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.test_name}</span>
                      <span>₹{item.customer_price?.toLocaleString()}</span>
                    </div>
                  ))}
                  {getDiscountAmount() > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({couponStatus.discount}%)</span>
                      <span>-₹{getDiscountAmount().toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Amount</span>
                    <span>₹{getFinalAmount().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>• We'll contact you within 2 hours to schedule sample collection</li>
                  <li>• Home collection available from 6:00 AM to 11:00 AM</li>
                  <li>• Reports will be available within 24 hours</li>
                  <li>• You'll receive SMS updates on collection and report status</li>
                </ul>
              </div>

              {/* Account Creation for Guest Users */}
              {!user && !showAccountCreation && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900">Create Your Account</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Save your booking details and track future orders easily
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowAccountCreation(true)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create Account
                    </Button>
                  </div>
                </div>
              )}

              {/* Account Creation Form for Guests */}
              {!user && showAccountCreation && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 space-y-4">
                  <h3 className="font-semibold text-blue-900">Create Your Account</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setIsCreatingAccount(true);
                    
                    try {
                      const { error } = await supabase.auth.signUp({
                        email: bookingData.customerEmail,
                        password: Math.random().toString(36).slice(-8),
                        options: {
                          emailRedirectTo: `${window.location.origin}/`,
                          data: {
                            full_name: bookingData.customerName,
                            phone: bookingData.customerPhone
                          }
                        }
                      });

                      if (error) {
                        toast({
                          title: "Account creation failed",
                          description: error.message,
                          variant: "destructive"
                        });
                      } else {
                        toast({
                          title: "Account Created!",
                          description: "Please check your email to set your password and verify your account.",
                        });
                        setShowAccountCreation(false);
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to create account",
                        variant: "destructive"
                      });
                    } finally {
                      setIsCreatingAccount(false);
                    }
                  }} className="space-y-3">
                    <div className="text-sm text-blue-700">
                      <p>Account will be created with:</p>
                      <p>Email: {bookingData.customerEmail}</p>
                      <p>Name: {bookingData.customerName}</p>
                      <p className="text-xs mt-1">You'll receive an email to set your password</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        size="sm" 
                        disabled={isCreatingAccount || !bookingData.customerEmail}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isCreatingAccount ? "Creating..." : "Create Account"}
                      </Button>
                      <Button 
                        type="button"
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowAccountCreation(false)}
                      >
                        Skip
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <Button 
                onClick={() => {
                  setIsSuccess(false);
                  setBookingData({
                    customerName: '',
                    customerPhone: '+91 ',
                    customerEmail: '',
                    customerAge: '',
                    customerGender: '',
                    address: '',
                    preferredDate: undefined,
                    preferredTime: '',
                    notes: '',
                    couponCode: '',
                    discountPercentage: 0
                  });
                  setSmsStatus({ sent: false });
                  setCouponStatus({ applied: false, message: '', discount: 0 });
                  setBookingId('');
                  setDebugError(null);
                }}
                className="w-full"
              >
                Book Again
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl py-8 sm:py-12">
        <div className="space-y-4 sm:space-y-6">
          {/* Debug Error Banner (dev only) */}
          {import.meta.env.DEV && debugError && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Debug:</strong> {debugError}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Authentication Benefits Banner */}
          {!user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 text-sm">
                    <span className="font-semibold">Booking as a guest?</span> You can create an account after booking to track your orders and reports.
                  </p>
                  <Button
                    onClick={() => navigate('/auth', { state: { from: { pathname: '/booking' } } })}
                    variant="link"
                    className="text-blue-600 hover:text-blue-700 p-0 h-auto font-normal text-sm"
                  >
                    Sign in / Sign up now →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Authenticated User Welcome */}
          {user && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-gray-800 text-sm">
                  <span className="font-semibold">Welcome back!</span> Your booking will be linked to your account for easy tracking.
                </p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">Full Name *</Label>
                  <Input
                    id="name"
                    value={bookingData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="e.g., Sivananda"
                    className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 block">Phone *</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      type="tel"
                      value={bookingData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                      onFocus={(e) => {
                        if (e.target.value === '+91 ') {
                          setTimeout(() => e.target.setSelectionRange(4, 4), 0);
                        }
                      }}
                      placeholder="e.g., +91 98765 43210"
                      className={cn(
                        "bg-white border-gray-300 text-gray-900 placeholder-gray-400 pr-10",
                        isPhoneValid && "border-green-500 focus-visible:ring-green-500"
                      )}
                      required
                    />
                    {isPhoneValid && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-scale-in">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={bookingData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder="Optional"
                    className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="age" className="text-sm font-medium text-gray-700 mb-2 block">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={bookingData.customerAge}
                    onChange={(e) => handleInputChange('customerAge', e.target.value)}
                    placeholder="e.g., 28"
                    className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="gender" className="text-sm font-medium text-gray-700 mb-2 block">Gender</Label>
                  <Select onValueChange={(value) => handleInputChange('customerGender', value)}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Preferred Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white border-gray-300",
                          !bookingData.preferredDate && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingData.preferredDate ? format(bookingData.preferredDate, "MMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={bookingData.preferredDate}
                        onSelect={(date) => setBookingData(prev => ({ ...prev, preferredDate: date }))}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Preferred Time *</Label>
                  <Select onValueChange={(value) => handleInputChange('preferredTime', value)}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="coupon" className="text-sm font-medium text-gray-700 mb-2 block">Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      type="text"
                      value={bookingData.couponCode}
                      onChange={(e) => handleInputChange('couponCode', e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      disabled={couponStatus.applied || isCouponLoading}
                    />
                    {!couponStatus.applied ? (
                      <Button
                        type="button"
                        onClick={applyCoupon}
                        variant="outline"
                        size="sm"
                        className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                        disabled={isCouponLoading}
                      >
                        {isCouponLoading ? 'Checking...' : 'Apply'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={removeCoupon}
                        variant="outline"
                        size="sm"
                        className="bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {couponStatus.message && (
                    <p className={`text-xs mt-1 ${couponStatus.applied ? 'text-green-600' : 'text-red-600'}`}>
                      {couponStatus.message}
                    </p>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700 mb-2 block">Address *</Label>
                  <Textarea
                    id="address"
                    value={bookingData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="e.g., 123 MG Road, Bangalore, Karnataka - 560001"
                    className="min-h-[80px] bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    rows={3}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter complete address for home sample collection</p>
                </div>

                <div className="lg:col-span-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-2 block">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={bookingData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="e.g., Please call before arriving"
                    className="min-h-[60px] bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-gray-900 font-semibold mb-4 text-lg">Order Summary</h3>
              <div className="space-y-2 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-gray-700 text-sm">
                    <span className="truncate pr-2">{item.test_name}</span>
                    <span className="flex-shrink-0 font-medium">₹{item.customer_price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-medium">₹{getTotalAmount().toLocaleString()}</span>
                </div>
                {getDiscountAmount() > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({couponStatus.discount}%)</span>
                    <span className="font-medium">-₹{getDiscountAmount().toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-900 font-bold text-xl border-t border-gray-200 pt-3">
                  <span>Total Amount</span>
                  <span>₹{getFinalAmount().toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Payment Method</span>
                  <span className="font-medium text-gray-900">Cash on Collection</span>
                </div>
                <p className="text-xs text-gray-500">Payment collected during sample collection. Free cancellation up to 2 hours before appointment.</p>
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isSubmitting || !bookingData.customerName || !bookingData.customerPhone || !bookingData.preferredDate || !bookingData.preferredTime || !bookingData.address || cartItems.length === 0}
              className="w-full bg-black hover:bg-gray-800 text-white text-base sm:text-lg py-6 font-semibold rounded-lg"
              size="lg"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Booking'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default CustomerDetailsSection;
