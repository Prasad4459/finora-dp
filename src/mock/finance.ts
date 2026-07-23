import {
  Home,
  Zap,
  Wifi,
  CreditCard,
  Smartphone,
  ShieldCheck,
  Tv,
  Landmark,
  Wallet,
  Banknote,
  TrendingUp,
  Plane,
  GraduationCap,
  Car,
  PiggyBank,
} from "lucide-react";
import type {
  Account,
  Asset,
  Bill,
  Budget,
  Expense,
  Goal,
  Income,
  Liability,
} from "@/types/finance";

export const seedAccounts: Account[] = [
  { id: 1, name: "Salary Account", bank: "HDFC Bank", type: "Savings", balance: 142500, icon: Landmark, color: "bg-blue-500/10 text-blue-600", updated: "2026-07-02" },
  { id: 2, name: "Joint Savings", bank: "SBI", type: "Savings", balance: 68200, icon: Landmark, color: "bg-emerald-500/10 text-emerald-600", updated: "2026-07-01" },
  { id: 3, name: "Everyday Spending", bank: "ICICI Bank", type: "Current", balance: 21400, icon: Wallet, color: "bg-orange-500/10 text-orange-600", updated: "2026-07-02" },
  { id: 4, name: "GPay Wallet", bank: "Google Pay", type: "UPI Wallet", balance: 3800, icon: Smartphone, color: "bg-fuchsia-500/10 text-fuchsia-600", updated: "2026-07-02" },
  { id: 5, name: "Cash on hand", bank: "—", type: "Cash", balance: 9200, icon: Banknote, color: "bg-amber-500/10 text-amber-600", updated: "2026-06-30" },
  { id: 6, name: "Amazon Pay ICICI CC", bank: "ICICI Bank", type: "Credit Card", balance: -12500, icon: CreditCard, color: "bg-rose-500/10 text-rose-600", updated: "2026-07-02" },
  { id: 7, name: "Zerodha", bank: "Zerodha", type: "Investment Account", balance: 484000, icon: TrendingUp, color: "bg-violet-500/10 text-violet-600", updated: "2026-07-01" },
];

export const seedIncomes: Income[] = [
  { id: 1, date: "2026-07-01", source: "Infosys Ltd.", category: "Salary", account: "HDFC •• 4021", amount: 85000, recurring: true },
  { id: 2, date: "2026-06-28", source: "Freelance — Acme Co.", category: "Freelancing", account: "ICICI •• 1009", amount: 22000, recurring: false },
  { id: 3, date: "2026-06-20", source: "SBI Savings Interest", category: "Interest", account: "SBI •• 8891", amount: 1240, recurring: true },
  { id: 4, date: "2026-06-15", source: "TCS Dividend", category: "Dividend", account: "Zerodha", amount: 3600, recurring: false },
  { id: 5, date: "2026-06-10", source: "Amazon Cashback", category: "Cashback", account: "HDFC •• 4021", amount: 450, recurring: false },
  { id: 6, date: "2026-06-05", source: "PG rent — Koramangala", category: "Rental Income", account: "Axis •• 3320", amount: 18000, recurring: true },
  { id: 7, date: "2026-06-01", source: "Infosys Ltd.", category: "Salary", account: "HDFC •• 4021", amount: 85000, recurring: true },
];

export const seedExpenses: Expense[] = [
  { id: 1, date: "2026-07-02", merchant: "BigBasket", category: "Groceries", account: "HDFC •• 4021", method: "UPI", amount: 2450 },
  { id: 2, date: "2026-07-01", merchant: "House Rent — Landlord", category: "Rent", account: "SBI •• 8891", method: "Bank transfer", amount: 18000 },
  { id: 3, date: "2026-06-30", merchant: "Ola Cabs", category: "Travel", account: "ICICI •• 1009", method: "UPI", amount: 320 },
  { id: 4, date: "2026-06-29", merchant: "Netflix", category: "Entertainment", account: "HDFC •• 4021", method: "Card", amount: 649 },
  { id: 5, date: "2026-06-29", merchant: "Swiggy", category: "Food", account: "Axis •• 3320", method: "UPI", amount: 540 },
  { id: 6, date: "2026-06-28", merchant: "Apollo Pharmacy", category: "Medical", account: "HDFC •• 4021", method: "UPI", amount: 820 },
  { id: 7, date: "2026-06-27", merchant: "Indian Oil", category: "Fuel", account: "ICICI •• 1009", method: "Card", amount: 2200 },
  { id: 8, date: "2026-06-25", merchant: "Myntra", category: "Shopping", account: "HDFC •• 4021", method: "Card", amount: 3200 },
];

