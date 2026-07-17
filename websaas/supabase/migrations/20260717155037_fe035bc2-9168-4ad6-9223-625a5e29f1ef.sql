
-- Enum para status dos pedidos
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'dispatched', 'delivered', 'cancelled');

-- Trigger genérico updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ RESTAURANTS ============
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  theme_color TEXT DEFAULT '#e85d3a',
  phone TEXT NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurants_public_read" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "restaurants_owner_update" ON public.restaurants FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "restaurants_owner_insert" ON public.restaurants FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_restaurant ON public.categories(restaurant_id);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_owner_write" ON public.categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()));

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_restaurant ON public.products(restaurant_id);
CREATE INDEX idx_products_category ON public.products(category_id);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()));
CREATE POLICY "products_owner_write" ON public.products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address_details JSONB NOT NULL,
  notes TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_restaurant_status ON public.orders(restaurant_id, status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Cliente pode ler o pedido pelo ID (link direto). Sem enumeração possível (UUID).
CREATE POLICY "orders_public_read_by_id" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders_public_insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_owner_update" ON public.orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ORDER ITEMS ============
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase NUMERIC(10,2) NOT NULL,
  notes TEXT
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_public_read" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "order_items_public_insert" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_owner_write" ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.restaurants r ON r.id = o.restaurant_id WHERE o.id = order_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o JOIN public.restaurants r ON r.id = o.restaurant_id WHERE o.id = order_id AND r.owner_id = auth.uid()));

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- ============ SEED: Padaria Demo ============
WITH r AS (
  INSERT INTO public.restaurants (slug, name, description, phone, delivery_fee, min_order, theme_color)
  VALUES ('padaria-da-esquina', 'Padaria da Esquina', 'Pão quentinho, café fresco e doces artesanais todos os dias.', '5511999998888', 7.00, 15.00, '#e85d3a')
  RETURNING id
), cat_paes AS (
  INSERT INTO public.categories (restaurant_id, name, sort_order) SELECT id, 'Pães', 1 FROM r RETURNING id, restaurant_id
), cat_doces AS (
  INSERT INTO public.categories (restaurant_id, name, sort_order) SELECT id, 'Doces & Bolos', 2 FROM r RETURNING id, restaurant_id
), cat_bebidas AS (
  INSERT INTO public.categories (restaurant_id, name, sort_order) SELECT id, 'Bebidas', 3 FROM r RETURNING id, restaurant_id
), cat_salgados AS (
  INSERT INTO public.categories (restaurant_id, name, sort_order) SELECT id, 'Salgados', 4 FROM r RETURNING id, restaurant_id
)
INSERT INTO public.products (restaurant_id, category_id, name, description, price, sort_order)
SELECT restaurant_id, id, name, description, price, sort_order FROM (
  SELECT cp.restaurant_id, cp.id, x.name, x.description, x.price, x.sort_order FROM cat_paes cp
  CROSS JOIN (VALUES
    ('Pão Francês (unidade)', 'Crocante por fora, macio por dentro. Assado várias vezes ao dia.', 0.90, 1),
    ('Baguete Artesanal', 'Fermentação natural de 24h, casca dourada.', 12.50, 2),
    ('Pão de Queijo (6 un)', 'Feito com queijo minas curado.', 15.00, 3)
  ) AS x(name, description, price, sort_order)
  UNION ALL
  SELECT cd.restaurant_id, cd.id, x.name, x.description, x.price, x.sort_order FROM cat_doces cd
  CROSS JOIN (VALUES
    ('Bolo de Fubá Cremoso', 'Fatia generosa, receita da vovó.', 8.90, 1),
    ('Sonho de Creme', 'Recheado com creme de baunilha.', 6.50, 2),
    ('Brownie de Chocolate', 'Massa densa com pedaços de chocolate 70%.', 9.00, 3)
  ) AS x(name, description, price, sort_order)
  UNION ALL
  SELECT cb.restaurant_id, cb.id, x.name, x.description, x.price, x.sort_order FROM cat_bebidas cb
  CROSS JOIN (VALUES
    ('Café Coado 300ml', 'Grãos especiais torrados na hora.', 6.00, 1),
    ('Suco de Laranja 500ml', 'Espremido na hora, sem adição de açúcar.', 12.00, 2),
    ('Cappuccino', 'Espresso, leite vaporizado e canela.', 9.50, 3)
  ) AS x(name, description, price, sort_order)
  UNION ALL
  SELECT cs.restaurant_id, cs.id, x.name, x.description, x.price, x.sort_order FROM cat_salgados cs
  CROSS JOIN (VALUES
    ('Coxinha de Frango', 'Massa dourada, recheio cremoso.', 8.00, 1),
    ('Empada de Palmito', 'Massa amanteigada, recheio artesanal.', 9.00, 2),
    ('Quiche Lorraine', 'Fatia individual com bacon e queijo.', 14.00, 3)
  ) AS x(name, description, price, sort_order)
) t;
