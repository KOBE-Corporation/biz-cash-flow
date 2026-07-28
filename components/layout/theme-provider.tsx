"use client";

import * as React from "react";
import { useServerInsertedHTML } from "next/navigation";

export type AppTheme = "light" | "dark";

type ThemeContextValue = {
  theme: AppTheme;
  resolvedTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: AppTheme;
  storageKey?: string;
  /** Compat next-themes — ignore. */
  attribute?: string;
  enableSystem?: boolean;
};

function buildThemeBootScript(storageKey: string, defaultTheme: AppTheme) {
  return `!function(){try{var d=document.documentElement,c=d.classList;c.remove("light","dark");var t=localStorage.getItem(${JSON.stringify(storageKey)});t=(t==="light"||t==="dark")?t:${JSON.stringify(defaultTheme)};c.add(t);d.style.colorScheme=t;}catch(e){document.documentElement.classList.add(${JSON.stringify(defaultTheme)});document.documentElement.style.colorScheme=${JSON.stringify(defaultTheme)};}}();`;
}

/**
 * Theme provider sans <script> dans l'arbre React client
 * (evite le warning React 19 / Next 16 de next-themes).
 * Le script d'init est injecte via useServerInsertedHTML.
 */
export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "bcf-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<AppTheme>(defaultTheme);
  const inserted = React.useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script
        id="bcf-theme-boot"
        dangerouslySetInnerHTML={{
          __html: buildThemeBootScript(storageKey, defaultTheme),
        }}
      />
    );
  });

  React.useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    }
  }, [storageKey]);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.colorScheme = theme;
    window.localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const setTheme = React.useCallback((next: AppTheme) => {
    setThemeState(next);
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme: theme, setTheme }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme doit etre utilise dans ThemeProvider");
  }
  return ctx;
}
