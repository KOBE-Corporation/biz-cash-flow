import type { CartLine, PaymentMethod, Product } from "@/lib/types";
import {
  addProductToCart,
  getAvailableStock,
  getCartSubtotal,
  getCartTotal,
  getChangeDue,
  getCartItemCount,
  removeFromCart,
  resolveDiscountAmount,
  updateCartQuantity,
  type DiscountMode,
  type StockFilter,
} from "@/lib/sales/cart";

export type ToastTone = "info" | "success" | "error";

export type SaleToast = {
  message: string;
  tone: ToastTone;
};

export type SaleState = {
  lines: CartLine[];
  discount: number;
  discountMode: DiscountMode;
  paymentMethod: PaymentMethod;
  note: string;
  amountReceived: number;
  amountDirty: boolean;
  clientCounter: number;
  query: string;
  stockFilter: StockFilter;
  highlightedIndex: number;
  flashProductId: string | null;
  clearOpen: boolean;
  checkoutOpen: boolean;
  checkoutLoading: boolean;
  toast: SaleToast | null;
};

export const initialSaleState: SaleState = {
  lines: [],
  discount: 0,
  discountMode: "amount",
  paymentMethod: "CASH",
  note: "",
  amountReceived: 0,
  amountDirty: false,
  clientCounter: 1,
  query: "",
  stockFilter: "available",
  highlightedIndex: 0,
  flashProductId: null,
  clearOpen: false,
  checkoutOpen: false,
  checkoutLoading: false,
  toast: null,
};

export type SaleAction =
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_STOCK_FILTER"; filter: StockFilter }
  | { type: "SET_HIGHLIGHT"; index: number }
  | { type: "CLAMP_HIGHLIGHT"; maxIndex: number }
  | { type: "CLEAR_FLASH" }
  | { type: "CLEAR_TOAST" }
  | { type: "TOAST"; message: string; tone?: ToastTone }
  | { type: "ADD_PRODUCT"; product: Product }
  | { type: "SET_QUANTITY"; productId: string; quantity: number }
  | { type: "REMOVE_LINE"; productId: string }
  | { type: "ADJUST_LAST_QTY"; delta: number }
  | { type: "SET_DISCOUNT"; value: number }
  | { type: "SET_DISCOUNT_MODE"; mode: DiscountMode }
  | { type: "SET_PAYMENT"; method: PaymentMethod }
  | { type: "SET_NOTE"; note: string }
  | { type: "SET_AMOUNT"; value: number; dirty?: boolean }
  | { type: "SYNC_AMOUNT_TO_TOTAL" }
  | { type: "SET_EXACT_AMOUNT" }
  | { type: "OPEN_CLEAR" }
  | { type: "SET_CLEAR_OPEN"; open: boolean }
  | { type: "CONFIRM_CLEAR" }
  | { type: "OPEN_CHECKOUT" }
  | { type: "SET_CHECKOUT_OPEN"; open: boolean }
  | { type: "SET_CHECKOUT_LOADING"; loading: boolean }
  | { type: "SALE_SUCCESS"; bumpClient: boolean }
  | { type: "RESET_SALE" };

function syncAmount(state: SaleState, lines = state.lines): number {
  if (state.amountDirty || state.paymentMethod !== "CASH") {
    return state.amountReceived;
  }
  return getCartTotal(lines, state.discount, state.discountMode);
}

function withToast(
  state: SaleState,
  message: string,
  tone: ToastTone = "info",
): SaleState {
  return { ...state, toast: { message, tone } };
}

