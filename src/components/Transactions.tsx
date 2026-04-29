import { useState, useMemo } from 'react';
import { Search, Trash2, Edit2, Download } from 'lucide-react';
import { useApp } from '../store';
import { Transaction } from '../types';
import styles from './Transactions.module.css';

type Period = 'all' | 'month' | 'week' | 'today';

export function Transactions({ onAdd, onEdit }: { onAdd: () => void; onEdit: (t: Transaction) => void }) {
  const { transactions, categories, wallets, deleteTransaction } = useApp();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [filterWallet, setFilterWallet] = useState('all');
  const [period, setPeriod] = useState<Period>('all');

  const fmt = (n: number) => new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(n);

  const exportCSV = () => {
    const header = ['Дата', 'Тип', 'Сумма', 'Описание', 'Категория', 'Кошелёк', 'Метод'];
    const rows = filtered.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const wallet = wallets.find(w => w.id === t.walletId);
      const toWallet = t.toWalletId ? wallets.find(w => w.id === t.toWalletId) : null;
      const typeLabel = t.type === 'income' ? 'Доход' : t.type === 'expense' ? 'Расход' : 'Перевод';
      const catLabel = toWallet ? `→ ${toWallet.name}` : (cat?.name ?? '');
      return [t.date, typeLabel, t.amount, `"${t.description}"`, catLabel, wallet?.name ?? '', t.inputMethod].join(',');
    });
    const csv = '﻿' + [header.join(','), ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const inputMethodLabel: Record<string, { icon: string; label: string; color: string }> = {
    manual: { icon: '✏️', label: 'Вручную', color: '#a0a0b8' },
    receipt: { icon: '🧾', label: 'Чек', color: '#f59e0b' },
    voice: { icon: '🎤', label: 'Голос', color: '#6366f1' },
    notification: { icon: '🔔', label: 'Уведомление', color: '#10b981' },
  };

  const periodBounds = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const monthStart = today.slice(0, 7) + '-01';
    return { today, weekStart: weekStart.toISOString().split('T')[0], monthStart };
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterWallet !== 'all' && t.walletId !== filterWallet && t.toWalletId !== filterWallet) return false;
      if (period === 'today' && t.date !== periodBounds.today) return false;
      if (period === 'week' && t.date < periodBounds.weekStart) return false;
      if (period === 'month' && t.date < periodBounds.monthStart) return false;
      if (search) {
        const cat = categories.find(c => c.id === t.categoryId);
        const q = search.toLowerCase();
        return t.description.toLowerCase().includes(q) || cat?.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [transactions, filterType, filterWallet, period, periodBounds, search, categories]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    filtered.forEach(t => { if (!g[t.date]) g[t.date] = []; g[t.date].push(t); });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (date.getTime() === today.getTime()) return 'Сегодня';
    if (date.getTime() === yesterday.getTime()) return 'Вчера';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Операции</h1>
          <p className={styles.subtitle}>{filtered.length} записей</p>
        </div>
        <div className={styles.headerBtns}>
          <button className={styles.exportBtn} onClick={exportCSV} title="Экспорт CSV">
            <Download size={15} /> CSV
          </button>
          <button className={styles.addBtn} onClick={onAdd}>+ Добавить</button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.filtersTop}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input className={styles.searchInput} placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className={styles.walletFilter} value={filterWallet} onChange={e => setFilterWallet(e.target.value)}>
            <option value="all">Все кошельки</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterBtns}>
            {(['all', 'income', 'expense', 'transfer'] as const).map(t => (
              <button key={t} className={`${styles.filterBtn} ${filterType === t ? styles.filterActive : ''}`} onClick={() => setFilterType(t)}>
                {t === 'all' ? 'Все' : t === 'income' ? '↑ Доходы' : t === 'expense' ? '↓ Расходы' : '⇄ Переводы'}
              </button>
            ))}
          </div>
          <div className={styles.filterBtns}>
            {([['all', 'Всё время'], ['month', 'Месяц'], ['week', 'Неделя'], ['today', 'Сегодня']] as [Period, string][]).map(([p, label]) => (
              <button key={p} className={`${styles.filterBtn} ${period === p ? styles.filterActive : ''}`} onClick={() => setPeriod(p)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {grouped.length === 0 ? (
          <div className={styles.empty}>Нет операций</div>
        ) : grouped.map(([date, txs]) => {
          const dayTotal = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
          return (
            <div key={date} className={styles.group}>
              <div className={styles.dateRow}>
                <span className={styles.dateLabel}>{formatDate(date)}</span>
                <span className={`${styles.dateTotal} ${dayTotal >= 0 ? styles.green : styles.red}`}>
                  {dayTotal >= 0 ? '+' : ''}{fmt(dayTotal)} ₸
                </span>
              </div>
              {txs.map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const wallet = wallets.find(w => w.id === t.walletId);
                const toWallet = t.toWalletId ? wallets.find(w => w.id === t.toWalletId) : null;
                const mInfo = inputMethodLabel[t.inputMethod];
                const isTransfer = t.type === 'transfer';

                return (
                  <div key={t.id} className={styles.txRow}>
                    <span className={styles.txCatIcon}>{isTransfer ? '⇄' : (cat?.icon ?? '?')}</span>
                    <div className={styles.txBody}>
                      <div className={styles.txTop}>
                        <span className={styles.txDesc}>{t.description || (isTransfer ? 'Перевод' : cat?.name)}</span>
                        <span className={`${styles.txAmount} ${isTransfer ? styles.transfer : t.type === 'income' ? styles.green : styles.red}`}>
                          {isTransfer ? '' : t.type === 'income' ? '+' : '-'}{fmt(t.amount)} ₸
                        </span>
                      </div>
                      <div className={styles.txBottom}>
                        {isTransfer ? (
                          <>
                            <span className={styles.txWallet} style={{ color: wallet?.color }}>{wallet?.name}</span>
                            <span className={styles.txDot}>→</span>
                            <span className={styles.txWallet} style={{ color: toWallet?.color }}>{toWallet?.name}</span>
                          </>
                        ) : (
                          <>
                            <span className={styles.txCat}>{cat?.name}</span>
                            <span className={styles.txDot}>·</span>
                            <span className={styles.txWallet} style={{ color: wallet?.color }}>{wallet?.name}</span>
                            <span className={styles.txDot}>·</span>
                            <span className={styles.txMethod} style={{ color: mInfo?.color }}>{mInfo?.icon} {mInfo?.label}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={styles.txActions}>
                      <button className={styles.editBtn} onClick={() => onEdit(t)}><Edit2 size={13} /></button>
                      <button className={styles.delBtn} onClick={() => deleteTransaction(t.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
