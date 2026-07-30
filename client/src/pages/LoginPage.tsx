import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { DEMO_CREDENTIALS, useLogin } from "../hooks/useAuth";
import { loginSchema } from "../lib/validation";
import type { ApiErrorResponse } from "../types";
import { isAxiosError } from "axios";

/**
 * 로그인 화면. 데모 버튼은 CLAUDE.md 데모 계정 규약이 정한 문구를 그대로 쓴다 —
 * 다른 프로젝트와 통일해야 하는 고정 문구이므로 임의로 바꾸지 않는다.
 * 데모 버튼도 폼에 자동 채우고 동일한 `useLogin` 뮤테이션(=정상 로그인 API)을 호출할 뿐,
 * 비밀번호 검증을 우회하는 별도 경로는 없다.
 */
export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showColdStartHint, setShowColdStartHint] = useState(false);
  const login = useLogin();

  // Render 무료 티어 콜드스타트로 로그인이 오래 걸릴 수 있어, 4초 넘게 pending이면
  // "화면이 멈췄다"는 오해를 막기 위해 안내 문구를 띄운다. 요청이 끝나면 즉시 정리한다.
  useEffect(() => {
    if (!login.isPending) return;
    const timer = setTimeout(() => setShowColdStartHint(true), 4000);
    return () => {
      clearTimeout(timer);
      setShowColdStartHint(false);
    };
  }, [login.isPending]);

  const attemptLogin = (values: { email: string; password: string }) => {
    const result = loginSchema.safeParse(values);
    if (!result.success) {
      setFieldError(
        result.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
      return;
    }
    setFieldError(null);
    login.mutate(result.data);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    attemptLogin({ email, password });
  };

  const serverMessage = extractErrorMessage(login.error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border-warm bg-card p-8">
        <h1 className="mb-1 text-xl font-extrabold text-accent">pingboard</h1>
        <p className="mb-6 text-sm text-ink/60">게시판 + 실시간 알림함</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="이메일 (데모 계정은 admin)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-border-warm px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-border-warm px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />

          {(fieldError || serverMessage) && (
            <p className="text-xs text-red-600">
              {fieldError ?? serverMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="mt-1 rounded-xl bg-accent px-3.5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            로그인
          </button>
          {showColdStartHint && (
            <p className="text-center text-xs text-ink/50">
              서버를 깨우는 중입니다.
            </p>
          )}
        </form>

        <button
          type="button"
          onClick={() => attemptLogin(DEMO_CREDENTIALS)}
          disabled={login.isPending}
          className="mt-3 w-full rounded-xl border-2 border-accent px-3.5 py-2.5 text-sm font-bold text-accent hover:bg-accent hover:text-white disabled:opacity-50"
        >
          회원가입 없이 둘러보기
        </button>
        <p className="mt-2 text-center text-xs text-ink/50">
          회원가입 없이 체험해 볼 수 있습니다.
        </p>

        <p className="mt-6 text-center text-xs text-ink/50">
          계정이 없으신가요?{" "}
          <Link to="/register" className="font-bold text-accent">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

function extractErrorMessage(error: unknown): string | null {
  if (!isAxiosError<ApiErrorResponse>(error)) return null;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? "로그인에 실패했습니다.";
}
