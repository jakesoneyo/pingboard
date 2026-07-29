import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreatePostFormValues } from "../lib/validation";
import type { PaginatedPosts, PostDetail } from "../types";

/** `GET /posts` 목록 조회 — 최신순 페이지네이션(API.md 4장). */
export function usePosts(page: number, limit = 20) {
  return useQuery({
    queryKey: ["posts", page, limit],
    queryFn: async () => {
      const { data } = await api.get<PaginatedPosts>("/posts", {
        params: { page, limit },
      });
      return data;
    },
  });
}

/** `GET /posts/:id` 상세 — 댓글 목록을 함께 받는다. */
export function usePostDetail(postId: string | undefined) {
  return useQuery({
    queryKey: ["posts", postId],
    queryFn: async () => {
      const { data } = await api.get<PostDetail>(`/posts/${postId}`);
      return data;
    },
    enabled: Boolean(postId),
  });
}

/** 글 작성 — 성공 시 목록 캐시를 무효화해 새 글이 바로 보이게 한다. */
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: CreatePostFormValues) => {
      const { data } = await api.post<PostDetail>("/posts", values);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
