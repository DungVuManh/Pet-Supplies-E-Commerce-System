import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../src/config/env.js';
describe('environment configuration', () => {
  it('provides local development defaults', () => {
    expect(parseEnvironment({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      MONGODB_URI: 'mongodb://127.0.0.1:27017/pet_supplies',
      CORS_ORIGIN: ['http://localhost:3000'],
    });
  });
  it('parses multiple exact CORS origins', () => {
    expect(
      parseEnvironment({
        CORS_ORIGIN: 'http://localhost:3000, https://shop.example.com',
      }).CORS_ORIGIN,
    ).toEqual(['http://localhost:3000', 'https://shop.example.com']);
  });
  it.each(['0', '65536', '3001.5', 'abc', ''])(
    'rejects invalid port %j',
    (PORT) => expect(() => parseEnvironment({ PORT })).toThrow('PORT'),
  );
  it.each([
    '*',
    'null',
    'ftp://example.com',
    'https://example.com/path',
    'https://example.com/',
    'https://user:password@example.com',
    'http://localhost:3000,',
  ])('rejects invalid CORS origin %j', (CORS_ORIGIN) => {
    expect(() => parseEnvironment({ CORS_ORIGIN })).toThrow('CORS_ORIGIN');
  });
  it.each([
    '',
    'https://localhost/db',
    'mongodb://',
    'mongodb://localhost:abc/db',
  ])('rejects invalid MongoDB URI %j', (MONGODB_URI) => {
    expect(() => parseEnvironment({ MONGODB_URI })).toThrow('MONGODB_URI');
  });
  it.each([
    'mongodb://host1:27017,host2:27017/pet_supplies?replicaSet=rs0',
    'mongodb+srv://user:password@cluster.example.com/pet_supplies',
  ])('accepts supported MongoDB URI %j without connecting', (MONGODB_URI) => {
    expect(parseEnvironment({ MONGODB_URI }).MONGODB_URI).toBe(MONGODB_URI);
  });
  it('requires database and origins explicitly in production', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production' })).toThrow(
      'Invalid environment configuration: MONGODB_URI, CORS_ORIGIN',
    );
  });
  it('rejects unknown runtime modes without leaking supplied values', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'secret-value' })).toThrow(
      'Invalid environment configuration: NODE_ENV',
    );
  });
});
