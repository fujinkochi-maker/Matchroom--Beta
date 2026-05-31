import { cn } from "@/lib/utils";

export const ADMIN_HEADING = "font-display text-2xl uppercase tracking-wider";
export const ADMIN_SUBTITLE = "mt-1 text-sm text-muted-foreground";
export const ADMIN_CARD = "mt-6 rounded-lg border border-border bg-background p-6";
export const ADMIN_INPUT =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
export const ADMIN_TEXTAREA =
  "h-auto w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]";
export const ADMIN_BTN_PRIMARY =
  "rounded-md bg-primary px-6 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark disabled:opacity-50";
export const ADMIN_BTN_ADD =
  "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark";
export const ADMIN_ERROR = "rounded-md bg-destructive/10 p-3 text-sm text-destructive";
export const ADMIN_TABLE_WRAP = "mt-6 overflow-x-auto rounded-lg border border-border";
export const ADMIN_TABLE_ROW = "border-b border-border last:border-0 hover:bg-muted/30";
export const ADMIN_HEADER_BAR = "flex items-center justify-between";
export const ADMIN_LABEL = "mb-1 block text-sm font-medium";

const CARD_WIDTHS = { "2xl": "max-w-2xl", "3xl": "max-w-3xl" } as const;
export function adminCard(w?: keyof typeof CARD_WIDTHS) {
  return w ? cn(ADMIN_CARD, CARD_WIDTHS[w]) : ADMIN_CARD;
}
