import { useCallback, useEffect, useRef, useState } from "react";

export interface IcpPrice {
  price: number | null;
  loading: boolean;
  retry: () => void;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function fetchIcpPrice(
  signal: AbortSignal,
  attempt: number,
): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd",
      { signal },
    );
    const data = (await res.json()) as Record<string, Record<string, number>>;
    return data?.["internet-computer"]?.usd ?? null;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    if (attempt <= MAX_RETRIES) {
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchIcpPrice(signal, attempt + 1);
    }
    return null;
  }
}

export function useIcpPrice(): IcpPrice {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const runRef = useRef(0);

  const doFetch = useCallback(() => {
    const run = ++runRef.current;
    setLoading(true);
    setPrice(null);
    const ctrl = new AbortController();

    fetchIcpPrice(ctrl.signal, 1)
      .then((val) => {
        if (runRef.current === run) {
          setPrice(val);
          setLoading(false);
        }
      })
      .catch(() => {
        if (runRef.current === run) setLoading(false);
      });

    return ctrl;
  }, []);

  useEffect(() => {
    const ctrl = doFetch();
    return () => ctrl.abort();
  }, [doFetch]);

  const retry = useCallback(() => {
    doFetch();
  }, [doFetch]);

  return { price, loading, retry };
}
