import { Wallet, Category, Transaction, Budget } from './types';

export const DEFAULT_WALLETS: Wallet[] = [
  { id: 'w1', name: 'Основной счет', balance: 245000, currency: '₸', color: '#6366f1', icon: 'credit-card' },
  { id: 'w2', name: 'Наличные', balance: 35000, currency: '₸', color: '#10b981', icon: 'banknotes' },
  { id: 'w3', name: 'Накопления', balance: 820000, currency: '₸', color: '#f59e0b', icon: 'piggy-bank' },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Зарплата', icon: '💼', type: 'income', color: '#10b981' },
  { id: 'c2', name: 'Фриланс', icon: '💻', type: 'income', color: '#6366f1' },
  { id: 'c3', name: 'Подарки', icon: '🎁', type: 'income', color: '#f59e0b' },
  { id: 'c4', name: 'Инвестиции', icon: '📈', type: 'income', color: '#3b82f6' },
  { id: 'c5', name: 'Продукты', icon: '🛒', type: 'expense', color: '#ef4444' },
  { id: 'c6', name: 'Транспорт', icon: '🚗', type: 'expense', color: '#f97316' },
  { id: 'c7', name: 'Рестораны', icon: '🍽️', type: 'expense', color: '#ec4899' },
  { id: 'c8', name: 'Развлечения', icon: '🎮', type: 'expense', color: '#8b5cf6' },
  { id: 'c9', name: 'Коммунальные', icon: '🏠', type: 'expense', color: '#64748b' },
  { id: 'c10', name: 'Здоровье', icon: '💊', type: 'expense', color: '#06b6d4' },
  { id: 'c11', name: 'Одежда', icon: '👕', type: 'expense', color: '#d946ef' },
  { id: 'c12', name: 'Образование', icon: '📚', type: 'expense', color: '#0ea5e9' },
];

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: 't1', walletId: 'w1', categoryId: 'c1', type: 'income', amount: 350000, description: 'Зарплата за апрель', date: fmt(new Date(today.getFullYear(), today.getMonth(), 5)), inputMethod: 'notification' },
  { id: 't2', walletId: 'w1', categoryId: 'c5', type: 'expense', amount: 12400, description: 'Магнум Молл', date: fmt(new Date(today.getFullYear(), today.getMonth(), 6)), inputMethod: 'receipt' },
  { id: 't3', walletId: 'w2', categoryId: 'c6', type: 'expense', amount: 1500, description: 'Такси', date: fmt(new Date(today.getFullYear(), today.getMonth(), 7)), inputMethod: 'voice' },
  { id: 't4', walletId: 'w1', categoryId: 'c7', type: 'expense', amount: 8700, description: 'Ужин с друзьями', date: fmt(new Date(today.getFullYear(), today.getMonth(), 8)), inputMethod: 'manual' },
  { id: 't5', walletId: 'w1', categoryId: 'c2', type: 'income', amount: 85000, description: 'Проект для клиента', date: fmt(new Date(today.getFullYear(), today.getMonth(), 10)), inputMethod: 'manual' },
  { id: 't6', walletId: 'w1', categoryId: 'c9', type: 'expense', amount: 25000, description: 'Коммунальные услуги', date: fmt(new Date(today.getFullYear(), today.getMonth(), 12)), inputMethod: 'notification' },
  { id: 't7', walletId: 'w3', categoryId: 'c4', type: 'income', amount: 32000, description: 'Дивиденды', date: fmt(new Date(today.getFullYear(), today.getMonth(), 15)), inputMethod: 'notification' },
  { id: 't8', walletId: 'w2', categoryId: 'c5', type: 'expense', amount: 5600, description: 'Рынок', date: fmt(new Date(today.getFullYear(), today.getMonth(), 16)), inputMethod: 'manual' },
  { id: 't9', walletId: 'w1', categoryId: 'c8', type: 'expense', amount: 4200, description: 'Кинотеатр', date: fmt(new Date(today.getFullYear(), today.getMonth(), 18)), inputMethod: 'voice' },
  { id: 't10', walletId: 'w1', categoryId: 'c10', type: 'expense', amount: 9800, description: 'Лекарства', date: fmt(new Date(today.getFullYear(), today.getMonth(), 20)), inputMethod: 'receipt' },
];

export const DEFAULT_BUDGETS: Budget[] = [
  { id: 'b1', categoryId: 'c5', amount: 50000, spent: 18000, period: 'monthly', month: fmt(today).slice(0, 7) },
  { id: 'b2', categoryId: 'c7', amount: 30000, spent: 8700, period: 'monthly', month: fmt(today).slice(0, 7) },
  { id: 'b3', categoryId: 'c8', amount: 20000, spent: 4200, period: 'monthly', month: fmt(today).slice(0, 7) },
  { id: 'b4', categoryId: 'c6', amount: 15000, spent: 1500, period: 'monthly', month: fmt(today).slice(0, 7) },
  { id: 'b5', categoryId: 'c9', amount: 30000, spent: 25000, period: 'monthly', month: fmt(today).slice(0, 7) },
];
