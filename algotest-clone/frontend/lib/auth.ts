import { UserProfile } from "./auth-api";

export const auth = {
  getAccessToken: (): string | null =>
    typeof window === "undefined" ? null : localStorage.getItem("access_token"),

  getRefreshToken: (): string | null =>
    typeof window === "undefined" ? null : localStorage.getItem("refresh_token"),

  setTokens: (access: string, refresh?: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
  },

  getUser: (): UserProfile | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("user_profile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser: (user: UserProfile) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("user_profile", JSON.stringify(user));
    window.dispatchEvent(new Event("auth_user_changed"));
  },

  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem("access_token"));
  },

  logout: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_profile");
    window.dispatchEvent(new Event("auth_user_changed"));
  },
};