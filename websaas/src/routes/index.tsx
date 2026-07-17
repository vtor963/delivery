import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  Trash2,
  X,
  ChefHat,
} from "lucide-react";

import { cartStore, useCart, type CartItem } from "@/lib/cart";
import { DEMO_SLUG, menuQuery, restaurantQuery } from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import { createOrder } from "@/lib/orders";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  component: Storefront,
  loader: async ({ context }) => {
    const restaurant = await context.queryClient.ensureQueryData(
      restaurantQuery(DEMO_SLUG),
    );
    await context.queryClient.ensureQueryData(menuQuery(restaurant.id));
    return { restaurantId: restaurant.id };
  },
});

function Storefront() {
  const { data: restaurant } = useSuspenseQuery(restaurantQuery(DEMO_SLUG));
  const { data: menu } = useSuspenseQuery(menuQuery(restaurant.id));
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const cart = useCart();

  const productsByCategory = useMemo(() => {
    const map = new Map<string, typeof menu.products>();
    menu.categories.forEach((c) => map.set(c.id, []));
    menu.products.forEach((p) => {
      if (!p.category_id) return;
      const list = map.get(p.category_id) ?? [];
      list.push(p);
      map.set(p.category_id, list);
    });
    return map;
  }, [menu]);

  return (
    <div className="min-h-screen">
      {/* Sticky nav */}
      <header className="glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="ember-gradient flex h-10 w-10 items-center justify-center rounded-2xl">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-tight sm:text-base">
                {restaurant.name}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    restaurant.is_open ? "bg-success" : "bg-destructive"
                  }`}
                />
                {restaurant.is_open ? "Aberto agora" : "Fechado"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="glass-strong relative flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">
              {cart.count > 0 ? formatBRL(cart.subtotal) : "Carrinho"}
            </span>
            {cart.count > 0 && (
              <span className="ember-gradient absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-primary-foreground">
                {cart.count}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="glass-strong ember-glow relative overflow-hidden rounded-3xl p-8 sm:p-12">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-40 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.78 0.17 55) 0%, transparent 70%)",
              }}
            />
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ember)]">
              Delivery em tempo real
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              {restaurant.name.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="ember-text-gradient">
                {restaurant.name.split(" ").slice(-1)}
              </span>
            </h1>
            {restaurant.description && (
              <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
                {restaurant.description}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3 text-xs">
              <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-[color:var(--ember)]" />
                Entrega em 30-45min
              </span>
              <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
                <MapPin className="h-3.5 w-3.5 text-[color:var(--ember)]" />
                Taxa {formatBRL(Number(restaurant.delivery_fee))}
              </span>
              <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-[color:var(--ember)]" />
                Mín. {formatBRL(Number(restaurant.min_order))}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias tabs (scrollable) */}
      <nav className="sticky top-[65px] z-30 -mb-2">
        <div className="glass border-y border-border">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
            {menu.categories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="whitespace-nowrap rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
              >
                {cat.name}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Menu grid */}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {menu.categories.map((cat) => {
          const items = productsByCategory.get(cat.id) ?? [];
          if (!items.length) return null;
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="mb-12 scroll-mt-36">
              <h2 className="mb-5 font-display text-2xl font-bold sm:text-3xl">
                {cat.name}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* Sticky bottom CTA when cart has items */}
      {cart.count > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-md justify-center px-4">
          <button
            onClick={() => setCartOpen(true)}
            className="ember-gradient ember-glow flex w-full items-center justify-between rounded-full px-6 py-4 text-sm font-bold text-primary-foreground shadow-2xl transition-transform hover:scale-[1.02]"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs">
                {cart.count}
              </span>
              Ver carrinho
            </span>
            <span>{formatBRL(cart.subtotal)}</span>
          </button>
        </div>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
        minOrder={Number(restaurant.min_order)}
        deliveryFee={Number(restaurant.delivery_fee)}
      />
      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        restaurant={restaurant}
      />
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  return (
    <div className="glass group relative flex flex-col overflow-hidden rounded-2xl p-5 transition-all hover:border-[color:var(--ember)]/40">
      <div className="flex-1">
        <h3 className="font-display text-lg font-semibold leading-snug">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-display text-xl font-bold text-[color:var(--ember)]">
          {formatBRL(Number(product.price))}
        </span>
        <button
          onClick={() =>
            cartStore.add({
              productId: product.id,
              name: product.name,
              price: Number(product.price),
            })
          }
          className="ember-gradient flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground transition-transform hover:scale-110 active:scale-95"
          aria-label="Adicionar ao carrinho"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function CartDrawer({
  open,
  onClose,
  onCheckout,
  minOrder,
  deliveryFee,
}: {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  minOrder: number;
  deliveryFee: number;
}) {
  const cart = useCart();
  const belowMin = cart.subtotal < minOrder;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={`glass-strong absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-bold">Seu pedido</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-secondary"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="glass mb-4 flex h-20 w-20 items-center justify-center rounded-full">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Seu carrinho está vazio. Escolha alguns itens do cardápio para começar.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ul className="space-y-3">
                {cart.items.map((it) => (
                  <CartRow key={it.productId} item={it} />
                ))}
              </ul>
            </div>
            <footer className="border-t border-border px-6 py-5">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatBRL(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Entrega</span>
                  <span>{formatBRL(deliveryFee)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-base font-bold">
                  <span>Total</span>
                  <span>{formatBRL(cart.subtotal + deliveryFee)}</span>
                </div>
              </div>
              {belowMin && (
                <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                  Pedido mínimo de {formatBRL(minOrder)}. Faltam{" "}
                  {formatBRL(minOrder - cart.subtotal)}.
                </p>
              )}
              <button
                disabled={belowMin}
                onClick={onCheckout}
                className="ember-gradient mt-4 w-full rounded-full py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Finalizar pedido
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

function CartRow({ item }: { item: CartItem }) {
  return (
    <li className="glass flex items-center gap-3 rounded-xl p-3">
      <div className="flex-1">
        <p className="font-medium leading-tight">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatBRL(item.price)} un
        </p>
      </div>
      <div className="glass-subtle flex items-center gap-1 rounded-full p-1">
        <button
          onClick={() => cartStore.setQuantity(item.productId, item.quantity - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary"
        >
          {item.quantity === 1 ? (
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
        </button>
        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
        <button
          onClick={() => cartStore.setQuantity(item.productId, item.quantity + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="w-16 text-right text-sm font-bold text-[color:var(--ember)]">
        {formatBRL(item.price * item.quantity)}
      </span>
    </li>
  );
}

function CheckoutDialog({
  open,
  onClose,
  restaurant,
}: {
  open: boolean;
  onClose: () => void;
  restaurant: any;
}) {
  const cart = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    street: "",
    number: "",
    neighborhood: "",
    complement: "",
    reference: "",
    payment: "Dinheiro",
    notes: "",
  });

  const total = cart.subtotal + Number(restaurant.delivery_fee);

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.phone.replace(/\D/g, "").length >= 10 &&
    form.street.trim() &&
    form.number.trim() &&
    form.neighborhood.trim() &&
    cart.items.length > 0 &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const order = await createOrder({
        restaurantId: restaurant.id,
        deliveryFee: Number(restaurant.delivery_fee),
        customerName: form.name.trim(),
        customerPhone: form.phone,
        address: {
          street: form.street.trim(),
          number: form.number.trim(),
          neighborhood: form.neighborhood.trim(),
          complement: form.complement.trim() || undefined,
          reference: form.reference.trim() || undefined,
        },
        notes: form.notes.trim() || undefined,
        paymentMethod: form.payment,
        items: cart.items,
      });

      const trackingUrl = `${window.location.origin}/pedido/${order.id}`;
      const waUrl = buildWhatsAppUrl({
        orderId: order.id,
        restaurantPhone: restaurant.phone.replace(/\D/g, ""),
        customerName: form.name.trim(),
        customerPhone: form.phone,
        address: {
          street: form.street.trim(),
          number: form.number.trim(),
          neighborhood: form.neighborhood.trim(),
          complement: form.complement.trim() || undefined,
          reference: form.reference.trim() || undefined,
        },
        items: cart.items.map((i) => ({
          quantity: i.quantity,
          name: i.name,
          price: i.price,
        })),
        subtotal: cart.subtotal,
        deliveryFee: Number(restaurant.delivery_fee),
        total,
        paymentMethod: form.payment,
        notes: form.notes.trim() || undefined,
        trackingUrl,
      });

      cartStore.clear();
      window.open(waUrl, "_blank");
      onClose();
      navigate({ to: "/pedido/$orderId", params: { orderId: order.id } });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar o pedido. Tente novamente.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-lg overflow-y-auto border-border bg-transparent">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Finalizar pedido</DialogTitle>
          <DialogDescription>
            Confirme seus dados. Você será redirecionado ao WhatsApp com o resumo do pedido.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nome" className="col-span-2">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Seu nome"
              />
            </FormField>
            <FormField label="WhatsApp" className="col-span-2">
              <Input
                required
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-8888"
              />
            </FormField>
            <FormField label="Rua" className="col-span-2">
              <Input
                required
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </FormField>
            <FormField label="Número">
              <Input
                required
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
              />
            </FormField>
            <FormField label="Bairro">
              <Input
                required
                value={form.neighborhood}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              />
            </FormField>
            <FormField label="Complemento" className="col-span-2">
              <Input
                value={form.complement}
                onChange={(e) => setForm({ ...form, complement: e.target.value })}
                placeholder="Apto, bloco…"
              />
            </FormField>
            <FormField label="Referência" className="col-span-2">
              <Input
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Próximo à padaria X"
              />
            </FormField>
            <FormField label="Forma de pagamento" className="col-span-2">
              <div className="flex flex-wrap gap-2">
                {["Dinheiro", "Pix", "Cartão na entrega"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm({ ...form, payment: opt })}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      form.payment === opt
                        ? "ember-gradient text-primary-foreground"
                        : "glass hover:border-[color:var(--ember)]/50"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Observações" className="col-span-2">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Sem cebola, troco para R$ 50, etc."
                rows={2}
              />
            </FormField>
          </div>

          <div className="glass rounded-xl p-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal ({cart.count} itens)</span>
              <span>{formatBRL(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Taxa de entrega</span>
              <span>{formatBRL(Number(restaurant.delivery_fee))}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-base font-bold">
              <span>Total</span>
              <span className="text-[color:var(--ember)]">{formatBRL(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="ember-gradient ember-glow flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Phone className="h-4 w-4" />
            {submitting ? "Enviando..." : "Confirmar e enviar pelo WhatsApp"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
