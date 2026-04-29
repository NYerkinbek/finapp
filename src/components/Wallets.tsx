import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useApp } from '../store';
import { Wallet } from '../types';
import styles from './Wallets.module.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

export function Wallets() {
  const { wallets, addWallet, updateWallet, deleteWallet, transactions } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', balance: '', currency: '₸', color: COLORS[0] });

  const fmt = (n: number) => new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(n);

  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  const save = () => {
    if (!form.name || !form.balance) return;
    if (editId) {
      const w = wallets.find(x => x.id === editId)!;
      updateWallet({ ...w, name: form.name, balance: parseFloat(form.balance) || w.balance, currency: form.currency, color: form.color });
    } else {
      addWallet({ name: form.name, balance: parseFloat(form.balance), currency: form.currency, color: form.color, icon: 'wallet' });
    }
    setShowForm(false);
    setEditId(null);
    setForm({ name: '', balance: '', currency: '₸', color: COLORS[0] });
  };

  const startEdit = (w: Wallet) => {
    setForm({ name: w.name, balance: String(w.balance), currency: w.currency, color: w.color });
    setEditId(w.id);
    setShowForm(true);
  };

  const walletTxCount = (id: string) => transactions.filter(t => t.walletId === id).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Кошельки</h1>
          <p className={styles.subtitle}>Общий баланс: {fmt(totalBalance)} ₸</p>
        </div>
        <button className={styles.addBtn} onClick={() => { setShowForm(true); setEditId(null); }}>
          <Plus size={18} /> Добавить кошелек
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <span>{editId ? 'Редактировать' : 'Новый кошелек'}</span>
            <button onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Название</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Название кошелька" />
            </div>
            <div className={styles.field}>
              <label>Сумма</label>
              <input type="number" value={form.balance} onChange={e => setForm(p => ({ ...p, balance: e.target.value }))} placeholder="0" />
            </div>
            <div className={styles.field}>
              <label>Валюта</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <option>₸</option><option>₽</option><option>$</option><option>€</option>
              </select>
            </div>
          </div>
          <div className={styles.colorRow}>
            <label>Цвет</label>
            <div className={styles.colors}>
              {COLORS.map(c => (
                <button key={c} className={`${styles.colorDot} ${form.color === c ? styles.colorSelected : ''}`}
                  style={{ background: c }} onClick={() => setForm(p => ({ ...p, color: c }))} />
              ))}
            </div>
          </div>
          <button className={styles.saveBtn} onClick={save}><Check size={16} /> Сохранить</button>
        </div>
      )}

      <div className={styles.grid}>
        {wallets.map(w => {
          const txs = transactions.filter(t => t.walletId === w.id);
          const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const percent = totalBalance > 0 ? Math.round((w.balance / totalBalance) * 100) : 0;

          return (
            <div key={w.id} className={styles.walletCard}>
              <div className={styles.walletTop}>
                <div className={styles.walletIcon} style={{ background: w.color + '22', color: w.color }}>
                  💳
                </div>
                <div className={styles.walletActions}>
                  <button onClick={() => startEdit(w)}><Edit2 size={14} /></button>
                  <button onClick={() => deleteWallet(w.id)} className={styles.deleteBtn}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className={styles.walletName}>{w.name}</div>
              <div className={styles.walletBalance} style={{ color: w.color }}>
                {w.currency} {fmt(w.balance)}
              </div>
              <div className={styles.walletMeta}>
                <span className={styles.green}>↑ {w.currency}{fmt(income)}</span>
                <span className={styles.red}>↓ {w.currency}{fmt(expense)}</span>
              </div>
              <div className={styles.walletBar}>
                <div className={styles.walletBarFill} style={{ width: `${percent}%`, background: w.color }} />
              </div>
              <div className={styles.walletStat}>{percent}% от общего · {walletTxCount(w.id)} операций</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
