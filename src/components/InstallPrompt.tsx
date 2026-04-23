import { useEffect, useState } from 'react';

const DISMISS_KEY = 'undercover.installHint.dismissed';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const navAny = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navAny.standalone === true
  );
}

function isiOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [bip, setBip] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    if (isiOS()) {
      const t = setTimeout(() => setShow(true), 1500);
      return () => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        clearTimeout(t);
      };
    }
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  }

  async function install() {
    if (!bip) return;
    await bip.prompt();
    await bip.userChoice;
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md p-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
      <div className="rounded-2xl border border-ink-600 bg-ink-800/95 p-4 shadow-card backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-ink-900 font-display font-bold">UC</div>
          <div className="flex-1 text-sm">
            <div className="font-display text-base font-semibold">Install Undercover</div>
            {bip ? (
              <p className="mt-1 text-ink-300">Add to your home screen for an app-like experience.</p>
            ) : isiOS() ? (
              <p className="mt-1 text-ink-300">
                Tap <span className="font-semibold">Share</span> then{' '}
                <span className="font-semibold">Add to Home Screen</span>.
              </p>
            ) : (
              <p className="mt-1 text-ink-300">Add to your home screen from your browser menu.</p>
            )}
            <div className="mt-3 flex gap-2">
              {bip && (
                <button onClick={install} className="btn btn-primary text-sm">
                  Install
                </button>
              )}
              <button onClick={dismiss} className="btn btn-ghost text-sm">
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
