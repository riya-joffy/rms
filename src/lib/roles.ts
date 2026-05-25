import { UserRole } from '../types';

/** Emails that must always receive admin access (legacy Firestore profiles). */
const DEFAULT_ADMIN_EMAILS = ['riyajoffy1@gmail.com'];

function getAdminEmails(): string[] {
  const fromEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  if (!fromEnv) return DEFAULT_ADMIN_EMAILS;
  return [...new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)])];
}

/** Normalize Firestore / legacy role strings to app roles. */
export function normalizeRole(role: string | undefined): UserRole {
  if (!role) return 'staff';
  const value = role.toLowerCase().trim();
  if (value === 'admin' || value === 'administrator') return 'admin';
  return 'staff';
}

/** Resolve role using profile data and email (handles legacy "User" / wrong roles). */
export function resolveUserRole(role: string | undefined, email?: string): UserRole {
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail && getAdminEmails().includes(normalizedEmail)) {
    return 'admin';
  }
  return normalizeRole(role);
}

export function isAdminRole(role: string | undefined): boolean {
  return normalizeRole(role) === 'admin';
}

export function isStaffRole(role: string | undefined): boolean {
  return !isAdminRole(role);
}
