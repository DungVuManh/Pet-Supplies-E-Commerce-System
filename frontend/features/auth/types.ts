export type Customer = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: "customer";
};

export type RegistrationProfile = { fullName: string; phone: string; terms: boolean };
