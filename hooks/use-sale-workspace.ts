"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { Product } from "@/lib/types";
import {
  findProductByCode,
  mockProducts,
  searchProducts,
} from "@/lib/mock/products";
import {
  filterProductsByStock,
  getAvailableStock,
  paymentMethodShortcuts,
} from "@/lib/sales/cart";
import { createSaleInvoice } from "@/lib/actions/sales";
import { CURRENT_USER } from "@/lib/auth/current-user";
import { isTypingTarget } from "@/lib/sales/shortcuts";
import { openSalesShortcutsHelp } from "@/lib/sales/events";
import {
  effectiveReceived,
  getSaleTotals,
  nextClientLabel,
  resolveClientName,
  saleReducer,
  initialSaleState,
} from "@/lib/sales/sale-state";
import { formatCurrency } from "@/lib/utils";

export function useSaleWorkspace() {
  const [state, dispatch] = useReducer(saleReducer, initialSaleState);
  const searchRef = useRef<HTMLInputElement>(null);
  const receivedRef = useRef<HTMLInputElement>(null);
  const validateRef = useRef<HTMLButtonElement>(null);

  const products = useMemo(() => {
    const searched = searchProducts(state.query, mockProducts);
    return filterProductsByStock(searched, state.stockFilter, state.lines);
  }, [state.query, state.stockFilter, state.lines]);

  const totals = useMemo(() => getSaleTotals(state), [state]);
  const clientName = resolveClientName(state);
  const clientLabel = nextClientLabel(state);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    dispatch({
      type: "CLAMP_HIGHLIGHT",
      maxIndex: Math.max(0, products.length - 1),
    });
  }, [products.length]);

  useEffect(() => {
    if (!state.flashProductId) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "CLEAR_FLASH" }),
      450,
    );
    return () => window.clearTimeout(timer);
  }, [state.flashProductId]);

  useEffect(() => {
    if (!state.toast) return;
    const duration =
      state.toast.tone === "success"
        ? 3200
        : state.toast.tone === "error"
          ? 2600
          : 1600;
    const timer = window.setTimeout(
      () => dispatch({ type: "CLEAR_TOAST" }),
      duration,
    );
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  const addProduct = useCallback((product: Product) => {
    dispatch({ type: "ADD_PRODUCT", product });
    queueMicrotask(() => searchRef.current?.focus());
  }, []);

  const handleScanSubmit = useCallback((code: string) => {
    const exact = findProductByCode(code, mockProducts);
    const match =
      exact ??
      (() => {
        const results = searchProducts(code, mockProducts);
        return results.length === 1 ? results[0] : null;
      })();

    if (!match) return false;
    dispatch({ type: "ADD_PRODUCT", product: match });
    return true;
  }, []);

  const focusValidate = useCallback(() => {
    validateRef.current?.focus();
  }, []);

  const focusReceived = useCallback(() => {
    receivedRef.current?.focus();
    receivedRef.current?.select();
  }, []);

  const prepareAmountThenFocusValidate = useCallback(() => {
    if (state.paymentMethod === "CASH" && state.amountReceived <= 0) {
      dispatch({ type: "SET_EXACT_AMOUNT" });
    }
    queueMicrotask(() => focusValidate());
  }, [focusValidate, state.amountReceived, state.paymentMethod]);

  const openCheckout = useCallback(() => {
    if (state.lines.length === 0) {
      dispatch({ type: "TOAST", message: "Ajoutez un article d'abord", tone: "error" });
      searchRef.current?.focus();
      return;
    }

    if (state.paymentMethod === "CASH") {
      const total = totals.total;
      const received = effectiveReceived(state);
      if (received < total) {
        dispatch({
          type: "TOAST",
          message: "Montant recu insuffisant",
          tone: "error",
        });
        focusReceived();
        return;
      }
      if (state.amountReceived <= 0) {
        dispatch({ type: "SET_EXACT_AMOUNT" });
      }
    }

    dispatch({ type: "OPEN_CHECKOUT" });
  }, [focusReceived, state, totals.total]);

  const confirmCheckout = useCallback(async () => {
    if (state.checkoutLoading || state.lines.length === 0) return;

    const bumpClient = !state.note.trim();
    const snapshot = {
      lines: state.lines,
      customerName: clientName,
      paymentMethod: state.paymentMethod,
      discount: state.discount,
      discountMode: state.discountMode,
      amountReceived: effectiveReceived(state),
      notes: state.note.trim() || undefined,
      total: totals.total,
    };

    dispatch({ type: "SET_CHECKOUT_LOADING", loading: true });
    try {
      const result = await createSaleInvoice({
        lines: snapshot.lines,
        customerName: snapshot.customerName,
        paymentMethod: snapshot.paymentMethod,
        discount: snapshot.discount,
        discountMode: snapshot.discountMode,
        amountReceived: snapshot.amountReceived,
        notes: snapshot.notes,
      });

      if (!result.ok) {
        dispatch({
          type: "TOAST",
          message: `Erreur : ${result.error}`,
          tone: "error",
        });
        return;
      }

      dispatch({ type: "SALE_SUCCESS", bumpClient });
      dispatch({
        type: "TOAST",
        message: `Vente ${result.invoiceNumber} — ${snapshot.customerName} — ${formatCurrency(snapshot.total)}`,
        tone: "success",
      });
      queueMicrotask(() => searchRef.current?.focus());
    } finally {
      dispatch({ type: "SET_CHECKOUT_LOADING", loading: false });
    }
  }, [clientName, state, totals.total]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (state.clearOpen || state.checkoutOpen) return;

      const typing = isTypingTarget(event.target);
      const meta = event.ctrlKey || event.metaKey;

      if (event.key === "?" && !typing) {
        event.preventDefault();
        openSalesShortcutsHelp();
        return;
      }

      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if (event.key === "Escape" && typing && event.target === searchRef.current) {
        event.preventDefault();
        dispatch({ type: "SET_QUERY", query: "" });
        return;
      }

      if (event.key === "F4") {
        event.preventDefault();
        openCheckout();
        return;
      }

      if (meta && event.key === "Backspace") {
        event.preventDefault();
        dispatch({ type: "OPEN_CLEAR" });
        return;
      }

      if (meta && ["1", "2"].includes(event.key)) {
        event.preventDefault();
        const method = paymentMethodShortcuts[Number(event.key) - 1];
        if (method) dispatch({ type: "SET_PAYMENT", method });
        return;
      }

      if (!typing && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        dispatch({ type: "ADJUST_LAST_QTY", delta: 1 });
        return;
      }

      if (!typing && event.key === "-") {
        event.preventDefault();
        dispatch({ type: "ADJUST_LAST_QTY", delta: -1 });
        return;
      }

      if (!typing && event.key === "ArrowDown") {
        event.preventDefault();
        dispatch({
          type: "SET_HIGHLIGHT",
          index: Math.min(
            state.highlightedIndex + 1,
            Math.max(0, products.length - 1),
          ),
        });
        return;
      }

      if (!typing && event.key === "ArrowUp") {
        event.preventDefault();
        dispatch({
          type: "SET_HIGHLIGHT",
          index: Math.max(state.highlightedIndex - 1, 0),
        });
        return;
      }

      if (!typing && event.key === "Enter") {
        if (event.target instanceof HTMLButtonElement) return;
        const product = products[state.highlightedIndex];
        if (product && getAvailableStock(product, state.lines) > 0) {
          event.preventDefault();
          addProduct(product);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    addProduct,
    openCheckout,
    products,
    state.clearOpen,
    state.checkoutOpen,
    state.highlightedIndex,
    state.lines,
  ]);

  return {
    state,
    dispatch,
    products,
    totals,
    clientName,
    clientLabel,
    searchRef,
    receivedRef,
    validateRef,
    issuerName: CURRENT_USER.name,
    addProduct,
    handleScanSubmit,
    openCheckout,
    confirmCheckout,
    focusValidate,
    prepareAmountThenFocusValidate,
    focusReceived,
  };
}
