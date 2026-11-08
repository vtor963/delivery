import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Demo mode is intentionally independent from Supabase so a buyer can test
// the storefront even when the database is paused or not configured.
export const DEMO_MODE = true;
export const DEMO_SLUG = "burger-house";

const demoRestaurant = {
  id: "demo-restaurant",
  name: "Burger House",
  slug: DEMO_SLUG,
  description: "Hambúrguer artesanal, ingredientes selecionados e muito sabor.",
  phone: "5511999999999",
  is_open: true,
  delivery_fee: 5,
  min_order: 20,
  logo_url: null,
};

const demoCategories = [
  { id: "cat-burgers", restaurant_id: demoRestaurant.id, name: "Hambúrgueres", sort_order: 1 },
  { id: "cat-combos", restaurant_id: demoRestaurant.id, name: "Combos", sort_order: 2 },
  { id: "cat-drinks", restaurant_id: demoRestaurant.id, name: "Bebidas", sort_order: 3 },
];

const demoProducts = [
  { id: "burger-classic", restaurant_id: demoRestaurant.id, category_id: "cat-burgers", name: "Classic Burger", description: "Pão brioche, hambúrguer  smash 150g, queijo cheddar, alface e molho da casa.", price: 24.9, is_active: true, sort_order: 1 },
  { id: "burger-bacon", restaurant_id: demoRestaurant.id, category_id: "cat-burgers", name: "Bacon House", description: "Hambúrguer 180g, cheddar cremoso, bacon crocante e cebola caramelizada.", price: 29.9, is_active: true, sort_order: 2 },
  { id: "burger-double", restaurant_id: demoRestaurant.id, category_id: "cat-burgers", name: "Double Smash", description: "Dois smash burgers, dobro de queijo e molho especial.", price: 34.9, is_active: true, sort_order: 3 },
  { id: "combo-house", restaurant_id: demoRestaurant.id, category_id: "cat-combos", name: "Combo House", description: "Classic Burger + batata frita + refrigerante lata.", price: 36.9, is_active: true, sort_order: 1 },
  { id: "combo-double", restaurant_id: demoRestaurant.id, category_id: "cat-combos", name: "Combo Double", description: "Double Smash + batata frita + refrigerante lata.", price: 44.9, is_active: true, sort_order: 2 },
  { id: "drink-cola", restaurant_id: demoRestaurant.id, category_id: "cat-drinks", name: "Refrigerante lata", description: "Lata 350ml bem gelada.", price: 6, is_active: true, sort_order: 1 },
  { id: "drink-water", restaurant_id: demoRestaurant.id, category_id: "cat-drinks", name: "Água mineral", description: "Garrafa 500ml.", price: 4, is_active: true, sort_order: 2 },
];

const DEMO_ORDER_KEY = "delivery_demo_orders_v1";

export const restaurantQuery = (slug: string) =>
  queryOptions({
    queryKey: ["restaurant", slug],
    queryFn: async () => {
      if (DEMO_MODE) return demoRestaurant as any;
      const { data, error } = await supabase
        .from("restaurants").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Restaurante não encontrado");
      return data;
    },
  });

export const menuQuery = (restaurantId: string) =>
  queryOptions({
    queryKey: ["menu", restaurantId],
    queryFn: async () => {
      if (DEMO_MODE) return { categories: demoCategories, products: demoProducts } as any;
      const [{ data: categories, error: catErr }, { data: products, error: prodErr }] =
        await Promise.all([
          supabase.from("categories").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
          supabase.from("products").select("*").eq("restaurant_id", restaurantId).eq("is_active", true).order("sort_order"),
        ]);
      if (catErr) throw catErr;
      if (prodErr) throw prodErr;
      return { categories: categories ?? [], products: products ?? [] };
    },
  });

export const orderQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (DEMO_MODE) {
        if (typeof window !== "undefined") {
          try {
            const saved = JSON.parse(window.localStorage.getItem(DEMO_ORDER_KEY) || "{}");
            if (saved[orderId]) return saved[orderId] as any;
          } catch { /* use the sample order below */ }
        }
        return {
          id: orderId,
          status: "preparing",
          customer_name: "Cliente de demonstração",
          customer_phone: "11999999999",
          address_details: { street: "Rua das Flores", number: "123", neighborhood: "Centro" },
          subtotal: 29.9,
          delivery_fee: 5,
          total: 34.9,
          payment_method: "Pix (simulação)",
          order_items: [{ id: "demo-item", quantity: 1, product_name: "Bacon House", price_at_purchase: 29.9 }],
          restaurants: { name: demoRestaurant.name, phone: demoRestaurant.phone, logo_url: null },
        } as any;
      }
      const { data, error } = await supabase
        .from("orders").select("*, order_items(*), restaurants(name, phone, logo_url)")
        .eq("id", orderId).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Pedido não encontrado");
      return data;
    },
  });

export { DEMO_ORDER_KEY };
