'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'cookie-consent-v1';

type Choice = 'accepted' | 'rejected' | null;

function readChoice(): Choice {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'rejected') return v;
    return null;
  } catch {
    return null;
  }
}

function writeChoice(c: Exclude<Choice, null>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, c);
    document.cookie = `${STORAGE_KEY}=${c}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch {
    // Ignore storage errors (private browsing, quota, etc.). The banner stays
    // visible on next load, which is the correct conservative fallback.
  }
}

export function CookieConsent() {
  const [choice, setChoice] = useState<Choice>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setChoice(readChoice());
  }, []);

  if (!mounted || choice !== null) return null;

  const accept = () => {
    writeChoice('accepted');
    setChoice('accepted');
  };
  const reject = () => {
    writeChoice('rejected');
    setChoice('rejected');
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 bg-background border-t shadow-lg"
    >
      <div className="container mx-auto max-w-5xl px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          We use essential cookies to keep you signed in and a few analytics
          cookies to understand usage. You can accept all or reject everything
          except essentials at any time.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={reject}>
            Reject non-essential
          </Button>
          <Button onClick={accept}>Accept all</Button>
        </div>
      </div>
    </div>
  );
}
