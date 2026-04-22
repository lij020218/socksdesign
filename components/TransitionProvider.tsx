"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";

type Phase = "idle" | "cover" | "uncover";

const Ctx = createContext<{
  navigate: (path: string) => void;
  phase: Phase;
}>({
  navigate: () => {},
  phase: "idle",
});

export function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const router = useRouter();
  const pathname = usePathname();
  const pendingPath = useRef<string | null>(null);

  const navigate = useCallback(
    (path: string) => {
      if (phase !== "idle" || path === pathname) return;
      pendingPath.current = path;
      setPhase("cover");
    },
    [phase, pathname],
  );

  // When cover animation finishes, push the new route
  useEffect(() => {
    if (phase !== "cover") return;
    const t = setTimeout(() => {
      if (pendingPath.current) {
        router.push(pendingPath.current);
      }
    }, 720); // matches cover animation
    return () => clearTimeout(t);
  }, [phase, router]);

  // When the route changes while in 'cover', start uncovering
  useEffect(() => {
    if (phase !== "cover") return;
    if (pendingPath.current && pathname === pendingPath.current) {
      pendingPath.current = null;
      // tiny beat so the new DOM settles
      const t = setTimeout(() => setPhase("uncover"), 80);
      return () => clearTimeout(t);
    }
  }, [pathname, phase]);

  // End of uncover → back to idle
  useEffect(() => {
    if (phase !== "uncover") return;
    const t = setTimeout(() => setPhase("idle"), 820);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <Ctx.Provider value={{ navigate, phase }}>
      {children}
      <Curtain phase={phase} />
    </Ctx.Provider>
  );
}

export function useSlickNav() {
  return useContext(Ctx);
}

function Curtain({ phase }: { phase: Phase }) {
  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] pointer-events-none bg-crimson-500 origin-top ${
        phase === "idle"
          ? "translate-y-full"
          : phase === "cover"
            ? "curtain-cover"
            : "curtain-uncover"
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="serif-it text-paper/90 text-[48px] md:text-[84px] leading-none tracking-tightest">
          Lovelysocks
          <span className="not-italic">.</span>
        </span>
      </div>
    </div>
  );
}
