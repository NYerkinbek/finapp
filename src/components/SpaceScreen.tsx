import { useState } from 'react';
import { useSpace } from '../contexts/SpaceContext';
import { useAuth } from '../contexts/AuthContext';
import styles from './SpaceScreen.module.css';

export function SpaceScreen() {
  const { createSpace, joinSpace } = useSpace();
  const { signOut, user } = useAuth();
  const [tab, setTab]       = useState<'create' | 'join'>('create');
  const [name, setName]     = useState('');
  const [code, setCode]     = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    const err = tab === 'create'
      ? await createSpace(name.trim())
      : await joinSpace(code.trim());
    if (err) setError(err);
    setLoading(false);
  };

  const valid = tab === 'create' ? name.trim().length > 0 : code.trim().length >= 5;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>◈ <span>FinUp</span></div>
        <div className={styles.userRow}>
          <span className={styles.userEmail}>{user?.email}</span>
          <button className={styles.logoutBtn} onClick={signOut}>Выйти</button>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'create' ? styles.tabActive : ''}`} onClick={() => { setTab('create'); setError(''); }}>
            Создать пространство
          </button>
          <button className={`${styles.tab} ${tab === 'join' ? styles.tabActive : ''}`} onClick={() => { setTab('join'); setError(''); }}>
            Вступить по коду
          </button>
        </div>

        {tab === 'create' ? (
          <div className={styles.field}>
            <label>Название пространства</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Например: Семья Нургазы" onKeyDown={e => e.key === 'Enter' && valid && submit()} />
            <p className={styles.hint}>После создания вы получите инвайт-код для других участников</p>
          </div>
        ) : (
          <div className={styles.field}>
            <label>Инвайт-код</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX" maxLength={6} className={styles.codeInput}
              onKeyDown={e => e.key === 'Enter' && valid && submit()} />
            <p className={styles.hint}>Попросите создателя пространства поделиться кодом из Настроек</p>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.btn} onClick={submit} disabled={loading || !valid}>
          {loading ? 'Подождите...' : tab === 'create' ? 'Создать' : 'Вступить'}
        </button>
      </div>
    </div>
  );
}
