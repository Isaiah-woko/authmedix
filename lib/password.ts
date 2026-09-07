// The one strength rule, enforced client-side for instant feedback.
// The backend remains the real gate.

export interface PasswordCheck {
  isValid: boolean;
  rules: { label: string; passed: boolean }[];
}

export function checkPasswordStrength(password: string): PasswordCheck {
  const rules = [
    { label: "At least 10 characters", passed: password.length >= 10 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "One lowercase letter", passed: /[a-z]/.test(password) },
    { label: "One number", passed: /[0-9]/.test(password) },
    { label: "One symbol (!@#$%^&*...)", passed: /[^A-Za-z0-9]/.test(password) },
  ];
  return { isValid: rules.every((r) => r.passed), rules };
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}