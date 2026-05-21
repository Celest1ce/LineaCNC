import csrf from 'csurf';
import cookieParser from 'cookie-parser';
import { env } from '../lib/env.js';

export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

export { cookieParser };
