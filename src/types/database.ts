import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "@/integrations/supabase/types";

export type { Database };

// ---- Row types ----
export type Profile = Tables<"profiles">;
export type UserSettings = Tables<"user_settings">;
export type Wallet = Tables<"wallets">;
export type Category = Tables<"categories">;
export type Transaction = Tables<"transactions">;
export type AssetRow = Tables<"assets">;
export type LiabilityRow = Tables<"liabilities">;
export type GoalRow = Tables<"goals">;
export type BudgetRow = Tables<"budgets">;
export type BillRow = Tables<"bills">;
export type BillPaymentRow = Tables<"bill_payments">;
export type Notification = Tables<"notifications">;

// ---- Insert types ----
export type ProfileInsert = TablesInsert<"profiles">;
export type UserSettingsInsert = TablesInsert<"user_settings">;
export type WalletInsert = TablesInsert<"wallets">;
export type CategoryInsert = TablesInsert<"categories">;
export type TransactionInsert = TablesInsert<"transactions">;
export type AssetInsert = TablesInsert<"assets">;
export type LiabilityInsert = TablesInsert<"liabilities">;
export type GoalInsert = TablesInsert<"goals">;
export type BudgetInsert = TablesInsert<"budgets">;
export type BillInsert = TablesInsert<"bills">;
export type NotificationInsert = TablesInsert<"notifications">;

// ---- Update types ----
export type ProfileUpdate = TablesUpdate<"profiles">;
export type UserSettingsUpdate = TablesUpdate<"user_settings">;
export type WalletUpdate = TablesUpdate<"wallets">;
export type CategoryUpdate = TablesUpdate<"categories">;
export type TransactionUpdate = TablesUpdate<"transactions">;
export type AssetUpdate = TablesUpdate<"assets">;
export type LiabilityUpdate = TablesUpdate<"liabilities">;
export type GoalUpdate = TablesUpdate<"goals">;
export type BudgetUpdate = TablesUpdate<"budgets">;
export type BillUpdate = TablesUpdate<"bills">;
export type NotificationUpdate = TablesUpdate<"notifications">;

// ---- Enums ----
export type WalletType = Enums<"wallet_type">;
export type TransactionType = Enums<"transaction_type">;
export type TransactionStatus = Enums<"transaction_status">;
export type CategoryKind = Enums<"category_kind">;
export type AssetType = Enums<"asset_type">;
export type LiabilityType = Enums<"liability_type">;
export type LiabilityStatus = Enums<"liability_status">;
export type GoalStatus = Enums<"goal_status">;
export type BillFrequency = Enums<"bill_frequency">;
export type BillStatus = Enums<"bill_status">;
export type NotificationType = Enums<"notification_type">;