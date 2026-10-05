// App-level (camelCase) shapes for data that lives in Supabase. The JSON
// columns of custom_items are typed here; db.ts is the only place that maps
// between these and the snake_case rows in ./database.ts.

export type VerificationLevel = 'self' | 'precheck' | 'expert';
export type VerificationStatus = 'none' | 'angefragt' | 'in Prüfung' | 'verifiziert' | 'abgelehnt';

export interface Verification {
  level: VerificationLevel;
  status: VerificationStatus;
  reason: string;
  reviewId: string | null;
}

export interface Flock {
  source: string;
  name?: string;
  number?: string;
  type?: string;
}

export interface Signature {
  signed: boolean;
  by?: string;
  hasCoa?: boolean;
  issuer?: string;
}

export interface Condition {
  grade: number;
  defects: string[];
}

export interface Photo {
  /** Storage object path (vault-photos bucket). */
  path?: string;
  thumbPath?: string;
  /** Legacy inline image / local preview before upload. Never persisted for new photos. */
  dataUrl?: string;
  label?: string;
  width?: number;
  height?: number;
  lowRes?: boolean;
  blurry?: boolean;
  tooDark?: boolean;
  tooBright?: boolean;
}

export interface Valuation {
  blocked: boolean;
  /** Message key (older items: German text, shown as is). */
  reason?: string;
  low?: number;
  mid: number;
  high?: number;
  confidence?: string;
  /** What the estimate rests on, as a message. */
  basis?: { key: string; vars?: Record<string, string | number> };
  /** Older items: the same, as German text. */
  basisText?: string;
}

export interface Precheck {
  status: 'ok' | 'review' | 'fake';
  /** Message keys (older items: German text, shown as is). */
  notes: string[];
}

export type Visibility = 'private' | 'public' | 'offers' | 'forsale';

export interface CustomItem {
  id: string;
  catalogId: string | null;
  proposed: boolean;
  proposedClub: string;
  proposedSeason: string;
  proposedVariant: string;
  version: string | null;
  sizeGroup: string | null;
  size: string | null;
  sleeve: string | null;
  flock: Flock;
  patches: string[];
  signature: Signature;
  tagsAttached: boolean;
  condition: Condition;
  provenance: string;
  photos: Record<string, Photo>;
  precheck: Precheck | null;
  verification: Verification;
  visibility: Visibility;
  salePrice: string;
  valuation: Valuation | null;
  initialValuation: Valuation | null;
  createdAt: number;
  updatedAt: number;
}

/** What a review request carries: a frozen copy of the submission. */
export interface ReviewSnapshot {
  catalogId?: string | null;
  proposedName?: string;
  version?: string | null;
  sizeGroup?: string | null;
  size?: string | null;
  sleeve?: string | null;
  flock?: Flock;
  patches?: string[];
  signature?: Signature;
  tagsAttached?: boolean;
  condition?: Condition;
  provenance?: string;
  photos?: Record<string, Photo>;
  precheck?: Precheck | null;
}

export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

export interface Review extends ReviewSnapshot {
  id: string;
  customItemId: string | null;
  status: ReviewStatus;
  reason: string;
  submittedAt: number;
  reviewedAt: number | null;
}

export type OrderStatus = 'pending_payment' | 'paid_escrow' | 'shipped' | 'delivered' | 'released' | 'disputed' | 'cancelled' | 'refunded';

export type EventType = 'view' | 'watch' | 'unwatch' | 'bid' | 'buy';
