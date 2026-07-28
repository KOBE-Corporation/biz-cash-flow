export const SALES_OPEN_SHORTCUTS_EVENT = "bcf:sales-open-shortcuts";

export function openSalesShortcutsHelp() {
  window.dispatchEvent(new Event(SALES_OPEN_SHORTCUTS_EVENT));
}
