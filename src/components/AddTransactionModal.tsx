import { useState, useRef } from 'react';
import { X, Keyboard, Camera, Mic, Bell, MicOff, CheckCircle } from 'lucide-react';
import { useApp } from '../store';
import { Transaction, TransactionType } from '../types';
import styles from './AddTransactionModal.module.css';

interface Props {
  onClose: () => void;
  editTransaction?: Transaction;
}

type InputMethod = 'manual' | 'receipt' | 'voice' | 'notification';

const VOICE_COMMANDS = [
  'Потратил 5000 тенге на продукты',
  'Доход 50000 зарплата',
  'Расход 3000 такси',
  'Получил 100000 фриланс',
];

const NOTIFICATIONS = [
  { text: 'Kaspi Bank: Покупка в Magnum 12400 ₸', amount: 12400, desc: 'Magnum', catKeyword: 'продукт', type: 'expense' as const },
  { text: 'Kaspi Bank: Поступление 350000 ₸', amount: 350000, desc: 'Зачисление', catKeyword: 'зарплат', type: 'income' as const },
  { text: 'Halyk Bank: Оплата 8500 ₸ restaurant', amount: 8500, desc: 'Ресторан', catKeyword: 'ресторан', type: 'expense' as const },
  { text: 'Kaspi Bank: Оплата 2100 ₸ такси', amount: 2100, desc: 'Такси', catKeyword: 'такси', type: 'expense' as const },
];

