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
import { PageModal } from './components/PageModal';
import { AuthScreen } from './components/AuthScreen';
import { SpaceScreen } from './components/SpaceScreen';
import { PinScreen } from './components/PinScreen';
import { Transaction } from './types';

type Page = 'dashboard' | 'transactions' | 'budgets' | 'analytics' | 'settings';
type Modal = 'budgets' | 'analytics' | 'settings' | null;

const modalTitles: Record<NonNullable<Modal>, string> = {
  budgets: 'Бюджет',
  analytics: 'Аналитика',
  settings: 'Настройки',
};

function AppInner() {
  const [page, setPage] = useState<Page>('dashboard');
  const [modal, setModal] = useState<Modal>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | undefined>(undefined);
  const [initialMethod, setInitialMethod] = useState<'manual' | 'voice'>('manual');

  const openAdd   = () => { setInitialMethod('manual'); setEditTransaction(undefined); setShowTxModal(true); };
  const openVoice = () => { setInitialMethod('voice');  setEditTransaction(undefined); setShowTxModal(true); };
  const openEdit  = (t: Transaction) => { setInitialMethod('manual'); setEditTransaction(t); setShowTxModal(true); };
  const closeAdd  = () => { setShowTxModal(false); setEditTransaction(undefined); };

  const navigate = (p: Page) => {
    if (p === 'budgets' || p === 'analytics' || p === 'settings') {
      setModal(p);
    } else {
      setPage(p);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      <Sidebar current={page} onChange={navigate} onAdd={openAdd} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {page === 'dashboard'    && <Dashboard onAddTransaction={openAdd} onAddVoice={openVoice} onNavigate={navigate} onEdit={openEdit} />}
        {page === 'transactions' && <Transactions onAdd={openAdd} onEdit={openEdit} />}
      </div>

      {/* Page modals */}
      {modal && (
        <PageModal title={modalTitles[modal]} onClose={() => setModal(null)}>
          {modal === 'budgets'   && <Budgets />}
          {modal === 'analytics' && <Analytics />}
          {modal === 'settings'  && <Settings />}
        </PageModal>
      )}

      {showTxModal && <AddTransactionModal onClose={closeAdd} editTransaction={editTransaction} initialMethod={initialMethod} />}
    </div>
  );
}

function AppRouter() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { space, loading: spaceLoading, loadSpace } = useSpace();
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const hasPin = !!localStorage.getItem('finflow_pin');

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
  if (hasPin && !pinUnlocked) return <PinScreen onVerified={() => setPinUnlocked(true)} onSignOut={() => { signOut(); setPinUnlocked(false); }} />;
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
