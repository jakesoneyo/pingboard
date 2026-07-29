import { z } from "zod";

/**
 * 폼 검증 스키마 — 백엔드 class-validator 제약(API.md)과 길이 제한을 동일하게 맞춘다.
 * 로그인만 데모 계정 리터럴 `'admin'` 예외를 허용한다(CLAUDE.md 데모 계정 규약,
 * RegisterDto에는 이 예외를 절대 적용하지 않음 — 서버와 동일한 좁은 예외 원칙).
 */
export const loginSchema = z.object({
  email: z
    .string()
    .refine(
      (value) =>
        value === "admin" || z.string().email().safeParse(value).success,
      { message: "올바른 이메일 형식이 아닙니다." },
    ),
  password: z.string().min(1, "비밀번호를 입력해 주세요.").max(64),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  nickname: z.string().min(2, "닉네임은 2자 이상이어야 합니다.").max(30),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(64),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const createPostSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(120),
  content: z.string().min(1, "내용을 입력해 주세요.").max(5000),
});
export type CreatePostFormValues = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  content: z.string().min(1, "댓글 내용을 입력해 주세요.").max(1000),
});
export type CreateCommentFormValues = z.infer<typeof createCommentSchema>;
