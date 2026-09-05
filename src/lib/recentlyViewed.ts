export interface RecentlyViewedItem {
  slug: string;
  name: string;
  image: string;
  price: number;
  category: string;
  ts: number;
}

const STORAGE_KEY = "ff-recently-viewed";
const MAX_ITEMS = 8;

export function recordRecentlyViewed(item: RecentlyViewedItem) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: RecentlyViewedItem[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((i) => i.slug !== item.slug);
    const next = [item, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — silently skip.
  }
}

export function readRecentlyViewed(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
