import { useMemo } from 'react';
import { Keyboard, Mic } from 'lucide-react';
import { useApp } from '../store';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import styles from './Analytics.module.css';

export function Analytics() {
  const { transactions, categories, wallets } = useApp();
  const fmt = (n: number) => new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(n);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthTxs = useMemo(() =>
    transactions.filter(t => t.date.startsWith(thisMonth)), [transactions]);

  // Expenses by category
  const expByCat = useMemo(() => {
    const m: Record<string, number> = {};
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      m[t.categoryId] = (m[t.categoryId] || 0) + t.amount;
    });
    return Object.entries(m).map(([id, amount]) => {
      const cat = categories.find(c => c.id === id);
      return { name: cat?.name ?? id, value: amount, icon: cat?.icon, color: cat?.color ?? '#6366f1' };
    }).sort((a, b) => b.value - a.value);
  }, [monthTxs, categories]);

  // Monthly comparison last 6 months
  const monthly = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mTxs = transactions.filter(t => t.date.startsWith(key));
      months.push({
        month: d.toLocaleDateString('ru-RU', { month: 'short' }),
        income: mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      });
    }
    return months;
  }, [transactions]);

  // Input method stats
  const methodStats = useMemo(() => {
    const m: Record<string, number> = { manual: 0, voice: 0 };
    transactions.forEach(t => { if (t.inputMethod in m) m[t.inputMethod] = (m[t.inputMethod] || 0) + 1; });
    return [
      { key: 'manual', name: 'Вручную', Icon: Keyboard, value: m.manual },
      { key: 'voice',  name: 'Голос',   Icon: Mic,      value: m.voice  },
    ];
  }, [transactions]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6'];

  const totalIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.subtitle}>
          {now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.sLabel}>Доходы за месяц</div>
          <div className={`${styles.sValue} ${styles.green}`}>{fmt(totalIncome)} ₸</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.sLabel}>Расходы за месяц</div>
          <div className={`${styles.sValue} ${styles.red}`}>{fmt(totalExpense)} ₸</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.sLabel}>Баланс месяца</div>
          <div className={`${styles.sValue} ${totalIncome - totalExpense >= 0 ? styles.green : styles.red}`}>
            {fmt(totalIncome - totalExpense)} ₸
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.sLabel}>Норма сбережений</div>
          <div className={styles.sValue}>
            {totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0}%
          </div>
        </div>
      </div>

      <div className={styles.chartsRow}>
        {/* Pie chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Расходы по категориям</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={expByCat} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false}>
                {expByCat.map((entry, i) => (
                  <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e1e28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}
                formatter={(v: number) => [`${fmt(v)} ₸`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.legend}>
            {expByCat.slice(0, 6).map((c, i) => (
              <div key={i} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: c.color || COLORS[i % COLORS.length] }} />
                <span className={styles.legendName}>{c.icon} {c.name}</span>
                <span className={styles.legendVal}>{fmt(c.value)} ₸</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Доходы и расходы по месяцам</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} barSize={16} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#a0a0b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#a0a0b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e1e28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}
                formatter={(v: number) => [`${fmt(v)} ₸`, '']}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Доходы" />
              <Bar dataKey="expense" fill="#6366f1" radius={[4, 4, 0, 0]} name="Расходы" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Method stats */}
      <div className={styles.methodCard}>
        <h3 className={styles.chartTitle}>Способы добавления операций</h3>
        <div className={styles.methodGrid}>
          {methodStats.map((m, i) => {
            const total = methodStats.reduce((s, x) => s + x.value, 0);
            const pct = total > 0 ? Math.round((m.value / total) * 100) : 0;
            return (
              <div key={i} className={styles.methodItem}>
                <div className={styles.methodTop}>
                  <span className={styles.methodName}><m.Icon size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />{m.name}</span>
                  <span className={styles.methodCount}>{m.value} оп.</span>
                </div>
                <div className={styles.methodBar}>
                  <div className={styles.methodBarFill} style={{ width: `${pct}%`, background: COLORS[i] }} />
                </div>
                <span className={styles.methodPct}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
