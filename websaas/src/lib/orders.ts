import { supabase } from "@/integrations/supabase/client";
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

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
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
    })
    .select("*")
    .single();

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
