import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Phone, Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect authenticated users to their intended destination or home
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone }
      });

      console.log('[Auth] send-otp response:', { data, error });

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
        
        console.log('[Auth] Error context body:', responseBody);
        
        // If body indicates success, treat as success despite error wrapper
        if (responseBody?.ok === true) {
          toast.success('OTP sent! Please check your phone for the verification code.');
          setStep('otp');
          return;
        }
        
        throw new Error(responseBody?.error || error.message || 'Failed to send OTP');
      }

      // Check for ok (backend uses "ok", not "success")
      if (data?.ok === true) {
        toast.success('OTP sent! Please check your phone for the verification code.');
        setStep('otp');
      } else {
        throw new Error(data?.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('[Auth] Send OTP error:', error);
      let errorMessage = error.message || 'Failed to send OTP';
      
      if (errorMessage.includes('SMS service not configured') || errorMessage.includes('Server misconfigured')) {
        errorMessage = 'SMS service is being configured. Please try again in a moment.';
      } else if (errorMessage.includes('Invalid phone')) {
        errorMessage = 'Please enter a valid phone number';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone, otp }
      });

      console.log('[Auth] verify-otp response:', { data, error });

      // Handle error case similar to send-otp
      if (error) {
        const errorContext = (error as any)?.context;
        let responseBody: any = null;
        
        if (errorContext?.json) {
          try {
            responseBody = await errorContext.json();
          } catch {}
        }
        
        console.log('[Auth] Verify error context body:', responseBody);
        
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
          toast.success('Login successful! Welcome to 5thvital.');
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

        toast.success('Login successful! Welcome to 5thvital.');
      } else {
        throw new Error(data?.error || 'Invalid OTP');
      }
    } catch (error: any) {
      console.error('[Auth] Verify OTP error:', error);
      setError(error.message || 'Invalid or expired OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to 5thvital
          </h1>
          <p className="text-muted-foreground">
            {step === 'phone' ? 'Enter your mobile number to continue' : 'Enter the verification code sent to your phone'}
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                {step === 'phone' ? (
                  <Phone className="w-8 h-8 text-primary" />
                ) : (
                  <Shield className="w-8 h-8 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              {step === 'phone' ? 'Login with Mobile' : 'Verify OTP'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'phone' 
                ? 'We\'ll send you a verification code' 
                : `Code sent to ${phone}`}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 'phone' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 XXXXXXXXXX"
                      className="pl-10"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleSendOTP}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                </div>
                
                <div className="space-y-3">
                  <Button 
                    onClick={handleVerifyOTP}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Login'
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleBack}
                    variant="ghost"
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Change Phone Number
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;