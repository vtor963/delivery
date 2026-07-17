import { formatBRL, formatPhone } from "./format";

export interface WhatsAppOrderPayload {
  orderId: string;
  restaurantPhone: string; // digits with country code, e.g. "5511999998888"
  customerName: string;
  customerPhone: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    reference?: string;
  };
  items: Array<{ quantity: number; name: string; price: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod?: string;
  notes?: string;
  trackingUrl: string;
}

export function buildOrderMessage(o: WhatsAppOrderPayload): string {
  const lines = [
    "*--- ACABEI DE REALIZAR UM PEDIDO ---*",
    "",
    `*Cliente:* ${o.customerName}`,
    `*Telefone:* ${formatPhone(o.customerPhone)}`,
    `*Endereço:* ${o.address.street}, ${o.address.number} - ${o.address.neighborhood}${
      o.address.complement ? ` (${o.address.complement})` : ""
    }`,
    o.address.reference ? `*Referência:* ${o.address.reference}` : null,
    "",
    "============================",
    "*ITENS DO PEDIDO:*",
    ...o.items.map(
      (i) => `• ${i.quantity}x ${i.name} — ${formatBRL(i.price * i.quantity)}`,
    ),
    "============================",
    "",
    `*Subtotal:* ${formatBRL(o.subtotal)}`,
    `*Taxa de Entrega:* ${formatBRL(o.deliveryFee)}`,
    `*TOTAL DO PEDIDO:* ${formatBRL(o.total)}`,
    o.paymentMethod ? `*Pagamento:* ${o.paymentMethod}` : null,
    o.notes ? `\n*Observações:* ${o.notes}` : null,
    "",
    `_Acompanhe o status do seu pedido em tempo real:_`,
    o.trackingUrl,
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildWhatsAppUrl(payload: WhatsAppOrderPayload): string {
  const text = encodeURIComponent(buildOrderMessage(payload));
  return `https://wa.me/${payload.restaurantPhone}?text=${text}`;
}
