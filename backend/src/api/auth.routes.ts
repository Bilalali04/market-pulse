import { Router, Request, Response } from "express";
import { isValidEmail, isValidPassword } from "../auth/validation";
import { registerUser } from "../auth/register";
import { loginUser } from "../auth/login";
import { EmailAlreadyRegisteredError, InvalidCredentialsError } from "../auth/errors";

export const authRouter = Router();

authRouter.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "invalid email" });
    return;
  }

  if (!isValidPassword(password)) {
    res.status(400).json({ error: "password must be at least 8 characters" });
    return;
  }

  try {
    const user = await registerUser(email, password);
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof EmailAlreadyRegisteredError) {
      res.status(409).json({ error: "email already registered" });
      return;
    }
    console.error("registration failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "internal server error" });
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  try {
    const token = await loginUser(email, password);
    res.status(200).json({ token });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }
    console.error("login failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "internal server error" });
  }
});
