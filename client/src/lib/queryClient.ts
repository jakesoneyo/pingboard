import { QueryClient } from "@tanstack/react-query";

/**
 * 앱 전역에서 공유하는 단일 QueryClient 인스턴스.
 * 소켓 훅(`useNotificationSocket`)이 컴포넌트 트리 밖(이벤트 콜백)에서도
 * `invalidateQueries`를 호출해야 하므로, Provider에도 이 인스턴스를 그대로 넘긴다.
 *
 * `refetchOnWindowFocus`(기본 true)는 SC-2의 보조 안전망으로 그대로 둔다(API.md 7-4).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});
