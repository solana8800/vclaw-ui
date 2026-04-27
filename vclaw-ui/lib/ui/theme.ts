export const themes = ["light", "dark"] as const;

export type ThemeName = (typeof themes)[number];

export const defaultTheme: ThemeName = "dark";
export const themeStorageKey = "vclaw-theme";

/** Đồng bộ với ThemeToggle: bắn sau khi `applyThemeToDocument` + localStorage. */
export const themeChangeEventName = "vclaw-theme-change";

export function isThemeName(value: string | null | undefined): value is ThemeName {
  return themes.includes(value as ThemeName);
}

export function applyThemeToDocument(theme: ThemeName) {
  const root = document.documentElement;
  root.classList.remove(...themes);
  root.classList.add(theme);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function readThemeFromDocument(): ThemeName {
  const theme = document.documentElement.dataset.theme;
  return isThemeName(theme) ? theme : defaultTheme;
}

export const themeInitScript = `
(() => {
  const themes = ["light", "dark"];
  const storageKey = "${themeStorageKey}";
  const fallbackTheme = "${defaultTheme}";

  try {
    const root = document.documentElement;
    const stored = window.localStorage.getItem(storageKey);
    const theme = themes.includes(stored) ? stored : fallbackTheme;
    root.classList.remove(...themes);
    root.classList.add(theme);
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  } catch {
    const root = document.documentElement;
    root.classList.remove(...themes);
    root.classList.add(fallbackTheme);
    root.dataset.theme = fallbackTheme;
    root.style.colorScheme = fallbackTheme;
  }
})();
`;
