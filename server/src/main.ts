// dotenv는 반드시 다른 import보다 먼저 실행되어야 한다. AppModule → NotificationsModule →
// NotificationsGateway가 require되는 순간(@WebSocketGateway 데코레이터 평가 시점)에
// 이미 process.env.CORS_ORIGINS가 채워져 있어야 하기 때문이다(cors.util.ts 주석 참고).
import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { parseCorsOrigins } from './config/cors.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 화이트리스트 방식 CORS — origin: true(전체 허용)는 절대 쓰지 않는다.
  app.enableCors({ origin: parseCorsOrigins(), credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('pingboard API')
    .setDescription('미니 게시판 + 실시간 알림함')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
