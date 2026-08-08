import {
  Home,
  Zap,
  Wifi,
  CreditCard,
  Smartphone,
  ShieldCheck,
  Tv,
  Receipt,
  Landmark,
  Wallet,
  Banknote,
  TrendingUp,
  Plane,
  GraduationCap,
  Car,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";

export const ACCOUNT_TYPES = [
  "Savings",
  "Current",
  "Cash",
  "UPI Wallet",
  "Credit Card",
  "Investment Account",
  "Loan Account",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Bonus",
  "Freelancing",
  "Business",
  "Rental Income",
  "Interest",
  "Dividend",
  "Cashback",
  "Refund",
  "Gift",
] as const;

export const EXPENSE_CATEGORIES = [
  "Groceries",
  "Rent",
  "Electricity",
  "Water",
  "Internet",
  "Mobile Recharge",
  "Fuel",
  "Food",
  "Shopping",
  "Medical",
  "Education",
  "Entertainment",
  "Travel",
  "Insurance",
  "Investment",
  "EMI",
  "Others",
] as const;

export const PAYMENT_METHODS = ["UPI", "Card", "Cash", "Bank transfer", "Netbanking"] as const;

export const ASSET_TYPES = [
  "Cash",
  "Bank",
  "FD",
  "RD",
  "Gold",
  "Silver",
  "Stocks",
  "Mutual Funds",
  "ETF",
  "Bonds",
  "REIT",
  "InvIT",
  "PPF",
  "EPF",
  "NPS",
  "Sukanya Samriddhi",
  "NSC",
  "KVP",
  "SCSS",
  "Post Office",
  "Property",
  "Vehicle",
  "Crypto",
] as const;

export const LIABILITY_TYPES = [
  "Home Loan",
  "Car Loan",
  "Education Loan",
  "Personal Loan",
  "Credit Card",
  "Borrowed Money",
] as const;

export const BILL_CATEGORIES = [
  "Rent",
  "Utilities",
  "Internet",
  "Mobile",
  "Credit Card",
  "Insurance",
  "Subscriptions",
  "EMI",
  "Others",
] as const;

export const GOAL_ICON_KEYS = ["PiggyBank", "Plane", "Home", "Car", "GraduationCap"] as const;
export const BILL_ICON_KEYS = [
  "Home",
  "Zap",
  "Wifi",
  "Smartphone",
  "CreditCard",
  "ShieldCheck",
  "Tv",
  "Receipt",
] as const;

export const GOAL_ICON_MAP: Record<string, LucideIcon> = {
  PiggyBank,
  Plane,
  Home,
  Car,
  GraduationCap,
  Target: Receipt,
};

export const BILL_ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Zap,
  Wifi,
  CreditCard,
  Smartphone,
  ShieldCheck,
  Tv,
  Receipt,
};

export const ACCOUNT_TYPE_META: Record<string, { icon: LucideIcon; color: string }> = {
  Savings: { icon: Landmark, color: "bg-blue-500/10 text-blue-600" },
  Current: { icon: Wallet, color: "bg-orange-500/10 text-orange-600" },
  Cash: { icon: Banknote, color: "bg-amber-500/10 text-amber-600" },
  "UPI Wallet": { icon: Smartphone, color: "bg-fuchsia-500/10 text-fuchsia-600" },
  "Credit Card": { icon: CreditCard, color: "bg-rose-500/10 text-rose-600" },
  "Investment Account": { icon: TrendingUp, color: "bg-violet-500/10 text-violet-600" },
  "Loan Account": { icon: CreditCard, color: "bg-rose-500/10 text-rose-600" },
};

export const DEFAULT_ACCOUNT_META = { icon: Wallet, color: "bg-muted text-foreground" };