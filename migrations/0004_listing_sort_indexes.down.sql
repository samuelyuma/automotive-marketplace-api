-- Name: 0004_listing_sort_indexes.down
-- Description: Removes the indexes used for sorted listing pages.

DROP INDEX idx_listings_mileage_id;
DROP INDEX idx_listings_year_id;
DROP INDEX idx_listings_price_id;
