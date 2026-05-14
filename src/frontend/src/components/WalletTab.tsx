import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  Heart,
  Link,
  Loader2,
  MessageCircle,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { GoldTransaction } from "../backend.d";
import { useIcpPrice } from "../hooks/useIcpPrice";
import {
  useAdminClaimGold,
  useClaimDailyCharityPulse,
  useDonateToPulseCharity,
  useGetAdminTotalClaimed,
  useGetCharityLastClaim,
  useGetCharityPoolBalance,
  useGetMyGoldBalance,
  useGetMyTransactionHistory,
  useGetUsersWithGoldAbove,
  useRequestBuyGold,
  useRequestSellGold,
} from "../hooks/useQueries";

// Display max in Gold units shown to user
const MAX_SUPPLY_GOLD = 9_999_999;
// Internal raw units (1 Gold = 10000 raw units)
const MAX_SUPPLY_RAW = BigInt(99_999_990_000);
const GOLD_SYMBOL = "✦";

function formatGold(amount: bigint): string {
  const raw = Number(amount) / 10000;
  const intPart = Math.floor(raw);
  const fracPart = (raw - intPart).toFixed(4).slice(1); // ".XXXX"
  const intFormatted = intPart.toLocaleString("en-US");
  return `${GOLD_SYMBOL} ${intFormatted}${fracPart} Pulse`;
}

function formatTimestamp(ns: bigint): string {
  const ms = Number(ns) / 1_000_000;
  if (ms === 0) return "";
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ms).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getKind(txType: GoldTransaction["txType"]): string {
  if (typeof txType === "string") return txType;
  const t = txType as Record<string, unknown>;
  if (typeof t.__kind__ === "string") return t.__kind__ as string;
  const keys = Object.keys(t);
  if (keys.length >= 1) return keys[0];
  return "";
}

function isFeeReward(kind: string, counterparty?: string): boolean {
  return kind === "received" && counterparty === "platform fee";
}

function txLabel(
  txType: GoldTransaction["txType"],
  counterparty?: string,
): string {
  const kind = getKind(txType);
  if (kind === "received" && counterparty === "platform fee")
    return "Fee Reward";
  switch (kind) {
    case "sent":
      return "Sent";
    case "received":
      return "Received";
    case "claimed":
      return "Claimed";
    case "buyRequest":
      return "Buy Request";
    case "sellRequest":
      return "Sell Request";
    default:
      return "Transaction";
  }
}

function TxIcon({
  txType,
  counterparty,
}: { txType: GoldTransaction["txType"]; counterparty?: string }) {
  const kind = getKind(txType);
  if (isFeeReward(kind, counterparty)) {
    return (
      <Sparkles className="h-4 w-4" style={{ color: "oklch(0.82 0.15 72)" }} />
    );
  }
  switch (kind) {
    case "received":
    case "claimed":
      return (
        <ArrowDownLeft
          className="h-4 w-4"
          style={{ color: "oklch(0.72 0.17 145)" }}
        />
      );
    case "sent":
      return (
        <ArrowUpRight
          className="h-4 w-4"
          style={{ color: "oklch(0.82 0.15 72)" }}
        />
      );
    default:
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
  }
}

