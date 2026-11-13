import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './AuthScreen.module.css';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

const titles: Record<Mode, string> = {
  login: 'Вход',
  register: 'Регистрация',
  forgot: 'Сброс пароля',
  reset: 'Новый пароль',
};

const buttonLabels: Record<Mode, string> = {
  login: 'Войти',
  register: 'Создать аккаунт',
  forgot: 'Отправить ссылку',
  reset: 'Сохранить пароль',
};

export function AuthScreen({ initialMode = 'login' }: { initialMode?: Mode }) {
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();
  const [mode, setMode]       = useState<Mode>(initialMode);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');
  const [loading, setLoading] = useState(false);

  const needEmail    = mode !== 'reset';
  const needPassword = mode !== 'forgot';
  const canSubmit    = (!needEmail || !!email) && (!needPassword || !!password);

  const switchMode = (m: Mode) => { setMode(m); setError(''); setInfo(''); };

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setInfo('');
    let err: string | null = null;
    if (mode === 'login')    err = await signIn(email, password);
    if (mode === 'register') err = await signUp(email, password);
    if (mode === 'forgot') {
      err = await resetPassword(email);
      if (!err) setInfo('Если аккаунт с этим email существует, на почту придёт ссылка для сброса пароля.');
    }
    if (mode === 'reset') {
      if (password.length < 8) err = 'Пароль должен быть не короче 8 символов';
      else err = await updatePassword(password);
    }
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>◈ <span>FinUp</span></div>
        <h1 className={styles.title}>{titles[mode]}</h1>

        {mode === 'forgot' && (
          <p className={styles.hint}>Введите email — мы отправим ссылку для установки нового пароля.</p>
        )}

        <div className={styles.fields}>
          {needEmail && (
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
          )}
          {needPassword && (
            <div className={styles.field}>
              <label>{mode === 'reset' ? 'Новый пароль' : 'Пароль'}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Минимум 8 символов" onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
          )}
        </div>

        {mode === 'login' && (
          <button className={styles.forgot} onClick={() => switchMode('forgot')}>Забыли пароль?</button>
        )}

        {error && <div className={styles.error}>{error}</div>}
        {info && <div className={styles.info}>{info}</div>}

        <button className={styles.btn} onClick={submit} disabled={loading || !canSubmit}>
          {loading ? 'Подождите...' : buttonLabels[mode]}
        </button>

        {mode === 'login' && (
          <button className={styles.toggle} onClick={() => switchMode('register')}>Нет аккаунта? Зарегистрироваться</button>
        )}
        {(mode === 'register' || mode === 'forgot') && (
          <button className={styles.toggle} onClick={() => switchMode('login')}>
            {mode === 'register' ? 'Уже есть аккаунт? Войти' : 'Вернуться ко входу'}
          </button>
        )}
      </div>
    </div>
  );
}
