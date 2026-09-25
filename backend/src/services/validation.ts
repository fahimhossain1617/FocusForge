// Server-side validation rules and stable error codes

export const ERROR_CODES = {
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  INVALID_USERNAME: 'INVALID_USERNAME',
  INVALID_FULL_NAME: 'INVALID_FULL_NAME',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  PASSWORD_MANAGED_BY_PROVIDER: 'PASSWORD_MANAGED_BY_PROVIDER',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_DATE_OF_BIRTH: 'INVALID_DATE_OF_BIRTH',
  INVALID_BIO: 'INVALID_BIO',
  INVALID_GENDER: 'INVALID_GENDER',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_CONFIRMATION: 'INVALID_CONFIRMATION',
  INVALID_INPUT: 'INVALID_INPUT',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export interface ValidationResult {
  valid: boolean;
  code?: ErrorCode;
  message?: string;
}

export function validateFullName(name: any): ValidationResult {
  if (typeof name !== 'string' || !name.trim()) {
    return { valid: false, code: ERROR_CODES.INVALID_FULL_NAME, message: 'Full name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { valid: false, code: ERROR_CODES.INVALID_FULL_NAME, message: 'Full name must be between 2 and 50 characters.' };
  }
  return { valid: true };
}

export function validateDisplayName(username: any): ValidationResult {
  if (!username) return { valid: true }; // Display name is optional
  if (typeof username !== 'string') {
    return { valid: false, code: ERROR_CODES.INVALID_USERNAME, message: 'Invalid display name format.' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    return { valid: false, code: ERROR_CODES.INVALID_USERNAME, message: 'Display name must be between 3 and 30 characters.' };
  }
  // Allow letters, numbers, dots and underscores only
  const validRegex = /^[a-zA-Z0-9._]+$/;
  if (!validRegex.test(trimmed)) {
    return { valid: false, code: ERROR_CODES.INVALID_USERNAME, message: 'Display name can only contain letters, numbers, dots, and underscores.' };
  }
  return { valid: true };
}

export function validatePhone(phone: any): ValidationResult {
  if (!phone) return { valid: true };
  if (typeof phone !== 'string') {
    return { valid: false, code: ERROR_CODES.INVALID_PHONE, message: 'Invalid phone format.' };
  }
  const trimmed = phone.trim();
  if (!trimmed) return { valid: true };
  // International format regex e.g. +1234567890 or 01712345678
  const phoneRegex = /^(\+?[0-9]{7,15}|0[0-9]{9,14})$/;
  if (!phoneRegex.test(trimmed.replace(/[\s-]/g, ''))) {
    return { valid: false, code: ERROR_CODES.INVALID_PHONE, message: 'Please enter a valid international phone number.' };
  }
  return { valid: true };
}

export function validateDateOfBirth(dob: any): ValidationResult {
  if (!dob) return { valid: true };
  const d = new Date(dob);
  if (isNaN(d.getTime())) {
    return { valid: false, code: ERROR_CODES.INVALID_DATE_OF_BIRTH, message: 'Invalid date of birth.' };
  }
  const today = new Date();
  if (d > today) {
    return { valid: false, code: ERROR_CODES.INVALID_DATE_OF_BIRTH, message: 'Date of birth cannot be in the future.' };
  }
  return { valid: true };
}

export function validateBio(bio: any): ValidationResult {
  if (!bio) return { valid: true };
  if (typeof bio !== 'string') {
    return { valid: false, code: ERROR_CODES.INVALID_BIO, message: 'Invalid bio.' };
  }
  if (bio.length > 200) {
    return { valid: false, code: ERROR_CODES.INVALID_BIO, message: 'Bio cannot exceed 200 characters.' };
  }
  return { valid: true };
}

export function validateGender(gender: any): ValidationResult {
  if (!gender) return { valid: true };
  const allowed = ['male', 'female', 'other', 'prefer_not_to_say'];
  if (!allowed.includes(gender)) {
    return { valid: false, code: ERROR_CODES.INVALID_GENDER, message: 'Invalid gender option.' };
  }
  return { valid: true };
}

export function validatePassword(password: any): ValidationResult {
  if (typeof password !== 'string' || !password) {
    return { valid: false, code: ERROR_CODES.INVALID_PASSWORD, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, code: ERROR_CODES.INVALID_PASSWORD, message: 'Password must be at least 8 characters long.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { valid: false, code: ERROR_CODES.INVALID_PASSWORD, message: 'Password must contain at least one letter and one number.' };
  }
  return { valid: true };
}
