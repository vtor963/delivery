import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DEMO_SLUG = "padaria-da-esquina";

export const restaurantQuery = (slug: string) =>
  queryOptions({
    queryKey: ["restaurant", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Restaurante não encontrado");
      return data;
    },
  });

export const menuQuery = (restaurantId: string) =>
  queryOptions({
    queryKey: ["menu", restaurantId],
    queryFn: async () => {
      const [{ data: categories, error: catErr }, { data: products, error: prodErr }] =
        await Promise.all([
          supabase
            .from("categories")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("sort_order"),
          supabase
            .from("products")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .eq("is_active", true)
            .order("sort_order"),
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
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), restaurants(name, phone, logo_url)")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Pedido não encontrado");
      return data;
    },
  });
