import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SpaceProvider, useSpace } from './contexts/SpaceContext';
import { AppProvider } from './store';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Budgets } from './components/Budgets';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { AddTransactionModal } from './components/AddTransactionModal';
import { AuthScreen } from './components/AuthScreen';
import { SpaceScreen } from './components/SpaceScreen';
import { Transaction } from './types';

type Page = 'dashboard' | 'transactions' | 'budgets' | 'analytics' | 'settings';

function AppInner() {
  const [page, setPage] = useState<Page>('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | undefined>(undefined);

  const openAdd  = () => { setEditTransaction(undefined); setShowModal(true); };
  const openEdit = (t: Transaction) => { setEditTransaction(t); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditTransaction(undefined); };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      <Sidebar current={page} onChange={setPage} onAdd={openAdd} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {page === 'dashboard'    && <Dashboard onAddTransaction={openAdd} />}
        {page === 'transactions' && <Transactions onAdd={openAdd} onEdit={openEdit} />}
        {page === 'budgets'      && <Budgets />}
        {page === 'analytics'    && <Analytics />}
        {page === 'settings'     && <Settings />}
      </div>
      {showModal && <AddTransactionModal onClose={closeModal} editTransaction={editTransaction} />}
    </div>
  );
}

function AppRouter() {
  const { user, loading: authLoading } = useAuth();
  const { space, loading: spaceLoading, loadSpace } = useSpace();

  useEffect(() => {
    if (user) loadSpace();
  }, [user]);

  if (authLoading || spaceLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--bg)', color: 'var(--text2)', fontSize: 14 }}>
        Загрузка...
      </div>
    );
  }
  if (!user)  return <AuthScreen />;
  if (!space) return <SpaceScreen />;

  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SpaceProvider>
        <AppRouter />
      </SpaceProvider>
    </AuthProvider>
  );
}
