import { useSyncExternalStore } from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

interface CartState {
  items: CartItem[];
}

const STORAGE_KEY = "padaria_cart_v1";

const load = (): CartState => {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartState) : { items: [] };
  } catch {
    return { items: [] };
  }
};

let state: CartState = { items: [] };
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
};

const hydrate = () => {
  if (hydrated) return;
  hydrated = true;
  state = load();
  listeners.forEach((l) => l());
};

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    hydrate();
    return () => listeners.delete(listener);
  },
  getSnapshot(): CartState {
    return state;
  },
  getServerSnapshot(): CartState {
    return { items: [] };
  },
  add(item: Omit<CartItem, "quantity">, qty = 1) {
    const existing = state.items.find((i) => i.productId === item.productId);
    state = existing
      ? {
          items: state.items.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i,
          ),
        }
      : { items: [...state.items, { ...item, quantity: qty }] };
    emit();
  },
  setQuantity(productId: string, qty: number) {
    state = {
      items:
        qty <= 0
          ? state.items.filter((i) => i.productId !== productId)
          : state.items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
    };
    emit();
  },
  remove(productId: string) {
    state = { items: state.items.filter((i) => i.productId !== productId) };
    emit();
  },
  clear() {
    state = { items: [] };
    emit();
  },
};

export function useCart() {
  const s = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  const subtotal = s.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = s.items.reduce((sum, i) => sum + i.quantity, 0);
  return { items: s.items, subtotal, count };
}
