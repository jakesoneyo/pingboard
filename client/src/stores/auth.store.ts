import { create } from "zustand";
import type { UserSummary } from "../types";

const STORAGE_KEY = "pingboard.auth";

interface StoredAuth {
  token: string;
  user: UserSummary;
}

/**
 * 트레이드오프(README에도 명시): JWT를 localStorage에 저장한다.
 * httpOnly 쿠키 대비 XSS에 더 취약하지만, 소켓 핸드셰이크(`auth: { token }`)에
 * 토큰을 직접 실어야 하는 이 프로젝트 구조상 JS에서 토큰을 읽을 수 있어야 하고,
 * S 티어 스코프에서 별도 BFF/쿠키 프록시를 두는 비용을 지지 않기로 했다.
 */
function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

interface AuthState {
  token: string | null;
  user: UserSummary | null;
  /** 로그인/회원가입 성공 시 토큰+유저를 저장하고 localStorage에 영속한다. */
  setAuth: (token: string, user: UserSummary) => void;
  /** 로그아웃 또는 401/소켓 인증 실패 시 세션을 완전히 폐기한다. */
  clearAuth: () => void;
}

const initial = loadStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  token: initial?.token ?? null,
  user: initial?.user ?? null,
  setAuth: (token, user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },
  clearAuth: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  },
}));
