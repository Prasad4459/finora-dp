export const todayISO = () => new Date().toISOString().slice(0, 10);

export const upsertBudget = <T extends { name: string }>(list: T[], v: T): T[] => [
  v,
  ...list.filter((b) => b.name !== v.name),
];
