export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export function validateNationalId(id: string): ValidationResult {
  if (!id || id.length !== 14) {
    return {
      isValid: false,
      reason: `الرقم القومي يجب أن يكون 14 رقماً بالضبط (هذا الرقم: ${id ? id.length : 0} أرقام)`
    };
  }

  if (!/^\d+$/.test(id)) {
    return {
      isValid: false,
      reason: "الرقم القومي يجب أن يحتوي على أرقام فقط"
    };
  }

  if (/^(\d)\1+$/.test(id)) {
    return {
      isValid: false,
      reason: "الرقم القومي غير صالح (أرقام متكررة)"
    };
  }

  if (!id.startsWith("2") && !id.startsWith("3")) {
    return {
      isValid: false,
      reason: "الرقم القومي يجب أن يبدأ بـ 2 أو 3"
    };
  }

  return { isValid: true };
}
