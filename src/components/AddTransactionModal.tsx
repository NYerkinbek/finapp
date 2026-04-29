import { useState, useRef } from 'react';
import { X, Keyboard, Mic, MicOff } from 'lucide-react';
import { useApp } from '../store';
import { Transaction, TransactionType } from '../types';
import styles from './AddTransactionModal.module.css';

interface Props {
  onClose: () => void;
  editTransaction?: Transaction;
  initialMethod?: InputMethod;
}

type InputMethod = 'manual' | 'voice';

const VOICE_COMMANDS = [
  'Потратил 5000 тенге на продукты',
  'Доход 50000 зарплата',
  'Расход 3000 такси',
  'Получил 100000 фриланс',
];


export function AddTransactionModal({ onClose, editTransaction, initialMethod }: Props) {
  const { wallets, categories, addTransaction, updateTransaction } = useApp();
  const isEdit = !!editTransaction;

  const [method, setMethod] = useState<InputMethod>(initialMethod ?? 'manual');
  const [type, setType] = useState<TransactionType>(editTransaction?.type ?? 'expense');
  const [amount, setAmount] = useState(editTransaction ? String(editTransaction.amount) : '');
  const [description, setDescription] = useState(editTransaction?.description ?? '');
  const [walletId, setWalletId] = useState(editTransaction?.walletId ?? wallets[0]?.id ?? '');
  const [toWalletId, setToWalletId] = useState(
    editTransaction?.toWalletId ?? wallets.find(w => w.id !== (editTransaction?.walletId ?? wallets[0]?.id))?.id ?? ''
  );
  const [categoryId, setCategoryId] = useState(editTransaction?.categoryId ?? '');
  const [date, setDate] = useState(editTransaction?.date ?? new Date().toISOString().split('T')[0]);

  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const filteredCats = categories.filter(c => c.type === type);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceText('⚠️ Голосовой ввод не поддерживается в этом браузере'); return; }
    const recognition = new SR();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => { const text = e.results[0][0].transcript; setVoiceText(text); parseVoiceText(text); };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => { setIsListening(false); setVoiceText('⚠️ Ошибка распознавания'); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoice = () => { recognitionRef.current?.stop(); setIsListening(false); };

  const handleClose = () => { stopVoice(); onClose(); };

  const simulateVoice = (cmd: string) => { setVoiceText(cmd); parseVoiceText(cmd); };

  const parseVoiceText = (text: string) => {
    const lower = text.toLowerCase();

    // Amount: find all digit sequences, take the largest (usually the sum)
    const allNums = text.match(/\d+/g);
    const num = allNums ? Math.max(...allNums.map(Number)) : 0;
    if (num) setAmount(String(num));

    // Type
    let txType: TransactionType = type;
    if (/доход|получил|зарплата|поступ|заработал|зачислен/i.test(lower)) txType = 'income';
    else if (/расход|потратил|купил|оплатил|заплатил|списан/i.test(lower)) txType = 'expense';
    setType(txType);

    // Category — search by name keywords in the text
    const matched = categories
      .filter(c => c.type === txType)
      .find(c =>
        lower.includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w))
      );
    if (matched) setCategoryId(matched.id);

    // Description — non-numeric words excluding service words
    const stopWords = /^(тенге|тыс|доход|расход|потратил|получил|купил|оплатил|заплатил|зарплата|руб|на|за|в|из|от|до)$/i;
    const descWords = text.split(' ').filter(w => isNaN(Number(w)) && w.length > 2 && !stopWords.test(w));
    if (descWords.length) setDescription(descWords.join(' '));
  };

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (!num) return;
    if (type === 'transfer') {
      if (!walletId || !toWalletId || walletId === toWalletId) return;
      const payload = { type: 'transfer' as const, amount: num, description: description || 'Перевод', walletId, toWalletId, categoryId: '', date, inputMethod: 'manual' as const };
      isEdit ? updateTransaction({ ...editTransaction!, ...payload }) : addTransaction(payload);
    } else {
      if (!walletId || !categoryId) return;
      const payload = { type, amount: num, description, walletId, categoryId, date, inputMethod: isEdit ? 'manual' as const : method };
      isEdit ? updateTransaction({ ...editTransaction!, ...payload, toWalletId: undefined }) : addTransaction(payload);
    }
    onClose();
  };

  const isTransfer = type === 'transfer';
  const submitDisabled = isTransfer
    ? !amount || !toWalletId || walletId === toWalletId
    : !amount || !walletId || !categoryId;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{isEdit ? 'Редактировать операцию' : 'Новая операция'}</h2>
          <button className={styles.closeBtn} onClick={handleClose}><X size={18} /></button>
        </div>

        {/* Method tabs — only for new transactions */}
        {!isEdit && (
          <div className={styles.methods}>
            {([
              { id: 'manual', label: 'Вручную', Icon: Keyboard },
              { id: 'voice', label: 'Голос', Icon: Mic },
            ] as const).map(({ id, label, Icon }) => (
              <button key={id} className={`${styles.methodBtn} ${method === id ? styles.methodActive : ''}`} onClick={() => setMethod(id)}>
                <Icon size={16} />{label}
              </button>
            ))}
          </div>
        )}

        {!isEdit && method === 'voice' && (
          <div className={styles.methodPanel}>
            <div className={styles.voiceArea}>
              <button className={`${styles.micBtn} ${isListening ? styles.micActive : ''}`} onClick={isListening ? stopVoice : startVoice}>
                {isListening ? <MicOff size={28} /> : <Mic size={28} />}
              </button>
              <p className={styles.voiceStatus}>{isListening ? '🔴 Слушаю...' : voiceText || 'Нажмите на микрофон и произнесите операцию'}</p>
              {voiceText && <div className={styles.voiceResult}>"{voiceText}"</div>}
            </div>
            <div className={styles.voiceExamples}>
              <p className={styles.examplesLabel}>Примеры команд:</p>
              {VOICE_COMMANDS.map((cmd, i) => <button key={i} className={styles.exampleCmd} onClick={() => simulateVoice(cmd)}>{cmd}</button>)}
            </div>
          </div>
        )}

        <div className={styles.form}>
          {/* Type toggle */}
          <div className={styles.typeToggle}>
            <button className={`${styles.typeBtn} ${type === 'expense' ? styles.typeBtnRed : ''}`} onClick={() => { setType('expense'); setCategoryId(''); }}>− Расход</button>
            <button className={`${styles.typeBtn} ${type === 'income' ? styles.typeBtnGreen : ''}`} onClick={() => { setType('income'); setCategoryId(''); }}>+ Доход</button>
            <button className={`${styles.typeBtn} ${type === 'transfer' ? styles.typeBtnTransfer : ''}`} onClick={() => { setType('transfer'); setCategoryId(''); }}>⇄ Перевод</button>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Сумма (₸)</label>
              <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className={styles.amountInput} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Дата</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Описание</label>
            <input type="text" placeholder={isTransfer ? 'Перевод' : 'Введите описание...'} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {isTransfer ? (
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Из кошелька</label>
                <select value={walletId} onChange={e => setWalletId(e.target.value)}>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>В кошелёк</label>
                <select value={toWalletId} onChange={e => setToWalletId(e.target.value)}>
                  <option value="">Выберите...</option>
                  {wallets.filter(w => w.id !== walletId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Кошелек</label>
                <select value={walletId} onChange={e => setWalletId(e.target.value)}>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Категория</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                  <option value="">Выберите...</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitDisabled}>
            {isEdit ? 'Сохранить изменения' : 'Сохранить операцию'}
          </button>
        </div>
      </div>
    </div>
  );
}
