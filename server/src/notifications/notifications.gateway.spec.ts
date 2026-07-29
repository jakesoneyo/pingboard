import { JwtService } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { UserSocketRegistry } from './user-socket.registry';

/**
 * 소켓 인증 미들웨어(SC-7)와 다중 탭 registry 카운트(SC-4의 서버 측 근거)를 고정한다.
 * 실제 socket.io 서버를 띄우지 않고 `afterInit`이 등록하는 미들웨어 함수만 직접 호출한다.
 */
describe('NotificationsGateway', () => {
  function buildGateway(jwtService: Partial<JwtService>) {
    const registry = new UserSocketRegistry();
    const gateway = new NotificationsGateway(
      jwtService as JwtService,
      registry,
    );
    return { gateway, registry };
  }

  function captureMiddleware(gateway: NotificationsGateway) {
    const use = jest.fn();
    gateway.afterInit({ use } as any);
    return use.mock.calls[0][0] as (
      socket: any,
      next: (err?: Error) => void,
    ) => void;
  }

  it('유효한 토큰이면 next()를 호출하고 socket.data.userId를 채운다', async () => {
    const verifyAsync = jest
      .fn()
      .mockResolvedValue({ sub: 'user-1', nickname: 'A' });
    const { gateway } = buildGateway({ verifyAsync });
    const middleware = captureMiddleware(gateway);

    const socket = {
      handshake: { auth: { token: 'valid.jwt.token' } },
      data: {} as any,
    };
    const next = jest.fn();

    middleware(socket, next);
    await Promise.resolve();
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith();
    expect(socket.data.userId).toBe('user-1');
  });

  it('토큰이 없거나 무효/만료면 next(Error)를 호출한다(SC-7)', async () => {
    const verifyAsync = jest.fn().mockRejectedValue(new Error('jwt expired'));
    const { gateway } = buildGateway({ verifyAsync });
    const middleware = captureMiddleware(gateway);

    const noTokenNext = jest.fn();
    middleware({ handshake: { auth: {} }, data: {} }, noTokenNext);
    expect(noTokenNext).toHaveBeenCalledWith(expect.any(Error));
    expect(noTokenNext.mock.calls[0][0].message).toBe('UNAUTHORIZED');

    const badTokenNext = jest.fn();
    middleware(
      { handshake: { auth: { token: 'expired.jwt' } }, data: {} },
      badTokenNext,
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(badTokenNext).toHaveBeenCalledWith(expect.any(Error));
    expect(badTokenNext.mock.calls[0][0].message).toBe('UNAUTHORIZED');
  });

  it('같은 userId로 소켓 2개가 연결되면 registry count가 2가 된다(다중 탭)', () => {
    const { gateway, registry } = buildGateway({});
    gateway.server = { to: jest.fn(() => ({ emit: jest.fn() })) } as any;

    const userId = 'user-1';
    const socketA = { id: 'socket-a', data: { userId }, join: jest.fn() };
    const socketB = { id: 'socket-b', data: { userId }, join: jest.fn() };

    gateway.handleConnection(socketA as any);
    gateway.handleConnection(socketB as any);

    expect(registry.count(userId)).toBe(2);
    expect(socketA.join).toHaveBeenCalledWith(`user:${userId}`);
    expect(socketB.join).toHaveBeenCalledWith(`user:${userId}`);
  });
});
