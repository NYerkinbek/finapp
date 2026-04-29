import { LayoutDashboard, ArrowLeftRight, PieChart, Settings, TrendingUp, Plus } from 'lucide-react';
import { NavTarget } from '../App';
import styles from './Sidebar.module.css';

interface Props {
  current: NavTarget;
  onChange: (p: NavTarget) => void;
  onAdd?: () => void;
}

const nav = [
  { id: 'dashboard',    label: 'Главная',    Icon: LayoutDashboard },
  { id: 'transactions', label: 'Операции',   Icon: ArrowLeftRight  },
  { id: 'budgets',      label: 'Бюджет',     Icon: PieChart        },
  { id: 'analytics',   label: 'Аналитика',  Icon: TrendingUp      },
  { id: 'settings',    label: 'Настройки',  Icon: Settings        },
] as const;

// Mobile bottom nav keeps 4 items (Аналитика не критична на мобиле)
const mobileNav = [nav[0], nav[1], nav[2], nav[4]];

export function Sidebar({ current, onChange, onAdd }: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>FinUp</span>
        </div>
        <nav className={styles.nav}>
          {nav.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`${styles.navItem} ${current === id ? styles.active : ''}`}
              onClick={() => onChange(id as NavTarget)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom nav — 4 items + FAB */}
      <nav className={styles.bottomNav}>
        {mobileNav.slice(0, 2).map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`${styles.bottomItem} ${current === id ? styles.bottomActive : ''}`}
            onClick={() => onChange(id as NavTarget)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}

        <button className={styles.fab} onClick={onAdd}>
          <Plus size={22} />
        </button>

        {mobileNav.slice(2).map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`${styles.bottomItem} ${current === id ? styles.bottomActive : ''}`}
            onClick={() => onChange(id as NavTarget)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
