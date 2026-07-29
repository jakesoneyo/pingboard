import { io, type Socket } from "socket.io-client";

/**
 * 알림 소켓 싱글턴 관리.
 *
 * `io()`를 훅이 호출될 때마다 새로 만들면 컴포넌트 리렌더마다 연결이 중복 생성되므로,
 * 모듈 스코프에 인스턴스를 하나만 유지한다(PLAN B-3). 인증은 REST와 동일한 JWT를
 * `auth.token`으로 핸드셰이크에 실어 보내고(API.md 7-1), 서버 `server.use()` 미들웨어가
 * 검증한다 — 클라이언트가 할 일은 연결 시점에 최신 토큰을 넘기는 것뿐이다.
 */
let socket: Socket | null = null;
let socketToken: string | null = null;

/**
 * 로그인 시 호출한다. 이미 같은 토큰으로 연결된 소켓이 있으면 재사용하고,
 * 토큰이 바뀌었으면(재로그인 등) 이전 소켓을 완전히 버리고 새로 만든다 —
 * socket.io는 연결 후 `auth` 값을 바꿀 방법이 없으므로 재생성이 유일한 방법이다.
 */
export function connectSocket(token: string): Socket {
  if (socket && socketToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(import.meta.env.VITE_API_URL ?? "http://localhost:3000", {
    auth: { token },
    autoConnect: false,
  });
  socketToken = token;
  socket.connect();
  return socket;
}

/** 로그아웃 시 호출한다. 리스너까지 정리해 다음 로그인에서 이벤트가 중복 등록되지 않게 한다. */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  socketToken = null;
}

export function getSocket(): Socket | null {
  return socket;
}
