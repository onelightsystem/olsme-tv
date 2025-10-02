// Path: src/hooks/use-toast.ts
// Improvements (Sept 30, 2025):
// - Added premium user check for enhanced politeness messages (freemium model, $4.99/month).
// - Added Firestore/IPFS logging for toast errors (aligns with other components).
// - Added ARIA attributes for accessibility (GDPR compliance).
// - Kept shadcn’s `useToast` and `toast` for notifications (Day 11).
// - Kept `toastPolitenessScore` for AI Politeness Monitor feedback (Day 5).
// - Aligned with blueprint: Toasts for user feedback counter elite-driven chaos.
// - Solo Tip: Test with `npm run dev`, trigger in `waiting-screen.tsx`, check Firestore `logs`/`biofeedback_events`, IPFS CID.
'use client';
import * as React from 'react';
import type {ToastActionElement, ToastProps} from '@components/ui/toast';
import {formatPolitenessScore, generateCorrelationId, formatErrorLog} from '@lib/utils';
import {logToIPFS} from '@lib/ipfs-client';
import {db, auth} from '@lib/firebase/config';
import {collection, doc, getDoc, writeBatch} from 'firebase/firestore';
import {triggerBiofeedback} from '@lib/utils';

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | { type: ActionType['ADD_TOAST']; toast: ToasterToast }
  | { type: ActionType['UPDATE_TOAST']; toast: Partial<ToasterToast> }
  | { type: ActionType['DISMISS_TOAST']; toastId?: ToasterToast['id'] }
  | { type: ActionType['REMOVE_TOAST']; toastId?: ToasterToast['id'] };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({type: 'REMOVE_TOAST', toastId});
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
  case 'ADD_TOAST':
    return {...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT)};
  case 'UPDATE_TOAST':
    return {
      ...state,
      toasts: state.toasts.map((t) => (t.id === action.toast.id ? {...t, ...action.toast} : t)),
    };
  case 'DISMISS_TOAST': {
    const {toastId} = action;
    if (toastId) {
      addToRemoveQueue(toastId);
    } else {
      state.toasts.forEach((toast) => addToRemoveQueue(toast.id));
    }
    return {
      ...state,
      toasts: state.toasts.map((t) =>
        t.id === toastId || toastId === undefined ? {...t, open: false} : t
      ),
    };
  }
  case 'REMOVE_TOAST':
    if (action.toastId === undefined) return {...state, toasts: []};
    return {...state, toasts: state.toasts.filter((t) => t.id !== action.toastId)};
  }
};

const listeners: Array<(state: State) => void> = [];
let memoryState: State = {toasts: []};

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

type Toast = Omit<ToasterToast, 'id'>;

async function toast({...props}: Toast) {
  const id = genId();
  const correlationId = generateCorrelationId();
  const user = auth.currentUser;
  const update = (props: ToasterToast) => dispatch({type: 'UPDATE_TOAST', toast: {...props, id}});
  const dismiss = () => dispatch({type: 'DISMISS_TOAST', toastId: id});

  try {
    const isPremium = user ? (await getDoc(doc(db, 'users', user.uid))).data()?.package === 'premium' : false;
    dispatch({
      type: 'ADD_TOAST',
      toast: {
        ...props,
        id,
        open: true,
        onOpenChange: (open) => {
          if (!open) dismiss();
        },
        'aria-live': 'polite', // Accessibility
      },
    });

    // Log toast to Firestore and IPFS
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'logs')), {
      userId: user?.uid || 'anonymous',
      context: 'toast',
      title: props.title,
      description: props.description,
      correlationId,
      timestamp: new Date(),
    });
    batch.set(doc(collection(db, 'biofeedback_events')), {
      userId: user?.uid || 'anonymous',
      type: 'toast_display',
      value: 1,
      correlationId,
      timestamp: new Date(),
    });
    await batch.commit();

    await logToIPFS({
      userId: user?.uid || 'anonymous',
      action: 'toast_display',
      title: props.title,
      description: props.description,
      correlationId,
      timestamp: new Date().toISOString(),
    });

    // Mindfulness: Trigger calming audio for premium users
    if (user && isPremium) {
      await triggerBiofeedback(user.uid, 'chat', 'https://olsme.com/assets/premium-waves.mp3');
    }

    return {id, dismiss, update};
  } catch (e: unknown) {
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'logs')), formatErrorLog(e, 'toast_error', user?.uid || 'anonymous', correlationId));
    batch.set(doc(collection(db, 'biofeedback_events')), {
      userId: user?.uid || 'anonymous',
      type: 'error',
      value: 0,
      correlationId,
      timestamp: new Date(),
    });
    await batch.commit();

    const errorMessage = e instanceof Error ? e.message : String(e);
    await logToIPFS({
      error: errorMessage,
      context: 'toast_error',
      userId: user?.uid || 'anonymous',
      action: 'error',
      correlationId,
      timestamp: new Date().toISOString(),
    });

    if (user) {
      await triggerBiofeedback(user.uid, 'chat');
    }

    return {id, dismiss, update};
  }
}

