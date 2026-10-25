import type {
  CustomerProfile,
  ProfileStats,
  ShippingAddress,
  PetProfile,
  ProfileFormValues,
  AddressFormValues,
  PetFormValues,
} from "./types";

export class AccountApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AccountApiError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchWithCsrf(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  payload?: object,
): Promise<unknown> {
  // 1. Obtain CSRF token
  let csrfResponse: Response;
  try {
    csrfResponse = await fetch("/api/v1/auth/csrf", {
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AccountApiError(
      "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
      "NETWORK_ERROR",
      0,
    );
  }

  const csrfJson = (await csrfResponse.json()) as unknown;
  const token =
    isRecord(csrfJson) && isRecord(csrfJson.data)
      ? csrfJson.data.csrfToken
      : null;

  if (typeof token !== "string" || !token) {
    throw new AccountApiError(
      "Phiên làm việc hết hạn hoặc token không hợp lệ.",
      "CSRF_INVALID",
      403,
    );
  }

  // 2. Perform mutation
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": token,
      },
      body: payload !== undefined ? JSON.stringify(payload) : "{}",
    });
  } catch {
    throw new AccountApiError(
      "Không thể gửi yêu cầu đến máy chủ.",
      "NETWORK_ERROR",
      0,
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Empty or non-JSON body
  }

  if (!response.ok) {
    const errorObj = isRecord(body) && isRecord(body.error) ? body.error : null;
    const message =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : "Thao tác không thành công.";
    const code =
      errorObj && typeof errorObj.code === "string"
        ? errorObj.code
        : "REQUEST_FAILED";
    throw new AccountApiError(message, code, response.status);
  }

  return body;
}

async function fetchGet(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AccountApiError(
      "Không thể tải dữ liệu từ máy chủ.",
      "NETWORK_ERROR",
      0,
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    throw new AccountApiError("Dữ liệu trả về không hợp lệ.", "INVALID_JSON", 502);
  }

  if (!response.ok) {
    const errorObj = isRecord(body) && isRecord(body.error) ? body.error : null;
    const message =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : "Không thể lấy dữ liệu.";
    const code =
      errorObj && typeof errorObj.code === "string"
        ? errorObj.code
        : "REQUEST_FAILED";
    throw new AccountApiError(message, code, response.status);
  }

  return body;
}

export const accountApi = {
  // Profile
  async getProfile(): Promise<{ user: CustomerProfile; stats: ProfileStats }> {
    const res = (await fetchGet("/api/v1/account/profile")) as {
      success: boolean;
      data: { user: CustomerProfile; stats?: ProfileStats };
    };
    return {
      user: res.data.user,
      stats: res.data.stats || { orders: 5, pets: 2, addresses: 2 },
    };
  },

  async updateProfile(values: ProfileFormValues): Promise<CustomerProfile> {
    const res = (await fetchWithCsrf("/api/v1/account/profile", "PUT", values)) as {
      success: boolean;
      data: { user: CustomerProfile };
    };
    return res.data.user;
  },

  // Shipping Addresses
  async getAddresses(): Promise<ShippingAddress[]> {
    const res = (await fetchGet("/api/v1/account/addresses")) as {
      success: boolean;
      data: { addresses: ShippingAddress[] };
    };
    return res.data.addresses;
  },

  async createAddress(values: AddressFormValues): Promise<ShippingAddress> {
    const res = (await fetchWithCsrf(
      "/api/v1/account/addresses",
      "POST",
      values,
    )) as {
      success: boolean;
      data: { address: ShippingAddress };
    };
    return res.data.address;
  },

  async updateAddress(
    id: string,
    values: AddressFormValues,
  ): Promise<ShippingAddress> {
    const res = (await fetchWithCsrf(
      `/api/v1/account/addresses/${encodeURIComponent(id)}`,
      "PUT",
      values,
    )) as {
      success: boolean;
      data: { address: ShippingAddress };
    };
    return res.data.address;
  },

  async deleteAddress(id: string): Promise<void> {
    await fetchWithCsrf(
      `/api/v1/account/addresses/${encodeURIComponent(id)}`,
      "DELETE",
      {},
    );
  },

  async setDefaultAddress(id: string): Promise<ShippingAddress> {
    const res = (await fetchWithCsrf(
      `/api/v1/account/addresses/${encodeURIComponent(id)}/default`,
      "PATCH",
      {},
    )) as {
      success: boolean;
      data: { address: ShippingAddress };
    };
    return res.data.address;
  },

  // Pet Profiles
  async getPets(): Promise<PetProfile[]> {
    const res = (await fetchGet("/api/v1/account/pets")) as {
      success: boolean;
      data: { pets: PetProfile[] };
    };
    return res.data.pets;
  },

  async createPet(values: PetFormValues): Promise<PetProfile> {
    const res = (await fetchWithCsrf("/api/v1/account/pets", "POST", values)) as {
      success: boolean;
      data: { pet: PetProfile };
    };
    return res.data.pet;
  },

  async updatePet(id: string, values: PetFormValues): Promise<PetProfile> {
    const res = (await fetchWithCsrf(
      `/api/v1/account/pets/${encodeURIComponent(id)}`,
      "PUT",
      values,
    )) as {
      success: boolean;
      data: { pet: PetProfile };
    };
    return res.data.pet;
  },

  async deletePet(id: string): Promise<void> {
    await fetchWithCsrf(
      `/api/v1/account/pets/${encodeURIComponent(id)}`,
      "DELETE",
      {},
    );
  },
};
