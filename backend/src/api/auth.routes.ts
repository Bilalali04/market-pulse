import { Router, Request, Response } from "express";
import { isValidEmail, isValidPassword } from "../auth/validation";
import { registerUser } from "../auth/register";
import { EmailAlreadyRegisteredError } from "../auth/errors";

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
