# Customer authentication

Firebase project: `wdp-pet-supplies`. This iteration supports email/password,
registration, profile recovery, sign-out and password reset. Email verification
is not required. Home/search/sample cart remain accessible to guests.

## Local setup

Use Node.js 24.x and npm 11+. Install dependencies separately with
`npm --prefix frontend ci` and `npm --prefix backend ci`.

1. In Firebase Console, enable Authentication → Email/Password and ensure
   `localhost` is an authorized domain. Use the standard hosted Firebase email
   reset action handler; customize its email template in the Firebase Console.
2. Copy `frontend/.env.example` to `frontend/.env.local`. Enter the Web app's
   configuration. `NEXT_PUBLIC_*` values are bundled into the browser; they must
   never contain an Admin credential. Analytics is not initialized.
3. Copy `backend/.env.example` to `backend/.env` if it does not already exist.
   Set `PORT=3001`, `CORS_ORIGIN=http://localhost:3000` and a working
   `MONGODB_URI`. An authentication-enabled MongoDB needs a database user with
   read/write and index-creation permission on the selected database, and the
   appropriate `authSource` in the URI. Do not log the URI.
4. Store an Admin service-account JSON **outside this repository** and set its
   absolute path as `GOOGLE_APPLICATION_CREDENTIALS` in the backend environment.
   Keep `FIREBASE_PROJECT_ID` aligned with the frontend. Replace any key shared in
   a chat or source control using Google Cloud IAM; never put its contents here.
5. Run `npm run dev` at the repository root. Frontend: `http://localhost:3000`;
   backend: `http://localhost:3001`; Swagger: `http://localhost:3001/api/docs/`.
   Restart Next after modifying its environment because public values are
   compiled into the client.

`BACKEND_ORIGIN` is a server-only Next setting (default
`http://127.0.0.1:3001`). Auth requests use the same-origin Next rewrite, including
Set-Cookie responses. The browser never calls the Express origin directly.
Avoid switching between `localhost` and `127.0.0.1` in the browser; they have
different cookies/origins. Direct Swagger mutations must run from an allowed
origin and include CSRF cookies/header; Swagger does not bypass authentication.

## Trust and persistence

The browser authenticates with Firebase using memory-only persistence. Firebase
handles passwords; Express receives only an ID token, validates its project,
revocation status, password provider and sign-in age (<5 minutes), then issues a
Firebase session cookie. The client SDK signs out once the exchange completes.

Cookies are HttpOnly, SameSite=Lax, Path=/ and have no Domain attribute. Production
enables Secure and `__Host-` names, requiring HTTPS. Default token lifetime is 24
hours with no persistent cookie expiry; remember-me uses 14 days. Browser session
restoration can retain session cookies; signed expiry still limits their lifetime.
Sign-out clears this browser's cookie, not other devices or previously copied
session cookies. `/auth/me` checks Firebase revocation/disabled-user status on
every call. Password changes through Firebase invalidate older sessions after
Firebase revocation takes effect.

Mutation endpoints require an exact allowed Origin, JSON and a matching CSRF
cookie/header. `/auth/csrf` returns the token in its JSON response; the CSRF cookie
is also HttpOnly. All auth responses are `no-store`; the existing API limiter is
100 requests per IP per 15 minutes. Its in-memory store is for a single local
instance; configure trusted proxies and a shared store before production scale.

MongoDB stores only Firebase UID (unique), email, name, phone, customer role,
consent timestamp and Mongoose timestamps. UID/email come from verified tokens;
role is server-controlled. Phone is unverified contact information. A unique UID
index is explicitly created at startup because global autoIndex is disabled.
Startup fails if database permissions or indexes are invalid. Firebase Admin
credentials are read on demand; a failed credential exchange returns a generic
authentication-unavailable response rather than issuing a session.

Registration retries use insert-only upsert: they cannot replace an existing
profile. If Firebase creates an account but MongoDB fails, resubmitting with the
same credentials signs into Firebase and retries profile creation. Later login
also detects `PROFILE_INCOMPLETE` and asks for name, phone and consent. No session
is issued until a complete profile is available. There is no cross-service
transaction; the Firebase account intentionally remains recoverable after failure.

