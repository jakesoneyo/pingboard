import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** REST 엔드포인트 보호용 가드. `@UseGuards(JwtAuthGuard)`로 붙인다. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
