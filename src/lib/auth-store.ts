import { useSyncExternalStore } from "react";
import { clearAllAppData } from "./app-data";

export type UserAccount = {
  email: string;
  password: string;
  profileName: string;
  createdAt: number;
};

export type RememberedCredentials = {
  email: string;
  password: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type PendingCode = {
  email: string;
  code: string;
  sentAt: number;
};

const AUTH_KEY = "kidhealth.auth.v1";
const CODE_KEY = "kidhealth.pendingCode.v1";
const REMEMBER_KEY = "kidhealth.rememberMe.v1";

function readRemembered(): RememberedCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedCredentials;
    if (!parsed?.email || !parsed?.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRemembered(credentials: RememberedCredentials | null) {
  if (typeof window === "undefined") return;
  try {
    if (credentials) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify(credentials));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  } catch (e) {
    console.error("[auth-store] Failed to persist remember me:", e);
  }
}

const listeners = new Set<() => void>();

let cache: UserAccount | null = null;
let initialized = false;

function readAuth(): UserAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserAccount;
    if (!parsed?.email || !parsed?.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeAuth(user: UserAccount | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch (e) {
    console.error("[auth-store] Failed to persist auth:", e);
  }
  cache = user;
  listeners.forEach((l) => l());
}

function initFromStorage() {
  if (!initialized) {
    cache = readAuth();
    initialized = true;
  }
}

function readPendingCode(): PendingCode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CODE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCode;
  } catch {
    return null;
  }
}

function writePendingCode(pending: PendingCode | null) {
  if (typeof window === "undefined") return;
  try {
    if (pending) {
      localStorage.setItem(CODE_KEY, JSON.stringify(pending));
    } else {
      localStorage.removeItem(CODE_KEY);
    }
  } catch (e) {
    console.error("[auth-store] Failed to persist code:", e);
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export function isAuthenticated(): boolean {
  initFromStorage();
  return cache !== null;
}

export function getCurrentUser(): UserAccount | null {
  initFromStorage();
  return cache;
}

export function isEmailRegistered(email: string): boolean {
  const account = getCurrentUser();
  if (!account) return false;
  return account.email === normalizeEmail(email);
}

export function loginAccount(email: string, password: string): UserAccount {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) throw new Error("Enter a valid email address.");

  const account = getCurrentUser();
  if (!account) throw new Error("No account found. Please create one first.");
  if (account.email !== normalized) throw new Error("No account found with this email.");
  if (account.password !== password) throw new Error("Incorrect password.");

  writeAuth(account);
  return account;
}

export function getRememberedCredentials(): RememberedCredentials | null {
  return readRemembered();
}

export function setRememberedCredentials(credentials: RememberedCredentials | null) {
  writeRemembered(credentials);
}

/** Mock: generate and store a 6-digit verification code for the email. */
export function sendVerificationCode(email: string): string {
  const normalized = normalizeEmail(email);
  if (isEmailRegistered(normalized)) {
    throw new Error("ALREADY_REGISTERED");
  }
  const code = String(Math.floor(100_000 + Math.random() * 900_000));
  writePendingCode({ email: normalized, code, sentAt: Date.now() });
  return code;
}

export function verifyCode(email: string, code: string): boolean {
  const pending = readPendingCode();
  if (!pending) return false;
  const normalized = normalizeEmail(email);
  if (pending.email !== normalized) return false;
  const expired = Date.now() - pending.sentAt > 10 * 60 * 1000;
  if (expired) return false;
  return pending.code === code.trim();
}

export function registerAccount(email: string, password: string, code: string): UserAccount {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) throw new Error("Enter a valid email address.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!verifyCode(normalized, code)) throw new Error("Invalid or expired verification code.");

  const existing = getCurrentUser();
  if (existing) {
    if (existing.email === normalized) throw new Error("ALREADY_REGISTERED");
    throw new Error("An account already exists on this device.");
  }

  const profileName = normalized.split("@")[0] || "Parent";
  const user: UserAccount = {
    email: normalized,
    password,
    profileName,
    createdAt: Date.now(),
  };
  writePendingCode(null);
  writeAuth(user);
  return user;
}

export function updateProfileName(profileName: string) {
  initFromStorage();
  if (!cache) return;
  const trimmed = profileName.trim();
  if (!trimmed) throw new Error("Name cannot be empty.");
  writeAuth({ ...cache, profileName: trimmed });
}

export function changePassword(currentPassword: string, newPassword: string) {
  initFromStorage();
  if (!cache) return;
  if (cache.password !== currentPassword) throw new Error("Current password is incorrect.");
  if (newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
  writeAuth({ ...cache, password: newPassword });
}

export function deleteAccount() {
  clearAllAppData();
  cache = null;
  initialized = true;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): UserAccount | null {
  initFromStorage();
  return cache;
}

function getServerSnapshot(): UserAccount | null {
  return null;
}

export function useAuth(): UserAccount | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function hydrateAuthStore() {
  if (typeof window === "undefined") return;
  const stored = readAuth();
  initialized = true;
  if (stored?.email !== cache?.email) {
    cache = stored;
    notify();
  }
}