function txAmountClass(
  txType: GoldTransaction["txType"],
  counterparty?: string,
): string {
  const kind = getKind(txType);
  if (isFeeReward(kind, counterparty)) return "text-amber-400";
  switch (kind) {
    case "received":
    case "claimed":
      return "text-emerald-400";
    case "sent":
      return "text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

function formatTxAmount(tx: GoldTransaction): string {
  const kind = getKind(tx.txType);
  const base = formatGold(tx.amount);
  if (kind === "sent") return `-${base}`;
  return base;
}

interface WalletTabProps {
  currentUsername: string;
  enabled?: boolean;
  onOpenChat: (username: string) => void;
}

export default function WalletTab({
  currentUsername,
  enabled = true,
  onOpenChat,
}: WalletTabProps) {
  const isAdmin = currentUsername === "pulse";

  const { data: balance, isLoading: balanceLoading } =
    useGetMyGoldBalance(enabled);
  const { data: transactions, isLoading: txLoading } =
    useGetMyTransactionHistory(enabled);
  const { data: totalClaimed, isLoading: claimedLoading } =
    useGetAdminTotalClaimed();
  // 99 Gold = 990000 raw units (1 Gold = 10000 raw)
  const { data: dealers, isLoading: dealersLoading } = useGetUsersWithGoldAbove(
    BigInt(990000),
  );

  const adminClaim = useAdminClaimGold();
  const requestBuy = useRequestBuyGold();
  const requestSell = useRequestSellGold();

  // Charity
  const { data: charityPool } = useGetCharityPoolBalance(enabled);
  const { data: charityLastClaim } = useGetCharityLastClaim(enabled);
  const donateCharity = useDonateToPulseCharity();
  const claimCharity = useClaimDailyCharityPulse();

  const [donateAmount, setDonateAmount] = useState("");
  const [donateMsg, setDonateMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [claimMsg, setClaimMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Countdown timer: seconds remaining until 24h after last claim
  const [countdown, setCountdown] = useState("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!charityLastClaim) {
      setCountdown("");
      return;
    }
    const computeNow = (lastClaimNs: bigint): string => {
      const claimMs = Number(lastClaimNs) / 1_000_000;
      const nextClaimMs = claimMs + 24 * 60 * 60 * 1000;
      const remaining = Math.max(0, nextClaimMs - Date.now());
      if (remaining === 0) return "";
      const h = Math.floor(remaining / 3_600_000);
      const m = Math.floor((remaining % 3_600_000) / 60_000);
      const s = Math.floor((remaining % 60_000) / 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };
    const tick = () => {
      setCountdown(computeNow(charityLastClaim));
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [charityLastClaim]);

  const canClaimToday = !charityLastClaim || countdown === "";

  async function handleDonate() {
    const amt = Math.round(Number.parseFloat(donateAmount) * 10000);
    if (!amt || amt <= 0) return;
    setDonateMsg(null);
    try {
      await donateCharity.mutateAsync(BigInt(amt));
      setDonateMsg({
        type: "success",
        text: "Donated successfully! 5% fee applied.",
      });
      setDonateAmount("");
    } catch (e: unknown) {
      setDonateMsg({
        type: "error",
        text: e instanceof Error ? e.message : "Donation failed",
      });
    }
  }

  async function handleCharityClaim() {
    setClaimMsg(null);
    try {
      await claimCharity.mutateAsync();
      setClaimMsg({
        type: "success",
        text: "Claimed! You received ✦ 0.0095 Pulse (after 5% fee).",
      });
    } catch (e: unknown) {
      setClaimMsg({
        type: "error",
        text: e instanceof Error ? e.message : "Claim failed",
      });
    }
  }

  // Payment link state
  const [payPulseAmt, setPayPulseAmt] = useState("");
  const [payUsdAmt, setPayUsdAmt] = useState("");
  const [payLinkCopied, setPayLinkCopied] = useState(false);
  const [payShowQr, setPayShowQr] = useState(false);

  const paymentLink = (() => {
    const base = `${window.location.origin}/pay/${encodeURIComponent(currentUsername)}`;
    const amt = Number.parseFloat(payPulseAmt);
    return amt > 0 ? `${base}?amount=${amt}` : base;
  })();

  function buildQrUrl(data: string, size = 200): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=1A1208&color=C8A84B&margin=4`;
  }

  const handlePayPulseChange = (val: string) => {
    setPayPulseAmt(val);
    if (val && icpPrice) {
      const pulseNum = Number.parseFloat(val);
      if (!Number.isNaN(pulseNum) && pulseNum > 0) {
        setPayUsdAmt((pulseNum * icpPrice).toFixed(2));
      } else {
        setPayUsdAmt("");
      }
    } else {
      setPayUsdAmt("");
    }
  };

  const handlePayUsdChange = (val: string) => {
    setPayUsdAmt(val);
    if (val && icpPrice && icpPrice > 0) {
      const usdNum = Number.parseFloat(val);
      if (!Number.isNaN(usdNum) && usdNum > 0) {
        setPayPulseAmt((usdNum / icpPrice).toFixed(4));
      } else {
        setPayPulseAmt("");
      }
    } else {
      setPayPulseAmt("");
    }
  };

  const handleCopyPayLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      setPayLinkCopied(true);
      toast.success("Payment link copied!");
      setTimeout(() => setPayLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSharePayLink = async () => {
    try {
      await navigator.share({
        title: `Pay @${currentUsername} on Pulse`,
        text: `Send Pulse to @${currentUsername}`,
        url: paymentLink,
      });
    } catch {
      // user cancelled or not supported
    }
  };

  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [txPage, setTxPage] = useState(1);

  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const { price: icpPrice, loading: icpPriceLoading } = useIcpPrice();

  async function handleBuy() {
    const amt = Math.round(Number.parseFloat(buyAmount) * 10000);
    if (!amt || amt <= 0) return;
    try {
      await requestBuy.mutateAsync(BigInt(amt));
      toast.success(`Buy request for ${formatGold(BigInt(amt))} sent to admin`);
      setBuyOpen(false);
      setBuyAmount("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Buy request failed");
    }
  }

  async function handleSell() {
    const amt = Math.round(Number.parseFloat(sellAmount) * 10000);
    if (!amt || amt <= 0) return;
    try {
      await requestSell.mutateAsync(BigInt(amt));
      toast.success(
        `Sell request for ${formatGold(BigInt(amt))} sent to admin`,
      );
      setSellOpen(false);
      setSellAmount("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sell request failed");
    }
  }

  async function handleClaim() {
    const amt = Math.round(Number.parseFloat(claimAmount) * 10000);
    if (!amt || amt <= 0) return;
    if (amt > MAX_SUPPLY_GOLD * 10000) {
      toast.error(
        `Exceeds maximum claimable Pulse of ${MAX_SUPPLY_GOLD.toLocaleString()}`,
      );
      return;
    }
    try {
      await adminClaim.mutateAsync(BigInt(amt));
      toast.success(`Claimed ${formatGold(BigInt(amt))}`);
      setClaimOpen(false);
      setClaimAmount("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Claim failed");
    }
  }

  // Progress uses raw units for accurate percentage
  const claimedPct =
    totalClaimed !== undefined
      ? Math.min(100, (Number(totalClaimed) / Number(MAX_SUPPLY_RAW)) * 100)
      : 0;

  // Show newest transactions first
  const sortedTransactions = transactions
    ? [...transactions].sort(
        (a, b) => Number(b.timestamp) - Number(a.timestamp),
      )
    : [];

  const visibleTransactions = sortedTransactions.slice(0, txPage * 9);
  const hasMoreTx = visibleTransactions.length < sortedTransactions.length;

  // Sort dealers high to low
  const sortedDealers = dealers
    ? (
        dealers as Array<{
          username: string;
          balance: bigint;
          avatarUrl?: string;
        }>
      )
        .filter((d) => d.username !== currentUsername)
        .sort((a, b) => Number(b.balance) - Number(a.balance))
    : [];

  return (
    <div className="w-full">
      <div className="w-full pb-[env(safe-area-inset-bottom,16px)]">
        {/* Balance Card */}
        <div
          className="mx-3 mt-4 mb-3 rounded-2xl p-4 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.20 0.04 55) 0%, oklch(0.16 0.06 60) 50%, oklch(0.18 0.03 55) 100%)",
            border: "1px solid oklch(0.82 0.15 72 / 0.3)",
            boxShadow: "0 8px 32px oklch(0.82 0.15 72 / 0.12)",
          }}
        >
          {/* Decorative circle */}
          <div
            className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10"
            style={{
              background:
                "radial-gradient(circle, oklch(0.82 0.15 72), transparent)",
            }}
          />
          <div className="flex items-center gap-2 mb-1">
            <Coins
              className="h-4 w-4"
              style={{ color: "oklch(0.82 0.15 72)" }}
            />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              Pulse Balance
            </span>
          </div>
          {balanceLoading ? (
            <Skeleton className="h-9 w-40 mt-1" />
          ) : (
            <div
              className="text-2xl sm:text-3xl font-bold font-display mt-1 truncate"
              style={{
                color: "oklch(0.82 0.15 72)",
                textShadow: "0 0 24px oklch(0.82 0.15 72 / 0.4)",
              }}
              data-ocid="wallet.balance.card"
            >
              {formatGold(balance ?? BigInt(0))}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            {icpPriceLoading
              ? "1 Pulse = 1 ICP (fetching price...)"
              : icpPrice !== null
                ? `1 Pulse = 1 ICP ≈ $${icpPrice.toFixed(2)} USD`
                : "1 Pulse = 1 ICP"}
          </div>
          {!balanceLoading && balance !== undefined && icpPrice !== null && (
            <div
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.65 0.1 145)" }}
            >
              ≈ $
              {((Number(balance) / 10000) * icpPrice).toLocaleString("en-US", {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              })}{" "}
              USD
            </div>
          )}
        </div>

        {/* Receive Payment / Payment Link Section */}
        <div
          className="mx-3 mt-0 mb-4 rounded-2xl p-4"
          style={{
            background: "oklch(0.15 0.03 55 / 0.7)",
            border: "1px solid oklch(0.82 0.15 72 / 0.25)",
          }}
          data-ocid="wallet.payment_link.section"
        >
          <div className="flex items-center gap-2 mb-3">
            <Link
              className="h-4 w-4"
              style={{ color: "oklch(0.82 0.15 72)" }}
            />
            <span
              className="text-sm font-semibold"
              style={{ color: "oklch(0.82 0.15 72)" }}
            >
              Receive Payment
            </span>
          </div>

          {/* Amount inputs */}
          <div className="space-y-2 mb-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 space-y-1">
                <label
                  className="text-xs text-muted-foreground"
                  htmlFor="wallet-pulse-amount"
                >
                  Pulse amount
                </label>
                <Input
                  data-ocid="wallet.payment_link.pulse_input"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="0.0000"
                  value={payPulseAmt}
                  onChange={(e) => handlePayPulseChange(e.target.value)}
                  className="bg-input border-border h-8 text-sm"
                  id="wallet-pulse-amount"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label
                  className="text-xs text-muted-foreground"
                  htmlFor="wallet-usd-amount"
                >
                  USD amount
                </label>
                <Input
                  data-ocid="wallet.payment_link.usd_input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="$0.00"
                  value={payUsdAmt}
                  onChange={(e) => handlePayUsdChange(e.target.value)}
                  className="bg-input border-border h-8 text-sm"
                  disabled={!icpPrice}
                  id="wallet-usd-amount"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Leave blank to let the sender choose any amount
              {!icpPrice && " · USD conversion unavailable"}
            </p>
          </div>

          {/* Payment link display */}
          <div
            className="rounded-xl p-2.5 flex items-center gap-1.5 mb-2 min-w-0"
            style={{ background: "oklch(0.11 0.005 55)" }}
          >
            <span
              className="text-[11px] flex-1 truncate font-mono min-w-0"
              style={{ color: "oklch(0.65 0.08 72)" }}
            >
              {paymentLink}
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                data-ocid="wallet.payment_link.copy_button"
                onClick={handleCopyPayLink}
                title="Copy payment link"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: "oklch(0.76 0.13 72)" }}
              >
                {payLinkCopied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  type="button"
                  data-ocid="wallet.payment_link.share_button"
                  onClick={handleSharePayLink}
                  title="Share payment link"
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: "oklch(0.76 0.13 72)" }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                data-ocid="wallet.payment_link.qr_toggle"
                onClick={() => setPayShowQr((v) => !v)}
                title="Show QR code"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  color: payShowQr
                    ? "oklch(0.08 0.004 55)"
                    : "oklch(0.76 0.13 72)",
                  background: payShowQr ? "oklch(0.76 0.13 72)" : "transparent",
                }}
              >
                <QrCode className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* QR code */}
          {payShowQr && (
            <div
              className="flex flex-col items-center gap-2 pt-3 pb-4"
              data-ocid="wallet.payment_link.qr_panel"
            >
              <div
                className="rounded-xl p-3"
                style={{
                  background: "oklch(0.82 0.15 72)",
                  boxShadow: "0 0 20px oklch(0.82 0.15 72 / 0.3)",
                }}
              >
                <img
                  src={buildQrUrl(paymentLink)}
                  alt="Payment QR code"
                  className="rounded-lg block mx-auto"
                  style={{
                    width: "min(200px, 100%)",
                    height: "auto",
                    aspectRatio: "1/1",
                  }}
                  loading="lazy"
                  key={paymentLink}
                />
              </div>
              <p
                className="text-[11px] text-center"
                style={{ color: "oklch(0.55 0.06 70)" }}
              >
                Scan to pay @{currentUsername}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 px-3 mb-4">
          <Button
            data-ocid="wallet.buy_gold.button"
            className="flex-1 gap-2"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
              color: "oklch(0.08 0.004 55)",
            }}
            onClick={() => setBuyOpen(true)}
          >
            <TrendingUp className="h-4 w-4" />
            Buy Pulse
          </Button>
          <Button
            data-ocid="wallet.sell_gold.button"
            variant="outline"
            className="flex-1 gap-2"
            style={{
              borderColor: "oklch(0.82 0.15 72 / 0.4)",
              color: "oklch(0.82 0.15 72)",
            }}
            onClick={() => setSellOpen(true)}
          >
            <TrendingDown className="h-4 w-4" />
            Sell Pulse
          </Button>
        </div>

        {/* Admin Panel */}
        {isAdmin && (
          <div
            className="mx-3 mb-4 rounded-xl p-4"
            style={{
              background: "oklch(0.15 0.02 280 / 0.6)",
              border: "1px solid oklch(0.82 0.15 72 / 0.2)",
            }}
            data-ocid="wallet.admin.panel"
          >
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck
                className="h-4 w-4"
                style={{ color: "oklch(0.82 0.15 72)" }}
              />
              <span
                className="text-sm font-semibold"
                style={{ color: "oklch(0.82 0.15 72)" }}
              >
                Admin Panel
              </span>
            </div>
            <div className="text-xs text-muted-foreground mb-1">
              Total claimed:{" "}
              {claimedLoading ? (
                "…"
              ) : (
                <span style={{ color: "oklch(0.82 0.15 72)" }}>
                  {(Number(totalClaimed ?? 0) / 10000).toLocaleString("en-US", {
                    maximumFractionDigits: 4,
                  })}{" "}
                  / {MAX_SUPPLY_GOLD.toLocaleString()} Pulse
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div
              className="h-1.5 rounded-full overflow-hidden mb-3"
              style={{ background: "oklch(0.25 0.02 55)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${claimedPct}%`,
                  background:
                    "linear-gradient(90deg, oklch(0.76 0.13 72), oklch(0.85 0.18 75))",
                }}
              />
            </div>
            <Button
              data-ocid="wallet.admin.claim.button"
              size="sm"
              className="w-full gap-2"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
              onClick={() => setClaimOpen(true)}
            >
              <Coins className="h-3.5 w-3.5" />
              Claim Pulse
            </Button>
          </div>
        )}

        {/* Gold Dealers Section */}
        <div
          className="px-3 mb-2 flex items-center gap-2"
          data-ocid="wallet.dealers.section"
        >
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pulse Dealers
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            99+ Pulse
          </span>
        </div>

        <div className="px-3 mb-4">
          {dealersLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : sortedDealers.length === 0 ? (
            <div
              className="flex items-center justify-center py-6 rounded-xl text-sm text-muted-foreground"
              style={{ border: "1px dashed oklch(0.82 0.15 72 / 0.15)" }}
              data-ocid="wallet.dealers.empty_state"
            >
              No dealers yet
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {sortedDealers.map((dealer, i) => (
                <div
                  key={dealer.username ?? i}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl shrink-0 w-[88px]"
                  style={{
                    background: "oklch(0.16 0.03 55 / 0.7)",
                    border: "1px solid oklch(0.82 0.15 72 / 0.15)",
                  }}
                  data-ocid={`wallet.dealers.item.${i + 1}`}
                >
                  {/* Avatar */}
                  {dealer.avatarUrl ? (
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage
                        src={dealer.avatarUrl}
                        alt={dealer.username}
                      />
                    </Avatar>
                  ) : null}
                  {/* Username */}
                  <span
                    className="text-xs font-bold truncate max-w-[80px] text-center"
                    style={{ color: "oklch(0.82 0.15 72)" }}
                  >
                    @{dealer.username}
                  </span>
                  {/* Balance */}
                  <span className="text-[10px] text-muted-foreground text-center w-full truncate leading-tight">
                    {formatGold(dealer.balance ?? BigInt(0))}
                  </span>
                  {/* Chat Button */}
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs px-2 w-full"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.2), oklch(0.65 0.11 65 / 0.15))",
                      color: "oklch(0.82 0.15 72)",
                      border: "1px solid oklch(0.76 0.13 72 / 0.3)",
                    }}
                    onClick={() => onOpenChat(dealer.username)}
                    data-ocid={`wallet.dealers.chat_button.${i + 1}`}
                  >
                    <MessageCircle className="h-3 w-3" />
                    Chat
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Charity Section */}
        <div
          className="px-3 mb-2 flex items-center gap-2"
          data-ocid="wallet.charity.section"
        >
          <Heart className="h-4 w-4" style={{ color: "oklch(0.70 0.22 15)" }} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Charity
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            Pool:{" "}
            <span style={{ color: "oklch(0.82 0.15 72)" }}>
              {formatGold(charityPool ?? BigInt(0)).replace(/^✦\s/, "")}
            </span>
          </span>
        </div>

        <div
          className="mx-3 mb-4 rounded-xl p-4 space-y-4"
          style={{
            background: "oklch(0.15 0.03 15 / 0.4)",
            border: "1px solid oklch(0.70 0.22 15 / 0.2)",
          }}
        >
          {/* Donate subsection */}
          <div className="space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "oklch(0.70 0.22 15)" }}
            >
              Donate Pulse
            </p>
            <p className="text-xs text-muted-foreground">
              Donate any amount to the charity pool. 5% platform fee applies.
            </p>
            <div className="flex gap-2">
              <Input
                data-ocid="wallet.charity.donate.input"
                type="number"
                min="0.01"
                step="0.0001"
                placeholder="0.0100"
                value={donateAmount}
                onChange={(e) => {
                  setDonateAmount(e.target.value);
                  setDonateMsg(null);
                }}
                className="bg-input border-border flex-1"
              />
              <Button
                data-ocid="wallet.charity.donate.submit_button"
                onClick={handleDonate}
                disabled={
                  donateCharity.isPending ||
                  !donateAmount ||
                  Number.parseFloat(donateAmount) < 0.01
                }
                size="sm"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.62 0.20 15), oklch(0.50 0.18 18))",
                  color: "oklch(0.97 0.01 55)",
                }}
              >
                {donateCharity.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Heart className="h-3.5 w-3.5" />
                )}
                Donate
              </Button>
            </div>
            {donateMsg && (
              <p
                data-ocid={`wallet.charity.donate.${
                  donateMsg.type === "success" ? "success_state" : "error_state"
                }`}
                className="text-xs mt-1"
                style={{
                  color:
                    donateMsg.type === "success"
                      ? "oklch(0.72 0.17 145)"
                      : "oklch(0.65 0.22 25)",
                }}
              >
                {donateMsg.text}
              </p>
            )}
          </div>

          {/* Divider */}
          <div
            className="h-px w-full"
            style={{ background: "oklch(0.70 0.22 15 / 0.15)" }}
          />

          {/* Daily claim subsection */}
          <div className="space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "oklch(0.70 0.22 15)" }}
            >
              Daily Claim
            </p>
            <p className="text-xs text-muted-foreground">
              Claim once every 24 hours. You receive 0.0095 Pulse (after 5%
              fee).
            </p>
            <Button
              data-ocid="wallet.charity.claim.button"
              onClick={handleCharityClaim}
              disabled={!canClaimToday || claimCharity.isPending}
              className="w-full gap-2"
              style={
                canClaimToday
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                      color: "oklch(0.08 0.004 55)",
                    }
                  : {
                      background: "oklch(0.20 0.02 55 / 0.5)",
                      color: "oklch(0.50 0.05 55)",
                      cursor: "not-allowed",
                    }
              }
            >
              {claimCharity.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : canClaimToday ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Claim 0.0095 Pulse
                </>
              ) : (
                <span className="font-mono text-sm">
                  Next claim in {countdown}
                </span>
              )}
            </Button>
            {claimMsg && (
              <p
                data-ocid={`wallet.charity.claim.${
                  claimMsg.type === "success" ? "success_state" : "error_state"
                }`}
                className="text-xs mt-1"
                style={{
                  color:
                    claimMsg.type === "success"
                      ? "oklch(0.72 0.17 145)"
                      : "oklch(0.65 0.22 25)",
                }}
              >
                {claimMsg.text}
              </p>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="px-3 mb-2 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Transaction History
          </span>
        </div>

        <div className="px-3">
          {txLoading ? (
            <div
              className="space-y-3 pb-6"
              data-ocid="wallet.transactions.loading_state"
            >
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              data-ocid="wallet.transactions.empty_state"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: "oklch(0.18 0.04 60 / 0.5)" }}
              >
                <Coins
                  className="h-6 w-6"
                  style={{ color: "oklch(0.82 0.15 72 / 0.5)" }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                No transactions yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Buy or receive Pulse to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              {visibleTransactions.map((tx, i) => (
                <div
                  key={tx.id.toString()}
                  className="flex items-center gap-2 rounded-xl px-3 py-3 transition-colors hover:bg-muted/40"
                  style={{ border: "1px solid oklch(0.82 0.15 72 / 0.08)" }}
                  data-ocid={`wallet.transactions.item.${i + 1}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.20 0.04 55)" }}
                  >
                    <TxIcon
                      txType={tx.txType}
                      counterparty={tx.counterpartyUsername}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {txLabel(tx.txType, tx.counterpartyUsername)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {tx.counterpartyUsername === "platform fee"
                        ? "Platform fee"
                        : tx.counterpartyUsername
                          ? (() => {
                              const kind = getKind(tx.txType);
                              return kind === "sent"
                                ? `to @${tx.counterpartyUsername}`
                                : `from @${tx.counterpartyUsername}`;
                            })()
                          : formatTimestamp(tx.timestamp)}
                    </div>
                    {tx.counterpartyUsername &&
                      tx.counterpartyUsername !== "platform fee" && (
                        <div className="text-xs text-muted-foreground/60">
                          {formatTimestamp(tx.timestamp)}
                        </div>
                      )}
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-semibold shrink-0 ml-1 ${txAmountClass(tx.txType, tx.counterpartyUsername)}`}
                  >
                    {formatTxAmount(tx)}
                  </div>
                </div>
              ))}
              {hasMoreTx && (
                <button
                  type="button"
                  data-ocid="wallet.transactions.pagination_next"
                  onClick={() => setTxPage((p) => p + 1)}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:opacity-90"
                  style={{
                    color: "oklch(0.82 0.15 72)",
                    border: "1px solid oklch(0.82 0.15 72 / 0.25)",
                    background: "oklch(0.16 0.03 55 / 0.5)",
                  }}
                >
                  View more
                </button>
              )}
            </div>
          )}
        </div>
        <div className="pb-8" />
      </div>

      {/* Buy Dialog */}
      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent
          className="sm:max-w-sm"
          style={{
            background: "oklch(0.13 0.02 55)",
            border: "1px solid oklch(0.82 0.15 72 / 0.2)",
          }}
          data-ocid="wallet.buy.dialog"
        >
          <DialogHeader>
            <DialogTitle style={{ color: "oklch(0.82 0.15 72)" }}>
              Buy Pulse
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Amount (1 Pulse = 1 ICP)
              </Label>
              <Input
                type="number"
                min="0.01"
                step="0.0001"
                placeholder="Enter amount..."
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            {buyAmount && Number.parseFloat(buyAmount) > 0 && (
              <p className="text-xs text-muted-foreground">
                Request to purchase{" "}
                {formatGold(
                  BigInt(Math.round(Number.parseFloat(buyAmount) * 10000)),
                )}{" "}
                will be sent to admin
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="wallet.buy.cancel_button"
              variant="outline"
              onClick={() => setBuyOpen(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              data-ocid="wallet.buy.submit_button"
              onClick={handleBuy}
              disabled={
                requestBuy.isPending ||
                !buyAmount ||
                Number.parseFloat(buyAmount) <= 0
              }
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              {requestBuy.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell Dialog */}
      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent
          className="sm:max-w-sm"
          style={{
            background: "oklch(0.13 0.02 55)",
            border: "1px solid oklch(0.82 0.15 72 / 0.2)",
          }}
          data-ocid="wallet.sell.dialog"
        >
          <DialogHeader>
            <DialogTitle style={{ color: "oklch(0.82 0.15 72)" }}>
              Sell Pulse
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Amount to sell
              </Label>
              <Input
                type="number"
                min="0.01"
                step="0.0001"
                placeholder="Enter amount..."
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Available: {formatGold(balance ?? BigInt(0))}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="wallet.sell.cancel_button"
              variant="outline"
              onClick={() => setSellOpen(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              data-ocid="wallet.sell.submit_button"
              onClick={handleSell}
              disabled={
                requestSell.isPending ||
                !sellAmount ||
                Number.parseFloat(sellAmount) <= 0
              }
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              {requestSell.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Claim Dialog */}
      {isAdmin && (
        <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
          <DialogContent
            className="sm:max-w-sm"
            style={{
              background: "oklch(0.13 0.02 55)",
              border: "1px solid oklch(0.82 0.15 72 / 0.2)",
            }}
            data-ocid="wallet.admin.claim.dialog"
          >
            <DialogHeader>
              <DialogTitle style={{ color: "oklch(0.82 0.15 72)" }}>
                Claim Pulse
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">
                  Amount to claim (max {MAX_SUPPLY_GOLD.toLocaleString()} Pulse)
                </Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.0001"
                  max={MAX_SUPPLY_GOLD}
                  placeholder="Enter amount..."
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                data-ocid="wallet.admin.claim.cancel_button"
                variant="outline"
                onClick={() => setClaimOpen(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                data-ocid="wallet.admin.claim.confirm_button"
                onClick={handleClaim}
                disabled={
                  adminClaim.isPending ||
                  !claimAmount ||
                  Number.parseFloat(claimAmount) <= 0
                }
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                  color: "oklch(0.08 0.004 55)",
                }}
              >
                {adminClaim.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Claim
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
