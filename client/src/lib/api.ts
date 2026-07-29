import axios, { AxiosError } from "axios";
import { useAuthStore } from "../stores/auth.store";

/** 모든 REST 호출이 거치는 단일 axios 인스턴스. Base URL은 배포 환경별로 `.env`에서 주입. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
});

// 매 요청에 최신 JWT를 붙인다 — 인터셉터라 로그인/로그아웃 시 재설정이 필요 없다.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * 401(토큰 없음/만료/위조)을 전역에서 잡아 세션을 폐기하고 로그인 화면으로 보낸다.
 * 개별 화면마다 401 처리를 반복하지 않기 위한 공통 처리.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      if (location.pathname !== "/login") {
        location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
