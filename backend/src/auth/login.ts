import { pool } from "../db/pool";
import { comparePassword } from "./password";
import { signAccessToken } from "./jwt";
import { InvalidCredentialsError } from "./errors";

interface UserRow {
  id: string;
  role: string;
  password_hash: string;
}

// Fixed bcrypt hash (cost 12) of an arbitrary dummy string, not derived from
// any real user's password. Used to pay the same bcrypt cost on the
// "no such user" path as on the "wrong password" path, so response timing
// doesn't reveal whether an email is registered.
const DUMMY_HASH = "$2b$12$5bCSkSAqLvqf2SMfAlfqueQasd5smnUky9BhYLZQU6DpHOgwEUpTq";

export async function loginUser(email: string, password: string): Promise<string> {
  const result = await pool.query<UserRow>(
    `SELECT id, role, password_hash FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user) {
    await comparePassword(password, DUMMY_HASH);
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return signAccessToken({ id: user.id, role: user.role });
}
