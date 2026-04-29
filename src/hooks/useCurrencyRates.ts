import { useState, useEffect } from 'react';

export interface RateItem {
  value: number;
  change: number; // % change vs yesterday
}

export interface Rates {
  usd: RateItem;
  rub: RateItem;
  goldG: RateItem;
  date: string;
}

const CACHE_KEY = 'finapp_rates_v3';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const CDN = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api';

function dateStr(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function pct(today: number, yesterday: number): number {
  if (!yesterday) return 0;
  return +((today - yesterday) / yesterday * 100).toFixed(2);
}

function loadCache(): Rates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: Rates; ts: number };
    if (Date.now() - ts < CACHE_TTL && data.usd.value > 0) return data;
  } catch {}
  return null;
}

export function useCurrencyRates() {
  const [rates, setRates] = useState<Rates | null>(loadCache);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = loadCache();
    if (cached) { setRates(cached); setLoading(false); return; }

    const today = dateStr(0);
    const yesterday = dateStr(1);

    Promise.all([
      fetch(`${CDN}@${today}/v1/currencies/usd.json`).then(r => r.json()),
      fetch(`${CDN}@${yesterday}/v1/currencies/usd.json`).then(r => r.json()),
      fetch(`${CDN}@${today}/v1/currencies/xau.json`).then(r => r.json()),
      fetch(`${CDN}@${yesterday}/v1/currencies/xau.json`).then(r => r.json()),
    ])
      .then(([todayUsd, yestUsd, todayXau, yestXau]) => {
        const tU = todayUsd.usd as Record<string, number>;
        const yU = yestUsd.usd as Record<string, number>;
        const tX = todayXau.xau as Record<string, number>;
        const yX = yestXau.xau as Record<string, number>;

        const kztToday = tU['kzt'] ?? 0;
        if (kztToday === 0) return;

        const rubToday = tU['rub'] ?? 0;
        const rubYest  = yU['rub'] ?? 0;
        const kztYest  = yU['kzt'] ?? 0;

        const usdVal  = Math.round(kztToday);
        const rubVal  = kztToday / rubToday;
        const goldVal = Math.round((tX['kzt'] ?? 0) / 31.1035);

        const usdYestVal  = Math.round(kztYest);
        const rubYestVal  = kztYest / rubYest;
        const goldYestVal = Math.round((yX['kzt'] ?? 0) / 31.1035);

        const data: Rates = {
          usd:   { value: usdVal,  change: pct(usdVal,  usdYestVal)  },
          rub:   { value: rubVal,  change: pct(rubVal,  rubYestVal)  },
          goldG: { value: goldVal, change: pct(goldVal, goldYestVal) },
          date: today,
        };

        setRates(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { rates, loading };
}
