import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check, Copy, Lock, Unlock } from 'lucide-react';
import { useApp } from '../store';
import { useSpace } from '../contexts/SpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { savePin, removePin } from './PinScreen';
import { Wallet, Category } from '../types';
import styles from './Settings.module.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];
const EMOJI_PRESETS = ['💼', '💻', '🎁', '📈', '🛒', '🚗', '🍽️', '🎮', '🏠', '💊', '👕', '📚', '✈️', '⚽', '🎵', '🐶'];

interface ConfirmState { message: string; onConfirm: () => void; }

export function Settings() {
  const { wallets, categories, transactions, addWallet, updateWallet, deleteWallet, addCategory, updateCategory, deleteCategory } = useApp();
  const { space, members, leaveSpace } = useSpace();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<'space' | 'wallets' | 'categories'>('space');

  // Confirm dialog
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const ask = (message: string, onConfirm: () => void) => setConfirm({ message, onConfirm });

  // Wallet form
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [editWalletId, setEditWalletId] = useState<string | null>(null);
  const [walletForm, setWalletForm] = useState({ name: '', balance: '', currency: '₸', color: COLORS[0] });

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: '', icon: '💼', type: 'expense' as 'income' | 'expense', color: COLORS[0] });

  // PIN
  const [hasPin, setHasPin] = useState(!!localStorage.getItem('finflow_pin'));
  const [pinMode, setPinMode] = useState<'setup' | 'change' | null>(null);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinError, setPinError] = useState('');

  const fmt = (n: number) => new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(n);

  // Wallet handlers
  const saveWallet = () => {
    if (!walletForm.name) return;
    if (editWalletId) {
      const w = wallets.find(x => x.id === editWalletId)!;
      updateWallet({ ...w, name: walletForm.name, balance: parseFloat(walletForm.balance) || w.balance, currency: walletForm.currency, color: walletForm.color });
    } else {
      if (!walletForm.balance) return;
      addWallet({ name: walletForm.name, balance: parseFloat(walletForm.balance), currency: walletForm.currency, color: walletForm.color, icon: 'wallet' });
    }
    setShowWalletForm(false); setEditWalletId(null);
    setWalletForm({ name: '', balance: '', currency: '₸', color: COLORS[0] });
  };

  const startEditWallet = (w: Wallet) => {
    setWalletForm({ name: w.name, balance: String(w.balance), currency: w.currency, color: w.color });
    setEditWalletId(w.id); setShowWalletForm(true);
  };

  const cancelWallet = () => {
    setShowWalletForm(false); setEditWalletId(null);
    setWalletForm({ name: '', balance: '', currency: '₸', color: COLORS[0] });
  };

  // Category handlers
  const saveCategory = () => {
    if (!catForm.name || !catForm.icon) return;
    if (editCatId) {
      updateCategory({ id: editCatId, ...catForm });
    } else {
      addCategory(catForm);
    }
    setShowCatForm(false);
    setEditCatId(null);
    setCatForm({ name: '', icon: '💼', type: 'expense', color: COLORS[0] });
  };

  const startEditCat = (c: Category) => {
    setCatForm({ name: c.name, icon: c.icon, type: c.type as 'income' | 'expense', color: c.color });
    setEditCatId(c.id);
    setShowCatForm(true);
  };

  // PIN handlers
  const submitPin = async () => {
    setPinError('');
    if (pin1.length !== 4 || !/^\d{4}$/.test(pin1)) { setPinError('PIN должен быть 4 цифры'); return; }
    if (pin1 !== pin2) { setPinError('PIN-коды не совпадают'); return; }
    await savePin(pin1);
    setHasPin(true); setPinMode(null); setPin1(''); setPin2('');
  };

  const handleRemovePin = () => {
    ask('Удалить PIN-код? Вход будет только по паролю.', () => {
      removePin(); setHasPin(false);
    });
  };

  const income = categories.filter(c => c.type === 'income');
  const expense = categories.filter(c => c.type === 'expense');

  return (
    <div className={styles.page}>

      {/* ── Confirm dialog ── */}
      {confirm && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <p className={styles.dialogMsg}>{confirm.message}</p>
            <div className={styles.dialogBtns}>
              <button className={styles.dialogCancel} onClick={() => setConfirm(null)}>Отмена</button>
              <button className={styles.dialogConfirm} onClick={() => { confirm.onConfirm(); setConfirm(null); }}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'space'      ? styles.tabActive : ''}`} onClick={() => setTab('space')}>Пространство</button>
        <button className={`${styles.tab} ${tab === 'wallets'    ? styles.tabActive : ''}`} onClick={() => setTab('wallets')}>Кошельки</button>
        <button className={`${styles.tab} ${tab === 'categories' ? styles.tabActive : ''}`} onClick={() => setTab('categories')}>Категории</button>
      </div>

      {/* ── Space tab ── */}
      {tab === 'space' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Пространство: {space?.name}</span>
          </div>

          <div className={styles.spaceCard}>
            <div className={styles.spaceRow}>
              <div>
                <div className={styles.spaceLabel}>Инвайт-код</div>
                <div className={styles.spaceCode}>{space?.inviteCode}</div>
                <div className={styles.spaceHint}>Поделитесь кодом — другие смогут вступить</div>
              </div>
              <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(space?.inviteCode ?? '')}>
                <Copy size={16} /> Скопировать
              </button>
            </div>
          </div>

          {/* PIN section */}
          <div className={styles.groupLabel}>Быстрый вход</div>
          <div className={styles.spaceCard}>
            {pinMode ? (
              <div className={styles.pinForm}>
                <div className={styles.pinFormRow}>
                  <div className={styles.field}>
                    <label>Новый PIN</label>
                    <input type="password" inputMode="numeric" maxLength={4} value={pin1}
                      onChange={e => setPin1(e.target.value.replace(/\D/g, ''))} placeholder="••••" className={styles.pinInput} />
                  </div>
                  <div className={styles.field}>
                    <label>Повторите PIN</label>
                    <input type="password" inputMode="numeric" maxLength={4} value={pin2}
                      onChange={e => setPin2(e.target.value.replace(/\D/g, ''))} placeholder="••••" className={styles.pinInput} />
                  </div>
                </div>
                {pinError && <div className={styles.pinError}>{pinError}</div>}
                <div className={styles.pinActions}>
                  <button className={styles.saveBtn} onClick={submitPin}><Check size={15} /> Сохранить</button>
                  <button className={styles.cancelPinBtn} onClick={() => { setPinMode(null); setPin1(''); setPin2(''); setPinError(''); }}><X size={15} /> Отмена</button>
                </div>
              </div>
            ) : (
              <div className={styles.pinRow}>
                <div className={styles.pinInfo}>
                  {hasPin ? <Lock size={16} color="var(--accent2)" /> : <Unlock size={16} color="var(--text2)" />}
                  <span className={styles.pinStatus}>{hasPin ? 'PIN установлен' : 'PIN не установлен'}</span>
                </div>
                <div className={styles.pinBtns}>
                  <button className={styles.copyBtn} onClick={() => setPinMode(hasPin ? 'change' : 'setup')}>
                    {hasPin ? 'Изменить' : 'Установить'}
                  </button>
                  {hasPin && (
                    <button className={styles.deleteBtn} onClick={handleRemovePin}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.groupLabel}>Участники ({members.length})</div>
          <div className={styles.list}>
            {members.map((m, i) => (
              <div key={i} className={styles.catRow}>
                <span className={styles.memberIcon}>👤</span>
                <span className={styles.rowName}>{m.email}</span>
                <span className={styles.memberRole}>{m.role === 'owner' ? 'Создатель' : 'Участник'}</span>
              </div>
            ))}
          </div>

          <div className={styles.dangerZone}>
            <button className={styles.dangerBtn} onClick={() => ask('Покинуть пространство? Вы потеряете доступ к данным.', leaveSpace)}>
              Покинуть пространство
            </button>
            <button className={styles.dangerBtn} onClick={() => ask(`Выйти из аккаунта (${user?.email})?`, signOut)}>
              Выйти из аккаунта ({user?.email})
            </button>
          </div>
        </div>
      )}

      {/* ── Wallets tab ── */}
      {tab === 'wallets' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Кошельки</span>
            <button className={styles.addBtn} onClick={() => { setShowWalletForm(true); setEditWalletId(null); }}>
              <Plus size={15} /> Добавить
            </button>
          </div>

          {showWalletForm && (
            <div className={styles.formCard}>
              <div className={styles.formHead}>
                <span>{editWalletId ? 'Редактировать кошелёк' : 'Новый кошелёк'}</span>
                <button onClick={cancelWallet}><X size={15} /></button>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label>Название</label>
                  <input value={walletForm.name} onChange={e => setWalletForm(p => ({ ...p, name: e.target.value }))} placeholder="Название" />
                </div>
                <div className={styles.field}>
                  <label>Сумма</label>
                  <input type="number" value={walletForm.balance} onChange={e => setWalletForm(p => ({ ...p, balance: e.target.value }))} placeholder="0" />
                </div>
                <div className={styles.field}>
                  <label>Валюта</label>
                  <select value={walletForm.currency} onChange={e => setWalletForm(p => ({ ...p, currency: e.target.value }))}>
                    <option>₸</option><option>₽</option><option>$</option><option>€</option>
                  </select>
                </div>
              </div>
              <div className={styles.colorRow}>
                <label>Цвет</label>
                <div className={styles.colors}>
                  {COLORS.map(c => (
                    <button key={c} className={`${styles.colorDot} ${walletForm.color === c ? styles.colorSelected : ''}`}
                      style={{ background: c }} onClick={() => setWalletForm(p => ({ ...p, color: c }))} />
                  ))}
                </div>
              </div>
              <button className={styles.saveBtn} onClick={saveWallet}><Check size={15} /> Сохранить</button>
            </div>
          )}

          <div className={styles.list}>
            {wallets.map(w => {
              const txCount = transactions.filter(t => t.walletId === w.id).length;
              return (
                <div key={w.id} className={styles.walletRow}>
                  <div className={styles.walletDot} style={{ background: w.color }} />
                  <div className={styles.walletInfo}>
                    <span className={styles.rowName}>{w.name}</span>
                    <span className={styles.rowMeta}>{txCount} операций</span>
                  </div>
                  <span className={styles.walletBalance} style={{ color: w.color }}>{w.currency} {fmt(w.balance)}</span>
                  <div className={styles.rowActions}>
                    <button onClick={() => startEditWallet(w)}><Edit2 size={14} /></button>
                    <button className={styles.deleteBtn} onClick={() => ask(`Удалить кошелёк «${w.name}»?`, () => deleteWallet(w.id))}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Categories tab ── */}
      {tab === 'categories' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Категории</span>
            <button className={styles.addBtn} onClick={() => setShowCatForm(v => !v)}>
              <Plus size={15} /> Добавить
            </button>
          </div>

          {showCatForm && (
            <div className={styles.formCard}>
              <div className={styles.formHead}>
                <span>{editCatId ? 'Редактировать категорию' : 'Новая категория'}</span>
                <button onClick={() => { setShowCatForm(false); setEditCatId(null); setCatForm({ name: '', icon: '💼', type: 'expense', color: COLORS[0] }); }}><X size={15} /></button>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label>Название</label>
                  <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="Название" />
                </div>
                <div className={styles.field}>
                  <label>Тип</label>
                  <select value={catForm.type} onChange={e => setCatForm(p => ({ ...p, type: e.target.value as 'income' | 'expense' }))}>
                    <option value="expense">Расход</option>
                    <option value="income">Доход</option>
                  </select>
                </div>
              </div>
              <div className={styles.field}>
                <label>Иконка</label>
                <div className={styles.emojiGrid}>
                  {EMOJI_PRESETS.map(e => (
                    <button key={e} className={`${styles.emojiBtn} ${catForm.icon === e ? styles.emojiSelected : ''}`}
                      onClick={() => setCatForm(p => ({ ...p, icon: e }))}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.colorRow}>
                <label>Цвет</label>
                <div className={styles.colors}>
                  {COLORS.map(c => (
                    <button key={c} className={`${styles.colorDot} ${catForm.color === c ? styles.colorSelected : ''}`}
                      style={{ background: c }} onClick={() => setCatForm(p => ({ ...p, color: c }))} />
                  ))}
                </div>
              </div>
              <button className={styles.saveBtn} onClick={saveCategory}><Check size={15} /> Сохранить</button>
            </div>
          )}

          {[{ label: 'Доходы', list: income }, { label: 'Расходы', list: expense }].map(({ label, list }) => (
            <div key={label}>
              <div className={styles.groupLabel}>{label}</div>
              <div className={styles.list}>
                {list.map(c => (
                  <div key={c.id} className={styles.catRow}>
                    <span className={styles.catIcon}>{c.icon}</span>
                    <span className={styles.rowName}>{c.name}</span>
                    <div className={styles.catDot} style={{ background: c.color }} />
                    <div className={styles.rowActions}>
                      <button onClick={() => startEditCat(c)}><Edit2 size={14} /></button>
                      <button className={styles.deleteBtn} onClick={() => ask(`Удалить категорию «${c.name}»?`, () => deleteCategory(c.id))}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {list.length === 0 && <div className={styles.empty}>Нет категорий</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
