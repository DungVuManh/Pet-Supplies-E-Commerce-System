import { Server } from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { AppError } from '../src/common/errors/app-error.js';
import { errorMiddleware } from '../src/common/middlewares/error.middleware.js';
import { parseEnvironment } from '../src/config/env.js';
const config = parseEnvironment({ NODE_ENV: 'test' });
describe('application foundation', () => {
  it('creates an application without listening or connecting to MongoDB', () => {
    const listen = vi.spyOn(Server.prototype, 'listen');
    const connect = vi.spyOn(mongoose, 'connect');
    expect(createApp(config)).toBeTypeOf('function');
    expect(listen).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
    expect(mongoose.connection.readyState).toBe(0);
  });
  it('returns a standard 404 and security headers for unknown routes', async () => {
    const response = await request(createApp(config)).get('/api/v1/missing');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
      error: { code: 'NOT_FOUND' },
    });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
  it('serves Swagger UI and its assets', async () => {
    const app = createApp(config);
    const page = await request(app).get('/api/docs/');
    expect(page.status).toBe(200);
    expect(page.text).toContain('swagger-ui');
    const script = await request(app).get('/api/docs/swagger-ui-init.js');
    expect(script.status).toBe(200);
    expect(script.text).toContain('Pet Supplies E-Commerce API');
    expect(script.text).toContain('/auth/session');
    expect(page.headers['content-security-policy']).not.toContain(
      'upgrade-insecure-requests',
    );
  });
  it('allows the configured origin on preflight requests', async () => {
    const response = await request(createApp(config))
      .options('/api/v1/missing')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
  });
  it('rejects unlisted origins with the standard error format', async () => {
    const response = await request(createApp(config))
      .get('/api/v1/missing')
      .set('Origin', 'https://untrusted.example');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CORS_FORBIDDEN');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('rejects malformed JSON with HTTP 400', async () => {
    const response = await request(createApp(config))
      .post('/api/v1/missing')
      .set('Content-Type', 'application/json')
      .send('{broken');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Malformed request body',
      error: { code: 'INVALID_BODY' },
    });
  });
  it('caps request bodies with HTTP 413', async () => {
    const response = await request(createApp(config))
      .post('/api/v1/missing')
      .send({ value: 'x'.repeat(110_000) });
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
  it('limits API traffic using a standard HTTP 429 response', async () => {
    const app = createApp(config);
    for (let index = 0; index < 100; index++) {
      await request(app).get('/api/v1/missing').expect(404);
    }
    const response = await request(app).get('/api/v1/missing');
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
    expect(response.headers['retry-after']).toBeDefined();
    expect(response.headers.ratelimit).toBeDefined();
  });
});
describe('centralized error handling', () => {
  it('handles rejected promises from Express 5 handlers', async () => {
    const app = express();
    app.get('/failure', () =>
      Promise.reject(new AppError('Request is invalid', 400, 'BAD_REQUEST')),
    );
    app.use(errorMiddleware);
    const response = await request(app).get('/failure');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Request is invalid',
      error: { code: 'BAD_REQUEST' },
    });
  });
  it('hides unexpected exception details in production', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = express();
    app.set('env', 'production');
    app.get('/failure', () => {
      throw new Error('sensitive database credentials');
    });
    app.use(errorMiddleware);
    const response = await request(app).get('/failure');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Something went wrong',
      error: { code: 'INTERNAL_SERVER_ERROR' },
    });
    expect(JSON.stringify(response.body)).not.toContain('sensitive');
    expect(console.error).toHaveBeenCalledWith('Unhandled request error');
  });
});
