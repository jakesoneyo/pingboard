import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  MarkAllReadResponse,
  MarkReadResponse,
  NotificationsListResponse,
} from "../types";

/**
 * 알림함의 단일 진실 소스 쿼리 키. Bell 드롭다운과 우측 알림 패널이 이 키를 공유해
 * 같은 데이터를 렌더링한다(중복 fetch 없음). 항상 `unreadOnly=true`로 고정한 이유:
 * 이 화면의 역할은 "읽지 않은 알림 받은함"이고, 읽으면 목록에서 사라지는 편이
 * 뱃지 숫자 = 목록 길이라는 단순한 정신 모델을 유지해 SC-5(다른 탭 동기화) 확인이 쉽다.
 * 재연결 시 재동기화도 API.md 7-4가 명시한 그대로 `unreadOnly=true&limit=100`을 호출한다.
 */
export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<NotificationsListResponse>(
        "/notifications",
        { params: { unreadOnly: true, limit: 100 } },
      );
      return data;
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<MarkReadResponse>(
        `/notifications/${id}/read`,
      );
      return { id, ...data };
    },
    onSuccess: ({ id, unreadCount }) => {
      queryClient.setQueryData<NotificationsListResponse>(
        NOTIFICATIONS_QUERY_KEY,
        (prev) =>
          prev && {
            items: prev.items.filter((item) => item.id !== id),
            unreadCount,
          },
      );
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<MarkAllReadResponse>(
        "/notifications/read-all",
      );
      return data;
    },
    onSuccess: () => {
      queryClient.setQueryData<NotificationsListResponse>(
        NOTIFICATIONS_QUERY_KEY,
        { items: [], unreadCount: 0 },
      );
    },
  });
}
