"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CartLine, PaymentMethod, Product } from "@/lib/types";
import {
  findProductByCode,
  mockProducts,
  searchProducts,
} from "@/lib/mock/products";
import type { DiscountMode, StockFilter } from "@/lib/sales/cart";
import {
  addProductToCart,
  filterProductsByStock,
  getAvailableStock,
  getCartItemCount,
  getCartTotal,
  paymentMethodLabels,
  paymentMethodShortcuts,
  removeFromCart,
  updateCartQuantity,
} from "@/lib/sales/cart";
import { isTypingTarget } from "@/lib/sales/shortcuts";
import { openSalesShortcutsHelp } from "@/lib/sales/events";
import { ProductPicker } from "@/components/sales/product-picker";
import { CartPanel } from "@/components/sales/cart-panel";
import { CheckoutPanel } from "@/components/sales/checkout-panel";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function SalesWorkspace() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [note, setNote] = useState("");
  const [amountReceived, setAmountReceived] = useState(0);
  const [stockFilter, setStockFilter] = useState<StockFilter>("available");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [flashProductId, setFlashProductId] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const products = useMemo(() => {
    const searched = searchProducts(query, mockProducts);
    return filterProductsByStock(searched, stockFilter, lines);
  }, [query, stockFilter, lines]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, stockFilter]);

  useEffect(() => {
    if (highlightedIndex >= products.length) {
      setHighlightedIndex(Math.max(0, products.length - 1));
    }
  }, [products.length, highlightedIndex]);

  useEffect(() => {
    if (!flashProductId) return;
    const timer = window.setTimeout(() => setFlashProductId(null), 450);
    return () => window.clearTimeout(timer);
  }, [flashProductId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const addProduct = useCallback((product: Product) => {
    setLines((prev) => {
      if (getAvailableStock(product, prev) <= 0) {
        queueMicrotask(() => setToast("Stock insuffisant"));
        return prev;
      }
      queueMicrotask(() => {
        setFlashProductId(product.id);
        setToast(`${product.name} ajoute`);
      });
      return addProductToCart(prev, product, 1);
    });
  }, []);

  const handleScanSubmit = useCallback((code: string) => {
    const exact = findProductByCode(code, mockProducts);
    if (exact) {
      setLines((prev) => {
        if (getAvailableStock(exact, prev) <= 0) {
          queueMicrotask(() => setToast("Stock insuffisant"));
          return prev;
        }
        queueMicrotask(() => {
          setFlashProductId(exact.id);
          setToast(`${exact.name} ajoute`);
        });
        return addProductToCart(prev, exact, 1);
      });
      return true;
    }

    const results = searchProducts(code, mockProducts);
    if (results.length === 1) {
      const product = results[0];
      setLines((prev) => {
        if (getAvailableStock(product, prev) <= 0) {
          queueMicrotask(() => setToast("Stock insuffisant"));
          return prev;
        }
        queueMicrotask(() => {
          setFlashProductId(product.id);
          setToast(`${product.name} ajoute`);
        });
        return addProductToCart(prev, product, 1);
      });
      return true;
    }

    return false;
  }, []);

  const adjustLastQuantity = useCallback((delta: number) => {
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      return updateCartQuantity(prev, last.productId, last.quantity + delta);
    });
  }, []);

  const resetSale = useCallback(() => {
    setLines([]);
    setDiscount(0);
    setDiscountMode("amount");
    setNote("");
    setPaymentMethod("CASH");
    setAmountReceived(0);
    setQuery("");
  }, []);

  const handleCheckoutConfirm = async () => {
    setLastTotal(getCartTotal(lines, discount, discountMode));
    resetSale();
    setSuccessOpen(true);
  };

  const openCheckout = useCallback(() => {
    if (lines.length === 0) return;
    setCheckoutOpen(true);
  }, [lines.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (clearOpen || checkoutOpen || successOpen) return;

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

      if (event.key === "F4") {
        event.preventDefault();
        openCheckout();
        return;
      }

      if (meta && event.key === "Backspace") {
        event.preventDefault();
        if (lines.length > 0) setClearOpen(true);
        return;
      }

      if (meta && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        const method = paymentMethodShortcuts[Number(event.key) - 1];
        if (method) setPaymentMethod(method);
        return;
      }

      if (!typing && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        adjustLastQuantity(1);
        return;
      }

      if (!typing && event.key === "-") {
        event.preventDefault();
        adjustLastQuantity(-1);
        return;
      }

      if (!typing && event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((index) =>
          Math.min(index + 1, Math.max(0, products.length - 1)),
        );
        return;
      }

      if (!typing && event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((index) => Math.max(index - 1, 0));
        return;
      }

      if (!typing && event.key === "Enter") {
        const product = products[highlightedIndex];
        if (product && getAvailableStock(product, lines) > 0) {
          event.preventDefault();
          addProduct(product);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    adjustLastQuantity,
    addProduct,
    clearOpen,
    checkoutOpen,
    highlightedIndex,
    lines,
    openCheckout,
    products,
    successOpen,
  ]);

  return (
    <>
      <div className="relative flex min-h-[calc(100svh-8rem)] flex-col gap-4 lg:flex-row">
        <ProductPicker
          ref={searchRef}
          query={query}
          onQueryChange={setQuery}
          products={products}
          lines={lines}
          stockFilter={stockFilter}
          onStockFilterChange={setStockFilter}
          highlightedIndex={highlightedIndex}
          onHighlightChange={setHighlightedIndex}
          onSelect={addProduct}
          onScanSubmit={handleScanSubmit}
          flashProductId={flashProductId}
        />

        <div className="flex min-h-0 w-full flex-col gap-4 lg:max-w-md xl:max-w-lg">
          <CartPanel
            lines={lines}
            onQuantityChange={(productId, quantity) =>
              setLines((prev) => updateCartQuantity(prev, productId, quantity))
            }
            onRemove={(productId) =>
              setLines((prev) => removeFromCart(prev, productId))
            }
            onClear={() => setClearOpen(true)}
          />
          <CheckoutPanel
            lines={lines}
            discount={discount}
            discountMode={discountMode}
            paymentMethod={paymentMethod}
            note={note}
            amountReceived={amountReceived}
            onDiscountChange={setDiscount}
            onDiscountModeChange={setDiscountMode}
            onPaymentMethodChange={setPaymentMethod}
            onNoteChange={setNote}
            onAmountReceivedChange={setAmountReceived}
            onCheckout={openCheckout}
          />
        </div>

        {toast ? (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border bg-popover px-4 py-2 text-sm text-foreground shadow-card">
            {toast}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Vider le panier ?"
        description="Tous les articles selectionnes seront retires. Cette action ne peut pas etre annulee."
        confirmLabel="Vider le panier"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={async () => {
          setLines([]);
          setDiscount(0);
          setAmountReceived(0);
          setNote("");
        }}
      />

      <ConfirmDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        title="Confirmer la vente ?"
        description={`${getCartItemCount(lines)} article(s) — Total ${formatCurrency(getCartTotal(lines, discount, discountMode))} — Paiement : ${paymentMethodLabels[paymentMethod]}.${note ? ` Note : ${note}` : ""}`}
        confirmLabel="Confirmer la vente"
        cancelLabel="Retour"
        variant="default"
        onConfirm={handleCheckoutConfirm}
      />

      <Dialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        title="Vente enregistree"
        description={`La vente a ete enregistree avec succes pour un total de ${formatCurrency(lastTotal)}. Le stock sera mis a jour automatiquement une fois le backend connecte.`}
      >
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setSuccessOpen(false);
              searchRef.current?.focus();
            }}
          >
            Nouvelle vente
          </Button>
        </div>
      </Dialog>
    </>
  );
}
