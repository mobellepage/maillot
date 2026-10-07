// Generated from the Supabase schema — do not edit by hand.
// Regenerate with `npm run db:types` (local stack) after any migration.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      catalog_shirts: {
        Row: {
          active: boolean;
          added_at: string;
          brand: string;
          club: string;
          cond: string;
          created_at: string;
          crest_color: string;
          edition: string;
          glow_color: string;
          id: string;
          index_change_30d: number;
          index_price: number;
          league: string;
          name: string;
          number_color: string | null;
          pattern: string;
          player: string | null;
          season: string;
          sizes: string[];
          sku: string;
          trim_color: string;
          type: string;
          updated_at: string;
          year: number;
        };
        Insert: Partial<Database['public']['Tables']['catalog_shirts']['Row']> & { id: string; club: string; name: string; season: string; year: number; brand: string; league: string; type: string; cond: string; edition: string; index_price: number; pattern: string; trim_color: string; crest_color: string; glow_color: string; sku: string };
        Update: Partial<Database['public']['Tables']['catalog_shirts']['Row']>;
        Relationships: [];
      };
      api_keys: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          key_hash: string;
          key_prefix: string;
          label: string;
          last_used_at: string | null;
          revoked_at: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key_hash: string;
          key_prefix: string;
          label: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key_hash?: string;
          key_prefix?: string;
          label?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      asks: {
        Row: {
          amount: number;
          condition: string | null;
          created_at: string;
          custom_item_id: string | null;
          edition: string | null;
          id: string;
          player_print: string | null;
          shirt_id: string | null;
          size: string;
          status: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          condition?: string | null;
          created_at?: string;
          custom_item_id?: string | null;
          edition?: string | null;
          id?: string;
          player_print?: string | null;
          shirt_id?: string | null;
          size: string;
          status?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          condition?: string | null;
          created_at?: string;
          custom_item_id?: string | null;
          edition?: string | null;
          id?: string;
          player_print?: string | null;
          shirt_id?: string | null;
          size?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asks_custom_item_id_fkey';
            columns: ['custom_item_id'];
            isOneToOne: false;
            referencedRelation: 'custom_items';
            referencedColumns: ['id'];
          }
        ];
      };
      bids: {
        Row: {
          amount: number;
          created_at: string;
          expires_at: string | null;
          id: string;
          shirt_id: string;
          size: string;
          status: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          shirt_id: string;
          size: string;
          status?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          shirt_id?: string;
          size?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      custom_items: {
        Row: {
          catalog_id: string | null;
          condition: Json | null;
          created_at: string;
          flock: Json | null;
          id: string;
          initial_valuation: Json | null;
          patches: Json | null;
          photos: Json | null;
          precheck: Json | null;
          proposed: boolean | null;
          proposed_club: string | null;
          proposed_season: string | null;
          proposed_variant: string | null;
          provenance: string | null;
          sale_price: string | null;
          signature: Json | null;
          size: string | null;
          size_group: string | null;
          sleeve: string | null;
          tags_attached: boolean | null;
          updated_at: string;
          user_id: string;
          valuation: Json | null;
          verification: Json;
          version: string | null;
          visibility: string;
        };
        Insert: {
          catalog_id?: string | null;
          condition?: Json | null;
          created_at?: string;
          flock?: Json | null;
          id: string;
          initial_valuation?: Json | null;
          patches?: Json | null;
          photos?: Json | null;
          precheck?: Json | null;
          proposed?: boolean | null;
          proposed_club?: string | null;
          proposed_season?: string | null;
          proposed_variant?: string | null;
          provenance?: string | null;
          sale_price?: string | null;
          signature?: Json | null;
          size?: string | null;
          size_group?: string | null;
          sleeve?: string | null;
          tags_attached?: boolean | null;
          updated_at?: string;
          user_id: string;
          valuation?: Json | null;
          verification?: Json;
          version?: string | null;
          visibility?: string;
        };
        Update: {
          catalog_id?: string | null;
          condition?: Json | null;
          created_at?: string;
          flock?: Json | null;
          id?: string;
          initial_valuation?: Json | null;
          patches?: Json | null;
          photos?: Json | null;
          precheck?: Json | null;
          proposed?: boolean | null;
          proposed_club?: string | null;
          proposed_season?: string | null;
          proposed_variant?: string | null;
          provenance?: string | null;
          sale_price?: string | null;
          signature?: Json | null;
          size?: string | null;
          size_group?: string | null;
          sleeve?: string | null;
          tags_attached?: boolean | null;
          updated_at?: string;
          user_id?: string;
          valuation?: Json | null;
          verification?: Json;
          version?: string | null;
          visibility?: string;
        };
        Relationships: [];
      };
      disputes: {
        Row: {
          created_at: string;
          id: string;
          opened_by: string | null;
          order_id: string;
          reason: string;
          resolution_note: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          opened_by?: string | null;
          order_id: string;
          reason: string;
          resolution_note?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          opened_by?: string | null;
          order_id?: string;
          reason?: string;
          resolution_note?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'disputes_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          }
        ];
      };
      events: {
        Row: {
          created_at: string;
          id: number;
          shirt_id: string;
          type: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: never;
          shirt_id: string;
          type: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: never;
          shirt_id?: string;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          code: string;
          order_id: string | null;
          shirt_id: string | null;
          size: string | null;
          checks: Json;
          nfc_uid: string | null;
          issued_at: string;
          revoked_at: string | null;
          revoked_reason: string | null;
        };
        Insert: { code: string; order_id?: string | null; shirt_id?: string | null; size?: string | null; checks?: Json; nfc_uid?: string | null; issued_at?: string; revoked_at?: string | null; revoked_reason?: string | null };
        Update: { code?: string; order_id?: string | null; shirt_id?: string | null; size?: string | null; checks?: Json; nfc_uid?: string | null; issued_at?: string; revoked_at?: string | null; revoked_reason?: string | null };
        Relationships: [];
      };
      seller_reviews: {
        Row: { order_id: string; seller_id: string; buyer_id: string; rating: number; comment: string | null; created_at: string };
        Insert: { order_id: string; seller_id: string; buyer_id: string; rating: number; comment?: string | null; created_at?: string };
        Update: { order_id?: string; seller_id?: string; buyer_id?: string; rating?: number; comment?: string | null; created_at?: string };
        Relationships: [];
      };
      audit_log: {
        Row: { id: number; at: string; actor: string | null; action: string; target: string; details: Json };
        Insert: { id?: never; at?: string; actor?: string | null; action: string; target: string; details?: Json };
        Update: { id?: never; at?: string; actor?: string | null; action?: string; target?: string; details?: Json };
        Relationships: [];
      };
      order_addresses: {
        Row: { order_id: string; ship_to: Json; created_at: string };
        Insert: { order_id: string; ship_to: Json; created_at?: string };
        Update: { order_id?: string; ship_to?: Json; created_at?: string };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: Json | null;
          emailed_at: string | null;
          id: string;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: Json | null;
          emailed_at?: string | null;
          id?: string;
          read?: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: Json | null;
          emailed_at?: string | null;
          id?: string;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          amount: number;
          ask_id: string | null;
          auth_fee: number;
          bid_id: string | null;
          buyer_id: string | null;
          commission: number;
          created_at: string;
          custom_item_id: string | null;
          delivered_at: string | null;
          id: string;
          paid_at: string | null;
          released_at: string | null;
          seller_id: string | null;
          shipped_at: string | null;
          shipping_fee: number;
          shirt_id: string | null;
          size: string | null;
          status: string;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          tracking_code: string | null;
          updated_at: string;
          payout_status: string;
          payout_transfer_id: string | null;
          refund_id: string | null;
          settlement_error: string | null;
          settled_at: string | null;
          carrier: string | null;
          label_path: string | null;
          inspection: 'pending' | 'passed' | 'failed';
          inspection_note: string | null;
          inspected_at: string | null;
          outbound_carrier: string | null;
          outbound_tracking: string | null;
          forwarded_at: string | null;
        };
        Insert: {
          amount: number;
          ask_id?: string | null;
          auth_fee?: number;
          bid_id?: string | null;
          buyer_id?: string | null;
          commission?: number;
          created_at?: string;
          custom_item_id?: string | null;
          delivered_at?: string | null;
          id?: string;
          paid_at?: string | null;
          released_at?: string | null;
          seller_id?: string | null;
          shipped_at?: string | null;
          shipping_fee?: number;
          shirt_id?: string | null;
          size?: string | null;
          status?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          tracking_code?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          ask_id?: string | null;
          auth_fee?: number;
          bid_id?: string | null;
          buyer_id?: string | null;
          commission?: number;
          created_at?: string;
          custom_item_id?: string | null;
          delivered_at?: string | null;
          id?: string;
          paid_at?: string | null;
          released_at?: string | null;
          seller_id?: string | null;
          shipped_at?: string | null;
          shipping_fee?: number;
          shirt_id?: string | null;
          size?: string | null;
          status?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          tracking_code?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_ask_id_fkey';
            columns: ['ask_id'];
            isOneToOne: false;
            referencedRelation: 'asks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_bid_id_fkey';
            columns: ['bid_id'];
            isOneToOne: false;
            referencedRelation: 'bids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_custom_item_id_fkey';
            columns: ['custom_item_id'];
            isOneToOne: false;
            referencedRelation: 'custom_items';
            referencedColumns: ['id'];
          }
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          handle: string | null;
          id: string;
          is_admin: boolean;
          payouts_enabled: boolean;
          stripe_account_id: string | null;
          goals: string[];
          interests: Json;
          onboarded_at: string | null;
        };
        Insert: {
          created_at?: string;
          handle?: string | null;
          id: string;
          is_admin?: boolean;
        };
        Update: {
          created_at?: string;
          handle?: string | null;
          id?: string;
          is_admin?: boolean;
          goals?: string[];
          interests?: Json;
          onboarded_at?: string | null;
        };
        Relationships: [];
      };
      review_queue: {
        Row: {
          custom_item_id: string | null;
          id: string;
          reason: string | null;
          reviewed_at: string | null;
          reviewer_id: string | null;
          snapshot: Json;
          status: string;
          submitted_at: string;
          user_id: string;
        };
        Insert: {
          custom_item_id?: string | null;
          id: string;
          reason?: string | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          snapshot: Json;
          status?: string;
          submitted_at?: string;
          user_id: string;
        };
        Update: {
          custom_item_id?: string | null;
          id?: string;
          reason?: string | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          snapshot?: Json;
          status?: string;
          submitted_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'review_queue_custom_item_id_fkey';
            columns: ['custom_item_id'];
            isOneToOne: false;
            referencedRelation: 'custom_items';
            referencedColumns: ['id'];
          }
        ];
      };
      watchlist: {
        Row: {
          created_at: string;
          shirt_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          shirt_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          shirt_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      account_deletion_blockers: {
        Args: never;
        Returns: { open_orders: number }[];
      };
      catalog_market: {
        Args: never;
        Returns: {
          shirt_id: string;
          completed_sales: number;
          last_price: number | null;
          last_sold_at: string | null;
          avg_recent: number | null;
        }[];
      };
      prepare_account_deletion: {
        Args: never;
        Returns: undefined;
      };
      create_api_key: {
        Args: { p_label: string };
        Returns: {
          created_at: string;
          id: string;
          key_prefix: string;
          plaintext_key: string;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
      list_disputes_for_admin: {
        Args: never;
        Returns: {
          amount: number;
          buyer_id: string;
          created_at: string;
          custom_item_id: string;
          dispute_id: string;
          dispute_status: string;
          order_id: string;
          order_status: string;
          reason: string;
          resolution_note: string;
          seller_id: string;
          shirt_id: string;
          size: string;
        }[];
      };
      match_order_book: {
        Args: { p_shirt_id: string; p_size: string };
        Returns: undefined;
      };
      list_inspections_for_admin: {
        Args: never;
        Returns: {
          order_id: string;
          shirt_id: string | null;
          custom_item_id: string | null;
          size: string | null;
          amount: number;
          carrier: string | null;
          tracking_code: string | null;
          shipped_at: string | null;
          inspection: string;
          outbound_tracking: string | null;
          ship_to: Json | null;
        }[];
      };
      admin_record_inspection: {
        Args: { p_order_id: string; p_passed: boolean; p_note?: string; p_outbound_tracking?: string; p_outbound_carrier?: string };
        Returns: undefined;
      };
      verify_certificate: {
        Args: { p_code: string; p_tag?: string };
        Returns: { code: string; shirt_id: string | null; size: string | null; checks: Json; issued_at: string; revoked: boolean; revoked_reason: string | null; tag_match: boolean | null }[];
      };
      admin_attach_tag: { Args: { p_code: string; p_uid: string }; Returns: undefined };
      admin_revoke_certificate: { Args: { p_code: string; p_reason: string }; Returns: undefined };
      handle_available: { Args: { p_handle: string }; Returns: boolean };
      review_seller: { Args: { p_order_id: string; p_rating: number; p_comment?: string }; Returns: undefined };
      seller_profile: {
        Args: { p_handle: string };
        Returns: { handle: string; member_since: string; sales: number; rating: number | null; reviews: number; pass_rate: number | null; avg_ship_days: number | null; listings: number }[];
      };
      seller_listings: { Args: { p_handle: string }; Returns: { ask_id: string; shirt_id: string; size: string; amount: number; condition: string | null; created_at: string }[] };
      seller_review_list: { Args: { p_handle: string }; Returns: { rating: number; comment: string | null; shirt_id: string | null; created_at: string }[] };
      seller_cards: { Args: { p_user_ids: string[] }; Returns: { user_id: string; handle: string | null; rating: number | null; reviews: number; sales: number }[] };
      report_client_error: { Args: { p_message: string; p_stack?: string; p_url?: string; p_release?: string; p_user_agent?: string }; Returns: undefined };
      admin_health: {
        Args: never;
        Returns: { errors_1h: number; errors_24h: number; failed_payouts: number; failed_refunds: number; stuck_settlements: number; overdue_inspections: number; open_disputes: number; pending_reviews: number }[];
      };
      admin_recent_errors: { Args: never; Returns: { fingerprint: string; message: string; count: number; last_seen: string; url: string | null; release: string | null; stack: string | null }[] };
      my_payout_status: { Args: never; Returns: { connected: boolean; payouts_enabled: boolean }[] };
      order_cancel: { Args: { p_order_id: string }; Returns: undefined };
      order_confirm_receipt: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
      order_mark_shipped: {
        Args: { p_order_id: string; p_tracking?: string; p_carrier?: string };
        Returns: undefined;
      };
      order_open_dispute: {
        Args: { p_order_id: string; p_reason: string };
        Returns: string;
      };
      resolve_dispute: {
        Args: { p_dispute_id: string; p_note: string; p_outcome: string };
        Returns: undefined;
      };
      resolve_review: {
        Args: { p_approved: boolean; p_id: string; p_reason?: string };
        Returns: undefined;
      };
      public_stats: {
        Args: never;
        Returns: {
          collectors: number;
          live_listings: number;
          open_bids: number;
          completed_sales: number;
          traded_chf: number;
        }[];
      };
      revoke_api_key: { Args: { p_id: string }; Returns: undefined };
      shirt_stats: {
        Args: { p_shirt_id: string };
        Returns: {
          watchers: number;
          live_listings: number;
          open_bids: number;
          completed_sales: number;
          last_sale_amount: number | null;
          last_sale_at: string | null;
        }[];
      };
      trending_scores: {
        Args: { days?: number };
        Returns: {
          score: number;
          shirt_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type RpcReturns<F extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][F]['Returns'];
