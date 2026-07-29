/**
 * `CORS_ORIGINS`(콤마 구분) 환경변수를 화이트리스트 배열로 파싱한다.
 * REST(main.ts)와 소켓 게이트웨이(@WebSocketGateway 데코레이터) 양쪽에서 공유해
 * `origin: true` 같은 전체 허용을 쓰지 않고 한 곳의 설정으로 두 경로를 동시에 관리한다.
 *
 * 게이트웨이 데코레이터는 클래스 파일이 로드되는 시점(=main.ts가 AppModule을 import하는
 * 시점)에 평가되므로, `main.ts` 최상단에서 `import 'dotenv/config'`를 가장 먼저 실행해
 * 이 함수가 호출될 때 이미 `process.env`가 채워져 있어야 한다.
 */
export function parseCorsOrigins(
  raw = process.env.CORS_ORIGINS ?? '',
): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
