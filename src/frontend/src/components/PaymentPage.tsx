import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ArrowLeft, Coins, Loader2, LogIn, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import type { UserProfile } from "../backend";
import { useIcpPrice } from "../hooks/useIcpPrice";
import { useTransferGold } from "../hooks/useQueries";

const GOLD_SYMBOL = "\u2726";

function formatPulse(pulseNum: number): string {
  const intPart = Math.floor(pulseNum);
  const fracPart = (pulseNum - intPart).toFixed(4).slice(1);
  return `${GOLD_SYMBOL} ${intPart.toLocaleString("en-US")}${fracPart} Pulse`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface PaymentPageProps {
  username: string;
  defaultAmount?: string;
  onBack?: () => void;
}

export default function PaymentPage({
  username,
  defaultAmount = "",
  onBack,
}: PaymentPageProps) {
  const { identity, login } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { actor, isFetching: actorFetching } = useActor(createActor);
  const { price: icpPrice, loading: icpPriceLoading } = useIcpPrice();
  const transferGold = useTransferGold();

  const [recipientProfile, setRecipientProfile] = useState<UserProfile | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  const [pulseAmt, setPulseAmt] = useState(defaultAmount);
  const [usdAmt, setUsdAmt] = useState(() => {
    if (!defaultAmount || !icpPrice) return "";
    const v = Number.parseFloat(defaultAmount);
    return !Number.isNaN(v) ? (v * (icpPrice ?? 0)).toFixed(2) : "";
  });

  const [sending, setSending] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Load recipient profile by username
  useEffect(() => {
    if (!actor || actorFetching) return;
    setProfileLoading(true);
    setProfileError(false);
    (actor as ReturnType<typeof createActor>)
      .searchUserByUsername(username)
      .then((p) => {
        if (p) {
          setRecipientProfile(p.profile);
        } else {
          setProfileError(true);
        }
      })
      .catch(() => setProfileError(true))
      .finally(() => setProfileLoading(false));
  }, [actor, actorFetching, username]);

  // Sync USD when price loads and default amount is present
  useEffect(() => {
    if (icpPrice && defaultAmount && !usdAmt) {
      const v = Number.parseFloat(defaultAmount);
      if (!Number.isNaN(v) && v > 0) {
        setUsdAmt((v * icpPrice).toFixed(2));
      }
    }
  }, [icpPrice, defaultAmount, usdAmt]);

  const handlePulseChange = (val: string) => {
    setPulseAmt(val);
    if (val && icpPrice) {
      const n = Number.parseFloat(val);
      if (!Number.isNaN(n) && n > 0) {
        setUsdAmt((n * icpPrice).toFixed(2));
      } else {
        setUsdAmt("");
      }
    } else {
      setUsdAmt("");
    }
  };

  const handleUsdChange = (val: string) => {
    setUsdAmt(val);
    if (val && icpPrice && icpPrice > 0) {
      const n = Number.parseFloat(val);
      if (!Number.isNaN(n) && n > 0) {
        setPulseAmt((n / icpPrice).toFixed(4));
      } else {
        setPulseAmt("");
      }
    } else {
      setPulseAmt("");
    }
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await login();
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSend = async () => {
    const pulseNum = Number.parseFloat(pulseAmt);
    if (Number.isNaN(pulseNum) || pulseNum < 0.01) {
      toast.error("Minimum amount is 0.01 Pulse");
      return;
    }
    const rawAmount = BigInt(Math.round(pulseNum * 10000));
    setSending(true);
    try {
      await transferGold.mutateAsync({
        toUsername: username,
        amount: rawAmount,
      });
      toast.success(`Sent ${formatPulse(pulseNum)} to @${username}!`);
      setPulseAmt("");
      setUsdAmt("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setSending(false);
    }
  };

  const pulseNum = Number.parseFloat(pulseAmt);
  const isValid = !Number.isNaN(pulseNum) && pulseNum >= 0.01;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "oklch(0.09 0.008 55)" }}
    >
      {/* Back button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          data-ocid="payment.back_button"
          className="fixed top-4 left-4 flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: "oklch(0.65 0.08 72)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}

      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
        style={{
          background: "oklch(0.13 0.02 55)",
          border: "1px solid oklch(0.82 0.15 72 / 0.2)",
          boxShadow: "0 12px 48px oklch(0.82 0.15 72 / 0.10)",
        }}
        data-ocid="payment.card"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="flex items-center gap-1.5 mb-1"
            style={{ color: "oklch(0.82 0.15 72)" }}
          >
            <Coins className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Pulse Payment
            </span>
          </div>
          <h1
            className="text-xl font-bold font-display"
            style={{ color: "oklch(0.82 0.15 72)" }}
          >
            Pay @{username}
          </h1>
        </div>

        {/* Recipient profile */}
        {profileLoading ? (
          <div
            className="flex flex-col items-center gap-3 py-2"
            data-ocid="payment.loading_state"
          >
            <div
              className="w-16 h-16 rounded-full animate-pulse"
              style={{ background: "oklch(0.20 0.04 55)" }}
            />
            <div
              className="h-3 w-24 rounded animate-pulse"
              style={{ background: "oklch(0.20 0.04 55)" }}
            />
          </div>
        ) : profileError ? (
          <div
            className="flex flex-col items-center gap-2 py-2 text-center"
            data-ocid="payment.error_state"
          >
            <p className="text-sm text-muted-foreground">
              User @{username} not found.
            </p>
          </div>
        ) : recipientProfile ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="w-16 h-16">
              {recipientProfile.avatarUrl && (
                <AvatarImage
                  src={recipientProfile.avatarUrl}
                  alt={recipientProfile.displayName}
                />
              )}
              <AvatarFallback
                className="text-xl font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.4), oklch(0.65 0.11 65 / 0.3))",
                  color: "oklch(0.82 0.15 72)",
                  border: "2px solid oklch(0.76 0.13 72 / 0.4)",
                }}
              >
                {getInitials(recipientProfile.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                {recipientProfile.displayName}
              </p>
              <p className="text-xs text-muted-foreground">
                @{recipientProfile.username}
              </p>
            </div>
          </div>
        ) : null}

        {/* Divider */}
        <div
          className="h-px w-full"
          style={{ background: "oklch(0.82 0.15 72 / 0.15)" }}
        />

        {/* Amount inputs */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Amount in Pulse
            </Label>
            <Input
              data-ocid="payment.pulse_input"
              type="number"
              min="0.01"
              step="0.0001"
              placeholder="0.0100"
              value={pulseAmt}
              onChange={(e) => handlePulseChange(e.target.value)}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {icpPriceLoading
                ? "USD equivalent (loading price...)"
                : icpPrice
                  ? `USD equivalent (1 Pulse ≈ $${icpPrice.toFixed(2)})`
                  : "USD equivalent (price unavailable)"}
            </Label>
            <Input
              data-ocid="payment.usd_input"
              type="number"
              min="0"
              step="0.01"
              placeholder="$0.00"
              value={usdAmt}
              onChange={(e) => handleUsdChange(e.target.value)}
              className="bg-input border-border"
              disabled={!icpPrice}
            />
          </div>

          {isValid && (
            <div
              className="rounded-xl px-3 py-2 text-center text-sm"
              style={{
                background: "oklch(0.18 0.04 55 / 0.6)",
                border: "1px solid oklch(0.82 0.15 72 / 0.2)",
                color: "oklch(0.82 0.15 72)",
              }}
            >
              You will send{" "}
              <span className="font-bold">{formatPulse(pulseNum)}</span>
              {icpPrice && <> (≈ ${(pulseNum * icpPrice).toFixed(2)} USD)</>}
            </div>
          )}
        </div>

        {/* CTA */}
        {!isAuthenticated ? (
          <Button
            data-ocid="payment.login_button"
            onClick={handleLogin}
            disabled={loginLoading}
            className="w-full h-12 gap-2 font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
              color: "oklch(0.08 0.004 55)",
            }}
          >
            {loginLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Login to send Pulse
          </Button>
        ) : (
          <Button
            data-ocid="payment.submit_button"
            onClick={handleSend}
            disabled={!isValid || sending || profileError || profileLoading}
            className="w-full h-12 gap-2 font-semibold"
            style={
              isValid && !profileError
                ? {
                    background:
                      "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                    color: "oklch(0.08 0.004 55)",
                  }
                : undefined
            }
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sending ? "Sending..." : `Send Pulse to @${username}`}
          </Button>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          5% platform fee applies. Powered by{" "}
          <a
            href="https://precious-lime-mko-draft.caffeine.xyz"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(0.65 0.08 72)" }}
          >
            Pulse
          </a>
        </p>
      </div>
    </div>
  );
}
