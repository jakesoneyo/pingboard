import { Injectable } from '@nestjs/common';

/**
 * userId → 활성 소켓 id 집합의 프로세스 로컬 메모리 레지스트리.
 *
 * 실제 알림 전달은 socket.io room(`user:{userId}`)이 담당하고, 이 레지스트리는
 * "연결 수 배지(F10)"·서버 로그 등 동기 조회가 필요한 관측 용도로만 쓰인다
 * (ARCHITECTURE 2-2 — room이 1차, Registry가 보조).
 *
 * 단일 인스턴스 전제: 프로세스를 여러 개로 늘리면 이 Map은 인스턴스별로 따로 논다.
 * 그 시점에 필요한 것이 `@socket.io/redis-adapter`다(README "알려진 한계" 참고).
 */
@Injectable()
export class UserSocketRegistry {
  private readonly socketsByUser = new Map<string, Set<string>>();

  /** @returns 추가 이후 해당 유저의 활성 소켓 수 */
  add(userId: string, socketId: string): number {
    const sockets = this.socketsByUser.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.socketsByUser.set(userId, sockets);
    return sockets.size;
  }

  /**
   * Set이 비면 Map 키 자체를 삭제한다. 안 그러면 한 번이라도 접속한 모든 userId가
   * 프로세스 생존 기간 내내 빈 Set으로 남아 서서히 메모리를 잠식한다.
   * @returns 제거 이후 해당 유저의 활성 소켓 수(0이면 완전히 오프라인)
   */
  remove(userId: string, socketId: string): number {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets) {
      return 0;
    }
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.socketsByUser.delete(userId);
      return 0;
    }
    return sockets.size;
  }

  count(userId: string): number {
    return this.socketsByUser.get(userId)?.size ?? 0;
  }
}