async function toastPolitenessScore({
  ethical,
  communication,
  listener,
  topics,
  userId = 'anonymous',
  isPremium = false,
}: {
  ethical: number;
  communication: number;
  listener: number;
  topics: number;
  userId?: string;
  isPremium?: boolean;
}) {
  const correlationId = generateCorrelationId();
  try {
    const {badge, message} = await formatPolitenessScore({ethical, communication, listener, topics}, userId);
    const enhancedMessage = isPremium
      ? `${message} - Premium insights for mindful chats!`
      : message;

    const toastProps = {
      title: `Politeness: ${badge}`,
      description: enhancedMessage,
      action: badge === 'Bronze' ? {label: 'Improve', onClick: () => window.location.href = '/tips'} : undefined,
      'aria-live': 'polite' as const, // Accessibility
    };

    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'politeness_scores')), {
      userId,
      score: {ethical, communication, listener, topics},
      badge,
      correlationId,
      timestamp: new Date(),
    });
    batch.set(doc(collection(db, 'biofeedback_events')), {
      userId,
      type: 'politeness_toast',
      value: 1,
      correlationId,
      timestamp: new Date(),
    });
    await batch.commit();

    await logToIPFS({
      userId,
      action: 'politeness_toast',
      badge,
      message: enhancedMessage,
      correlationId,
      timestamp: new Date().toISOString(),
    });

    // Mindfulness: Trigger calming audio for premium users
    if (isPremium && auth.currentUser) {
      await triggerBiofeedback(auth.currentUser.uid, 'chat', 'https://olsme.com/assets/premium-waves.mp3');
    }

    return toast(toastProps);
  } catch (e: unknown) {
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'logs')), formatErrorLog(e, 'toastPolitenessScore_error', userId, correlationId));
    batch.set(doc(collection(db, 'biofeedback_events')), {
      userId,
      type: 'error',
      value: 0,
      correlationId,
      timestamp: new Date(),
    });
    await batch.commit();

    const errorMessage = e instanceof Error ? e.message : String(e);
    await logToIPFS({
      error: errorMessage,
      context: 'toastPolitenessScore_error',
      userId,
      action: 'error',
      correlationId,
      timestamp: new Date().toISOString(),
    });

    if (auth.currentUser) {
      await triggerBiofeedback(auth.currentUser.uid, 'chat');
    }

    return toast({
      title: 'Politeness: Error',
      description: 'Failed to display politeness score.',
      'aria-live': 'polite',
    });
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [state]);

  return {
    ...state,
    toast,
    toastPolitenessScore,
    dismiss: (toastId?: string) => dispatch({type: 'DISMISS_TOAST', toastId}),
  };
}

export {useToast, toast, toastPolitenessScore};
