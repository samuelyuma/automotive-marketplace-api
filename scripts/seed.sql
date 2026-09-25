BEGIN;

INSERT INTO categories (name, slug)
VALUES ('Demo Cars', 'demo-cars')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (parent_id, name, slug)
SELECT parent.id, child.name, child.slug
FROM categories AS parent
CROSS JOIN (
  VALUES
    ('Sedans', 'demo-sedans'),
    ('SUVs', 'demo-suvs'),
    ('Hatchbacks', 'demo-hatchbacks'),
    ('MPVs', 'demo-mpvs')
) AS child(name, slug)
WHERE parent.slug = 'demo-cars'
ON CONFLICT (slug) DO NOTHING;

WITH models(slot, category_slug, make, model, base_price, engine_cc, fuel_type, transmission) AS (
  VALUES
    (0, 'demo-mpvs', 'Toyota', 'Avanza', 220000000, 1500, 'PETROL', 'AUTOMATIC'),
    (1, 'demo-hatchbacks', 'Honda', 'Brio', 160000000, 1200, 'PETROL', 'MANUAL'),
    (2, 'demo-mpvs', 'Mitsubishi', 'Xpander', 250000000, 1500, 'PETROL', 'AUTOMATIC'),
    (3, 'demo-suvs', 'Suzuki', 'XL7', 230000000, 1500, 'PETROL', 'AUTOMATIC'),
    (4, 'demo-suvs', 'Hyundai', 'Creta', 290000000, 1500, 'PETROL', 'AUTOMATIC'),
    (5, 'demo-sedans', 'Toyota', 'Vios', 290000000, 1500, 'PETROL', 'AUTOMATIC'),
    (6, 'demo-sedans', 'Honda', 'Civic', 550000000, 1500, 'PETROL', 'AUTOMATIC'),
    (7, 'demo-suvs', 'Mitsubishi', 'Pajero Sport', 620000000, 2400, 'DIESEL', 'AUTOMATIC'),
    (8, 'demo-suvs', 'Nissan', 'Kicks', 310000000, 1200, 'HYBRID', 'AUTOMATIC'),
    (9, 'demo-hatchbacks', 'Hyundai', 'Ioniq 5', 700000000, NULL::integer, 'ELECTRIC', 'AUTOMATIC')
)
INSERT INTO vehicle_listings (
  id, category_id, make, model, year, price, mileage, condition,
  color, location, fuel_type, transmission, engine_cc, created_at, updated_at
)
SELECT
  md5('automotive-demo-listing-' || series.n::text)::uuid,
  category.id,
  model.make,
  model.model,
  2012 + series.n % 14,
  model.base_price + (series.n % 17) * 1000000,
  (series.n * 3719) % 180000,
  (CASE
    WHEN series.n % 14 = 13 THEN 'NEW'
    WHEN series.n % 20 = 0 THEN 'CERTIFIED'
    ELSE 'USED'
  END)::listing_conditions,
  (ARRAY['Black', 'White', 'Silver', 'Red', 'Blue'])[series.n % 5 + 1],
  (ARRAY['Jakarta', 'Bandung', 'Surabaya', 'Semarang', 'Yogyakarta'])[series.n % 5 + 1],
  model.fuel_type::fuel_types,
  model.transmission::transmissions,
  model.engine_cc,
  now() - ((500 - series.n) * interval '1 hour'),
  now() - ((500 - series.n) * interval '1 hour')
FROM generate_series(1, 500) AS series(n)
JOIN models AS model ON model.slot = (series.n - 1) % 10
JOIN categories AS category ON category.slug = model.category_slug
ON CONFLICT (id) DO NOTHING;

COMMIT;
