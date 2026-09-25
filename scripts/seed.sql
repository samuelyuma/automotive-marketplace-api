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
    ('MPVs', 'demo-mpvs'),
    ('Coupes', 'demo-coupes'),
    ('Pickups', 'demo-pickups'),
    ('Vans', 'demo-vans'),
    ('Wagons', 'demo-wagons'),
    ('Crossovers', 'demo-crossovers')
) AS child(name, slug)
WHERE parent.slug = 'demo-cars'
ON CONFLICT (slug) DO NOTHING;

WITH common(key, label, type, options) AS (
  VALUES
    ('condition', 'Condition', 'ENUM'::attribute_types, ARRAY['NEW', 'USED', 'CERTIFIED']),
    ('fuel_type', 'Fuel Type', 'ENUM'::attribute_types, ARRAY['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC']),
    ('transmission', 'Transmission', 'ENUM'::attribute_types, ARRAY['MANUAL', 'AUTOMATIC']),
    ('color', 'Color', 'ENUM'::attribute_types, ARRAY['Black', 'White', 'Silver', 'Red', 'Blue']),
    ('location', 'Location', 'ENUM'::attribute_types, ARRAY['Jakarta', 'Bandung', 'Surabaya', 'Semarang', 'Yogyakarta']),
    ('year', 'Year', 'RANGE'::attribute_types, NULL::text[]),
    ('price', 'Price', 'RANGE'::attribute_types, NULL::text[]),
    ('mileage', 'Mileage', 'RANGE'::attribute_types, NULL::text[])
)
INSERT INTO attribute_definitions AS current (category_id, key, label, type, options)
SELECT category.id, common.key, common.label, common.type, common.options
FROM categories AS category
CROSS JOIN common
WHERE category.slug IN (
  'demo-cars', 'demo-sedans', 'demo-suvs', 'demo-hatchbacks', 'demo-mpvs',
  'demo-coupes', 'demo-pickups', 'demo-vans', 'demo-wagons', 'demo-crossovers'
)
ON CONFLICT (category_id, key) WHERE deleted_at IS NULL
DO UPDATE SET
  label = EXCLUDED.label,
  type = EXCLUDED.type,
  options = EXCLUDED.options,
  updated_at = now()
WHERE (current.label, current.type, current.options)
  IS DISTINCT FROM (EXCLUDED.label, EXCLUDED.type, EXCLUDED.options);

WITH specialized(category_slug, key, label, type, options) AS (
  VALUES
    ('demo-sedans', 'segment', 'Segment', 'ENUM'::attribute_types, ARRAY['Compact', 'Midsize', 'Luxury']),
    ('demo-sedans', 'sunroof', 'Sunroof', 'BOOLEAN'::attribute_types, NULL::text[]),
    ('demo-suvs', 'drivetrain', 'Drivetrain', 'ENUM'::attribute_types, ARRAY['FWD', 'RWD', 'AWD', '4WD']),
    ('demo-suvs', 'third_row', 'Third Row Seating', 'BOOLEAN'::attribute_types, NULL::text[]),
    ('demo-hatchbacks', 'doors', 'Doors', 'RANGE'::attribute_types, NULL::text[]),
    ('demo-hatchbacks', 'city_friendly', 'City Friendly', 'BOOLEAN'::attribute_types, NULL::text[]),
    ('demo-mpvs', 'seats', 'Seats', 'RANGE'::attribute_types, NULL::text[]),
    ('demo-mpvs', 'sliding_doors', 'Sliding Doors', 'BOOLEAN'::attribute_types, NULL::text[]),
    ('demo-coupes', 'doors', 'Doors', 'RANGE'::attribute_types, NULL::text[]),
    ('demo-coupes', 'performance_trim', 'Performance Trim', 'BOOLEAN'::attribute_types, NULL::text[]),
    ('demo-pickups', 'cab_type', 'Cab Type', 'ENUM'::attribute_types, ARRAY['Single', 'Extended', 'Double']),
    ('demo-pickups', 'payload_kg', 'Payload (kg)', 'RANGE'::attribute_types, NULL::text[]),
    ('demo-pickups', 'four_wheel_drive', 'Four Wheel Drive', 'BOOLEAN'::attribute_types, NULL::text[]),
    ('demo-vans', 'seats', 'Seats', 'RANGE'::attribute_types, NULL::text[]),
    ('demo-vans', 'commercial_use', 'Commercial Use', 'BOOLEAN'::attribute_types, NULL::text[]),
    ('demo-wagons', 'cargo_liters', 'Cargo Volume (L)', 'RANGE'::attribute_types, NULL::text[]),
    ('demo-wagons', 'roof_rails', 'Roof Rails', 'BOOLEAN'::attribute_types, NULL::text[]),
    ('demo-crossovers', 'drivetrain', 'Drivetrain', 'ENUM'::attribute_types, ARRAY['FWD', 'AWD']),
    ('demo-crossovers', 'hybrid', 'Hybrid', 'BOOLEAN'::attribute_types, NULL::text[])
)
INSERT INTO attribute_definitions AS current (category_id, key, label, type, options)
SELECT category.id, specialized.key, specialized.label, specialized.type, specialized.options
FROM specialized
JOIN categories AS category ON category.slug = specialized.category_slug
ON CONFLICT (category_id, key) WHERE deleted_at IS NULL
DO UPDATE SET
  label = EXCLUDED.label,
  type = EXCLUDED.type,
  options = EXCLUDED.options,
  updated_at = now()
