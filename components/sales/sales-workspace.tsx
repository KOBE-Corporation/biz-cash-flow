"use client";

import { ProductPicker } from "@/components/sales/product-picker";
import { CartPanel } from "@/components/sales/cart-panel";
import { CheckoutPanel } from "@/components/sales/checkout-panel";
import { ReimbursementPanel } from "@/components/sales/reimbursement-panel";
import { SaleInvoicePreviewDialog } from "@/components/sales/sale-invoice-preview-dialog";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useSaleWorkspace } from "@/hooks/use-sale-workspace";
import { cn } from "@/lib/utils";

export function SalesWorkspace() {
  const {
    state,
    dispatch,
    products,
    totals,
    clientName,
    clientLabel,
    searchRef,
    receivedRef,
    validateRef,
    issuerName,
    addProduct,
    handleScanSubmit,
    openCheckout,
    confirmCheckout,
    prepareAmountThenFocusValidate,
  } = useSaleWorkspace();

  return (
    <>
      <div className="relative grid min-h-0 w-full min-w-0 grid-cols-1 gap-2 max-md:auto-rows-auto md:h-full md:flex-1 md:grid-cols-[minmax(0,4fr)_minmax(0,3fr)_minmax(0,3fr)] md:overflow-hidden">
        <div className="min-h-[240px] min-w-0 overflow-hidden md:h-full md:min-h-0">
          <ProductPicker
            ref={searchRef}
            query={state.query}
            onQueryChange={(query) => dispatch({ type: "SET_QUERY", query })}
            products={products}
            lines={state.lines}
            stockFilter={state.stockFilter}
            onStockFilterChange={(filter) =>
              dispatch({ type: "SET_STOCK_FILTER", filter })
            }
            highlightedIndex={state.highlightedIndex}
            onHighlightChange={(index) =>
              dispatch({ type: "SET_HIGHLIGHT", index })
            }
            onSelect={addProduct}
            onScanSubmit={handleScanSubmit}
            flashProductId={state.flashProductId}
          />
        </div>

        <div className="min-h-[240px] min-w-0 overflow-hidden md:h-full md:min-h-0">
          <CartPanel
            lines={state.lines}
            onQuantityChange={(productId, quantity) =>
              dispatch({ type: "SET_QUANTITY", productId, quantity })
            }
            onRemove={(productId) =>
              dispatch({ type: "REMOVE_LINE", productId })
            }
            onClear={() => dispatch({ type: "OPEN_CLEAR" })}
          />
        </div>

        <div className="grid min-h-[320px] min-w-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-2 overflow-hidden md:h-full md:min-h-0">
          <div className="min-h-0 min-w-0 overflow-hidden">
            <CheckoutPanel
              receivedRef={receivedRef}
              lines={state.lines}
              discount={state.discount}
              discountMode={state.discountMode}
              paymentMethod={state.paymentMethod}
              note={state.note}
              amountReceived={state.amountReceived}
              nextClientLabel={clientLabel}
              onDiscountChange={(value) =>
                dispatch({ type: "SET_DISCOUNT", value })
              }
              onDiscountModeChange={(mode) =>
                dispatch({ type: "SET_DISCOUNT_MODE", mode })
              }
              onPaymentMethodChange={(method) =>
                dispatch({ type: "SET_PAYMENT", method })
              }
              onNoteChange={(note) => dispatch({ type: "SET_NOTE", note })}
              onAmountReceivedChange={(value) =>
                dispatch({ type: "SET_AMOUNT", value })
              }
              onExactAmount={() => dispatch({ type: "SET_EXACT_AMOUNT" })}
              onAmountReceivedSubmit={prepareAmountThenFocusValidate}
            />
          </div>
          <div className="min-h-0 min-w-0 overflow-hidden">
            <ReimbursementPanel
              ref={validateRef}
              lines={state.lines}
              discount={state.discount}
              discountMode={state.discountMode}
              paymentMethod={state.paymentMethod}
              amountReceived={
                state.amountReceived > 0 ? state.amountReceived : totals.total
              }
              onCheckout={openCheckout}
            />
          </div>
        </div>

        {state.toast ? (
          <div
            className={cn(
              "pointer-events-none fixed bottom-4 left-1/2 z-20 max-w-[90vw] -translate-x-1/2 rounded-full border px-4 py-2 text-sm shadow-card md:absolute",
              state.toast.tone === "success" &&
                "border-success/40 bg-success text-success-foreground",
              state.toast.tone === "error" &&
                "border-destructive/40 bg-destructive text-destructive-foreground",
              state.toast.tone === "info" &&
                "border-border bg-popover text-foreground",
            )}
          >
            <span className="block truncate">{state.toast.message}</span>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={state.clearOpen}
        onOpenChange={(open) => dispatch({ type: "SET_CLEAR_OPEN", open })}
        title="Vider le panier ?"
        description="Tous les articles selectionnes seront retires. Cette action ne peut pas etre annulee."
        confirmLabel="Vider le panier"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={async () => {
          dispatch({ type: "CONFIRM_CLEAR" });
        }}
      />

      <SaleInvoicePreviewDialog
        open={state.checkoutOpen}
        onOpenChange={(open) =>
          dispatch({ type: "SET_CHECKOUT_OPEN", open })
        }
        lines={state.lines}
        discount={state.discount}
        discountMode={state.discountMode}
        paymentMethod={state.paymentMethod}
        amountReceived={
          state.amountReceived > 0 ? state.amountReceived : totals.total
        }
        clientName={clientName}
        issuedByName={issuerName}
        loading={state.checkoutLoading}
        onConfirm={confirmCheckout}
      />
    </>
  );
}
