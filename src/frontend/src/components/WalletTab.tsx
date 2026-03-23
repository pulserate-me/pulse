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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  Coins,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { GoldTransaction } from "../backend.d";
import {
  useAdminClaimGold,
  useGetAdminTotalClaimed,
  useGetMyGoldBalance,
  useGetMyTransactionHistory,
  useGetUsersWithGoldAbove,
  useRequestBuyGold,
  useRequestSellGold,
} from "../hooks/useQueries";

// Display max in Gold units shown to user
const MAX_SUPPLY_GOLD = 9_999_999;
// Internal raw units (1 Gold = 100 raw units)
const MAX_SUPPLY_RAW = BigInt(999_999_900);
const GOLD_SYMBOL = "✦";

function formatGold(amount: bigint): string {
  return `${GOLD_SYMBOL} ${(Number(amount) / 100).toFixed(2)} Gold`;
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
  const t = txType as any;
  if (typeof t.__kind__ === "string") return t.__kind__;
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
  onOpenChat: (username: string) => void;
}

function useIcpPrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd",
    )
      .then((r) => r.json())
      .then((data) => {
        setPrice(data?.["internet-computer"]?.usd ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { price, loading };
}

export default function WalletTab({
  currentUsername,
  onOpenChat,
}: WalletTabProps) {
  const isAdmin = currentUsername === "pulse";

  const { data: balance, isLoading: balanceLoading } = useGetMyGoldBalance();
  const { data: transactions, isLoading: txLoading } =
    useGetMyTransactionHistory();
  const { data: totalClaimed, isLoading: claimedLoading } =
    useGetAdminTotalClaimed();
  const { data: dealers, isLoading: dealersLoading } = useGetUsersWithGoldAbove(
    BigInt(99),
  );

  const adminClaim = useAdminClaimGold();
  const requestBuy = useRequestBuyGold();
  const requestSell = useRequestSellGold();

  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);

  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const { price: icpPrice, loading: icpPriceLoading } = useIcpPrice();

  async function handleBuy() {
    const amt = Math.round(Number.parseFloat(buyAmount) * 100);
    if (!amt || amt <= 0) return;
    try {
      await requestBuy.mutateAsync(BigInt(amt));
      toast.success(`Buy request for ${formatGold(BigInt(amt))} sent to admin`);
      setBuyOpen(false);
      setBuyAmount("");
    } catch (e: any) {
      toast.error(e?.message ?? "Buy request failed");
    }
  }

  async function handleSell() {
    const amt = Math.round(Number.parseFloat(sellAmount) * 100);
    if (!amt || amt <= 0) return;
    try {
      await requestSell.mutateAsync(BigInt(amt));
      toast.success(
        `Sell request for ${formatGold(BigInt(amt))} sent to admin`,
      );
      setSellOpen(false);
      setSellAmount("");
    } catch (e: any) {
      toast.error(e?.message ?? "Sell request failed");
    }
  }

  async function handleClaim() {
    const amt = Math.round(Number.parseFloat(claimAmount) * 100);
    if (!amt || amt <= 0) return;
    if (amt > MAX_SUPPLY_GOLD * 100) {
      toast.error(
        `Exceeds maximum claimable Gold of ${MAX_SUPPLY_GOLD.toLocaleString()}`,
      );
      return;
    }
    try {
      await adminClaim.mutateAsync(BigInt(amt));
      toast.success(`Claimed ${formatGold(BigInt(amt))}`);
      setClaimOpen(false);
      setClaimAmount("");
    } catch (e: any) {
      toast.error(e?.message ?? "Claim failed");
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

  return (
    <div className="flex flex-col h-full">
      {/* Balance Card */}
      <div
        className="mx-4 mt-4 mb-3 rounded-2xl p-5 relative overflow-hidden"
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
          <Coins className="h-4 w-4" style={{ color: "oklch(0.82 0.15 72)" }} />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            Gold Balance
          </span>
        </div>
        {balanceLoading ? (
          <Skeleton className="h-10 w-40 mt-1" />
        ) : (
          <div
            className="text-4xl font-bold font-display mt-1"
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
            ? "1 Gold = 1 ICP (fetching price...)"
            : icpPrice !== null
              ? `1 Gold = 1 ICP ≈ $${icpPrice.toFixed(2)} USD`
              : "1 Gold = 1 ICP"}
        </div>
        {!balanceLoading && balance !== undefined && icpPrice !== null && (
          <div
            className="text-xs mt-0.5"
            style={{ color: "oklch(0.65 0.1 145)" }}
          >
            ≈ $
            {((Number(balance) / 100) * icpPrice).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            USD
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 px-4 mb-4">
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
          Buy Gold
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
          Sell Gold
        </Button>
      </div>

      {/* Admin Panel */}
      {isAdmin && (
        <div
          className="mx-4 mb-4 rounded-xl p-4"
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
                {(Number(totalClaimed ?? 0) / 100).toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}{" "}
                / {MAX_SUPPLY_GOLD.toLocaleString()} Gold
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
            Claim Gold
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1 px-0">
        {/* Gold Dealers Section */}
        <div
          className="px-4 mb-2 flex items-center gap-2"
          data-ocid="wallet.dealers.section"
        >
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Gold Dealers
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            99+ Gold
          </span>
        </div>

        <div className="px-4 mb-4">
          {dealersLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : !dealers || (dealers as any[]).length === 0 ? (
            <div
              className="flex items-center justify-center py-6 rounded-xl text-sm text-muted-foreground"
              style={{ border: "1px dashed oklch(0.82 0.15 72 / 0.15)" }}
              data-ocid="wallet.dealers.empty_state"
            >
              No dealers yet
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {(dealers as any[])
                .filter((d: any) => d.username !== currentUsername)
                .map((dealer: any, i: number) => (
                  <div
                    key={dealer.username ?? i}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl shrink-0 min-w-[100px]"
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
                    <span className="text-xs text-muted-foreground">
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

        {/* Transaction History */}
        <div className="px-4 mb-2 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Transaction History
          </span>
        </div>

        <div className="px-4">
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
                Buy or receive Gold to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              {sortedTransactions.map((tx, i) => (
                <div
                  key={tx.id.toString()}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/40"
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
                    <div className="font-semibold text-sm text-foreground">
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
                    className={`text-sm font-semibold ${txAmountClass(tx.txType, tx.counterpartyUsername)}`}
                  >
                    {formatTxAmount(tx)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

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
              Buy Gold
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Amount (1 Gold = 1 ICP)
              </Label>
              <Input
                data-ocid="wallet.buy.input"
                type="number"
                min="0.01"
                step="0.01"
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
                  BigInt(Math.round(Number.parseFloat(buyAmount) * 100)),
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
              Sell Gold
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Amount to sell
              </Label>
              <Input
                data-ocid="wallet.sell.input"
                type="number"
                min="0.01"
                step="0.01"
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
                Claim Gold
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">
                  Amount to claim (max {MAX_SUPPLY_GOLD.toLocaleString()} Gold)
                </Label>
                <Input
                  data-ocid="wallet.admin.claim.input"
                  type="number"
                  min="0.01"
                  step="0.01"
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