WHERE (current.label, current.type, current.options)
  IS DISTINCT FROM (EXCLUDED.label, EXCLUDED.type, EXCLUDED.options);

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
    (8, 'demo-crossovers', 'Nissan', 'Kicks', 310000000, 1200, 'HYBRID', 'AUTOMATIC'),
    (9, 'demo-hatchbacks', 'Hyundai', 'Ioniq 5', 700000000, NULL::integer, 'ELECTRIC', 'AUTOMATIC'),
    (10, 'demo-pickups', 'Ford', 'Ranger', 520000000, 2000, 'DIESEL', 'AUTOMATIC'),
    (11, 'demo-vans', 'Toyota', 'Hiace', 590000000, 2800, 'DIESEL', 'MANUAL'),
    (12, 'demo-coupes', 'BMW', '4 Series', 1100000000, 2000, 'PETROL', 'AUTOMATIC'),
    (13, 'demo-wagons', 'Subaru', 'Outback', 780000000, 2500, 'PETROL', 'AUTOMATIC'),
    (14, 'demo-crossovers', 'Toyota', 'Corolla Cross', 420000000, 1800, 'HYBRID', 'AUTOMATIC')
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
JOIN models AS model ON model.slot = (series.n - 1) % 15
JOIN categories AS category ON category.slug = model.category_slug
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  make = EXCLUDED.make,
  model = EXCLUDED.model,
  year = EXCLUDED.year,
  price = EXCLUDED.price,
  mileage = EXCLUDED.mileage,
  condition = EXCLUDED.condition,
  color = EXCLUDED.color,
  location = EXCLUDED.location,
  fuel_type = EXCLUDED.fuel_type,
  transmission = EXCLUDED.transmission,
  engine_cc = EXCLUDED.engine_cc,
  updated_at = now()
WHERE (
  vehicle_listings.category_id, vehicle_listings.make, vehicle_listings.model,
  vehicle_listings.year, vehicle_listings.price, vehicle_listings.mileage,
  vehicle_listings.condition, vehicle_listings.color, vehicle_listings.location,
  vehicle_listings.fuel_type, vehicle_listings.transmission, vehicle_listings.engine_cc
) IS DISTINCT FROM (
  EXCLUDED.category_id, EXCLUDED.make, EXCLUDED.model,
  EXCLUDED.year, EXCLUDED.price, EXCLUDED.mileage,
  EXCLUDED.condition, EXCLUDED.color, EXCLUDED.location,
  EXCLUDED.fuel_type, EXCLUDED.transmission, EXCLUDED.engine_cc
);

COMMIT;
