import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import db from "../db";
import { signToken, requireAuth } from "../middleware/auth";
import { asyncHandler, HttpError } from "../utils/asyncHandler";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  role: string;
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new HttpError(401, "Invalid username or password");
    }

    const token = signToken({
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(req.user!.id) as UserRow;

    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      throw new HttpError(400, "Current password is incorrect");
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, user.id);
    res.json({ ok: true });
  })
);

export default router;
