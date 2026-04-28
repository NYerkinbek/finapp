import { useMemo, useState, useRef, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Plus, ChevronDown } from 'lucide-react';
import { useApp } from '../store';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './Dashboard.module.css';

interface Props {
  onAddTransaction: () => void;
}

export function Dashboard({ onAddTransaction }: Props) {
  const { wallets, transactions, categories } = useApp();
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedWallet = selectedWalletId ? wallets.find(w => w.id === selectedWalletId) ?? null : null;
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const displayBalance = selectedWallet ? selectedWallet.balance : totalBalance;
  const displayCurrency = selectedWallet ? selectedWallet.currency : '₸';

  const filteredTxs = useMemo(
    () => selectedWalletId ? transactions.filter(t => t.walletId === selectedWalletId) : transactions,
    [transactions, selectedWalletId]
  );

  const thisMonth = useMemo(() => {
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return filteredTxs.filter(t => t.date.startsWith(m));
  }, [filteredTxs]);

  const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const chartData = useMemo(() => {
    const days: Record<string, { income: number; expense: number }> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = { income: 0, expense: 0 };
    }
    filteredTxs.forEach(t => {
      if (days[t.date] && (t.type === 'income' || t.type === 'expense')) {
        days[t.date][t.type] += t.amount;
      }
    });
    return Object.entries(days).map(([date, v]) => ({ date: date.slice(5), ...v }));
  }, [filteredTxs]);

  const recent = filteredTxs.slice(0, 6);

  const fmt = (n: number) => new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(n);

  const inputMethodIcon: Record<string, string> = {
    manual: '✏️', receipt: '🧾', voice: '🎤', notification: '🔔'
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectWallet = (id: string | null) => {
    setSelectedWalletId(id);
    setDropdownOpen(false);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}></h1>
          <p className={styles.subtitle}>
            {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className={styles.addBtn} onClick={onAddTransaction}>
          <Plus size={18} />
          Добавить операцию
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        {/* Balance card with wallet selector */}
        <div className={`${styles.statCard} ${styles.statMain}`} ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            className={styles.balanceSelector}
            onClick={() => setDropdownOpen(v => !v)}
            role="button"
          >
            <span className={styles.statLabel}>{selectedWallet ? selectedWallet.name : 'Общий баланс'}</span>
            <ChevronDown size={14} className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`} />
          </div>
          <div className={styles.statValue}>{displayCurrency} {fmt(displayBalance)}</div>
          <div className={styles.statSub}>
            {selectedWallet ? '1 кошелёк выбран' : `${wallets.length} кошелька`}
          </div>

          {dropdownOpen && (
            <div className={styles.dropdown}>
              <button
                className={`${styles.dropdownItem} ${!selectedWalletId ? styles.dropdownActive : ''}`}
                onClick={() => selectWallet(null)}
              >
                <span className={styles.dropdownDot} style={{ background: 'var(--accent)' }} />
                Все кошельки
                <span className={styles.dropdownBalance}>₸ {fmt(totalBalance)}</span>
              </button>
              {wallets.map(w => (
                <button
                  key={w.id}
                  className={`${styles.dropdownItem} ${selectedWalletId === w.id ? styles.dropdownActive : ''}`}
                  onClick={() => selectWallet(w.id)}
                >
                  <span className={styles.dropdownDot} style={{ background: w.color }} />
                  {w.name}
                  <span className={styles.dropdownBalance}>{w.currency} {fmt(w.balance)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Доходы</span>
            <span className={`${styles.badge} ${styles.badgeGreen}`}>
              <ArrowUpRight size={12} /> этот месяц
            </span>
          </div>
          <div className={`${styles.statValue} ${styles.green}`}>{displayCurrency} {fmt(income)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Расходы</span>
            <span className={`${styles.badge} ${styles.badgeRed}`}>
              <ArrowDownRight size={12} /> этот месяц
            </span>
          </div>
          <div className={`${styles.statValue} ${styles.red}`}>{displayCurrency} {fmt(expense)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Сэкономлено</div>
          <div className={`${styles.statValue} ${income - expense >= 0 ? styles.green : styles.red}`}>
            {displayCurrency} {fmt(income - expense)}
          </div>
          <div className={styles.statSub}>
            {income > 0 ? Math.round(((income - expense) / income) * 100) : 0}% от доходов
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <span className={styles.chartTitle}>
            Движение средств — 30 дней{selectedWallet ? ` · ${selectedWallet.name}` : ''}
          </span>
          <div className={styles.chartLegend}>
            <span className={styles.legendDot} style={{ background: '#10b981' }} /> Доходы
            <span className={styles.legendDot} style={{ background: '#ef4444', marginLeft: 12 }} /> Расходы
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#a0a0b8', fontSize: 11 }} axisLine={false} tickLine={false} interval={6} />
            <YAxis tick={{ fill: '#a0a0b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip
              contentStyle={{ background: '#1e1e28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f0f0f5' }}
              formatter={(v: number) => [`${displayCurrency} ${fmt(v)}`, '']}
            />
            <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#gIncome)" />
            <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#gExpense)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className={styles.bottomRow}>
        {/* Wallets summary */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Кошельки</span>
          </div>
          <div className={styles.walletList}>
            {wallets.map(w => (
              <div
                key={w.id}
                className={`${styles.walletItem} ${selectedWalletId === w.id ? styles.walletItemActive : ''}`}
                onClick={() => selectWallet(selectedWalletId === w.id ? null : w.id)}
                role="button"
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.walletDot} style={{ background: w.color }} />
                <div className={styles.walletInfo}>
                  <span className={styles.walletName}>{w.name}</span>
                </div>
                <span className={styles.walletBalance}>{w.currency} {fmt(w.balance)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              Последние операции{selectedWallet ? ` · ${selectedWallet.name}` : ''}
            </span>
          </div>
          <div className={styles.txList}>
            {recent.length === 0 && <div style={{ fontSize: 13, color: 'var(--text2)', padding: '8px 0' }}>Нет операций</div>}
            {recent.map(t => {
              const cat = categories.find(c => c.id === t.categoryId);
              return (
                <div key={t.id} className={styles.txItem}>
                  <span className={styles.txIcon}>{cat?.icon}</span>
                  <div className={styles.txInfo}>
                    <span className={styles.txDesc}>{t.description}</span>
                    <span className={styles.txMeta}>
                      {t.date} · {inputMethodIcon[t.inputMethod]}
                    </span>
                  </div>
                  <span className={`${styles.txAmount} ${t.type === 'income' ? styles.green : styles.red}`}>
                    {t.type === 'income' ? '+' : '-'}{displayCurrency}{fmt(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