export const seedAssets: Asset[] = [
  { id: 1, name: "SBI Savings", type: "Bank", purchase: 200000, current: 200000, date: "2022-04-01" },
  { id: 2, name: "HDFC 1-Year FD", type: "FD", purchase: 300000, current: 321000, date: "2025-07-10" },
  { id: 3, name: "Sovereign Gold Bond", type: "Gold", purchase: 150000, current: 187000, date: "2023-09-15" },
  { id: 4, name: "Nifty 50 Index Fund", type: "Mutual Funds", purchase: 400000, current: 512000, date: "2022-06-20" },
  { id: 5, name: "TCS Shares", type: "Stocks", purchase: 120000, current: 148000, date: "2024-02-11" },
  { id: 6, name: "PPF Account", type: "PPF", purchase: 250000, current: 278000, date: "2020-04-01" },
  { id: 7, name: "EPF", type: "EPF", purchase: 320000, current: 356000, date: "2021-05-01" },
  { id: 8, name: "NPS Tier-1", type: "NPS", purchase: 80000, current: 92000, date: "2023-04-01" },
  { id: 9, name: "2BHK — Whitefield", type: "Property", purchase: 6500000, current: 7800000, date: "2019-11-20" },
  { id: 10, name: "Honda City", type: "Vehicle", purchase: 1200000, current: 780000, date: "2021-01-15" },
  { id: 11, name: "Bitcoin", type: "Crypto", purchase: 50000, current: 72000, date: "2024-08-01" },
];

export const seedLiabilities: Liability[] = [
  { id: 1, name: "SBI Home Loan", type: "Home Loan", balance: 3850000, rate: 8.5, emi: 32500, due: "2026-08-01", remaining: 168, status: "Active" },
  { id: 2, name: "HDFC Car Loan", type: "Car Loan", balance: 420000, rate: 9.2, emi: 12800, due: "2026-07-15", remaining: 36, status: "Active" },
  { id: 3, name: "Axis Education Loan", type: "Education Loan", balance: 180000, rate: 10.5, emi: 8500, due: "2026-07-20", remaining: 24, status: "Active" },
  { id: 4, name: "Personal Loan — Bajaj", type: "Personal Loan", balance: 90000, rate: 13.0, emi: 7500, due: "2026-07-10", remaining: 14, status: "Active" },
  { id: 5, name: "HDFC Credit Card", type: "Credit Card", balance: 12500, rate: 36.0, emi: 0, due: "2026-07-15", remaining: 1, status: "Due" },
  { id: 6, name: "Loan from Dad", type: "Borrowed Money", balance: 50000, rate: 0, emi: 5000, due: "2026-07-30", remaining: 10, status: "Active" },
];

export const seedGoals: Goal[] = [
  { id: 1, name: "Emergency Fund", icon: PiggyBank, target: 600000, current: 425000, date: "2027-03-31" },
  { id: 2, name: "Europe Trip", icon: Plane, target: 350000, current: 128000, date: "2026-12-15" },
  { id: 3, name: "Home Down Payment", icon: Home, target: 2500000, current: 850000, date: "2028-06-01" },
  { id: 4, name: "New Car (Creta)", icon: Car, target: 1500000, current: 420000, date: "2027-09-20" },
  { id: 5, name: "MBA Fund", icon: GraduationCap, target: 1800000, current: 260000, date: "2028-07-01" },
];

export const seedBudgets: Budget[] = [
  { name: "Groceries", spent: 8500, budget: 10000 },
  { name: "Rent", spent: 18000, budget: 18000 },
  { name: "Fuel", spent: 4200, budget: 4000 },
  { name: "Food & Dining", spent: 5600, budget: 5000 },
  { name: "Entertainment", spent: 2800, budget: 3500 },
  { name: "Shopping", spent: 3200, budget: 5000 },
  { name: "Utilities", spent: 3800, budget: 4500 },
  { name: "Transport", spent: 1900, budget: 3000 },
];

export const seedBills: Bill[] = [
  { id: 1, name: "House Rent", category: "Rent", due: "05/07/2026", amount: 18000, icon: Home, status: "Upcoming" },
  { id: 2, name: "BESCOM Electricity", category: "Utilities", due: "08/07/2026", amount: 2450, icon: Zap, status: "Upcoming" },
  { id: 3, name: "Jio Fiber", category: "Internet", due: "12/07/2026", amount: 999, icon: Wifi, status: "Upcoming" },
  { id: 4, name: "HDFC Credit Card", category: "Credit Card", due: "15/07/2026", amount: 12500, icon: CreditCard, status: "Upcoming" },
  { id: 5, name: "Airtel Postpaid", category: "Mobile", due: "18/07/2026", amount: 599, icon: Smartphone, status: "Upcoming" },
  { id: 6, name: "HDFC ERGO Health", category: "Insurance", due: "22/07/2026", amount: 14500, icon: ShieldCheck, status: "Upcoming" },
  { id: 7, name: "Netflix + Prime", category: "Subscriptions", due: "25/07/2026", amount: 1148, icon: Tv, status: "Upcoming" },
  { id: 8, name: "SBI Home Loan EMI", category: "EMI", due: "01/08/2026", amount: 32500, icon: Home, status: "Scheduled" },
];