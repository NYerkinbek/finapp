import { useMemo, useState, useRef, useEffect } from 'react';
import { PieChart, Database, Settings, AudioLines, Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ChevronDown, Wallet, Edit2, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import { Transaction } from '../types';
import { useCurrencyRates } from '../hooks/useCurrencyRates';
import styles from './Dashboard.module.css';

type Page = 'dashboard' | 'transactions' | 'budgets' | 'analytics' | 'settings';
type Period = 'all' | 'month' | 'week' | 'today';

interface Props {
  onAddTransaction: () => void;
  onAddVoice: () => void;
  onNavigate: (p: Page) => void;
  onEdit: (t: Transaction) => void;
}

export function Dashboard({ onAddTransaction, onAddVoice, onNavigate, onEdit }: Props) {
  const { wallets, transactions, categories, deleteTransaction } = useApp();
  const { rates } = useCurrencyRates();
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  const selectedWallet = selectedWalletId ? wallets.find(w => w.id === selectedWalletId) ?? null : null;
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const displayBalance = selectedWallet ? selectedWallet.balance : totalBalance;
  const displayCurrency = selectedWallet?.currency ?? '₸';

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) setPeriodOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filteredTxs = useMemo(() => {
    let txs = selectedWalletId
      ? transactions.filter(t => t.walletId === selectedWalletId || t.toWalletId === selectedWalletId)
      : transactions;

    const now = new Date();
    if (period === 'today') {
      const today = now.toISOString().split('T')[0];
      txs = txs.filter(t => t.date === today);
    } else if (period === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      txs = txs.filter(t => t.date >= weekAgo.toISOString().split('T')[0]);
    } else if (period === 'month') {
      const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      txs = txs.filter(t => t.date.startsWith(m));
    }
    return txs;
  }, [transactions, selectedWalletId, period]);

  const income  = filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    filteredTxs.forEach(t => { (map[t.date] ??= []).push(t); });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, txs]) => ({
        date,
        txs,
        total: txs.reduce((s, t) => t.type === 'income' ? s + t.amount : t.type === 'expense' ? s - t.amount : s, 0),
      }));
  }, [filteredTxs]);

  const fmt = (n: number) => new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(Math.abs(n));
  const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });

  const periodLabels: Record<Period, string> = { all: 'Все время', month: 'Месяц', week: 'Неделя', today: 'Сегодня' };

  const getCatIcon = (t: Transaction) => {
    if (t.type === 'transfer') return null;
    return categories.find(c => c.id === t.categoryId);
  };

  const getWalletName = (id: string) => wallets.find(w => w.id === id)?.name ?? '';

  return (
    <div className={styles.page}>
      {/* ── Top header ── */}
      <div className={styles.topBar}>
        <div className={styles.walletPill} ref={dropdownRef} onClick={() => setDropdownOpen(v => !v)}>
          <div className={styles.walletPillIcon}><Wallet size={15} /></div>
          <div className={styles.walletPillText}>
            <span className={styles.walletPillName}>{selectedWallet?.name ?? 'Все счета'}</span>
            <span className={styles.walletPillBalance}>{displayCurrency} {fmt(displayBalance)}</span>
          </div>
          <ChevronDown size={13} className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`} />

          {dropdownOpen && (
            <div className={styles.walletDropdown} onClick={e => e.stopPropagation()}>
              <button className={`${styles.walletDdItem} ${!selectedWalletId ? styles.walletDdActive : ''}`} onClick={() => { setSelectedWalletId(null); setDropdownOpen(false); }}>
                <span className={styles.walletDdDot} style={{ background: 'var(--accent)' }} />
                <span>Все счета</span>
                <span className={styles.walletDdBal}>₸ {fmt(totalBalance)}</span>
              </button>
              {wallets.map(w => (
                <button key={w.id} className={`${styles.walletDdItem} ${selectedWalletId === w.id ? styles.walletDdActive : ''}`}
                  onClick={() => { setSelectedWalletId(w.id); setDropdownOpen(false); }}>
                  <span className={styles.walletDdDot} style={{ background: w.color }} />
                  <span>{w.name}</span>
                  <span className={styles.walletDdBal}>{w.currency} {fmt(w.balance)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.topActions}>
          <button className={styles.topBtn} onClick={() => onNavigate('analytics')}><PieChart size={18} /></button>
          <button className={styles.topBtn} onClick={() => onNavigate('budgets')}><Database size={18} /></button>
          <button className={styles.topBtn} onClick={() => onNavigate('settings')}><Settings size={18} /></button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className={styles.scroll}>
        {/* Currency rates */}
        {rates && (
          <div className={styles.ratesRow}>
            {([
              { label: '🇺🇸 USD', value: rates.usd.value,   change: rates.usd.change,   display: `${fmt(rates.usd.value)} ₸` },
              { label: '🇷🇺 RUB', value: rates.rub.value,   change: rates.rub.change,   display: `${rates.rub.value.toFixed(2)} ₸` },
              { label: 'Gold/г', value: rates.goldG.value, change: rates.goldG.change, display: rates.goldG.value > 0 ? `${fmt(rates.goldG.value)} ₸` : '—' },
            ]).map(({ label, change, display }) => (
              <div key={label} className={styles.rateCard}>
                <span className={styles.rateLabel}>{label}</span>
                <span className={styles.rateValue}>{display}</span>
                {change !== 0 && (
                  <span className={change > 0 ? styles.rateUp : styles.rateDown}>
                    {change > 0 ? '▲' : '▼'} {Math.abs(change)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Balance section */}
        <div className={styles.balanceSection}>
          <div className={styles.periodRow}>
            <span className={styles.periodLabel}>Баланс за</span>
            <div className={styles.periodDropdown} ref={periodRef}>
              <button className={styles.periodPill} onClick={() => setPeriodOpen(v => !v)}>
                {periodLabels[period]}
                <ChevronDown size={13} className={`${styles.chevron} ${periodOpen ? styles.chevronOpen : ''}`} />
              </button>
              {periodOpen && (
                <div className={styles.periodMenu}>
                  {(['all','month','week','today'] as Period[]).map(p => (
                    <button key={p}
                      className={`${styles.periodMenuItem} ${period === p ? styles.periodMenuActive : ''}`}
                      onClick={() => { setPeriod(p); setPeriodOpen(false); }}>
                      {periodLabels[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={styles.balanceNum}>{fmt(displayBalance)} <span className={styles.balanceCur}>{displayCurrency}</span></div>
          <div className={styles.inExRow}>
            <div className={styles.inExItem}>
              <div className={styles.inExIcon} style={{ background: 'var(--green-bg)' }}>
                <ArrowDownLeft size={14} color="var(--green)" />
              </div>
              <span className={styles.inExAmt} style={{ color: 'var(--green)' }}>{fmt(income)} {displayCurrency}</span>
            </div>
            <div className={styles.inExItem}>
              <div className={styles.inExIcon} style={{ background: 'var(--orange-bg)' }}>
                <ArrowUpRight size={14} color="var(--orange)" />
              </div>
              <span className={styles.inExAmt} style={{ color: 'var(--orange)' }}>{fmt(expense)} {displayCurrency}</span>
            </div>
          </div>
        </div>

        {/* Transactions grouped by date */}
        {grouped.length === 0 && (
          <div className={styles.empty}>Нет операций за выбранный период</div>
        )}
        {grouped.map(({ date, txs, total }) => (
          <div key={date} className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupDate}>{fmtDate(date)}</span>
              <span className={styles.groupTotal} style={{ color: total >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {total >= 0 ? '+' : '-'}{fmt(total)} {displayCurrency}
              </span>
            </div>
            <div className={styles.txCards}>
              {txs.map(t => {
                const cat = getCatIcon(t);
                const isTransfer = t.type === 'transfer';
                const fromWallet = getWalletName(t.walletId);
                const toWallet = t.toWalletId ? getWalletName(t.toWalletId) : '';
                const wallet = wallets.find(w => w.id === t.walletId);

                return (
                  <div key={t.id} className={styles.txCard}>
                    <div className={styles.txLeft}>
                      {isTransfer ? (
                        <div className={styles.txCatIcon} style={{ background: 'var(--blue-bg)' }}>
                          <ArrowLeftRight size={18} color="var(--blue)" />
                        </div>
                      ) : cat ? (
                        <div className={styles.txCatIcon} style={{ background: cat.color + '22' }}>
                          <span style={{ fontSize: 20 }}>{cat.icon}</span>
                        </div>
                      ) : (
                        <div className={styles.txCatIcon} style={{ background: 'var(--bg3)' }}>
                          <span style={{ fontSize: 20 }}>—</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.txMid}>
                      <span className={styles.txName}>
                        {isTransfer ? 'Перевод' : cat?.name ?? 'Без категории'}
                      </span>
                      {t.description && <span className={styles.txDesc}>{t.description}</span>}
                      {isTransfer ? (
                        <span className={styles.txWallet}>{fromWallet} → {toWallet}</span>
                      ) : (
                        <span className={styles.txWallet}>{wallet?.name}</span>
                      )}
                    </div>

                    <div className={styles.txRight}>
                      {isTransfer ? (
                        <>
                          <span className={styles.txAmt} style={{ color: 'var(--red)' }}>-{fmt(t.amount)} {wallet?.currency ?? '₸'}</span>
                          <span className={styles.txAmt} style={{ color: 'var(--green)', fontSize: 12 }}>+{fmt(t.amount)} {t.toWalletId ? (wallets.find(w => w.id === t.toWalletId)?.currency ?? '₸') : '₸'}</span>
                        </>
                      ) : (
                        <span className={styles.txAmt} style={{ color: t.type === 'income' ? 'var(--green)' : 'var(--text)' }}>
                          {t.type === 'income' ? '+' : '-'}{fmt(t.amount)} {wallet?.currency ?? '₸'}
                        </span>
                      )}
                      {deletingId === t.id ? (
                        <div className={styles.txConfirm}>
                          <button className={styles.txConfirmYes} onClick={() => { deleteTransaction(t.id); setDeletingId(null); }}>Удалить</button>
                          <button className={styles.txConfirmNo} onClick={() => setDeletingId(null)}>Отмена</button>
                        </div>
                      ) : (
                        <div className={styles.txActions}>
                          <button className={styles.txActionBtn} onClick={() => onEdit(t)}><Edit2 size={13} /></button>
                          <button className={`${styles.txActionBtn} ${styles.txActionDel}`} onClick={() => setDeletingId(t.id)}><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ height: 'calc(var(--bottom-nav-height) + 16px)' }} />
      </div>

      {/* ── Bottom action bar ── */}
      <div className={styles.actionBar}>
        <button className={styles.actionBtn} onClick={onAddVoice}><AudioLines size={20} /></button>
        <button className={styles.actionBtnMain} onClick={onAddTransaction}><Plus size={22} /></button>
      </div>
    </div>
  );
}
