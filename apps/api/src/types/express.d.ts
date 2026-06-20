import type { AuthTokenPayload } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthTokenPayload;
    }
  }
}

export {};
