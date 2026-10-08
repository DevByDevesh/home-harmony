export type OwnerContactPreference = "CALL" | "WHATSAPP" | "BOTH";

export type OwnerContactInput = {
  phone: string;
  preferredContact: OwnerContactPreference | null;
};

export type NormalizedOwnerContact = {
  phone: string | null;
  preferredContact: OwnerContactPreference | null;
};

export function normalizeOwnerContact(input: OwnerContactInput): NormalizedOwnerContact {
  const rawPhone = input.phone.trim();

  if (!rawPhone) {
    return { phone: null, preferredContact: null };
  }

  const digits = rawPhone.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `+91${digits}` : rawPhone.startsWith("+") ? `+${digits}` : null;

  if (!normalized || !/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Enter a valid phone number.");
  }

  return {
    phone: normalized,
    preferredContact: input.preferredContact,
  };
}
