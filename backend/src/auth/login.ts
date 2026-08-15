import { pool } from "../db/pool";
import { comparePassword } from "./password";
import { signAccessToken } from "./jwt";
import { InvalidCredentialsError } from "./errors";

interface UserRow {
  id: string;
  role: string;
  password_hash: string;
}

export async function loginUser(email: string, password: string): Promise<string> {
  const result = await pool.query<UserRow>(
    `SELECT id, role, password_hash FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user) {
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return signAccessToken({ id: user.id, role: user.role });
}
