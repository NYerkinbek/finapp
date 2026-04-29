import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Wallet, Category, Transaction, Budget } from './types';
import { supabase } from './lib/supabase';
import { useSpace } from './contexts/SpaceContext';
import { useAuth } from './contexts/AuthContext';

// ─── DB mappers ───────────────────────────────────────────────────────────────

const toWallet   = (d: Record<string, unknown>): Wallet     => ({ id: d.id as string, name: d.name as string, balance: Number(d.balance), currency: d.currency as string, color: d.color as string, icon: d.icon as string });
const toCategory = (d: Record<string, unknown>): Category   => ({ id: d.id as string, name: d.name as string, icon: d.icon as string, type: d.type as 'income' | 'expense', color: d.color as string });
const toTx       = (d: Record<string, unknown>): Transaction => ({ id: d.id as string, walletId: d.wallet_id as string, toWalletId: (d.to_wallet_id as string | null) ?? undefined, categoryId: (d.category_id as string) ?? '', type: d.type as Transaction['type'], amount: Number(d.amount), description: d.description as string, date: d.date as string, inputMethod: d.input_method as Transaction['inputMethod'] });
const toBudget   = (d: Record<string, unknown>): Budget     => ({ id: d.id as string, categoryId: d.category_id as string, amount: Number(d.amount), spent: Number(d.spent), period: d.period as 'monthly' | 'weekly', month: d.month as string });

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppState {
  wallets: Wallet[]; categories: Category[]; transactions: Transaction[]; budgets: Budget[];
  activeWalletId: string | null; loading: boolean;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  addWallet: (w: Omit<Wallet, 'id'>) => void;
  updateWallet: (w: Wallet) => void;
  deleteWallet: (id: string) => void;
  addBudget: (b: Omit<Budget, 'id'>) => void;
  updateBudget: (b: Budget) => void;
  deleteBudget: (id: string) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (t: Transaction) => void;
  setActiveWallet: (id: string | null) => void;
  addCategory: (c: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const { space } = useSpace();
  const { user } = useAuth();
  const spaceId = space?.id ?? '';

  const [wallets,      setWallets]      = useState<Wallet[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets,      setBudgets]      = useState<Budget[]>([]);
  const [activeWalletId, setActiveWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Tracks transaction IDs we've applied optimistically – skip their realtime echo
  const pendingTxIds = useRef(new Set<string>());

  // ── Refetchers ──────────────────────────────────────────────────────────────

  const refetchWallets = useCallback(async () => {
    const { data } = await supabase.from('wallets').select('*').eq('space_id', spaceId).order('created_at');
    if (data) setWallets(data.map(toWallet));
  }, [spaceId]);

  const refetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').eq('space_id', spaceId);
    if (data) setCategories(data.map(toCategory));
  }, [spaceId]);

  const refetchTransactions = useCallback(async () => {
    const { data } = await supabase.from('transactions').select('*').eq('space_id', spaceId)
      .order('date', { ascending: false }).order('created_at', { ascending: false });
    if (data) setTransactions(data.map(toTx));
  }, [spaceId]);

  const refetchBudgets = useCallback(async () => {
    const { data } = await supabase.from('budgets').select('*').eq('space_id', spaceId);
    if (!data) return;
    // Auto-reset if new month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const toReset = data.filter((b: Record<string, unknown>) => b.month !== currentMonth);
    if (toReset.length) {
      await Promise.all(toReset.map((b: Record<string, unknown>) =>
        supabase.from('budgets').update({ spent: 0, month: currentMonth }).eq('id', b.id)
      ));
      const { data: updated } = await supabase.from('budgets').select('*').eq('space_id', spaceId);
      if (updated) setBudgets(updated.map(toBudget));
    } else {
      setBudgets(data.map(toBudget));
    }
  }, [spaceId]);

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!spaceId) return;
    setLoading(true);
    Promise.all([refetchWallets(), refetchCategories(), refetchTransactions(), refetchBudgets()])
      .finally(() => setLoading(false));
  }, [spaceId]);

  // ── Realtime ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!spaceId) return;

    const channel = supabase.channel(`space:${spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `space_id=eq.${spaceId}` }, (p: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
        const id = p.new?.id ?? p.old?.id;
        if (typeof id === 'string' && pendingTxIds.current.has(id)) {
          pendingTxIds.current.delete(id);
          return; // Already applied optimistically
        }
        refetchTransactions();
        refetchWallets();
        refetchBudgets();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets',   filter: `space_id=eq.${spaceId}` }, refetchWallets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories',filter: `space_id=eq.${spaceId}` }, refetchCategories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets',   filter: `space_id=eq.${spaceId}` }, refetchBudgets)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [spaceId, refetchTransactions, refetchWallets, refetchBudgets, refetchCategories]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const uid = () => crypto.randomUUID();

  // ── Mutations ───────────────────────────────────────────────────────────────

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    const id = uid();
    pendingTxIds.current.add(id);
    const newT: Transaction = { ...t, id };

    // Optimistic
    setTransactions(prev => [newT, ...prev]);
    if (t.type === 'transfer') {
      setWallets(prev => prev.map(w => {
        if (w.id === t.walletId)   return { ...w, balance: w.balance - t.amount };
        if (w.id === t.toWalletId) return { ...w, balance: w.balance + t.amount };
        return w;
      }));
    } else {
      setWallets(prev => prev.map(w => w.id !== t.walletId ? w : { ...w, balance: w.balance + (t.type === 'income' ? t.amount : -t.amount) }));
      setBudgets(prev => prev.map(b => b.categoryId === t.categoryId && t.type === 'expense' ? { ...b, spent: b.spent + t.amount } : b));
    }

    // Persist (DB trigger handles balance/spent)
    supabase.from('transactions').insert({
      id, space_id: spaceId, wallet_id: t.walletId, to_wallet_id: t.toWalletId ?? null,
      category_id: t.categoryId || null, type: t.type, amount: t.amount,
      description: t.description, date: t.date, input_method: t.inputMethod,
      created_by: user?.id,
    }).then(() => { refetchWallets(); refetchBudgets(); });
  }, [spaceId, user, refetchWallets, refetchBudgets]);

  const deleteTransaction = useCallback((id: string) => {
    const t = transactions.find(x => x.id === id);
    if (!t) return;
    pendingTxIds.current.add(id);

    setTransactions(prev => prev.filter(x => x.id !== id));
    if (t.type === 'transfer') {
      setWallets(prev => prev.map(w => {
        if (w.id === t.walletId)   return { ...w, balance: w.balance + t.amount };
        if (w.id === t.toWalletId) return { ...w, balance: w.balance - t.amount };
        return w;
      }));
    } else {
      setWallets(prev => prev.map(w => w.id !== t.walletId ? w : { ...w, balance: w.balance + (t.type === 'income' ? -t.amount : t.amount) }));
      if (t.type === 'expense') setBudgets(prev => prev.map(b => b.categoryId === t.categoryId ? { ...b, spent: Math.max(0, b.spent - t.amount) } : b));
    }

    supabase.from('transactions').delete().eq('id', id)
      .then(() => { refetchWallets(); refetchBudgets(); });
  }, [transactions, spaceId, refetchWallets, refetchBudgets]);

  const updateTransaction = useCallback((updated: Transaction) => {
    const old = transactions.find(x => x.id === updated.id);
    if (!old) return;
    pendingTxIds.current.add(updated.id);

    setTransactions(prev => prev.map(x => x.id === updated.id ? updated : x));
    setWallets(prev => prev.map(w => {
      let bal = w.balance;
      if (old.type === 'transfer') { if (w.id === old.walletId) bal += old.amount; if (w.id === old.toWalletId) bal -= old.amount; }
      else if (w.id === old.walletId) bal += old.type === 'income' ? -old.amount : old.amount;
      if (updated.type === 'transfer') { if (w.id === updated.walletId) bal -= updated.amount; if (w.id === updated.toWalletId) bal += updated.amount; }
      else if (w.id === updated.walletId) bal += updated.type === 'income' ? updated.amount : -updated.amount;
      return bal !== w.balance ? { ...w, balance: bal } : w;
    }));
    setBudgets(prev => {
      let next = prev;
      if (old.type === 'expense' && old.categoryId) next = next.map(b => b.categoryId === old.categoryId ? { ...b, spent: Math.max(0, b.spent - old.amount) } : b);
      if (updated.type === 'expense' && updated.categoryId) next = next.map(b => b.categoryId === updated.categoryId ? { ...b, spent: b.spent + updated.amount } : b);
      return next;
    });

    supabase.from('transactions').update({
      wallet_id: updated.walletId, to_wallet_id: updated.toWalletId ?? null,
      category_id: updated.categoryId || null, type: updated.type, amount: updated.amount,
      description: updated.description, date: updated.date, input_method: updated.inputMethod,
    }).eq('id', updated.id)
      .then(() => { refetchWallets(); refetchBudgets(); });
  }, [transactions, refetchWallets, refetchBudgets]);

  const log = (op: string, error: unknown) => { if (error) console.error(`[store] ${op}:`, error); };

  const addWallet = useCallback((w: Omit<Wallet, 'id'>) => {
    const id = `w_${uid()}`;
    setWallets(prev => [...prev, { ...w, id }]);
    supabase.from('wallets').insert({ id, space_id: spaceId, name: w.name, balance: w.balance, currency: w.currency, color: w.color, icon: w.icon })
      .then(({ error }) => log('addWallet', error));
  }, [spaceId]);

  const updateWallet = useCallback((w: Wallet) => {
    setWallets(prev => prev.map(x => x.id === w.id ? w : x));
    supabase.from('wallets').update({ name: w.name, balance: w.balance, currency: w.currency, color: w.color, icon: w.icon }).eq('id', w.id)
      .then(({ error }) => log('updateWallet', error));
  }, []);

  const deleteWallet = useCallback((id: string) => {
    setWallets(prev => prev.filter(w => w.id !== id));
    setTransactions(prev => prev.filter(t => t.walletId !== id));
    supabase.from('wallets').delete().eq('id', id)
      .then(({ error }) => log('deleteWallet', error));
  }, [spaceId]);

  const addBudget = useCallback((b: Omit<Budget, 'id'>) => {
    const id = `b_${uid()}`;
    setBudgets(prev => [...prev, { ...b, id }]);
    supabase.from('budgets').insert({ id, space_id: spaceId, category_id: b.categoryId, amount: b.amount, spent: b.spent, period: b.period, month: b.month })
      .then(({ error }) => log('addBudget', error));
  }, [spaceId]);

  const updateBudget = useCallback((b: Budget) => {
    setBudgets(prev => prev.map(x => x.id === b.id ? b : x));
    supabase.from('budgets').update({ category_id: b.categoryId, amount: b.amount, period: b.period }).eq('id', b.id)
      .then(({ error }) => log('updateBudget', error));
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    supabase.from('budgets').delete().eq('id', id)
      .then(({ error }) => log('deleteBudget', error));
  }, []);

  const addCategory = useCallback((c: Omit<Category, 'id'>) => {
    const id = `c_${uid()}`;
    console.log('[addCategory] spaceId:', JSON.stringify(spaceId), '| id:', id);
    setCategories(prev => [...prev, { ...c, id }]);
    supabase.from('categories')
      .insert({ id, space_id: spaceId, name: c.name, icon: c.icon, type: c.type, color: c.color })
      .select()
      .then(({ data, error }) => console.log('[addCategory] response:', { data, error }));
  }, [spaceId]);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    supabase.from('categories').delete().eq('id', id)
      .then(({ error }) => log('deleteCategory', error));
  }, []);

  return (
    <AppContext.Provider value={{
      wallets, categories, transactions, budgets, activeWalletId, loading,
      addTransaction, addWallet, updateWallet, deleteWallet,
      addBudget, updateBudget, deleteBudget,
      deleteTransaction, updateTransaction,
      setActiveWallet, addCategory, deleteCategory,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
