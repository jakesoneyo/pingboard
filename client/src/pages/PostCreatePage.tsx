import { useState } from "react";
import type { FormEvent } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { useCreatePost } from "../hooks/usePosts";
import { createPostSchema } from "../lib/validation";
import type { ApiErrorResponse } from "../types";

export function PostCreatePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const createPost = useCreatePost();
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = createPostSchema.safeParse({ title, content });
    if (!result.success) {
      setFieldError(
        result.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
      return;
    }
    setFieldError(null);
    createPost.mutate(result.data, {
      onSuccess: (post) => navigate(`/posts/${post.id}`),
    });
  };

  const serverMessage = extractErrorMessage(createPost.error);

  return (
    <div>
      <h1 className="mb-4 text-lg font-extrabold text-ink">글쓰기</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-[14px] border border-border-warm bg-card px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
        <textarea
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="resize-none rounded-[14px] border border-border-warm bg-card px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
        {(fieldError || serverMessage) && (
          <p className="text-xs text-red-600">{fieldError ?? serverMessage}</p>
        )}
        <button
          type="submit"
          disabled={createPost.isPending}
          className="self-start rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          작성 완료
        </button>
      </form>
    </div>
  );
}

function extractErrorMessage(error: unknown): string | null {
  if (!isAxiosError<ApiErrorResponse>(error)) return null;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? "글 작성에 실패했습니다.";
}