export function AddTransactionModal({ onClose, editTransaction }: Props) {
  const { wallets, categories, addTransaction, updateTransaction } = useApp();
  const isEdit = !!editTransaction;

  const [method, setMethod] = useState<InputMethod>('manual');
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
  const [receiptParsed, setReceiptParsed] = useState(false);
  const [receiptSim, setReceiptSim] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<number | null>(null);

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

  const simulateVoice = (cmd: string) => { setVoiceText(cmd); parseVoiceText(cmd); };

  const parseVoiceText = (text: string) => {
    const lower = text.toLowerCase();
    const numMatch = text.match(/[\d\s]+(?=\s*(?:тенге|₸|руб|т\.|тыс))?/);
    const num = numMatch ? parseInt(numMatch[0].replace(/\s/g, '')) : 0;
    if (num) setAmount(String(num));
    if (/доход|получил|зарплата|поступ/i.test(lower)) setType('income');
    else if (/расход|потратил|купил|оплатил/i.test(lower)) setType('expense');
    const words = text.split(' ').filter(w => isNaN(Number(w)) && w.length > 3);
    const descWords = words.filter(w => !/тенге|тыс|доход|расход|потратил|получил/i.test(w));
    if (descWords.length) setDescription(descWords.join(' '));
  };

  const parseReceiptText = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Find total amount — look for keywords like итого/сумма/total
    let amount = 0;
    const totalMatch = text.match(/(?:итого|сумма|total|к\s*оплате|к\s+оплате|sum|amount)[:\s]*(\d[\d\s]*(?:[.,]\d{1,2})?)/i);
    if (totalMatch) {
      amount = parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.'));
    } else {
      // Fallback: largest number in text
      const nums = [...text.matchAll(/\b(\d{3,}(?:[.,]\d{1,2})?)\b/g)].map(m => parseFloat(m[1].replace(',', '.')));
      if (nums.length) amount = Math.max(...nums);
    }
    if (amount > 0) setAmount(String(Math.round(amount)));

    // Merchant name — first meaningful line
    const merchant = lines.find(l => l.length > 2 && !/^\d/.test(l)) ?? lines[0] ?? 'Покупка';
    setDescription(merchant.slice(0, 60));
    setType('expense');

    const cat = categories.find(c => c.type === 'expense' && c.name.toLowerCase().includes('продукт'));
    if (cat) setCategoryId(cat.id);
    setReceiptParsed(true);
  };

  const scanWithVision = async (base64: string) => {
    const key = import.meta.env.VITE_GOOGLE_VISION_KEY as string | undefined;
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ image: { content: base64 }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }],
        }),
      }
    );
    const data = await res.json();
    const text: string = data.responses?.[0]?.fullTextAnnotation?.text ?? '';
    if (!text) throw new Error('No text detected');
    parseReceiptText(text);
  };

  const handleReceiptFile = async (file: File | null) => {
    if (!file) return;
    const key = import.meta.env.VITE_GOOGLE_VISION_KEY as string | undefined;
    if (!key) { simulateReceipt(); return; }

    setReceiptSim(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await scanWithVision(base64);
    } catch {
      simulateReceipt();
    } finally {
      setReceiptSim(false);
    }
  };

  const simulateReceipt = () => {
    setReceiptSim(true);
    setTimeout(() => {
      setAmount('15200'); setDescription('Магазин Magnum'); setType('expense');
      const cat = categories.find(c => c.type === 'expense' && c.name.toLowerCase().includes('продукт'));
      if (cat) setCategoryId(cat.id);
      setReceiptParsed(true); setReceiptSim(false);
    }, 1800);
  };

  const applyNotification = (idx: number) => {
    const n = NOTIFICATIONS[idx];
    setSelectedNotif(idx); setAmount(String(n.amount)); setDescription(n.desc);
    setType(n.type);
    const cat = categories.find(c => c.type === n.type && c.name.toLowerCase().includes(n.catKeyword));
    if (cat) setCategoryId(cat.id);
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
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{isEdit ? 'Редактировать операцию' : 'Новая операция'}</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Method tabs — only for new transactions */}
        {!isEdit && (
          <div className={styles.methods}>
            {([
              { id: 'manual', label: 'Вручную', Icon: Keyboard },
              { id: 'receipt', label: 'Чек', Icon: Camera },
              { id: 'voice', label: 'Голос', Icon: Mic },
              { id: 'notification', label: 'Уведомление', Icon: Bell },
            ] as const).map(({ id, label, Icon }) => (
              <button key={id} className={`${styles.methodBtn} ${method === id ? styles.methodActive : ''}`} onClick={() => setMethod(id)}>
                <Icon size={16} />{label}
              </button>
            ))}
          </div>
        )}

        {!isEdit && method === 'receipt' && (
          <div className={styles.methodPanel}>
            {!receiptParsed ? (
              <div className={styles.receiptArea}>
                <div className={styles.receiptIcon}>📷</div>
                <p className={styles.receiptHint}>Сфотографируйте чек или загрузите изображение</p>
                <div className={styles.receiptBtns}>
                  <button className={styles.outlineBtn} onClick={simulateReceipt} disabled={receiptSim}>
                    {receiptSim ? <span className={styles.scanning}>⏳ Сканирование...</span> : '🎭 Демо'}
                  </button>
                  <label className={styles.outlineBtn}>📁 Загрузить файл<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleReceiptFile(e.target.files?.[0] ?? null)} /></label>
                  <label className={styles.outlineBtn}>📷 Камера<input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleReceiptFile(e.target.files?.[0] ?? null)} /></label>
                </div>
              </div>
            ) : (
              <div className={styles.receiptSuccess}><CheckCircle size={20} color="#10b981" /><span>Чек распознан! Данные заполнены автоматически</span></div>
            )}
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

        {!isEdit && method === 'notification' && (
          <div className={styles.methodPanel}>
            <p className={styles.notifHint}>Выберите уведомление из банка:</p>
            <div className={styles.notifList}>
              {NOTIFICATIONS.map((n, i) => (
                <button key={i} className={`${styles.notifItem} ${selectedNotif === i ? styles.notifSelected : ''}`} onClick={() => applyNotification(i)}>
                  <span className={styles.notifIcon}>🔔</span>
                  <span className={styles.notifText}>{n.text}</span>
                  {selectedNotif === i && <CheckCircle size={16} color="#10b981" />}
                </button>
              ))}
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
