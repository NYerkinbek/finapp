import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../store';
import { Budget } from '../types';
import styles from './Budgets.module.css';

type Tab = 'current' | 'history';

export function Budgets() {
  const { budgets, categories, addBudget, updateBudget, deleteBudget } = useApp();
  const [tab, setTab] = useState<Tab>('current');
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState<{ categoryId: string; amount: string; period: 'monthly' | 'weekly' }>({ categoryId: '', amount: '', period: 'monthly' });
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const fmt = (n: number) => new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(n);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const expenseCats = categories.filter(c => c.type === 'expense');

  const save = () => {
    if (!form.categoryId || !form.amount) return;
    const month = currentMonth;
    if (editBudget) {
      updateBudget({ ...editBudget, categoryId: form.categoryId, amount: parseFloat(form.amount), period: form.period });
    } else {
      addBudget({ categoryId: form.categoryId, amount: parseFloat(form.amount), spent: 0, period: form.period, month });
    }
    setShowForm(false);
    setEditBudget(null);
    setForm({ categoryId: '', amount: '', period: 'monthly' as const });
  };

  const startEdit = (b: Budget) => {
    setForm({ categoryId: b.categoryId, amount: String(b.amount), period: b.period });
    setEditBudget(b);
    setShowForm(true);
  };

  // Current month budgets
  const currentBudgets = budgets.filter(b => b.month === currentMonth);
  const totalBudget = currentBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent  = currentBudgets.reduce((s, b) => s + b.spent, 0);

  // History: group budgets by month, exclude current
  const history = useMemo(() => {
    const map: Record<string, Budget[]> = {};
    budgets.forEach(b => {
      if (b.month !== currentMonth) (map[b.month] ??= []).push(b);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, list]) => {
        const budget = list.reduce((s, b) => s + b.amount, 0);
        const spent  = list.reduce((s, b) => s + b.spent, 0);
        const saved  = budget - spent;
        const pct    = budget > 0 ? Math.round((spent / budget) * 100) : 0;
        const [y, m] = month.split('-');
        const label  = new Date(+y, +m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        return { month, label, budget, spent, saved, pct, list };
      });
  }, [budgets, currentMonth]);

  return (
    <div className={styles.page}>
      {/* Tabs */}
      <div className={styles.tabRow}>
        <button className={`${styles.tabBtn} ${tab === 'current' ? styles.tabActive : ''}`} onClick={() => setTab('current')}>Текущий месяц</button>
        <button className={`${styles.tabBtn} ${tab === 'history' ? styles.tabActive : ''}`} onClick={() => setTab('history')}>История</button>
      </div>

      {/* ── CURRENT TAB ── */}
      {tab === 'current' && (
        <>
          <div className={styles.header}>
            <div>
              <p className={styles.subtitle}>
                Потрачено ₸{fmt(totalSpent)} из ₸{fmt(totalBudget)} — {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%
              </p>
            </div>
            <button className={styles.addBtn} onClick={() => { setShowForm(true); setEditBudget(null); }}>
              <Plus size={18} /> Добавить бюджет
            </button>
          </div>

          <div className={styles.overallCard}>
            <div className={styles.overallLabel}>
              <span>Общий бюджет месяца</span>
              <span>₸{fmt(totalSpent)} / ₸{fmt(totalBudget)}</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{
                width: `${Math.min(100, totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0)}%`,
                background: totalSpent > totalBudget ? '#ef4444' : '#6366f1'
              }} />
            </div>
          </div>

          {showForm && (
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
                <span>{editBudget ? 'Редактировать бюджет' : 'Новый бюджет'}</span>
                <button onClick={() => setShowForm(false)}><X size={16} /></button>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label>Категория</label>
                  <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                    <option value="">Выберите категорию</option>
                    {expenseCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Лимит (₸)</label>
                  <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
                </div>
                <div className={styles.field}>
                  <label>Период</label>
                  <select value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value as 'monthly' | 'weekly' }))}>
                    <option value="monthly">Месяц</option>
                    <option value="weekly">Неделя</option>
                  </select>
                </div>
              </div>
              <button className={styles.saveBtn} onClick={save}><Check size={16} /> Сохранить</button>
            </div>
          )}

          <div className={styles.grid}>
            {currentBudgets.map(b => {
              const cat = categories.find(c => c.id === b.categoryId);
              const pct  = Math.min(100, b.amount > 0 ? (b.spent / b.amount) * 100 : 0);
              const over = b.spent > b.amount;
              const warn = pct >= 80;
              return (
                <div key={b.id} className={`${styles.budgetCard} ${over ? styles.budgetOver : ''}`}>
                  <div className={styles.budgetTop}>
                    <div className={styles.budgetCat}>
                      <span className={styles.catIcon}>{cat?.icon}</span>
                      <span className={styles.catName}>{cat?.name}</span>
                    </div>
                    <div className={styles.budgetActions}>
                      {warn && <AlertTriangle size={14} color={over ? '#ef4444' : '#f59e0b'} />}
                      <button onClick={() => startEdit(b)}><Edit2 size={13} /></button>
                      <button onClick={() => deleteBudget(b.id)} className={styles.deleteBtn}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className={styles.budgetAmounts}>
                    <span className={styles.budgetSpent} style={{ color: over ? '#ef4444' : 'var(--text)' }}>₸{fmt(b.spent)}</span>
                    <span className={styles.budgetLimit}>/ ₸{fmt(b.amount)}</span>
                  </div>
                  <div className={styles.bar}>
                    <div className={styles.barFill} style={{ width: `${pct}%`, background: over ? '#ef4444' : warn ? '#f59e0b' : cat?.color ?? '#6366f1' }} />
                  </div>
                  <div className={styles.budgetMeta}>
                    <span className={over ? styles.red : styles.muted}>
                      {over ? `Превышен на ₸${fmt(b.spent - b.amount)}` : `Осталось ₸${fmt(b.amount - b.spent)}`}
                    </span>
                    <span className={styles.muted}>{Math.round(pct)}%</span>
                  </div>
                </div>
              );
            })}
            {currentBudgets.length === 0 && (
              <div className={styles.empty}>Нет бюджетов. Создайте первый бюджет для контроля расходов.</div>
            )}
          </div>
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div className={styles.historyList}>
          {history.length === 0 && (
            <div className={styles.empty}>История бюджетов пока пуста</div>
          )}
          {history.map(({ month, label, budget, spent, saved, pct, list }) => {
            const isOpen = expandedMonth === month;
            const over   = spent > budget;
            return (
              <div key={month} className={styles.historyCard}>
                <button className={styles.historyHeader} onClick={() => setExpandedMonth(isOpen ? null : month)}>
                  <div className={styles.historyMeta}>
                    <span className={styles.historyMonth}>{label}</span>
                    <span className={styles.historySaved} style={{ color: saved >= 0 ? 'var(--green)' : '#ef4444' }}>
                      {saved >= 0 ? `Сэкономлено ₸${fmt(saved)}` : `Перерасход ₸${fmt(Math.abs(saved))}`}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp size={16} color="var(--text2)" /> : <ChevronDown size={16} color="var(--text2)" />}
                </button>

                <div className={styles.historySummary}>
                  <div className={styles.historyStatRow}>
                    <div className={styles.historyStat}>
                      <span className={styles.historyStatLabel}>Бюджет</span>
                      <span className={styles.historyStatVal}>₸{fmt(budget)}</span>
                    </div>
                    <div className={styles.historyStat}>
                      <span className={styles.historyStatLabel}>Потрачено</span>
                      <span className={styles.historyStatVal} style={{ color: over ? '#ef4444' : 'var(--text)' }}>₸{fmt(spent)}</span>
                    </div>
                    <div className={styles.historyStat}>
                      <span className={styles.historyStatLabel}>% исполнения</span>
                      <span className={styles.historyStatVal} style={{ color: over ? '#ef4444' : 'var(--green)' }}>{pct}%</span>
                    </div>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${Math.min(100, pct)}%`, background: over ? '#ef4444' : '#6366f1' }} />
                  </div>
                </div>

                {isOpen && (
                  <div className={styles.historyCategories}>
                    {list.map(b => {
                      const cat  = categories.find(c => c.id === b.categoryId);
                      const bPct = b.amount > 0 ? Math.min(100, Math.round((b.spent / b.amount) * 100)) : 0;
                      const bOver = b.spent > b.amount;
                      return (
                        <div key={b.id} className={styles.historyCatRow}>
                          <span className={styles.historyCatIcon}>{cat?.icon}</span>
                          <div className={styles.historyCatInfo}>
                            <div className={styles.historyCatMeta}>
                              <span className={styles.historyCatName}>{cat?.name ?? '—'}</span>
                              <span style={{ color: bOver ? '#ef4444' : 'var(--text2)', fontSize: 12 }}>
                                ₸{fmt(b.spent)} / ₸{fmt(b.amount)}
                              </span>
                            </div>
                            <div className={styles.bar}>
                              <div className={styles.barFill} style={{ width: `${bPct}%`, background: bOver ? '#ef4444' : cat?.color ?? '#6366f1' }} />
                            </div>
                          </div>
                          <span className={styles.muted} style={{ fontSize: 11, flexShrink: 0 }}>{bPct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
