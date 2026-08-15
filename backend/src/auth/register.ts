import { pool } from "../db/pool";
import { hashPassword } from "./password";
import { EmailAlreadyRegisteredError } from "./errors";

const UNIQUE_VIOLATION = "23505";

export interface RegisteredUser {
  id: string;
  email: string;
  role: string;
}

export async function registerUser(
  email: string,
  password: string
): Promise<RegisteredUser> {
  const passwordHash = await hashPassword(password);

  try {
    const result = await pool.query<RegisteredUser>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role`,
      [email, passwordHash]
    );
    return result.rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new EmailAlreadyRegisteredError();
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === UNIQUE_VIOLATION
  );
}
