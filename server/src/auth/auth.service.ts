import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { AuthResponseDto, MeResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser, JwtPayload } from './jwt-payload.interface';

// Postgres unique_violation 코드. DATA-MODEL 2-1 — 동시 가입 경쟁을 DB 제약으로 최종 방어한다.
const POSTGRES_UNIQUE_VIOLATION = '23505';
const BCRYPT_COST = 10;
const LOGIN_FAILURE_MESSAGE = '이메일 또는 비밀번호가 올바르지 않습니다.';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 신규 계정을 생성한다. 이메일 중복은 사전 조회로도 걸러지지만, 동시 요청 경쟁
   * 상황에서는 DB unique 제약(23505)만이 최종 방어선이므로 이를 잡아 409로 변환한다.
   * @throws ConflictException 이메일이 이미 존재할 때
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    let user: User;
    try {
      user = await this.users.save(
        this.users.create({
          email: dto.email,
          nickname: dto.nickname,
          passwordHash,
        }),
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }
      throw error;
    }

    return this.issueTokenResponse(user);
  }

  /**
   * 데모 계정(`admin`)도 포함해 항상 동일한 bcrypt 비교 경로를 탄다 — 인증 우회 없음.
   * 이메일 존재 여부가 새어나가지 않도록 실패 사유를 구분하지 않고 동일 메시지로 401을 던진다.
   * @throws UnauthorizedException 이메일이 없거나 비밀번호가 틀렸을 때
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException(LOGIN_FAILURE_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException(LOGIN_FAILURE_MESSAGE);
    }

    return this.issueTokenResponse(user);
  }

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private issueTokenResponse(user: User): AuthResponseDto {
    const payload: JwtPayload = { sub: user.id, nickname: user.nickname };
    // 만료시간은 AuthModule의 JwtModule.registerAsync 기본 signOptions를 그대로 따른다.
    const accessToken = this.jwtService.sign(payload);

    const summary: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    };
    return { accessToken, user: summary };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
    );
  }
}
