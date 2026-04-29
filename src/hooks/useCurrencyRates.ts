import { useState, useEffect } from 'react';

interface Rates {
  usd: number;   // 1 USD in KZT
  rub: number;   // 1 RUB in KZT
  goldG: number; // 1 gram gold in KZT
}

const CACHE_KEY = 'finapp_rates';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function loadCache(): Rates | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, ts } = JSON.parse(cached) as { data: Rates; ts: number };
    if (Date.now() - ts < CACHE_TTL && data.usd > 0) return data;
  } catch {}
  return null;
}

export function useCurrencyRates() {
  const [rates, setRates] = useState<Rates | null>(loadCache);
  const [loading, setLoading] = useState(!loadCache());

  useEffect(() => {
    const cached = loadCache();
    if (cached) { setRates(cached); return; }

    // Fetch USD→KZT and USD→RUB from open.er-api.com
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(json => {
        const r = json.rates as Record<string, number>;
        const kzt = r['KZT'];
        const rub = r['RUB'];
        if (!kzt || kzt === 0) return; // guard against bad response

        // Gold: fetch separately from metals-api fallback or estimate via XAU
        const xau = r['XAU']; // troy oz per USD (may be absent in free tier)
        const goldG = xau && xau > 0
          ? kzt / xau / 31.1035
          : null; // will fetch separately

        const data: Rates = {
          usd: Math.round(kzt),
          rub: kzt / rub,
          goldG: goldG ?? 0,
        };

        // If XAU missing, try gold price via another free endpoint
        if (!goldG) {
          fetch('https://open.er-api.com/v6/latest/XAU')
            .then(r2 => r2.json())
            .then(j2 => {
              const xauKzt = (j2.rates as Record<string, number>)['KZT'];
              if (xauKzt && xauKzt > 0) {
                data.goldG = Math.round(xauKzt / 31.1035);
              }
              setRates({ ...data });
              localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
            })
            .catch(() => {
              setRates(data);
              localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
            });
        } else {
          data.goldG = Math.round(data.goldG);
          setRates(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { rates, loading };
}
