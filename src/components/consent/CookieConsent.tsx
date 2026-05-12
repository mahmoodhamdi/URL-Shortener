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
  } catch {
    // ignore
  }
  try {
    const m = document.cookie.match(/(?:^|; )cookie-consent-v1=([^;]+)/);
    if (m && (m[1] === 'accepted' || m[1] === 'rejected')) {
      return m[1];
    }
  } catch {
    // ignore
  }
  return null;
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

/**
 * The wrapper renders server-side as an inert placeholder. On the client we
 * hydrate, read the stored consent, and decide whether to show the banner.
 * Critically, this avoids a late post-hydration mount paint — Lighthouse was
 * picking the banner up as the LCP element when it appeared after first paint.
 */
export function CookieConsent({ defaultHidden }: { defaultHidden?: boolean }) {
  const [visible, setVisible] = useState<boolean>(!defaultHidden);

  useEffect(() => {
    const stored = readChoice();
    if (stored !== null) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    writeChoice('accepted');
    setVisible(false);
  };
  const reject = () => {
    writeChoice('rejected');
    setVisible(false);
  };

  return (
    <aside
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] rounded-lg border bg-background shadow-lg"
    >
      <div className="px-4 py-3 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Essential cookies keep you signed in. Optional analytics cookies are
          off until you accept.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={reject}>
            Reject
          </Button>
          <Button size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </aside>
  );
}
