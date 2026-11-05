import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { withConnection } from "../db/oracle";

declare global {
  namespace Express {
    interface Request { cypressxUser?: { id: number; username: string; email: string; firstName: string; lastName: string } }
  }
}

const cookieName = "cypressx_sid";
const cookieOptions = () => {
  const useSecure = process.env.COOKIE_SECURE === "true" ||
    (process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production");
  const secure = useSecure ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
};

export const newSessionToken = () => randomBytes(32).toString("base64url");
export const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function setSessionCookie(response: Response, token: string) {
  response.setHeader("Set-Cookie", `${cookieName}=${token}; ${cookieOptions()}`);
}

export function clearSessionCookie(response: Response) {
  const useSecure = process.env.COOKIE_SECURE === "true" ||
    (process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production");
  const secure = useSecure ? "; Secure" : "";
  response.setHeader("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function readCookie(request: Request, name: string) {
  const prefix = `${name}=`;
  const cookie = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return cookie?.slice(prefix.length);
}

export async function sessionMiddleware(request: Request, _response: Response, next: NextFunction) {
  try {
    const token = readCookie(request, cookieName);
    if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return next();
    const result = await withConnection((connection) => connection.execute<{
      ID: string; USERNAME: string; EMAIL: string; FIRST_NAME: string; LAST_NAME: string;
    }>(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name
       FROM cx_sessions s JOIN cx_users u ON u.id = s.user_id
       WHERE s.token_hash = :tokenHash AND s.expires_at > SYSTIMESTAMP`,
      { tokenHash: hashSessionToken(token) }
    ));
    const user = result.rows?.[0];
    if (user) request.cypressxUser = {
      id: Number(user.ID), username: user.USERNAME, email: user.EMAIL,
      firstName: user.FIRST_NAME, lastName: user.LAST_NAME,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireUser(request: Request, response: Response, next: NextFunction) {
  if (!request.cypressxUser) {
    response.status(401).json({ message: "Inicia sesión para continuar." });
    return;
  }
  next();
}

export function currentUser(request: Request) {
  if (!request.cypressxUser) throw new Error("Sesión requerida.");
  return request.cypressxUser;
}
