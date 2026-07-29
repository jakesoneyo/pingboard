import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './jwt-payload.interface';

interface RequestWithUser {
  user: AuthenticatedUser;
}

/** `JwtAuthGuard` 통과 후 `request.user`에 채워진 인증 사용자를 컨트롤러 인자로 꺼낸다. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
