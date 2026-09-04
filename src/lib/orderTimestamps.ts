// Client-side order timestamp storage using localStorage.
// Since the Supabase table may lack the timestamp columns (and the serverless
// endpoint is unreliable), we persist timestamps locally so the admin always
// sees when each status transition happened.

const STORAGE_KEY = "ff_order_timestamps";

type TimestampField =
  | "pending_at"
  | "preparing_at"
  | "ready_at"
  | "completed_at"
  | "cancelled_at";

type OrderTimestamps = Record<string, Record<TimestampField, string>>;

function readAll(): OrderTimestamps {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data: OrderTimestamps): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

/** Record a timestamp for a specific order + status field. */
export function recordOrderTimestamp(
  orderId: string,
  field: TimestampField,
  iso: string,
): void {
  const all = readAll();
  if (!all[orderId]) all[orderId] = {} as Record<TimestampField, string>;
  all[orderId][field] = iso;
  writeAll(all);
}

/** Merge locally-stored timestamps into an order fetched from the DB. */
export function mergeOrderTimestamps<T extends Record<string, unknown>>(order: T): T {
  const all = readAll();
  const local = all[order.id as string];
  if (!local) return order;

  const fields: TimestampField[] = [
    "pending_at",
    "preparing_at",
    "ready_at",
    "completed_at",
    "cancelled_at",
  ];

  const merged = { ...order };
  for (const f of fields) {
    // Local wins only when the DB value is null/undefined
    if (!merged[f] && local[f]) {
      merged[f] = local[f] as T[Extract<keyof T, string>];
    }
  }
  return merged;
}
