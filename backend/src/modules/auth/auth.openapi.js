const jsonBody = (schema) => ({ required: true, content: { 'application/json': { schema } } });
const error = (description) => ({ description, content: { 'application/json': {
  schema: { $ref: '#/components/schemas/ErrorResponse' },
} } });
const sessionProperties = {
  idToken: { type: 'string', description: 'Firebase ID token from a password sign-in within 5 minutes.' },
  remember: { type: 'boolean', default: false },
};
const userResponse = { description: 'Public customer profile; session is sent only as an HttpOnly cookie.',
  content: { 'application/json': { schema: { type: 'object', properties: {
    success: { type: 'boolean', enum: [true] },
    data: { type: 'object', properties: { user: { $ref: '#/components/schemas/Customer' } } },
  } } } } };
const mutationParameters = [{ in: 'header', name: 'X-CSRF-Token', required: true, schema: { type: 'string' } },
  { in: 'header', name: 'Origin', required: true, schema: { type: 'string', example: 'http://localhost:3000' } }];
const sessionResponses = { 200: userResponse, 400: error('Invalid input'),
  401: error('Invalid, revoked, expired token or sign-in too old'), 403: error('Invalid origin or CSRF token'),
  409: error('Profile incomplete; submit name, phone and consent to /auth/register'),
  415: error('JSON required'), 429: error('Rate limit exceeded'), 503: error('Firebase or MongoDB unavailable') };

export const authPaths = {
  '/auth/csrf': { get: { tags: ['Authentication'], summary: 'Get a CSRF token before a mutation',
    description: 'Sets an HttpOnly CSRF cookie and returns its token. Send the token as X-CSRF-Token, preserving cookies. All auth responses are no-store.',
    responses: { 200: { description: 'CSRF token', content: { 'application/json': { schema: {
      type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object',
        properties: { csrfToken: { type: 'string' } } } },
    } } } } },
  } },
  '/auth/register': { post: { tags: ['Authentication'], summary: 'Complete a customer profile and start a session',
    description: 'First create the Firebase email/password account on the client. Retry safely after a profile-save failure; existing profiles cannot be overwritten here. Email and UID come only from the verified token.',
    parameters: mutationParameters, requestBody: jsonBody({ type: 'object', additionalProperties: false,
      required: ['idToken', 'fullName', 'phone', 'terms'], properties: { ...sessionProperties,
        fullName: { type: 'string', minLength: 2, maxLength: 100 },
        phone: { type: 'string', maxLength: 20, description: 'Vietnamese contact phone; not an authentication method.' },
        terms: { type: 'boolean', enum: [true] },
      } }), responses: sessionResponses,
  } },
  '/auth/session': {
    post: { tags: ['Authentication'], summary: 'Exchange a Firebase ID token for a session cookie',
      description: 'Default: browser-session cookie with a 24-hour token. Remember: persistent cookie, 14 days. Production cookies use __Host- prefix, Secure, HttpOnly and SameSite=Lax.',
      parameters: mutationParameters,
      requestBody: jsonBody({ type: 'object', additionalProperties: false, required: ['idToken'], properties: sessionProperties }),
      responses: sessionResponses },
    delete: { tags: ['Authentication'], summary: 'Sign out the current browser',
      description: 'Clears the cookie; does not sign out other devices.', parameters: mutationParameters,
      requestBody: jsonBody({ type: 'object', additionalProperties: false }),
      responses: { 204: { description: 'Session cookie cleared' }, 403: error('Invalid origin or CSRF token') },
    },
  },
  '/auth/me': { get: { tags: ['Authentication'], summary: 'Read the current customer',
    security: [{ sessionCookie: [] }], responses: { 200: userResponse,
      401: error('Missing, revoked, disabled or expired session; cookie cleared'),
      409: error('Profile incomplete'), 503: error('Authentication or database unavailable') },
  } },
};

export const customerSchema = { type: 'object', required: ['id', 'email', 'fullName', 'phone', 'role'], properties: {
  id: { type: 'string' }, email: { type: 'string', format: 'email' }, fullName: { type: 'string' },
  phone: { type: 'string' }, role: { type: 'string', enum: ['customer'] },
} };
