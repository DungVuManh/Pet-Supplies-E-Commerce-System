
export type CartProduct = {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  image: string;
};

export type CartItem = {
  id: string;
  product: CartProduct;
  quantity: number;
};

export type CartSummary = {
  distinctCount: number;  
  totalQuantity: number;  
  subtotal: number;       
  shippingFee: number;    
  discount: number;       
  total: number;          
};
