/**
 * Provider-agnostic catalog search contract.
 *
 * The pilot uses a Firestore token-matching provider (cheap, no external
 * engine). The app depends only on this interface, so a dedicated search engine
 * (Algolia/Typesense/Meilisearch/etc.) can be added later without touching API
 * routes or UI — a config change plus a new adapter.
 */
import type { PublicProduct } from '@/types/catalog';

export interface SearchProvider {
  readonly id: 'firestore';
  /**
   * Search ACTIVE products only. Implementations must return at most `limit`
   * results and must never build queries from raw, unvalidated user input.
   */
  search(query: string, limit: number): Promise<PublicProduct[]>;
}
