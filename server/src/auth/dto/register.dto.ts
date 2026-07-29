import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Length } from 'class-validator';

/**
 * 회원가입 요청. 데모 계정 예외는 절대 여기 적용하지 않는다 — 일반 사용자는
 * 항상 형식이 맞는 진짜 이메일로 가입해야 한다(CLAUDE.md 데모 계정 규약).
 */
export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '영선' })
  @Length(2, 30)
  nickname: string;

  @ApiProperty({ example: 'password123' })
  @Length(8, 64)
  password: string;
}
