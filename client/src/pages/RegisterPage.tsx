import { useState } from "react";
import type { FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router-dom";
import { useRegister } from "../hooks/useAuth";
import { registerSchema } from "../lib/validation";
import type { ApiErrorResponse } from "../types";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const register = useRegister();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = registerSchema.safeParse({ email, nickname, password });
    if (!result.success) {
      setFieldError(
        result.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
      return;
    }
    setFieldError(null);
    register.mutate(result.data);
  };

  const serverMessage = extractErrorMessage(register.error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border-warm bg-card p-8">
        <h1 className="mb-1 text-xl font-extrabold text-accent">회원가입</h1>
        <p className="mb-6 text-sm text-ink/60">
          pingboard에 오신 것을 환영합니다
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-border-warm px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            type="text"
            placeholder="닉네임 (2~30자)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="rounded-xl border border-border-warm px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="비밀번호 (8~64자)"
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
            disabled={register.isPending}
            className="mt-1 rounded-xl bg-accent px-3.5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            가입하기
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink/50">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="font-bold text-accent">
            로그인
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
  return message ?? "회원가입에 실패했습니다.";
}
