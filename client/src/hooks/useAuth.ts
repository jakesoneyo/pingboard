import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { disconnectSocket } from "../lib/socket";
import { useAuthStore } from "../stores/auth.store";
import type { AuthResponse } from "../types";
import type { LoginFormValues, RegisterFormValues } from "../lib/validation";

/** 데모 로그인 버튼이 자동 채우는 값 — 서버가 시드해 둔 admin/admin 계정(CLAUDE.md 규약). */
export const DEMO_CREDENTIALS: LoginFormValues = {
  email: "admin",
  password: "admin",
};

/**
 * 로그인 성공 후 공통으로 해야 할 일(세션 저장 + 이동)을 한 곳에 모은다.
 * 소켓 연결은 여기서 직접 하지 않는다 — 앱 루트에 1회만 마운트되는
 * `useNotificationSocket`이 `token` 스토어 값을 구독해 연결/해제를 전담한다
 * (연결 로직이 두 곳에 흩어지는 것을 막기 위함). 데모 로그인도 이 훅을 그대로 타므로
 * "정상 인증 절차를 우회하지 않는다"는 규칙을 지킨다.
 */
function useAuthSuccess() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return (data: AuthResponse) => {
    setAuth(data.accessToken, data.user);
    navigate("/");
  };
}

export function useLogin() {
  const onSuccess = useAuthSuccess();
  return useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await api.post<AuthResponse>("/auth/login", values);
      return data;
    },
    onSuccess,
  });
}

export function useRegister() {
  const onSuccess = useAuthSuccess();
  return useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const { data } = await api.post<AuthResponse>("/auth/register", values);
      return data;
    },
    onSuccess,
  });
}

/** 로그아웃 — 소켓 연결 해제 + 로컬 세션 폐기. 서버에 별도 로그아웃 엔드포인트는 없다(단일 access token). */
export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  return () => {
    disconnectSocket();
    clearAuth();
    navigate("/login");
  };
}
