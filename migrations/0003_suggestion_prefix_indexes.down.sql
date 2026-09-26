-- Name: 0003_suggestion_prefix_indexes.down
-- Description: Removes the prefix indexes used by listing suggestions.

DROP INDEX idx_listings_location_prefix;
DROP INDEX idx_listings_model_prefix;
DROP INDEX idx_listings_make_prefix;