export function saleReducer(state: SaleState, action: SaleAction): SaleState {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, query: action.query, highlightedIndex: 0 };

    case "SET_STOCK_FILTER":
      return {
        ...state,
        stockFilter: action.filter,
        highlightedIndex: 0,
      };

    case "SET_HIGHLIGHT":
      return { ...state, highlightedIndex: Math.max(0, action.index) };

    case "CLAMP_HIGHLIGHT":
      return {
        ...state,
        highlightedIndex: Math.min(
          state.highlightedIndex,
          Math.max(0, action.maxIndex),
        ),
      };

    case "CLEAR_FLASH":
      return { ...state, flashProductId: null };

    case "CLEAR_TOAST":
      return { ...state, toast: null };

    case "TOAST":
      return withToast(state, action.message, action.tone ?? "info");

    case "ADD_PRODUCT": {
      if (getAvailableStock(action.product, state.lines) <= 0) {
        return withToast(state, "Stock insuffisant", "error");
      }
      const lines = addProductToCart(state.lines, action.product, 1);
      const next = {
        ...state,
        lines,
        query: "",
        highlightedIndex: 0,
        flashProductId: action.product.id,
        amountReceived: syncAmount({ ...state, lines }, lines),
      };
      return withToast(next, `${action.product.name} ajoute`, "info");
    }

    case "SET_QUANTITY": {
      const lines = updateCartQuantity(
        state.lines,
        action.productId,
        action.quantity,
      );
      return {
        ...state,
        lines,
        amountReceived: syncAmount({ ...state, lines }, lines),
      };
    }

    case "REMOVE_LINE": {
      const lines = removeFromCart(state.lines, action.productId);
      return {
        ...state,
        lines,
        amountReceived: syncAmount({ ...state, lines }, lines),
      };
    }

    case "ADJUST_LAST_QTY": {
      const last = state.lines[state.lines.length - 1];
      if (!last) return state;
      const lines = updateCartQuantity(
        state.lines,
        last.productId,
        last.quantity + action.delta,
      );
      return {
        ...state,
        lines,
        amountReceived: syncAmount({ ...state, lines }, lines),
      };
    }

    case "SET_DISCOUNT": {
      const discount = Math.max(0, action.value);
      const next = { ...state, discount };
      return {
        ...next,
        amountReceived: syncAmount(next),
      };
    }

    case "SET_DISCOUNT_MODE": {
      const next = { ...state, discountMode: action.mode };
      return {
        ...next,
        amountReceived: syncAmount(next),
      };
    }

    case "SET_PAYMENT": {
      const next: SaleState = {
        ...state,
        paymentMethod: action.method,
        amountDirty: action.method === "CASH" ? state.amountDirty : false,
      };
      return {
        ...next,
        amountReceived:
          action.method === "CASH" ? syncAmount(next) : state.amountReceived,
      };
    }

    case "SET_NOTE":
      return { ...state, note: action.note };

    case "SET_AMOUNT":
      return {
        ...state,
        amountReceived: Math.max(0, action.value),
        amountDirty: action.dirty ?? true,
      };

    case "SYNC_AMOUNT_TO_TOTAL":
      return {
        ...state,
        amountReceived: getCartTotal(
          state.lines,
          state.discount,
          state.discountMode,
        ),
        amountDirty: false,
      };

    case "SET_EXACT_AMOUNT": {
      const total = getCartTotal(
        state.lines,
        state.discount,
        state.discountMode,
      );
      return {
        ...state,
        amountReceived: total,
        amountDirty: true,
      };
    }

    case "OPEN_CLEAR":
      if (state.lines.length === 0) return state;
      return { ...state, clearOpen: true };

    case "SET_CLEAR_OPEN":
      return { ...state, clearOpen: action.open };

    case "CONFIRM_CLEAR":
      return {
        ...state,
        lines: [],
        discount: 0,
        discountMode: "amount",
        note: "",
        amountReceived: 0,
        amountDirty: false,
        paymentMethod: "CASH",
        clearOpen: false,
        toast: { message: "Panier vide", tone: "info" },
      };

    case "OPEN_CHECKOUT":
      if (state.lines.length === 0) {
        return withToast(state, "Ajoutez un article d'abord", "error");
      }
      return { ...state, checkoutOpen: true };

    case "SET_CHECKOUT_OPEN":
      if (state.checkoutLoading && !action.open) return state;
      return { ...state, checkoutOpen: action.open };

    case "SET_CHECKOUT_LOADING":
      return { ...state, checkoutLoading: action.loading };

    case "SALE_SUCCESS":
      return {
        ...initialSaleState,
        clientCounter: action.bumpClient
          ? state.clientCounter + 1
          : state.clientCounter,
        stockFilter: state.stockFilter,
      };

    case "RESET_SALE":
      return {
        ...initialSaleState,
        clientCounter: state.clientCounter,
        stockFilter: state.stockFilter,
      };

    default:
      return state;
  }
}

export function effectiveReceived(state: SaleState) {
  if (state.paymentMethod !== "CASH") {
    return getCartTotal(state.lines, state.discount, state.discountMode);
  }
  if (state.amountReceived > 0) return state.amountReceived;
  return getCartTotal(state.lines, state.discount, state.discountMode);
}

export function resolveClientName(state: SaleState) {
  const trimmed = state.note.trim();
  if (trimmed) return trimmed;
  return `Client N~${state.clientCounter}`;
}

export function getSaleTotals(state: SaleState) {
  const subtotal = getCartSubtotal(state.lines);
  const discountAmount = resolveDiscountAmount(
    subtotal,
    state.discount,
    state.discountMode,
  );
  const total = getCartTotal(state.lines, state.discount, state.discountMode);
  const received = effectiveReceived(state);
  const change =
    state.paymentMethod === "CASH" ? getChangeDue(total, received) : 0;
  const itemCount = getCartItemCount(state.lines);

  return { subtotal, discountAmount, total, received, change, itemCount };
}

export function nextClientLabel(state: SaleState) {
  return `Client N~${state.clientCounter}`;
}
