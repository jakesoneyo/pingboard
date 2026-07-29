import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { useAuthStore } from "../stores/auth.store";
import { usePresenceStore } from "../stores/presence.store";
import { NOTIFICATIONS_QUERY_KEY } from "./useNotifications";
import type { NotificationDto, NotificationsListResponse } from "../types";

interface NotificationNewPayload {
  notification: NotificationDto;
  unreadCount: number;
}

interface NotificationReadPayload {
  ids: string[];
  unreadCount: number;
}

interface PresenceSyncPayload {
  connections: number;
}

/**
 * 앱 루트에서 딱 1회만 마운트되는 알림 소켓 훅(PLAN B-3). 소켓 연결/해제 자체와
 * 4개 서버 이벤트 처리를 전부 여기서 담당한다 — 컴포넌트 여러 곳에서 리스너를
 * 중복 등록하면 알림이 여러 번 처리되는 버그로 이어지기 쉽기 때문이다.
 */
export function useNotificationSocket() {
  const token = useAuthStore((s) => s.token);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setStatus = usePresenceStore((s) => s.setStatus);
  const setConnections = usePresenceStore((s) => s.setConnections);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setStatus("disconnected");
      setConnections(0);
      return;
    }

    const socket = connectSocket(token);
    setStatus(socket.connected ? "connected" : "connecting");

    /**
     * 최초 연결과 재연결 모두 여기를 탄다(API.md 7-4). 끊긴 동안 유실된 emit을
     * DB 재조회로 덮어써야 하므로 이 한 줄이 SC-2(재연결 유실 0건)의 핵심이다.
     */
    const handleConnect = () => {
      setStatus("connected");
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    };

    // 정상적인 일시 끊김(네트워크 단절 등) — socket.io가 자동 재연결을 계속 시도한다.
    const handleDisconnect = () => {
      setStatus("connecting");
    };

    /**
     * 미들웨어가 핸드셰이크 자체를 거부한 경우(`next(new Error(...))`) socket.io는
     * `socket.active`를 false로 만들고 자동 재연결을 멈춘다(SC-7). 토큰 위조/만료가
     * 이 경로로 들어오므로, 여기서만 세션을 폐기하고 로그인 화면으로 보낸다 —
     * 일시적 네트워크 문제(`socket.active === true`)까지 로그아웃시키지 않기 위함이다.
     */
    const handleConnectError = () => {
      if (!socket.active) {
        setStatus("disconnected");
        clearAuth();
        navigate("/login");
      }
    };

    // id 기준 upsert: 이미 캐시에 있으면(레이스 컨디션으로 REST 재동기화와 겹친 경우)
    // 교체, 없으면 최신 알림이 위로 오도록 배열 맨 앞에 삽입한다. unreadCount는
    // 클라이언트가 +1로 추측하지 않고 서버가 계산한 값을 그대로 신뢰한다.
    const handleNotificationNew = (payload: NotificationNewPayload) => {
      queryClient.setQueryData<NotificationsListResponse>(
        NOTIFICATIONS_QUERY_KEY,
        (prev) => {
          const items = prev?.items ?? [];
          const existingIndex = items.findIndex(
            (item) => item.id === payload.notification.id,
          );
          const nextItems =
            existingIndex >= 0
              ? items.map((item, i) =>
                  i === existingIndex ? payload.notification : item,
                )
              : [payload.notification, ...items];
          return { items: nextItems, unreadCount: payload.unreadCount };
        },
      );
    };

    // 알림함이 "미읽음만" 보여주는 뷰이므로(useNotifications 주석 참고), 읽음 처리된
    // id는 목록에서 제거하는 것이 isRead=true로 바꾸는 것과 동등하다. 다른 탭에서
    // 읽었을 때도 이 이벤트로 동일하게 반영된다(SC-5).
    const handleNotificationRead = (payload: NotificationReadPayload) => {
      queryClient.setQueryData<NotificationsListResponse>(
        NOTIFICATIONS_QUERY_KEY,
        (prev) => ({
          items: (prev?.items ?? []).filter(
            (item) => !payload.ids.includes(item.id),
          ),
          unreadCount: payload.unreadCount,
        }),
      );
    };

    const handlePresenceSync = (payload: PresenceSyncPayload) => {
      setConnections(payload.connections);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("notification:new", handleNotificationNew);
    socket.on("notification:read", handleNotificationRead);
    socket.on("presence:sync", handlePresenceSync);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("notification:new", handleNotificationNew);
      socket.off("notification:read", handleNotificationRead);
      socket.off("presence:sync", handlePresenceSync);
    };
  }, [token, clearAuth, navigate, setStatus, setConnections, queryClient]);
}
