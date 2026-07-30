import { ApiProperty } from '@nestjs/swagger';

/**
 * 본인 응답(`/auth/login`, `/auth/register`, `/auth/me`) 전용 — `email`을 포함한다.
 * 타인에게 노출되는 게시글/댓글/알림 응답에는 절대 재사용하지 않는다(B2 — `AuthorSummaryDto` 참고).
 */
export class UserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  nickname: string;
}

/**
 * 타인에게 노출되는 작성자/행위자 정보(API.md 4~7장) — 이메일은 절대 포함하지 않는다.
 * `GET /posts`는 인증조차 필요 없어서 `UserSummaryDto`를 재사용하면 전체 가입자 이메일이
 * 새어 나간다(B2).
 */
export class AuthorSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nickname: string;
}

/** `POST /auth/register`, `POST /auth/login` 공통 응답 형태(API.md 3장). */
export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;
}

/** `GET /auth/me` 응답. */
export class MeResponseDto extends UserSummaryDto {
  @ApiProperty()
  createdAt: string;
}
