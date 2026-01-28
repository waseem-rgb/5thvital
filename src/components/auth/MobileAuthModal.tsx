import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MobileAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MobileAuthModal = ({ open, onOpenChange }: MobileAuthModalProps) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+91 ');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePhoneChange = (value: string) => {
    // Always ensure it starts with +91 
    if (!value.startsWith('+91 ')) {
      // If user tries to delete the prefix, restore it
      const digits = value.replace(/\D/g, '');
      if (digits.length === 0) {
        setPhone('+91 ');
        return;
      }
      // Extract just the phone number digits (remove country code if present)
      const phoneDigits = digits.startsWith('91') ? digits.slice(2) : digits;
      if (phoneDigits.length <= 10) {
        setPhone(`+91 ${phoneDigits}`);
      }
      return;
    }
    
    // If value already starts with +91, just validate length
    const digitsAfterPrefix = value.slice(4).replace(/\D/g, '');
    if (digitsAfterPrefix.length <= 10) {
      setPhone(`+91 ${digitsAfterPrefix}`);
    }
  };

  const handleSendOTP = async () => {
    // Validate phone format: must start with +91 and have exactly 10 digits after
    const phoneDigits = phone.replace(/\D/g, '').slice(2); // Remove +91
    
    if (!phone || phoneDigits.length !== 10) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid Indian phone number with +91 followed by 10 digits',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone }
      });

      console.log('[MobileAuth] send-otp response:', { data, error });

      // supabase.functions.invoke may wrap non-2xx as FunctionsHttpError
      // but the body may still contain { ok: true } if SMS was sent
      if (error) {
        // Try to extract response body from error context
        const errorContext = (error as any)?.context;
        let responseBody: any = null;
        
        if (errorContext?.json) {
          try {
            responseBody = await errorContext.json();
          } catch {}
        }
        
        console.log('[MobileAuth] Error context body:', responseBody);
        
        // If body indicates success, treat as success despite error wrapper
        if (responseBody?.ok === true) {
          toast({
            title: 'OTP Sent',
            description: 'Please check your phone for the verification code',
          });
          setStep('otp');
          return;
        }
        
        throw new Error(responseBody?.error || error.message || 'Failed to send OTP');
      }

      // Check for ok (backend uses "ok", not "success")
      if (data?.ok === true) {
        toast({
          title: 'OTP Sent',
          description: 'Please check your phone for the verification code',
        });
        setStep('otp');
      } else {
        throw new Error(data?.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('[MobileAuth] Send OTP error:', error);
      let errorMessage = error.message || 'Failed to send OTP';
      
      if (errorMessage.includes('SMS service not configured') || errorMessage.includes('Server misconfigured')) {
        errorMessage = 'SMS service is being configured. Please try again in a moment.';
      } else if (errorMessage.includes('Invalid phone')) {
        errorMessage = 'Please enter a valid phone number';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit verification code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone, otp }
      });

      console.log('[MobileAuth] verify-otp response:', { data, error });

      // Handle error case similar to send-otp
      if (error) {
        const errorContext = (error as any)?.context;
        let responseBody: any = null;
        
        if (errorContext?.json) {
          try {
            responseBody = await errorContext.json();
          } catch {}
        }
        
        console.log('[MobileAuth] Verify error context body:', responseBody);
        
        // If body indicates success, treat as success
        if (responseBody?.ok === true) {
          // If edge function returned credentials, sign in on the client
          if (responseBody.signIn?.email && responseBody.signIn?.password) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: responseBody.signIn.email,
              password: responseBody.signIn.password,
            });
            if (signInError) throw signInError;
          }
          toast({
            title: 'Login Successful',
            description: 'Welcome to 5thvital!',
          });
          onOpenChange(false);
          setStep('phone');
          setPhone('+91 ');
          setOtp('');
          return;
        }
        
        throw new Error(responseBody?.error || error.message || 'Invalid OTP');
      }

      // Check for ok (backend uses "ok", not "success")
      if (data?.ok === true) {
        // If edge function returned credentials, sign in on the client
        if (data.signIn?.email && data.signIn?.password) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: data.signIn.email,
            password: data.signIn.password,
          });
          if (signInError) throw signInError;
        }

        toast({
          title: 'Login Successful',
          description: 'Welcome to 5thvital!',
        });
        onOpenChange(false);
        setStep('phone');
        setPhone('+91 ');
        setOtp('');
      } else {
        throw new Error(data?.error || 'Invalid OTP');
      }
    } catch (error: any) {
      console.error('[MobileAuth] Verify OTP error:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid or expired OTP',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setPhone('+91 ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-2 border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-foreground mb-2">
            {step === 'phone' ? 'Login with Phone' : 'Verify OTP'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {step === 'phone' ? (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Phone className="w-8 h-8 text-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">
                  Mobile Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onFocus={(e) => {
                    // Position cursor after +91 space if field only contains prefix
                    if (e.target.value === '+91 ') {
                      setTimeout(() => e.target.setSelectionRange(4, 4), 0);
                    }
                  }}
                  placeholder="+91 XXXXXXXXXX"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-foreground"
                />
              </div>
              
              <Button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-foreground" />
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  Enter the 6-digit code sent to
                </p>
                <p className="text-foreground font-semibold">{phone}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-foreground">
                  Verification Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-foreground text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold"
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </Button>
                
                <Button
                  onClick={handleBack}
                  variant="ghost"
                  className="w-full text-foreground hover:bg-muted"
                >
                  Change Phone Number
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MobileAuthModal;