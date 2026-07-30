import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 모든 예외를 API.md 2장의 공통 에러 응답 형태(`statusCode`/`message`/`error`)로 통일한다.
 * class-validator 실패, 컨트롤러에서 던진 HttpException, 예기치 못한 에러 모두 이 필터를 거친다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status: number = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // 응답 본문은 지금처럼 일반화한 메시지로 감추되, 원본 예외는 콘솔에 남겨야
    // Render 배포 후 500이 나도 원인을 추적할 수 있다.
    if (!isHttpException) {
      const error = exception as Error;
      this.logger.error(error?.message ?? String(exception), error?.stack);
    }

    const body = isHttpException
      ? exception.getResponse()
      : { message: '서버 오류가 발생했습니다.' };

    // API.md 예시(`"error": "Bad Request"`)와 표기를 맞추기 위해 500만 별도 리터럴을 쓴다.
    const errorLabel = isHttpException
      ? HttpStatus[status]
      : 'Internal Server Error';

    const normalized =
      typeof body === 'string'
        ? { statusCode: status, message: body, error: errorLabel }
        : {
            statusCode: status,
            error: errorLabel,
            ...body,
          };

    response.status(status).json(normalized);
  }
}
