import { AppError } from '../errors/app-error.js';
export const errorMiddleware = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  let statusCode = 500;
  let message = 'Something went wrong';
  let code = 'INTERNAL_SERVER_ERROR';
  if (error instanceof AppError) {
    ({ statusCode, message, code } = error);
  } else if (error && typeof error === 'object' && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      statusCode = 400;
      message = 'Malformed request body';
      code = 'INVALID_BODY';
    } else if (error.type === 'entity.too.large') {
      statusCode = 413;
      message = 'Request body is too large';
      code = 'PAYLOAD_TOO_LARGE';
    }
  }
  if (statusCode >= 500) {
    // Raw exceptions may contain credentials or request data.
    console.error('Unhandled request error');
  }
  response
    .status(statusCode)
    .json({ success: false, message, error: { code } });
};
