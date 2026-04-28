import { useState, useEffect } from 'react';
import { Delete } from 'lucide-react';
import styles from './PinScreen.module.css';

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface Props {
  onVerified: () => void;
  onSignOut: () => void;
}

export function PinScreen({ onVerified, onSignOut }: Props) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (digits.length === 4) verify();
  }, [digits]);

  const verify = async () => {
    const hash = await hashPin(digits);
    if (hash === localStorage.getItem('finflow_pin')) {
      onVerified();
    } else {
      setError(true);
      setDigits('');
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 5) { localStorage.removeItem('finflow_pin'); onSignOut(); }
      setTimeout(() => setError(false), 600);
    }
  };

  const press = (d: string) => { if (digits.length < 4) setDigits(p => p + d); };
  const del   = () => setDigits(p => p.slice(0, -1));

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>◈ <span>FinFlow</span></div>
        <div className={styles.hint}>Введите PIN-код</div>

        <div className={`${styles.dots} ${error ? styles.shake : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`${styles.dot} ${i < digits.length ? styles.filled : ''}`} />
          ))}
        </div>

        {attempts > 0 && (
          <div className={styles.attempts}>Неверный PIN. Осталось попыток: {5 - attempts}</div>
        )}

        <div className={styles.pad}>
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} className={styles.key} onClick={() => press(d)}>{d}</button>
          ))}
          <div />
          <button className={styles.key} onClick={() => press('0')}>0</button>
          <button className={styles.key} onClick={del}><Delete size={18} /></button>
        </div>

        <button className={styles.forgot} onClick={onSignOut}>
          Войти по паролю
        </button>
      </div>
    </div>
  );
}

export async function checkPin(pin: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === localStorage.getItem('finflow_pin');
}

export async function savePin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  localStorage.setItem('finflow_pin', hash);
}

export function removePin(): void {
  localStorage.removeItem('finflow_pin');
}
