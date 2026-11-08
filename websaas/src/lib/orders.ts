import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE, DEMO_ORDER_KEY } from "./queries";
import type { CartItem } from "./cart";

export interface CreateOrderInput {
  restaurantId: string;
  deliveryFee: number;
  customerName: string;
  customerPhone: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    reference?: string;
  };
  notes?: string;
  paymentMethod?: string;
  items: CartItem[];
}

export async function createOrder(input: CreateOrderInput) {
  const subtotal = input.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + input.deliveryFee;

  if (DEMO_MODE) {
    const id = `demo-${Date.now().toString(36)}`;
    const order = {
      id,
      restaurant_id: input.restaurantId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone.replace(/\D/g, ""),
      address_details: input.address,
      notes: input.notes ?? null,
      subtotal,
      delivery_fee: input.deliveryFee,
      total,
      payment_method: input.paymentMethod ?? "Dinheiro",
      status: "pending",
      order_items: input.items.map((item, index) => ({
        id: `${id}-${index}`,
        order_id: id,
        product_name: item.name,
        quantity: item.quantity,
        price_at_purchase: item.price,
      })),
      restaurants: { name: "Burger House", phone: "5511999999999", logo_url: null },
    };
    if (typeof window !== "undefined") {
      const saved = JSON.parse(window.localStorage.getItem(DEMO_ORDER_KEY) || "{}");
      saved[id] = order;
      window.localStorage.setItem(DEMO_ORDER_KEY, JSON.stringify(saved));
    }
    return order as any;
  }

  const { data: order, error: orderErr } = await supabase.from("orders").insert({
    restaurant_id: input.restaurantId,
    customer_name: input.customerName,
    customer_phone: input.customerPhone.replace(/\D/g, ""),
    address_details: input.address,
    notes: input.notes ?? null,
    subtotal,
    delivery_fee: input.deliveryFee,
    total,
    payment_method: input.paymentMethod ?? null,
    status: "pending",
  }).select("*").single();

  if (orderErr) throw orderErr;
  const { error: itemsErr } = await supabase.from("order_items").insert(
    input.items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      product_name: i.name,
      quantity: i.quantity,
      price_at_purchase: i.price,
    })),
  );
  if (itemsErr) throw itemsErr;
  return order;
}
