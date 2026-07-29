import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Length, ValidateIf } from 'class-validator';

/**
 * 로그인 요청.
 *
 * **데모 계정 예외는 이 DTO 한 곳에만 존재한다**: `email`이 정확히 문자열 `'admin'`일 때만
 * 이메일 형식 검증(`@IsEmail`)을 건너뛴다. 그 외 모든 값은 정상적으로 이메일 형식이어야 한다.
 * RegisterDto에는 이 예외를 절대 적용하지 않는다(CLAUDE.md 데모 계정 규약 — 좁은 예외 원칙).
 * 비밀번호는 이 예외와 무관하게 항상 bcrypt 비교를 거친다(AuthService에서 처리).
 */
export class LoginDto {
  @ApiProperty({
    example: 'admin',
    description: "데모 계정은 문자열 'admin'을 그대로 사용",
  })
  @ValidateIf((o: LoginDto) => o.email !== 'admin')
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin' })
  @Length(1, 64)
  password: string;
}
