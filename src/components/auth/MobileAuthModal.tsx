import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Shield } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
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
  const { refreshAuth } = useAuth();

  const handlePhoneChange = (value: string) => {
    if (!value.startsWith('+91 ')) {
      const digits = value.replace(/\D/g, '');
      if (digits.length === 0) {
        setPhone('+91 ');
        return;
      }
      const phoneDigits = digits.startsWith('91') ? digits.slice(2) : digits;
      if (phoneDigits.length <= 10) {
        setPhone(`+91 ${phoneDigits}`);
      }
      return;
    }

    const digitsAfterPrefix = value.slice(4).replace(/\D/g, '');
    if (digitsAfterPrefix.length <= 10) {
      setPhone(`+91 ${digitsAfterPrefix}`);
    }
  };

  const handleSendOTP = async () => {
    const phoneDigits = phone.replace(/\D/g, '').slice(2);

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
      // Normalize phone: remove space between +91 and digits
      const normalizedPhone = `+91${phoneDigits}`;
      const { data, error } = await api.sendOTP(normalizedPhone);

      if (error) throw new Error(error);

      if (data?.success) {
        toast({ title: 'OTP Sent', description: 'Please check your phone for the verification code' });
        setStep('otp');
      } else {
        throw new Error('Failed to send OTP');
      }
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to send OTP';
      if (errorMessage.includes('SMS service') || errorMessage.includes('Server')) {
        errorMessage = 'SMS service is being configured. Please try again in a moment.';
      }
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Please enter the 6-digit verification code', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const phoneDigits = phone.replace(/\D/g, '').slice(2);
      const normalizedPhone = `+91${phoneDigits}`;
      const { data, error } = await api.verifyOTP(normalizedPhone, otp);

      if (error) throw new Error(error);

      if (data?.success) {
        refreshAuth();
        toast({ title: 'Login Successful', description: 'Welcome to 5thvital!' });
        onOpenChange(false);
        setStep('phone');
        setPhone('+91 ');
        setOtp('');
      } else {
        throw new Error('Invalid OTP');
      }
    } catch (error: any) {
      toast({ title: 'Verification Failed', description: error.message || 'Invalid or expired OTP', variant: 'destructive' });
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
            {step === 'phone' ? 'Login to Complete Booking' : 'Verify OTP'}
          </DialogTitle>
          {step === 'phone' && (
            <p className="text-center text-sm text-muted-foreground mt-1">
              Your cart is saved. Login to complete your booking.
            </p>
          )}
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
