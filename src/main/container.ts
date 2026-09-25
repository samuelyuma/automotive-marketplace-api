import type { CachePort } from "../application/ports/cache.port";
import { CategoryService } from "../application/service/category.service";
import { FilterService } from "../application/service/filter.service";
import { ListingService } from "../application/service/listing.service";
import { ListingSearchService } from "../application/service/listing-search.service";
import { traceLayer } from "../infrastructure/logging/trace-layer";
import { RedisCache } from "../infrastructure/redis/cache";
import { PgCategoryRepository } from "../repository/postgres/category.repository";
import { PgFilterRepository } from "../repository/postgres/filter.repository";
import { PgListingRepository } from "../repository/postgres/listing.repository";
import { PgListingSearchRepository } from "../repository/postgres/listing-search.repository";

export function buildContainer(cache: CachePort = new RedisCache()) {
  const categoryRepository = traceLayer(
    "repository",
    "category",
    new PgCategoryRepository(),
  );
  const listingRepository = traceLayer(
    "repository",
    "listing",
    new PgListingRepository(),
  );
  const listingSearchRepository = traceLayer(
    "repository",
    "listingSearch",
    new PgListingSearchRepository(),
  );
  const filterRepository = traceLayer(
    "repository",
    "filter",
    new PgFilterRepository(),
  );

  return {
    cache,
    categoryService: traceLayer(
      "service",
      "category",
      new CategoryService(categoryRepository),
    ),
    filterService: traceLayer(
      "service",
      "filter",
      new FilterService(categoryRepository, filterRepository),
    ),
    listingService: traceLayer(
      "service",
      "listing",
      new ListingService(listingRepository, cache),
    ),
    listingSearchService: traceLayer(
      "service",
      "listingSearch",
      new ListingSearchService(listingSearchRepository),
    ),
  };
}

export type Container = ReturnType<typeof buildContainer>;
