import { Router, Request, Response } from "express";
import { authenticate } from "../auth/authenticate";
import { requireRole } from "../auth/requireRole";

export const debugRouter = Router();

debugRouter.get("/rbac-test/any-authenticated", authenticate, (req: Request, res: Response) => {
  res.status(200).json({ message: "ok", user: req.user });
});

debugRouter.get(
  "/rbac-test/paid-or-admin",
  authenticate,
  requireRole(["paid", "admin"]),
  (req: Request, res: Response) => {
    res.status(200).json({ message: "ok", user: req.user });
  }
);

debugRouter.get(
  "/rbac-test/admin-only",
  authenticate,
  requireRole(["admin"]),
  (req: Request, res: Response) => {
    res.status(200).json({ message: "ok", user: req.user });
  }
);
