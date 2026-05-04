import { useEffect, useRef, useState, type ReactNode } from "react";

// SSR guard wrapper. Renders children only on the client.
export function ClientOnly({
  children,
  fallback,
}: {
  children: () => ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children()}</>;
}

// Lazy-load any module on the client only (avoids leaflet/window crashes in SSR).
export function useClientModule<T>(loader: () => Promise<T>) {
  const [mod, setMod] = useState<T | null>(null);
  const ranRef = useRef(false);
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    loader().then(setMod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return mod;
}
