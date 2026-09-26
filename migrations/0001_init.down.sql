-- Name: 0001_init.down
-- Description: Removes the initial listing and category tables, enum types, and their indexes.

DROP TABLE IF EXISTS attribute_definitions;
DROP TABLE IF EXISTS vehicle_listings;
DROP TABLE IF EXISTS categories;

DROP TYPE IF EXISTS attribute_types;
DROP TYPE IF EXISTS transmissions;
DROP TYPE IF EXISTS fuel_types;
DROP TYPE IF EXISTS listing_statuses;
DROP TYPE IF EXISTS listing_conditions;
