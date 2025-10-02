// Path: src/components/layout/header.tsx
// Improvements (Sept 30, 2025):
// - Updated `Sun` icon to link to home page (`/`), kept "olsme Chat beta 0.2" linked to `/about`.
// - Kept `Volume2` and `User` icon colors as darker orange (#FF8C00).
// - Replaced multiple login buttons with a single User profile icon (Day 16).
// - For guests, the icon opens a sign-in/sign-up dialog with Email/Phone/Twitter options.
// - For logged-in users, the icon opens a dropdown menu with Profile, Search, and Sign Out.
// - Maintained all existing authentication logic (Email, Phone, Twitter) (Day 15).
// - Fixed import: Changed `signInWithX`, `signInWithPhone`, `signUpWithEmail`, `signInWithEmail`, `createUserDocument` from `@lib/firebase` to `@lib/firebase/config` (Day 16).
// - Kept dynamic `logToIPFS` import from `ipfs-client.ts` to prevent SSR `electron` error (Day 16).
// - Kept PT Sans, #FFD700 gold, Radix dialogs (blueprint).
// - Kept IPFS logging for auth actions (Day 4).
// - Aligns with freemium: Premium users ($4.99) unlock custom audio toggles (Business Plan).
// - Solo Tip: Test with `npm run dev`, click `Sun` icon and "olsme Chat beta 0.2" link, check Firestore `logs`, IPFS CID.
'use client';
import Link from 'next/link';
import { Sun, User, Volume2, Phone, Mail, LogOut, Twitter, Search, Shield } from 'lucide-react';
import { Button } from '@components/ui/button';
import {
  signInWithX,
  signInWithPhone,
  signUpWithEmail,
  signInWithEmail,
  createUserDocument,
} from '@lib/firebase/config';
import { auth, db } from '@lib/firebase/config';
import { triggerBiofeedback, formatErrorLog } from '@lib/utils';
import { useToast } from '@hooks/use-toast';
import { useEffect, useState, useRef } from 'react';
import { RecaptchaVerifier, ConfirmationResult, signOut, User as FirebaseUser, IdTokenResult } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/tabs';

export default function Header() {
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [claims, setClaims] = useState<IdTokenResult['claims'] | null>(null);
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
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const tokenResult = await u.getIdTokenResult();
        setClaims(tokenResult.claims);
      } else {
        setClaims(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = claims?.isAdmin === true;

  const handleTwitterSignIn = async () => {
    try {
      await signInWithX();
      toast({ title: 'Logged In', description: 'Welcome to Awake Chat!' });
      setAuthDialogOpen(false);
      const { logToIPFS } = await import('@lib/ipfs-client');
      await logToIPFS({ userId: auth.currentUser?.uid, action: 'signInWithX' });
    } catch (e) {
      const error = e as Error;
      await addDoc(collection(db, 'logs'), formatErrorLog(error, 'headerLoginX'));
      const { logToIPFS } = await import('@lib/ipfs-client');
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
          // reCAPTCHA solved
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
      if (recaptchaVerifier.current) {
        const confirmation = await signInWithPhone(phoneNumber, recaptchaVerifier.current);
        setConfirmationResult(confirmation);
        toast({ title: 'Code Sent', description: 'A verification code has been sent to your phone.' });
      }
    } catch (e) {
      const error = e as Error;
      await addDoc(collection(db, 'logs'), formatErrorLog(error, 'phoneSignInRequest'));
      const { logToIPFS } = await import('@lib/ipfs-client');
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
      await createUserDocument({ uid: user.uid, phoneNumber: user.phoneNumber });
      toast({ title: 'Logged In', description: 'Phone authentication successful!' });
      setPhoneDialogOpen(false);
      setConfirmationResult(null);
      setPhoneNumber('');
      setVerificationCode('');
      const { logToIPFS } = await import('@lib/ipfs-client');
      await logToIPFS({ userId: user.uid, action: 'signInWithPhone' });
    } catch (e) {
      const error = e as Error;
      await addDoc(collection(db, 'logs'), formatErrorLog(error, 'phoneSignInVerify'));
      const { logToIPFS } = await import('@lib/ipfs-client');
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
      const { logToIPFS } = await import('@lib/ipfs-client');
      await logToIPFS({ error: error.message, context: 'headerBiofeedback' });
      toast({ variant: 'destructive', title: 'Error', description: 'Biofeedback failed.' });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex items-center">
            <Link href="/" className="flex items-center">
              <Sun className="h-8 w-8 mr-2 stroke-[#FFD700]" aria-label="Home" />
            </Link>
              <span className="mx-2" />
            <Link href="/about" className="flex items-center">
          
              <span className="font-bold font-headline">olsme Chat beta 0.2</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={handleBiofeedbackToggle} aria-label="Toggle biofeedback">
              <Volume2 className="h-5 w-5 stroke-[#FF8C00]" />
            </Button>
            {user && (
              <Link href="/search" passHref>
                <Button variant="ghost" size="icon" aria-label="Search users">
                  <Search className="h-5 w-5 stroke-[#FF8C00]" />
                </Button>
              </Link>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="User Profile">
                    <User className="h-5 w-5 stroke-[#FF8C00]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Welcome, {user.displayName || 'Friend'}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <Link href="/admin/users" passHref>
                      <DropdownMenuItem>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <Link href="/profile" passHref>
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/search" passHref>
                    <DropdownMenuItem>
                      <Search className="mr-2 h-4 w-4" />
                      <span>Search Users</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setAuthDialogOpen(true)} aria-label="Login or Sign Up">
                <User className="h-5 w-5 stroke-[#FF8C00]" />
              </Button>
            )}
          </div>
        </div>
      </header>
      {/* Auth Dialog for Email, Phone, and Twitter */}
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
                    <Label htmlFor="signin-password" className="text-right">Password</Label>
                    <Input id="signin-password" type="password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="col-span-3" required />
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
                    <Label htmlFor="signup-password" className="text-right">Password</Label>
                    <Input id="signup-password" type="password" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} className="col-span-3" required />
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
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleTwitterSignIn}><Twitter className="mr-2 h-4 w-4" /> Twitter</Button>
            <Button variant="outline" onClick={() => { setAuthDialogOpen(false); setPhoneDialogOpen(true); }}><Phone className="mr-2 h-4 w-4" /> Phone</Button>
          </div>
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