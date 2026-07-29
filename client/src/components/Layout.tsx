import { Outlet } from "react-router-dom";
import { ConnectionBadge } from "./ConnectionBadge";
import { NotificationBell } from "./NotificationBell";
import { NotificationPanel } from "./NotificationPanel";
import { SideNav } from "./SideNav";
import { useAuthStore } from "../stores/auth.store";
import { useLogout } from "../hooks/useAuth";

/**
 * 앱 전역 셸. DESIGN.md가 확정한 3분할(좌 네비 · 가운데 콘텐츠 · 우 알림 패널) +
 * 최대 폭 1040px 가운데 정렬을 그대로 지킨다 — 브라우저 풀블리드 금지가 사람이 명시한 요구사항.
 */
export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto flex max-w-[1040px] items-center justify-between px-6 py-4">
        <span className="text-base font-extrabold text-accent">pingboard</span>
        <div className="flex items-center gap-3">
          <ConnectionBadge />
          <NotificationBell />
          {user && (
            <button
              type="button"
              onClick={logout}
              className="text-xs font-medium text-ink/50 hover:text-accent"
            >
              로그아웃 ({user.nickname})
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1040px] grid-cols-[200px_1fr_260px] gap-6 border-t border-border-warm px-6 py-6">
        <div className="border-r border-border-warm pr-4">
          <SideNav />
        </div>
        <main className="min-w-0">
          <Outlet />
        </main>
        <div className="border-l border-border-warm pl-4">
          <NotificationPanel />
        </div>
      </div>
    </div>
  );
}
