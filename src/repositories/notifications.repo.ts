import { createRepository } from "./base.repo";

const repo = createRepository("notifications");

export const notificationsRepo = {
  ...repo,
  listRecent: (limit = 20) => repo.list({ orderBy: "created_at", limit }),
  listUnread: () => repo.list({ filters: { is_read: false }, orderBy: "created_at" }),
  markRead: (id: string) => repo.update(id, { is_read: true }),
};