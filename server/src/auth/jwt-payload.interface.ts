/** REST와 소켓 핸드셰이크 양쪽에서 공유하는 JWT payload 형태(API.md 3장). */
export interface JwtPayload {
  sub: string;
  nickname: string;
}

/** 인증된 요청에 부착되는 사용자 정보(JwtStrategy.validate의 반환값). */
export interface AuthenticatedUser {
  id: string;
  email: string;
  nickname: string;
}
