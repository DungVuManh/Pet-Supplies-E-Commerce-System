
export type CheckoutAddress = {
    _id: string;
    recipientName: string;
    email: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    street: string;
    isDefault: boolean;
}


export async function getCheckoutAddress(): Promise<CheckoutAddress[]> {
    const res = await fetch("/api/v1/account/addresses", {
        method: 'GET',
        credentials: 'include',
        cache: "no-store"
    }
    );
    let data;
    try {
        data = await res.json();

    } catch {
        throw new Error("Du lieu điaj chi khong hop le -__-")
    }
    return data.data?.addresses ?? [];
}