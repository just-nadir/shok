import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool';

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

/**
 * Inserts a login attempt record for the given identifier.
 */
export async function recordAttempt(identifier: string): Promise<void> {
  await query(
    `INSERT INTO login_attempts (identifier, attempt_at) VALUES ($1, NOW())`,
    [identifier]
  );
}

/**
 * Returns true if the identifier has >= 5 attempts in the last 15 minutes.
 */
export async function isBlocked(identifier: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM login_attempts
     WHERE identifier = $1
       AND attempt_at > NOW() - INTERVAL '${WINDOW_MINUTES} minutes'`,
    [identifier]
  );
  return parseInt(result.rows[0].count, 10) >= MAX_ATTEMPTS;
}

/**
 * Deletes all login attempt records for the given identifier.
 * Call this after a successful login.
 */
export async function clearAttempts(identifier: string): Promise<void> {
  await query(`DELETE FROM login_attempts WHERE identifier = $1`, [identifier]);
}

/**
 * Express middleware that blocks requests when the identifier has too many
 * recent failed login attempts.
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const identifier: string | undefined = req.body?.phone || req.body?.username;

  if (!identifier) {
    next();
    return;
  }

  const blocked = await isBlocked(identifier);
  if (blocked) {
    res.status(423).json({
      error: "Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring",
      code: 'RATE_LIMITED',
    });
    return;
  }

  next();
}
