import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './PageModal.module.css';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function PageModal({ title, onClose, children }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <div className={styles.head}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
