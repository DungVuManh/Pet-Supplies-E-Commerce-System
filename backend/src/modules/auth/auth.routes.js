import { Router } from 'express';
import { getFirebaseAuth } from '../../config/firebase.js';
import { createAuthService } from './auth.service.js';
import { createAuthController } from './auth.controller.js';
import { userRepository } from './user.model.js';

export function createAuthRouter(config, service = createAuthService({
  getAuth: () => getFirebaseAuth(config), users: userRepository,
})) {
  const router = Router();
  const controller = createAuthController(config, service);
  router.use(controller.readCookies);
  router.get('/csrf', controller.csrf);
  router.post('/register', controller.protectMutation, controller.register);
  router.post('/session', controller.protectMutation, controller.login);
  router.get('/me', controller.me);
  router.delete('/session', controller.protectMutation, controller.logout);
  return router;
}
