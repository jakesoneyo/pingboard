import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreateCommentFormValues } from "../lib/validation";
import type { CommentSummary } from "../types";

/**
 * 댓글 작성. 성공 시 해당 글 상세 캐시만 무효화한다 — 알림 자체는 서버가
 * 트랜잭션 커밋 후 소켓으로 브로드캐스트하므로 여기서 알림 쿼리를 건드릴 필요가 없다
 * (내가 쓴 댓글로 내가 알림을 받는 경우는 자기 글이 아닌 한 없다).
 */
export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: CreateCommentFormValues) => {
      const { data } = await api.post<CommentSummary>(
        `/posts/${postId}/comments`,
        values,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
