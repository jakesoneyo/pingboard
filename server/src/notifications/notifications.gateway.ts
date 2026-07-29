import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { parseCorsOrigins } from '../config/cors.util';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { NotificationDto } from './dto/notification-response.dto';
import { UserSocketRegistry } from './user-socket.registry';

/** 인증 미들웨어가 `socket.data`에 채우는 값 — socket.io의 SocketData 제네릭으로 타입을 고정한다. */
interface AuthSocketData {
  userId: string;
}
type AppSocket = Socket<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  AuthSocketData
>;

/**
 * 알림 실시간 전달 게이트웨이.
 *
 * 이 클래스는 **아무 비즈니스 로직도 갖지 않는다** — emit만 한다(ARCHITECTURE 2-3).
 * 알림 생성·조회·읽음 처리는 전부 NotificationsService/Controller(REST)의 책임이고,
 * 클라이언트가 서버로 보내는 이벤트는 0개다(쓰기는 항상 REST).
 *
 * REST와 동일한 HTTP 서버·포트를 공유한다(별도 포트 지정 없음, ARCHITECTURE 1장).
 */
@WebSocketGateway({ cors: { origin: parseCorsOrigins(), credentials: true } })
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly registry: UserSocketRegistry,
  ) {}

  /**
   * 연결 인증 미들웨어. `handleConnection`이 아니라 `server.use()`에서 거부하는 이유(SC-7):
   * socket.io v4에서 미들웨어가 거부한 연결은 클라이언트가 자동 재연결을 시도하지 않는다
   * (`socket.active === false`). `handleConnection` 안에서 `socket.disconnect()`를 하면
   * 클라이언트가 "일시적 끊김"으로 오인해 무한 재연결 루프를 돈다 — 토큰 만료마다 서버를
   * 폴링으로 때리는 실패를 여기서 구조적으로 막는다(ARCHITECTURE 2-1).
   */
  afterInit(server: Server): void {
    server.use((socket: AppSocket, next: (err?: Error) => void) => {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        next(new Error('UNAUTHORIZED'));
        return;
      }

      this.jwtService
        .verifyAsync<JwtPayload>(token)
        .then((payload) => {
          socket.data.userId = payload.sub;
          next();
        })
        .catch(() => next(new Error('UNAUTHORIZED')));
    });
  }

  /** 인증 성공 소켓을 `user:{userId}` room에 join시키고, 연결 수를 갱신·브로드캐스트한다. */
  handleConnection(socket: AppSocket): void {
    const userId = socket.data.userId;
    // 기본 in-memory 어댑터에서 join()은 동기적으로 끝난다(Redis 어댑터 전환 시에만 비동기).
    void socket.join(this.roomFor(userId));
    const connections = this.registry.add(userId, socket.id);
    this.server.to(this.roomFor(userId)).emit('presence:sync', { connections });
  }

  /**
   * room 탈퇴는 socket.io가 자동 처리한다. Registry만 명시적으로 정리한다.
   * 남은 연결이 있을 때만 presence:sync를 보낸다 — 완전히 끊긴 유저에게는 보낼 대상이 없다.
   */
  handleDisconnect(socket: AppSocket): void {
    const userId = socket.data.userId;
    if (!userId) {
      return;
    }
    const connections = this.registry.remove(userId, socket.id);
    if (connections > 0) {
      this.server
        .to(this.roomFor(userId))
        .emit('presence:sync', { connections });
    }
  }

  /**
   * 댓글 알림 발생을 수신자의 모든 활성 탭에 브로드캐스트한다.
   * 호출 시점은 반드시 댓글+알림 트랜잭션 커밋 이후여야 한다(API.md 5장 서버 동작 순서).
   * 이 emit이 실패해도 알림은 이미 DB에 있으므로 호출부의 201 응답을 막지 않는다.
   */
  notifyNew(
    recipientId: string,
    notification: NotificationDto,
    unreadCount: number,
  ): void {
    this.server.to(this.roomFor(recipientId)).emit('notification:new', {
      notification,
      unreadCount,
    });
  }

  /** 읽음 처리 결과를 같은 유저의 모든 탭에 동기화한다(SC-5). */
  notifyRead(userId: string, ids: string[], unreadCount: number): void {
    this.server
      .to(this.roomFor(userId))
      .emit('notification:read', { ids, unreadCount });
  }

  private roomFor(userId: string): string {
    return `user:${userId}`;
  }
}
