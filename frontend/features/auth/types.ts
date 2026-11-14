export type Role = "customer" | "staff" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  dob?: string | null;
  gender?: string | null;
  avatarUrl?: string;
  createdAt?: string;
};

export type RegistrationProfile = { fullName: string; phone: string; terms: boolean };
