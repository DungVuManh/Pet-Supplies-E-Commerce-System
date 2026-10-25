export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  dob?: string | null;
  gender?: "male" | "female" | "other" | string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface ProfileStats {
  orders: number;
  pets: number;
  addresses: number;
}

export interface ShippingAddress {
  _id: string;
  userId?: string;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  addressType?: "home" | "office" | string;
  isDefault: boolean;
  createdAt?: string;
}

export interface PetProfile {
  _id: string;
  userId?: string;
  name: string;
  species: "dog" | "cat" | string;
  breed?: string;
  dob?: string | null;
  age?: string;
  weight?: number | null;
  notes?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface ProfileFormValues {
  fullName: string;
  phone: string;
  dob?: string;
  gender?: "male" | "female" | "other" | string;
  avatarUrl?: string;
}

export interface AddressFormValues {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  addressType: "home" | "office";
  isDefault: boolean;
}

export interface PetFormValues {
  name: string;
  species: "dog" | "cat" | string;
  breed?: string;
  dob?: string;
  age?: string;
  weight?: number;
  notes?: string;
  avatarUrl?: string;
}
