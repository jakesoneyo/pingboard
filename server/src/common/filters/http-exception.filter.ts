import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 모든 예외를 API.md 2장의 공통 에러 응답 형태(`statusCode`/`message`/`error`)로 통일한다.
 * class-validator 실패, 컨트롤러에서 던진 HttpException, 예기치 못한 에러 모두 이 필터를 거친다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = isHttpException
      ? exception.getResponse()
      : { message: '서버 오류가 발생했습니다.' };

    const normalized =
      typeof body === 'string'
        ? { statusCode: status, message: body, error: HttpStatus[status] }
        : {
            statusCode: status,
            error: HttpStatus[status],
            ...body,
          };

    response.status(status).json(normalized);
  }
}
