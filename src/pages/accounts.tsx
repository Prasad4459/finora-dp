import { useMemo, useState } from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import { AccountsHero, type AccountsHeroSlice } from "@/components/finance/accounts/accounts-hero";
import {
  AccountsList,
  type AccountGroup,
  type AccountItem,
} from "@/components/finance/accounts/accounts-list";
import { Button } from "@/components/ui/button";
import { useWallets } from "@/hooks/use-wallets";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";
import { useFinance } from "@/store/finance-store";

const CREDIT_TYPES = new Set(["Credit Card", "Loan Account"]);
const INVESTMENT_TYPES = new Set(["Investment Account"]);

export function Accounts() {
  const { accounts, openDialog, openEditDialog, removeAccount } = useFinance();
  const wallets = useWallets();
  const recent = useRecentTransactions(50);
  const [query, setQuery] = useState("");

  // Read-only presentation: newest ledger date seen per wallet.
  const lastActivity = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of recent.rows ?? []) {
      const id = t.wallet_id;
      const date = (t.transaction_date ?? "").slice(0, 10);
      if (!id || !date) continue;
      const prev = map.get(id);
      if (!prev || date > prev) map.set(id, date);
    }
    return map;
  }, [recent.rows]);

  const items: AccountItem[] = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        name: a.name,
        institution: a.bank,
        type: a.type,
        balance: a.balance,
        icon: a.icon,
        color: a.color,
        lastActivityISO: lastActivity.get(a.id) ?? null,
        updatedISO: a.updated,
        isCredit: CREDIT_TYPES.has(a.type),
      })),
    [accounts, lastActivity],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      `${i.name} ${i.institution} ${i.type}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  const groups: AccountGroup[] = useMemo(() => {
    const byBalance = (a: AccountItem, b: AccountItem) => Math.abs(b.balance) - Math.abs(a.balance);
    return [
      {
        key: "everyday",
        label: "Everyday money",
        hint: "Bank, cash and UPI balances you can spend today",
        tone: "primary" as const,
        items: filtered
          .filter((i) => !CREDIT_TYPES.has(i.type) && !INVESTMENT_TYPES.has(i.type))
          .sort(byBalance),
      },
      {
        key: "credit",
        label: "Cards & loans",
        hint: "What you owe — repayments post through the ledger",
        tone: "destructive" as const,
        items: filtered.filter((i) => CREDIT_TYPES.has(i.type)).sort(byBalance),
      },
      {
        key: "investment",
        label: "Investment accounts",
        hint: "Accounts that fund your holdings and SIPs",
        tone: "muted" as const,
        items: filtered.filter((i) => INVESTMENT_TYPES.has(i.type)).sort(byBalance),
      },
    ];
  }, [filtered]);

  // A card/loan account holds what you owe, however its balance is signed —
  // spendable money only ever comes from non-credit accounts.
  const available = items
    .filter((i) => !i.isCredit && i.balance > 0)
    .reduce((s, i) => s + i.balance, 0);
  const outstanding = items
    .filter((i) => i.isCredit || i.balance < 0)
    .reduce((s, i) => s + Math.abs(i.balance), 0);
  const netPosition = available - outstanding;
  const cashCount = items.filter(
    (i) => !CREDIT_TYPES.has(i.type) && !INVESTMENT_TYPES.has(i.type),
  ).length;
  const creditCount = items.filter((i) => CREDIT_TYPES.has(i.type)).length;
  const investmentCount = items.filter((i) => INVESTMENT_TYPES.has(i.type)).length;

  const positiveIn = (pred: (i: AccountItem) => boolean) =>
    items.filter((i) => pred(i) && i.balance > 0).reduce((s, i) => s + i.balance, 0);

  const slices: AccountsHeroSlice[] = [
    {
      label: "Bank & cash",
      amount: positiveIn((i) => !CREDIT_TYPES.has(i.type) && !INVESTMENT_TYPES.has(i.type)),
      className: "bg-primary",
    },
    {
      label: "Investment accounts",
      amount: positiveIn((i) => INVESTMENT_TYPES.has(i.type)),
      className: "bg-chart-2",
    },
  ];

  const accountById = (id: string) => accounts.find((a) => a.id === id);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden">
      <header className="space-y-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3 sm:space-y-0">
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Wallets &amp; Accounts
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Every bank, cash, UPI, card and investment account in one place — balances stay in sync
            with your ledger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          <Button size="sm" variant="outline" onClick={() => openDialog("transfer")}>
            <ArrowLeftRight className="mr-1 h-4 w-4" /> Transfer
          </Button>
          <Button size="sm" onClick={() => openDialog("account")}>
            <Plus className="mr-1 h-4 w-4" /> Add account
          </Button>
        </div>
      </header>

      <AccountsHero
        available={available}
        outstanding={outstanding}
        netPosition={netPosition}
        accountCount={items.length}
        cashCount={cashCount}
        creditCount={creditCount}
        investmentCount={investmentCount}
        slices={slices}
        isLoading={wallets.isLoading}
        isError={wallets.isError}
        onRetry={wallets.refetch}
        onAdd={() => openDialog("account")}
      />

      <AccountsList
        groups={groups}
        totalAccounts={items.length}
        query={query}
        onQueryChange={setQuery}
        isLoading={wallets.isLoading}
        isError={wallets.isError}
        onRetry={wallets.refetch}
        onTransfer={() => openDialog("transfer")}
        onEdit={(id) => {
          const a = accountById(id);
          if (a) openEditDialog({ kind: "account", entity: a });
        }}
        onRemove={(id) => removeAccount(id)}
        onAdd={() => openDialog("account")}
      />
    </div>
  );
}
