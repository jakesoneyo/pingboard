import { ApiProperty } from '@nestjs/swagger';

/** 응답에 노출할 사용자 필드만 담는다 — `passwordHash`는 절대 직렬화하지 않는다. */
export class UserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

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
