import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './AuthScreen.module.css';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode]       = useState<'login' | 'register'>('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const err = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>◈ <span>FinUp</span></div>
        <h1 className={styles.title}>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
          <div className={styles.field}>
            <label>Пароль</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Минимум 6 символов" onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.btn} onClick={submit} disabled={loading || !email || !password}>
          {loading ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>

        <button className={styles.toggle} onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </div>
  );
}
