export function createOpenApiDocument(config) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Pet Supplies E-Commerce API',
      version: '0.1.0',
      description:
        'Backend foundation. Business endpoints are not implemented yet.',
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}/api/v1`,
        description: 'Local development',
      },
      { url: '/api/v1', description: 'Current deployment' },
    ],
    paths: {},
    components: {
      schemas: {
        ErrorResponse: {
          type: 'object',
          required: ['success', 'message', 'error'],
          properties: {
            success: { type: 'boolean', enum: [false] },
            message: { type: 'string' },
            error: {
              type: 'object',
              required: ['code'],
              properties: { code: { type: 'string' } },
            },
          },
        },
      },
    },
  };
}
