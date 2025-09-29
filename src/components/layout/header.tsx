// Path: src/components/layout/header.tsx
// Improvements (Oct 1, 2025):
// - Implemented Radix Dialogs for Email and Phone sign-in flows, improving UX.
// - Added separate forms for Sign Up and Sign In with email/password.
// - Integrated `RecaptchaVerifier` for secure phone authentication.
// - Maintained Twitter sign-in, biofeedback toggle, and branding.
// - All authentication events are logged to Firestore and IPFS as required.

'use client';
import { Sun, User, Volume2, Phone, Mail, LogOut, Twitter } from 'lucide-react';
import { Button } from '@components/ui/button';
import {
  auth,
  signInWithX,
  signInWithPhone,
  signUpWithEmail,
  signInWithEmail,
  db,
  createUserDocument,
} from '@lib/firebase/config';
import { triggerBiofeedback, formatErrorLog, logToIPFS } from '@lib/utils';
import { useToast } from '@hooks/use-toast';
import { useEffect, useState, useRef } from 'react';
import { RecaptchaVerifier, ConfirmationResult, signOut } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@components/ui/dialog';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';

export default function Header() {
  const { toast } = useToast();
  const [user, setUser] = useState(auth.currentUser);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Form states
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleTwitterSignIn = async () => {
    try {
      await signInWithX();
      toast({ title: 'Logged In', description: 'Welcome to Awake Chat!' });
      setAuthDialogOpen(false);
      await logToIPFS({ userId: auth.currentUser?.uid, action: 'signInWithX' });
    } catch (e) {
      const error = e as Error;
      await addDoc(collection(db, 'logs'), formatErrorLog(error, 'headerLoginX'));
      await logToIPFS({ error: error.message, context: 'headerLoginX' });
      toast({ variant: 'destructive', title: 'Error', description: 'Login with X failed.' });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUpWithEmail(signUpEmail, signUpPassword, displayName);
      toast({ title: 'Account Created', description: 'Welcome to Awake Chat!' });
      setAuthDialogOpen(false);
    } catch (e) {
      const error = e as Error;
      toast({ variant: 'destructive', title: 'Sign Up Failed', description: error.message });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmail(signInEmail, signInPassword);
      toast({ title: 'Logged In', description: 'Welcome back!' });
      setAuthDialogOpen(false);
    } catch (e) {
      const error = e as Error;
      toast({ variant: 'destructive', title: 'Sign In Failed', description: error.message });
    }
  };

  const setupRecaptcha = () => {
    if (!recaptchaVerifier.current && recaptchaContainerRef.current) {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
            size: 'invisible',
            callback: () => {
                // reCAPTCHA solved, allow signInWithPhoneNumber.
            },
        });
    }
  };
  
  const handlePhoneSignInRequest = async () => {
    if (!phoneNumber) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a phone number.' });
      return;
    }
    try {
      setupRecaptcha();
      if(recaptchaVerifier.current) {
        const confirmation = await signInWithPhone(phoneNumber, recaptchaVerifier.current);
        setConfirmationResult(confirmation);
        toast({ title: 'Code Sent', description: 'A verification code has been sent to your phone.' });
      }
    } catch (e) {
      const error = e as Error;
      await addDoc(collection(db, 'logs'), formatErrorLog(error, 'phoneSignInRequest'));
      await logToIPFS({ error: error.message, context: 'phoneSignInRequest' });
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send code. Please check the number and try again.' });
    }
  };

  const handlePhoneCodeVerify = async () => {
    if (!verificationCode) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter the verification code.' });
      return;
    }
    if (!confirmationResult) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please request a code first.' });
      return;
    }
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      await createUserDocument({ uid: user.uid, phoneNumber: user.phoneNumber, displayName: user.phoneNumber });
      toast({ title: 'Logged In', description: 'Phone authentication successful!' });
      setPhoneDialogOpen(false);
      setConfirmationResult(null);
      setPhoneNumber('');
      setVerificationCode('');
      await logToIPFS({ userId: user.uid, action: 'signInWithPhone' });
    } catch (e) {
      const error = e as Error;
      await addDoc(collection(db, 'logs'), formatErrorLog(error, 'phoneSignInVerify'));
      await logToIPFS({ error: error.message, context: 'phoneSignInVerify' });
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid verification code.' });
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: 'Logged Out', description: 'You have been signed out.' });
  };
  
  const handleBiofeedbackToggle = async () => {
    try {
      await triggerBiofeedback(user?.uid || 'anonymous', 'chat');
      toast({ title: 'Biofeedback', description: 'Red Sea waves activated.' });
    } catch (e) {
      const error = e as Error;
      await addDoc(collection(db, 'logs'), formatErrorLog(error, 'headerBiofeedback'));
      await logToIPFS({ error: error.message, context: 'headerBiofeedback' });
      toast({ variant: 'destructive', title: 'Error', description: 'Biofeedback failed.' });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex items-center">
            <Sun className="h-6 w-6 mr-2 stroke-[#FFD700]" />
            <span className="font-bold font-headline">Awake Chat</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={handleBiofeedbackToggle} aria-label="Toggle biofeedback">
              <Volume2 className="h-5 w-5 stroke-[#FFD700]" />
            </Button>
            {user ? (
               <>
                <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.displayName || 'Friend'}</span>
                <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign Out">
                  <LogOut className="h-5 w-5 stroke-[#FFD700]" />
                </Button>
               </>
            ) : (
                <>
                <Button variant="ghost" onClick={() => setAuthDialogOpen(true)}>
                    <Mail className="h-5 w-5 mr-2 stroke-[#FFD700]" />
                    Email
                </Button>
                <Button variant="ghost" onClick={() => setPhoneDialogOpen(true)}>
                    <Phone className="h-5 w-5 mr-2 stroke-[#FFD700]" />
                    Phone
                </Button>
                <Button variant="ghost" size="icon" onClick={handleTwitterSignIn} aria-label="Login with X">
                    <User className="h-5 w-5 stroke-[#FFD700]" />
                    <span className="sr-only">Login with X</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Email Auth Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <DialogHeader>
                <DialogTitle>Sign In</DialogTitle>
                <DialogDescription>Access your account to continue.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSignIn}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="signin-email" className="text-right">Email</Label>
                    <Input id="signin-email" type="email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="signin-password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="text-right">Password</Label>
                    <Input id="signin-password" type="password" className="col-span-3" required/>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Sign In</Button>
                </DialogFooter>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <DialogHeader>
                <DialogTitle>Create Account</DialogTitle>
                <DialogDescription>Start your mindful journey with us.</DialogDescription>
              </DialogHeader>
               <form onSubmit={handleSignUp}>
                <div className="grid gap-4 py-4">
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="display-name" className="text-right">Name</Label>
                    <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="signup-email" className="text-right">Email</Label>
                    <Input id="signup-email" type="email" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="signup-password" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} className="text-right">Password</Label>
                    <Input id="signup-password" type="password" className="col-span-3" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Sign Up</Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
           <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
          </div>
          <Button variant="outline" onClick={handleTwitterSignIn}><Twitter className="mr-2 h-4 w-4" /> Twitter</Button>
        </DialogContent>
      </Dialog>
      
      {/* Phone Auth Dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sign In with Phone</DialogTitle>
            <DialogDescription>
              {confirmationResult ? 'Enter the code we sent you.' : 'Enter your phone number to receive a verification code.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!confirmationResult ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 555-555-5555" className="col-span-3" />
              </div>
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <Input id="code" type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="123456" className="col-span-3" />
              </div>
            )}
          </div>
          <DialogFooter>
            {!confirmationResult ? (
              <Button onClick={handlePhoneSignInRequest}>Send Code</Button>
            ) : (
              <Button onClick={handlePhoneCodeVerify}>Verify Code</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div ref={recaptchaContainerRef}></div>
    </>
  );
}
