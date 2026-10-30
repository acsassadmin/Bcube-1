/** Shared form validation helpers used by every enquiry / order form. */

/** Local part + domain + a TLD of at least two letters. */
export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/** Indian mobile number: exactly 10 digits, starting with 6–9. */
export const PHONE_RE = /^[6-9]\d{9}$/;

/** Indian PIN code: exactly 6 digits, first digit 1–9. */
export const PINCODE_RE = /^[1-9]\d{5}$/;

/** Letters, spaces, apostrophes, dots and hyphens (2–60 characters). */
export const NAME_RE = /^[A-Za-z][A-Za-z\s.'-]{1,59}$/;

export const NAME_MAX_LENGTH = 60;
export const MESSAGE_MAX_LENGTH = 1000;
/** Minimum quantity accepted by the bulk order form. */
export const MIN_BULK_QUANTITY = 1;

/** Uppercases the first letter of every word, leaving the rest as typed. */
export function capitalizeName(value: string): string {
  return value.replace(/(^|\s)([a-z])/g, (_match, lead: string, letter: string) => lead + letter.toUpperCase());
}

/** Keeps digits only, drops a +91 / leading 0 prefix and caps at 10 digits. */
export function sanitizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length > 10) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Keeps digits only and caps at 6 digits. */
export function sanitizePincode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

/** Keeps digits only and caps at 6 digits (max quantity 999999). */
export function sanitizeQuantity(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(value.trim());
}

export function isValidPincode(value: string): boolean {
  return PINCODE_RE.test(value.trim());
}

/** Returns a user-facing error message for an invalid name, or null. */
export function validateName(name: string): string | null {
  const cleanName = name.trim();
  if (!cleanName) return "Please enter your name.";
  if (cleanName.length < 2) return "Name must be at least 2 characters.";
  if (!NAME_RE.test(cleanName)) {
    return "Please enter a valid name (letters, spaces, apostrophes, dots and hyphens only).";
  }
  return null;
}

/** Returns a user-facing error message for an invalid email, or null. */
export function validateEmail(email: string, options: { required?: boolean } = {}): string | null {
  const cleanEmail = email.trim();
  if (!cleanEmail) {
    return options.required === false ? null : "Please enter your email address.";
  }
  if (!isValidEmail(cleanEmail)) {
    return "Please enter a valid email address (e.g. name@example.com).";
  }
  return null;
}

/** Returns a user-facing error message for an invalid phone, or null. */
export function validatePhone(phone: string): string | null {
  if (!phone.trim()) return "Please enter your phone number.";
  if (!isValidPhone(phone)) {
    return "Please enter a valid 10-digit mobile number starting with 6–9.";
  }
  return null;
}

export type ContactFields = {
  name?: string;
  email?: string;
  phone?: string;
};

/** Returns a user-facing error message for the first invalid field, or null. */
export function validateContactFields({
  name = "",
  email = "",
  phone = "",
}: ContactFields): string | null {
  return validateName(name) ?? validateEmail(email) ?? validatePhone(phone);
}
