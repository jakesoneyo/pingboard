import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

/** 토큰이 없으면 로그인 화면으로 보낸다. 글쓰기 등 인증이 필요한 라우트에서만 사용. */
export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
