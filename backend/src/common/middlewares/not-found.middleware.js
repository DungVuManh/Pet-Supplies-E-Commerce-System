import { AppError } from '../errors/app-error.js';
export const notFoundMiddleware = (_request, _response, next) => {
  next(new AppError('Route not found', 404, 'NOT_FOUND'));
};
