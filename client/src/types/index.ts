/**
 * 서버(API.md) 응답 형태와 1:1로 맞춘 타입 모음.
 * REST와 소켓 payload가 `NotificationDto`를 공유하므로 타입도 하나만 둔다.
 */

export interface UserSummary {
  id: string;
  email: string;
  nickname: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserSummary;
}

export interface MeResponse extends UserSummary {
  createdAt: string;
}

export interface CommentSummary {
  id: string;
  content: string;
  author: UserSummary;
  createdAt: string;
}

export interface PostListItem {
  id: string;
  title: string;
  author: UserSummary;
  commentCount: number;
  createdAt: string;
}

export interface PaginatedPosts {
  items: PostListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PostDetail {
  id: string;
  title: string;
  content: string;
  author: UserSummary;
  createdAt: string;
  comments: CommentSummary[];
}

export type NotificationType = "COMMENT";

export interface NotificationDto {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  actor: UserSummary;
  post: { id: string; title: string };
  commentPreview: string;
}

export interface NotificationsListResponse {
  items: NotificationDto[];
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface MarkReadResponse {
  unreadCount: number;
}

export interface MarkAllReadResponse {
  updatedIds: string[];
  unreadCount: number;
}

/** 전역 예외 필터가 통일해서 내려주는 에러 응답 형태(API.md 2장). */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
