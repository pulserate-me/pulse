import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, Shield, Users, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function AuthScreen() {
  const { login, isLoggingIn } = useInternetIdentity();

  const features = [
    { icon: MessageCircle, text: "Real-time messaging" },
    { icon: Users, text: "Group conversations" },
    { icon: Shield, text: "Secure & private" },
    { icon: Zap, text: "Lightning fast" },
  ];

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background decorative elements */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.76 0.13 72 / 0.15) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-64 opacity-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 100%, oklch(0.76 0.13 72 / 0.2) 0%, transparent 70%)",
        }}
      />

      {/* Geometric pattern */}
      <div className="absolute inset-0 opacity-5" aria-hidden="true">
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="oklch(0.76 0.13 72)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-md w-full"
      >
        {/* Title */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center gap-3"
        >
          <h1 className="font-display text-6xl font-bold gold-shimmer">
            Pulse
          </h1>
          <p className="text-muted-foreground text-center text-lg font-light">
            Connect with the people who matter most
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid grid-cols-2 gap-3 w-full"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-2 bg-card rounded-lg px-3 py-2.5 border border-border"
            >
              <feature.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground/80">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Auth Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="w-full"
        >
          <Button
            data-ocid="auth.login_button"
            onClick={login}
            disabled={isLoggingIn}
            className="w-full h-12 text-base font-semibold rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
              color: "oklch(0.08 0.004 55)",
              boxShadow: "0 4px 20px oklch(0.76 0.13 72 / 0.35)",
            }}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Sign In to Pulse"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Secured by Internet Identity — no passwords required
          </p>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
