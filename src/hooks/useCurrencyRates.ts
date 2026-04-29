import { useState, useEffect } from 'react';

interface Rates {
  usd: number;   // 1 USD in KZT
  rub: number;   // 1 RUB in KZT
  goldG: number; // 1 gram gold in KZT
  updatedAt: string;
}

const CACHE_KEY = 'finapp_rates';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function useCurrencyRates() {
  const [rates, setRates] = useState<Rates | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return data;
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(!rates);

  useEffect(() => {
    if (rates) return;
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(json => {
        const r = json.rates as Record<string, number>;
        const kzt = r['KZT'] ?? 0;
        const rub = r['RUB'] ?? 0;
        const xau = r['XAU'] ?? 0; // troy oz per 1 USD → 1 USD = 1/XAU troy oz
        const data: Rates = {
          usd: kzt,
          rub: kzt / rub,
          goldG: kzt / xau / 31.1035,
          updatedAt: json.time_last_update_utc ?? '',
        };
        setRates(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { rates, loading };
}
