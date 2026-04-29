import { useState, useEffect } from 'react';

export interface Rates {
  usd: number;   // 1 USD → KZT
  rub: number;   // 1 RUB → KZT
  goldG: number; // 1 gram gold → KZT
  date: string;
}

const CACHE_KEY = 'finapp_rates_v2';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const CDN = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';

function loadCache(): Rates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: Rates; ts: number };
    if (Date.now() - ts < CACHE_TTL && data.usd > 0) return data;
  } catch {}
  return null;
}

export function useCurrencyRates() {
  const [rates, setRates] = useState<Rates | null>(loadCache);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = loadCache();
    if (cached) { setRates(cached); setLoading(false); return; }

    Promise.all([
      fetch(`${CDN}/usd.json`).then(r => r.json()),
      fetch(`${CDN}/xau.json`).then(r => r.json()),
    ])
      .then(([usdData, xauData]) => {
        const usdRates = usdData.usd as Record<string, number>;
        const xauRates = xauData.xau as Record<string, number>;

        const kztPerUsd = usdRates['kzt'] ?? 0;
        const rubPerUsd = usdRates['rub'] ?? 0;
        const kztPerTroyOz = xauRates['kzt'] ?? 0;

        if (kztPerUsd === 0) return;

        const data: Rates = {
          usd: Math.round(kztPerUsd),
          rub: kztPerUsd / rubPerUsd,
          goldG: Math.round(kztPerTroyOz / 31.1035),
          date: usdData.date ?? '',
        };

        setRates(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { rates, loading };
}
