import { Share2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "pwa-banner-dismissed";

function isIOS() {
  const ua = navigator.userAgent;
  const isIPhoneIPad = /iPhone|iPad|iPod/.test(ua);
  const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return (isIPhoneIPad || isIPadOS) && !(window.navigator as any).standalone;
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

interface Props {
  /** Trigger the banner to appear (e.g. after profile creation). */
  triggerShow?: boolean;
}

export default function PWAInstallBanner({ triggerShow = false }: Props) {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const ios = isIOS();

  // Capture Android/desktop install prompt
  useEffect(() => {
    // Check if already captured globally before component mounted
    if ((window as any).__deferredInstallPrompt) {
      setDeferredPrompt((window as any).__deferredInstallPrompt);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).__deferredInstallPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Show banner when triggerShow fires (after profile creation)
  useEffect(() => {
    if (!triggerShow) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Don't show if already installed as standalone
    if ((window.navigator as any).standalone) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    setVisible(true);
  }, [triggerShow]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const handleInstall = async () => {
    if (ios) {
      // Use Web Share API to open the native iOS share sheet
      // which includes "Add to Home Screen"
      try {
        await navigator.share({
          title: "Pulse",
          text: "Add Pulse to your Home Screen for the best experience",
          url: window.location.href,
        });
      } catch {
        // User cancelled or share not supported — do nothing
      }
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      dismiss();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-ocid="pwa.banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg"
        >
          <div
            className="m-3 rounded-2xl border px-4 py-3 flex items-center gap-3"
            style={{
              background: "oklch(0.11 0.007 55)",
              borderColor: "oklch(0.76 0.13 72 / 0.5)",
              boxShadow: "0 -4px 24px oklch(0.76 0.13 72 / 0.12)",
            }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold leading-snug"
                style={{ color: "oklch(0.82 0.15 72)" }}
              >
                Add Pulse to your home screen
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {ios
                  ? 'Tap the button below, then "Add to Home Screen"'
                  : isAndroid()
                    ? "Install for faster access and offline use"
                    : "Install for the best experience"}
              </p>
            </div>
            {/* Action button */}
            <button
              type="button"
              data-ocid="pwa.install_button"
              onClick={handleInstall}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              {ios ? (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </>
              ) : (
                "Install"
              )}
            </button>
            <button
              type="button"
              data-ocid="pwa.close_button"
              onClick={dismiss}
              className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