## API

All paths start with `/api/v1/auth`. Success with a profile uses
`{ success: true, data: { user: { id, email, fullName, phone, role } } }`.
Errors retain `{ success: false, message, error: { code } }`.

| Method/path | Request | Behavior |
| --- | --- | --- |
| GET `/csrf` | — | CSRF cookie plus `{success:true,data:{csrfToken}}` |
| POST `/register` | `idToken, fullName, phone, terms:true, remember?` | Idempotent profile creation and session, 200 |
| POST `/session` | `idToken, remember?` | Session for existing complete profile, 200 |
| GET `/me` | Session cookie | Current profile; 401 clears an invalid session |
| DELETE `/session` | JSON `{}` | Clears current browser cookie, 204 |

POST/DELETE need `X-CSRF-Token` obtained from `/csrf`. Unexpected fields are
rejected. Profile errors return 400; rejected tokens 401; invalid CSRF/origin 403;
incomplete profiles 409; wrong content type 415; throttling 429; dependencies
unavailable 503. The UI translates codes; raw Firebase/server exceptions are
never shown. Password-reset confirmation is generic for known/unknown emails.

## Troubleshooting server clock errors

Firebase timestamps and the backend clock must agree. If the signed `auth_time`
is ahead of the backend, the exchange fails closed with HTTP 503 and
`AUTH_CLOCK_SKEW`, rather than incorrectly reporting an expired user session.
The safe `[auth] Recent sign-in check rejected` log includes only a reason and
age in seconds; a negative age indicates the server clock is behind. Firebase
SDK failures log only the operation and SDK error code, never a token or profile.

On 2026-10-21 a real login produced `server-clock-behind`, `ageSeconds: -87`;
Windows Time was disabled/stopped. The owner chose to synchronize Windows time
manually. Enable automatic time synchronization in Windows Date & time settings,
use Sync now, then sign in again. Production hosts likewise need a working time
synchronization service. Do not work around clock errors by skipping token or
recent-sign-in verification.

## Verification

Run `npm --prefix backend test`, `npm --prefix frontend test`,
`npm --prefix frontend run lint`, `npx tsc --noEmit` from `frontend/`, and
`npm --prefix frontend run build`. Unit/HTTP tests use fake Firebase/database
adapters and do not prove the live service is configured correctly.

With Firebase and MongoDB configured, manually use your own account or an
explicitly authorized disposable test account to verify
registration → home → reload → logout → login with/without remember. Check the
header name, pending/disabled submit state, password reset, wrong credentials,
public browsing and mobile layout. Delete only an explicitly authorized disposable
test account and its matching MongoDB profile. Never delete a personal account
as test cleanup. Never print ID/session tokens or passwords.

### Verification recorded on 2026-10-21

- Node 24: 48 backend tests and 19 frontend tests passed; frontend lint,
  TypeScript and production build passed.
- Live read-only checks confirmed Firebase Admin credentials, Email/Password,
  `localhost` authorization and MongoDB access/index creation. The local URI
  needed `authSource=admin`, which was added after successful authentication.
- Live same-origin HTTP checks verified CSRF cookie forwarding, rejection of
  invalid tokens/client roles/cross-origin mutations, anonymous `/me` = 401 and
  logout = 204. No external test account or profile was created.
- Browser checks covered validation/focus, auth navigation, public home/guest
  cart and no horizontal overflow at 320/768/1024/1440px.
- Full account creation/login/reset/session restoration with a real user remains
  for the owner to verify, as requested. Mock adapter tests are not evidence of
  a successful live sign-in.

The Firebase Web package currently pins an older gRPC dependency through its
unused Firestore entrypoint. A frontend override selects patched `@grpc/grpc-js`
1.14.6 or later; the app imports only Firebase App/Auth. Production dependency
audits must pass independently of existing tooling-only advisories.
