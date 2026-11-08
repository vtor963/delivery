import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  CheckCircle2,
  ChefHat,
  Bike,
  PackageCheck,
  Phone,
  MapPin,
  Clock,
} from "lucide-react";

import { DEMO_MODE, orderQuery, DEMO_ORDER_KEY } from "@/lib/queries";
import { formatBRL, formatPhone } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pedido/$orderId")({
  component: TrackingPage,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(orderQuery(params.orderId));
  },
});

const STATUS_STEPS = [
  { key: "pending", label: "Recebido", icon: CheckCircle2 },
  { key: "preparing", label: "Em preparo", icon: ChefHat },
  { key: "dispatched", label: "Saiu para entrega", icon: Bike },
  { key: "delivered", label: "Entregue", icon: PackageCheck },
] as const;

function TrackingPage() {
  const { orderId } = Route.useParams();
  const qc = useQueryClient();
  const { data: order } = useSuspenseQuery(orderQuery(orderId));

  // Realtime: escuta mudanças no pedido
  useEffect(() => {
    if (DEMO_MODE) return;
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["order", orderId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, qc]);

  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const address = order.address_details as any;

  if (order.status === "cancelled") {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="glass-strong mx-auto max-w-lg rounded-3xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-destructive">
            Pedido cancelado
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre em contato com a loja para mais informações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <header className="text-center">
          <Link to="/" className="ember-text-gradient font-display text-sm font-semibold">
            {(order as any).restaurants?.name ?? "Voltar ao cardápio"}
          </Link>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Acompanhe seu pedido
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pedido #{orderId.slice(0, 8).toUpperCase()}
          </p>
        </header>

        {/* Status timeline */}
        <section className="glass-strong ember-glow overflow-hidden rounded-3xl p-6 sm:p-8">
          <div className="relative">
            {STATUS_STEPS.map((step, idx) => {
              const done = idx <= currentIdx;
              const active = idx === currentIdx && order.status !== "delivered";
              const Icon = step.icon;
              const isLast = idx === STATUS_STEPS.length - 1;

              return (
                <div key={step.key} className="relative flex items-start gap-4 pb-8 last:pb-0">
                  {!isLast && (
                    <div
                      className={`absolute left-6 top-12 h-full w-0.5 transition-colors ${
                        idx < currentIdx ? "bg-[color:var(--ember)]" : "bg-border"
                      }`}
                    />
                  )}
                  <div
                    className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${
                      done
                        ? "ember-gradient text-primary-foreground"
                        : "glass text-muted-foreground"
                    } ${active ? "animate-ember-pulse" : ""}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div className="pt-2">
                    <p
                      className={`font-display text-base font-semibold ${
                        done ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    {active && (
                      <p className="mt-0.5 text-xs text-[color:var(--ember)]">
                        {step.key === "pending" && "Aguardando confirmação da loja"}
                        {step.key === "preparing" && "A padaria está preparando seu pedido"}
                        {step.key === "dispatched" && "O motoboy está a caminho! 🛵"}
                      </p>
                    )}
                    {idx === currentIdx && order.status === "delivered" && (
                      <p className="mt-0.5 text-xs text-success">
                        Bom apetite! 🍞
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Detalhes */}
        <section className="glass rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Resumo do pedido</h2>
          <ul className="space-y-2 text-sm">
            {(order as any).order_items?.map((item: any) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {item.quantity}x {item.product_name}
                </span>
                <span className="font-medium">
                  {formatBRL(Number(item.price_at_purchase) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatBRL(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Taxa de entrega</span>
              <span>{formatBRL(Number(order.delivery_fee))}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-base font-bold">
              <span>Total</span>
              <span className="text-[color:var(--ember)]">
                {formatBRL(Number(order.total))}
              </span>
            </div>
          </div>
        </section>

        {/* Entrega */}
        <section className="glass rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Entrega</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--ember)]" />
              <p>
                {address?.street}, {address?.number}
                {address?.complement && ` — ${address.complement}`}
                <br />
                <span className="text-muted-foreground">{address?.neighborhood}</span>
                {address?.reference && (
                  <>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      Ref: {address.reference}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-[color:var(--ember)]" />
              <span>{formatPhone(order.customer_phone)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-[color:var(--ember)]" />
              <span>{order.payment_method ?? "Pagamento na entrega"}</span>
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Esta página atualiza automaticamente. Você pode fechar e reabrir a qualquer momento.
        </p>
      </div>
    </div>
  );
}
