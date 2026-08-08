export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asset_valuations: {
        Row: {
          as_of: string
          asset_id: string
          created_at: string
          id: string
          source: string
          units: number | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          as_of?: string
          asset_id: string
          created_at?: string
          id?: string
          source?: string
          units?: number | null
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          as_of?: string
          asset_id?: string
          created_at?: string
          id?: string
          source?: string
          units?: number | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_valuations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          avg_cost: number | null
          compounding: string | null
          created_at: string
          current_value: number
          folio_number: string | null
          id: string
          institution: string | null
          interest_rate: number | null
          is_active: boolean
          last_price: number | null
          last_price_at: string | null
          linked_wallet_id: string | null
          maturity_date: string | null
          maturity_value: number | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_value: number
          quantity: number | null
          type: Database["public"]["Enums"]["asset_type"]
          units: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_cost?: number | null
          compounding?: string | null
          created_at?: string
          current_value?: number
          folio_number?: string | null
          id?: string
          institution?: string | null
          interest_rate?: number | null
          is_active?: boolean
          last_price?: number | null
          last_price_at?: string | null
          linked_wallet_id?: string | null
          maturity_date?: string | null
          maturity_value?: number | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number
          quantity?: number | null
          type: Database["public"]["Enums"]["asset_type"]
          units?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_cost?: number | null
          compounding?: string | null
          created_at?: string
          current_value?: number
          folio_number?: string | null
          id?: string
          institution?: string | null
          interest_rate?: number | null
          is_active?: boolean
          last_price?: number | null
          last_price_at?: string | null
          linked_wallet_id?: string | null
          maturity_date?: string | null
          maturity_value?: number | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number
          quantity?: number | null
          type?: Database["public"]["Enums"]["asset_type"]
          units?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_linked_wallet_id_fkey"
            columns: ["linked_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          bill_id: string
          created_at: string
          due_date: string
          expected_amount: number
          id: string
          notes: string | null
          paid_amount: number
          paid_date: string
          period_key: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          due_date: string
          expected_amount?: number
          id?: string
          notes?: string | null
          paid_amount?: number
          paid_date?: string
          period_key: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          due_date?: string
          expected_amount?: number
          id?: string
          notes?: string | null
          paid_amount?: number
          paid_date?: string
          period_key?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          auto_pay: boolean
          category_id: string | null
          created_at: string
          description: string | null
          due_date: string
          frequency: Database["public"]["Enums"]["bill_frequency"]
          icon: string | null
          id: string
          is_recurring: boolean
          last_paid_date: string | null
          name: string
          notes: string | null
          reminder_days_before: number
          reminder_enabled: boolean
          status: Database["public"]["Enums"]["bill_status"]
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          amount: number
          auto_pay?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          frequency?: Database["public"]["Enums"]["bill_frequency"]
          icon?: string | null
          id?: string
          is_recurring?: boolean
          last_paid_date?: string | null
          name: string
          notes?: string | null
          reminder_days_before?: number
          reminder_enabled?: boolean
          status?: Database["public"]["Enums"]["bill_status"]
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          auto_pay?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          frequency?: Database["public"]["Enums"]["bill_frequency"]
          icon?: string | null
          id?: string
          is_recurring?: boolean
          last_paid_date?: string | null
          name?: string
          notes?: string | null
          reminder_days_before?: number
          reminder_enabled?: boolean
          status?: Database["public"]["Enums"]["bill_status"]
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          name: string | null
          period_month: number
          period_year: number
          rollover: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          period_month: number
          period_year: number
          rollover?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          period_month?: number
          period_year?: number
          rollover?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          notes: string | null
          saved_amount: number
          status: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          notes?: string | null
          saved_amount?: number
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          notes?: string | null
          saved_amount?: number
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_contributions: {
        Row: {
          amount: number
          asset_id: string
          auto_debit: boolean
          created_at: string
          day_of_month: number | null
          frequency: Database["public"]["Enums"]["bill_frequency"]
          id: string
          next_due_date: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          amount?: number
          asset_id: string
          auto_debit?: boolean
          created_at?: string
          day_of_month?: number | null
          frequency?: Database["public"]["Enums"]["bill_frequency"]
          id?: string
          next_due_date?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string
          auto_debit?: boolean
          created_at?: string
          day_of_month?: number | null
          frequency?: Database["public"]["Enums"]["bill_frequency"]
          id?: string
          next_due_date?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_contributions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_contributions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          created_at: string
          emi_amount: number
          id: string
          interest_rate: number
          lender: string | null
          name: string
          next_due_date: string | null
          notes: string | null
          outstanding_balance: number
          principal_amount: number | null
          remaining_months: number | null
          status: Database["public"]["Enums"]["liability_status"]
          tenure_months: number | null
          type: Database["public"]["Enums"]["liability_type"]
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          created_at?: string
          emi_amount?: number
          id?: string
          interest_rate?: number
          lender?: string | null
          name: string
          next_due_date?: string | null
          notes?: string | null
          outstanding_balance?: number
          principal_amount?: number | null
          remaining_months?: number | null
          status?: Database["public"]["Enums"]["liability_status"]
          tenure_months?: number | null
          type: Database["public"]["Enums"]["liability_type"]
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          created_at?: string
          emi_amount?: number
          id?: string
          interest_rate?: number
          lender?: string | null
          name?: string
          next_due_date?: string | null
          notes?: string | null
          outstanding_balance?: number
          principal_amount?: number | null
          remaining_months?: number | null
          status?: Database["public"]["Enums"]["liability_status"]
          tenure_months?: number | null
          type?: Database["public"]["Enums"]["liability_type"]
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liabilities_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          full_name: string | null
          id: string
          locale: string
          phone: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          full_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          full_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          asset_id: string | null
          attachment_url: string | null
          category_id: string | null
          created_at: string
          goal_id: string | null
          id: string
          interest_amount: number | null
          is_recurring: boolean
          liability_id: string | null
          notes: string | null
          payee: string | null
          payment_method: string | null
          price_per_unit: number | null
          principal_amount: number | null
          status: Database["public"]["Enums"]["transaction_status"]
          to_wallet_id: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          units: number | null
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          amount: number
          asset_id?: string | null
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          interest_amount?: number | null
          is_recurring?: boolean
          liability_id?: string | null
          notes?: string | null
          payee?: string | null
          payment_method?: string | null
          price_per_unit?: number | null
          principal_amount?: number | null
          status?: Database["public"]["Enums"]["transaction_status"]
          to_wallet_id?: string | null
          transaction_date?: string
          type: Database["public"]["Enums"]["transaction_type"]
          units?: number | null
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string | null
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          interest_amount?: number | null
          is_recurring?: boolean
          liability_id?: string | null
          notes?: string | null
          payee?: string | null
          payment_method?: string | null
          price_per_unit?: number | null
          principal_amount?: number | null
          status?: Database["public"]["Enums"]["transaction_status"]
          to_wallet_id?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          units?: number | null
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: false
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          bill_reminder_days: number
          budget_alert_threshold: number
          created_at: string
          currency: string
          date_format: string
          email_notifications: boolean
          id: string
          push_notifications: boolean
          start_of_month: number
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_reminder_days?: number
          budget_alert_threshold?: number
          created_at?: string
          currency?: string
          date_format?: string
          email_notifications?: boolean
          id?: string
          push_notifications?: boolean
          start_of_month?: number
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_reminder_days?: number
          budget_alert_threshold?: number
          created_at?: string
          currency?: string
          date_format?: string
          email_notifications?: boolean
          id?: string
          push_notifications?: boolean
          start_of_month?: number
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          account_number_masked: string | null
          balance: number
          color: string | null
          created_at: string
          credit_limit: number | null
          currency: string
          icon: string | null
          id: string
          institution: string | null
          is_active: boolean
          name: string
          opening_balance: number
          type: Database["public"]["Enums"]["wallet_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number_masked?: string | null
          balance?: number
          color?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          icon?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean
          name: string
          opening_balance?: number
          type: Database["public"]["Enums"]["wallet_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number_masked?: string | null
          balance?: number
          color?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          icon?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean
          name?: string
          opening_balance?: number
          type?: Database["public"]["Enums"]["wallet_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      tx_apply: {
        Args: {
          _sign: number
          _t: Database["public"]["Tables"]["transactions"]["Row"]
        }
        Returns: undefined
      }
      tx_category_monthly: {
        Args: { _from: string; _to: string }
        Returns: {
          category_id: string
          category_name: string
          m: number
          total: number
          tx_type: Database["public"]["Enums"]["transaction_type"]
          y: number
        }[]
      }
      tx_summary_monthly: {
        Args: { _from: string; _to: string }
        Returns: {
          interest_total: number
          m: number
          principal_total: number
          total: number
          tx_count: number
          tx_type: Database["public"]["Enums"]["transaction_type"]
          y: number
        }[]
      }
    }
    Enums: {
      asset_type:
        | "property"
        | "vehicle"
        | "gold"
        | "silver"
        | "mutual_fund"
        | "stocks"
        | "epf"
        | "ppf"
        | "nps"
        | "fixed_deposit"
        | "crypto"
        | "bank"
        | "cash"
        | "other"
        | "etf"
        | "bond"
        | "reit"
        | "invit"
        | "recurring_deposit"
        | "sukanya_samriddhi"
        | "nsc"
        | "kvp"
        | "scss"
        | "post_office"
      bill_frequency:
        | "one_time"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "half_yearly"
        | "yearly"
      bill_status: "upcoming" | "scheduled" | "paid" | "overdue" | "cancelled"
      category_kind: "income" | "expense" | "both"
      goal_status: "active" | "achieved" | "paused" | "cancelled"
      liability_status: "active" | "due" | "overdue" | "closed"
      liability_type:
        | "home_loan"
        | "car_loan"
        | "personal_loan"
        | "education_loan"
        | "credit_card"
        | "borrowed_money"
        | "other"
      notification_type:
        | "bill_reminder"
        | "budget_alert"
        | "goal_milestone"
        | "emi_due"
        | "system"
      transaction_status: "pending" | "completed" | "failed" | "cancelled"
      transaction_type:
        | "income"
        | "expense"
        | "transfer"
        | "investment"
        | "refund"
        | "dividend"
        | "emi"
        | "redemption"
      wallet_type:
        | "bank_account"
        | "cash"
        | "upi_wallet"
        | "credit_card"
        | "investment_account"
        | "loan_account"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      asset_type: [
        "property",
        "vehicle",
        "gold",
        "silver",
        "mutual_fund",
        "stocks",
        "epf",
        "ppf",
        "nps",
        "fixed_deposit",
        "crypto",
        "bank",
        "cash",
        "other",
        "etf",
        "bond",
        "reit",
        "invit",
        "recurring_deposit",
        "sukanya_samriddhi",
        "nsc",
        "kvp",
        "scss",
        "post_office",
      ],
      bill_frequency: [
        "one_time",
        "weekly",
        "monthly",
        "quarterly",
        "half_yearly",
        "yearly",
      ],
      bill_status: ["upcoming", "scheduled", "paid", "overdue", "cancelled"],
      category_kind: ["income", "expense", "both"],
      goal_status: ["active", "achieved", "paused", "cancelled"],
      liability_status: ["active", "due", "overdue", "closed"],
      liability_type: [
        "home_loan",
        "car_loan",
        "personal_loan",
        "education_loan",
        "credit_card",
        "borrowed_money",
        "other",
      ],
      notification_type: [
        "bill_reminder",
        "budget_alert",
        "goal_milestone",
        "emi_due",
        "system",
      ],
      transaction_status: ["pending", "completed", "failed", "cancelled"],
      transaction_type: [
        "income",
        "expense",
        "transfer",
        "investment",
        "refund",
        "dividend",
        "emi",
        "redemption",
      ],
      wallet_type: [
        "bank_account",
        "cash",
        "upi_wallet",
        "credit_card",
        "investment_account",
        "loan_account",
      ],
    },
  },
} as const
