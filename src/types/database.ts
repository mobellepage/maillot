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
          /** Exemplar fields, no longer used: the catalogue describes the model only. */
          cond: string | null;
          created_at: string;
          crest_color: string;
          edition: string | null;
          glow_color: string;
          id: string;
          index_change_30d: number;
          index_price: number;
          kit: string;
          league: string;
          name: string;
          number_color: string | null;
          pattern: string;
          player: string | null;
          players: string[];
          product_codes: string[];
          season: string;
          sizes: string[];
          sku: string;
          trim_color: string;
          type: string;
          updated_at: string;
          year: number;
        };
        Insert: Partial<Database['public']['Tables']['catalog_shirts']['Row']> & { id: string; club: string; name: string; season: string; year: number; brand: string; league: string; type: string; index_price: number; pattern: string; trim_color: string; crest_color: string; glow_color: string; sku: string };
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
          photos: Json;
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
          photos?: Json;
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
          photos?: Json;
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
          kit_id: string | null;
          kit_image: string | null;
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
          inquiries_enabled: boolean;
          highlighted_at: string | null;
        };
        Insert: {
          catalog_id?: string | null;
          kit_id?: string | null;
          kit_image?: string | null;
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
          inquiries_enabled?: boolean;
          highlighted_at?: string | null;
        };
        Update: {
          catalog_id?: string | null;
          kit_id?: string | null;
          kit_image?: string | null;
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
          inquiries_enabled?: boolean;
          highlighted_at?: string | null;
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
      kit_designs: {
        Row: { id: string; user_id: string; name: string; design: Json; shared: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; user_id?: string; name: string; design: Json; shared?: boolean; created_at?: string; updated_at?: string };
        Update: { name?: string; design?: Json; shared?: boolean };
        Relationships: [];
      };
      kit_clubs: {
        Row: { id: string; name: string; league: string; country: string; colors: string[]; aliases: string[]; top5: boolean; region: string | null; featured: boolean };
        Insert: { id: string; name: string; league: string; country: string; colors: string[]; aliases?: string[]; top5?: boolean; region?: string | null };
        Update: { id?: string; name?: string; league?: string; country?: string; colors?: string[]; aliases?: string[]; top5?: boolean; region?: string | null };
        Relationships: [];
      };
      fantasy_club_prices: {
        Row: { club_id: string; price: number; base_price: number; updated_at: string };
        Insert: { club_id: string; price: number; base_price: number; updated_at?: string };
        Update: { price?: number; base_price?: number; updated_at?: string };
        Relationships: [];
      };
      fantasy_team_mappings: {
        Row: { club_id: string; provider: string; provider_team_id: string; team_name: string | null };
        Insert: { club_id: string; provider?: string; provider_team_id: string; team_name?: string | null };
        Update: { provider?: string; provider_team_id?: string; team_name?: string | null };
        Relationships: [];
      };
      kits: {
        Row: { id: string; club_id: string; season: string; season_year: number; kind: string; variant: string; image_path: string | null; image_credit: string | null; image_credit_url: string | null; brand: string | null; sponsor: string | null; pattern: string; colors: string[]; note: string | null; catalog_id: string | null; source: string; status: string; suggested_by: string | null; created_at: string };
        Insert: { id?: string; club_id: string; season: string; season_year: number; kind: string; brand?: string | null; sponsor?: string | null; pattern?: string; colors: string[]; note?: string | null; catalog_id?: string | null; source: string; status?: string; suggested_by?: string | null; created_at?: string };
        Update: { id?: string; club_id?: string; season?: string; season_year?: number; kind?: string; brand?: string | null; sponsor?: string | null; pattern?: string; colors?: string[]; note?: string | null; catalog_id?: string | null; source?: string; status?: string; suggested_by?: string | null; created_at?: string };
        Relationships: [];
      };
      daily_game_results: {
        Row: { user_id: string; day: string; won: boolean; tries: number; created_at: string };
        Insert: { user_id: string; day: string; won: boolean; tries: number; created_at?: string };
        Update: { user_id?: string; day?: string; won?: boolean; tries?: number; created_at?: string };
        Relationships: [];
      };
      order_addresses: {
        Row: { order_id: string; ship_to: Json; created_at: string };
        Insert: { order_id: string; ship_to: Json; created_at?: string };
        Update: { order_id?: string; ship_to?: Json; created_at?: string };
        Relationships: [];
      };
      market_comp_runs: {
        Row: {
          error: string | null;
          finished_at: string | null;
          id: number;
          kept: number;
          listings: number;
          shirts: number;
          started_at: string;
        };
        Insert: {
          error?: string | null;
          finished_at?: string | null;
          id?: number;
          kept?: number;
          listings?: number;
          shirts?: number;
          started_at?: string;
        };
        Update: {
          error?: string | null;
          finished_at?: string | null;
          id?: number;
          kept?: number;
          listings?: number;
          shirts?: number;
          started_at?: string;
        };
        Relationships: [];
      };
      market_comps: {
        Row: {
          catalog_id: string;
          condition: string;
          currency: string;
          edition: string;
          external_id: string;
          first_seen_at: string;
          image_url: string | null;
          kind: string;
          listed_at: string | null;
          marketplace: string;
          match: string;
          price: number;
          price_chf: number;
          seen_at: string;
          sold_at: string | null;
          source: string;
          title: string;
          url: string | null;
        };
        Insert: {
          catalog_id?: string;
          condition?: string;
          currency?: string;
          edition?: string;
          external_id?: string;
          first_seen_at?: string;
          image_url?: string | null;
          kind?: string;
          listed_at?: string | null;
          marketplace?: string;
          match?: string;
          price?: number;
          price_chf?: number;
          seen_at?: string;
          sold_at?: string | null;
          source?: string;
          title?: string;
          url?: string | null;
        };
        Update: {
          catalog_id?: string;
          condition?: string;
          currency?: string;
          edition?: string;
          external_id?: string;
          first_seen_at?: string;
          image_url?: string | null;
          kind?: string;
          listed_at?: string | null;
          marketplace?: string;
          match?: string;
          price?: number;
          price_chf?: number;
          seen_at?: string;
          sold_at?: string | null;
          source?: string;
          title?: string;
          url?: string | null;
        };
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
          inspection: 'not_required' | 'pending' | 'passed' | 'failed';
          inspection_note: string | null;
          ship_photos: Json;
          receipt_photos: Json;
          delivered_by: 'buyer' | 'auto' | null;
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
          show_collection_value: boolean;
          dealer_verified_at: string | null;
          commission_rate: number | null;
          notification_prefs: Json;
          premium_until: string | null;
          stripe_customer_id: string | null;
          premium_waitlist_at: string | null;
          trial_until: string | null;
          bio: string | null;
          avatar: string | null;
          collection_private: boolean;
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
          show_collection_value?: boolean;
          notification_prefs?: Json;
          premium_until?: string | null;
          stripe_customer_id?: string | null;
          premium_waitlist_at?: string | null;
          trial_until?: string | null;
          bio?: string | null;
          avatar?: string | null;
          collection_private?: boolean;
        };
        Relationships: [];
      };
      listing_alerts: {
        Row: { id: string; user_id: string; shirt_id: string; size: string | null; max_price: number | null; created_at: string; last_notified_at: string | null };
        Insert: { id?: string; user_id: string; shirt_id: string; size?: string | null; max_price?: number | null };
        Update: never;
        Relationships: [];
      };
      follows: {
        Row: { follower_id: string; followee_id: string; created_at: string };
        Insert: never;
        Update: never;
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
      shirt_identifications: {
        Row: {
          catalog_id: string | null;
          confidence: number | null;
          created_at: string;
          id: string;
          model: string;
          result: Json;
          user_id: string;
        };
        Insert: {
          catalog_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          id?: string;
          model?: string;
          result?: Json;
          user_id?: string;
        };
        Update: {
          catalog_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          id?: string;
          model?: string;
          result?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      shirt_value_history: {
        Row: {
          catalog_id: string;
          day: string;
          value: number;
        };
        Insert: {
          catalog_id?: string;
          day?: string;
          value?: number;
        };
        Update: {
          catalog_id?: string;
          day?: string;
          value?: number;
        };
        Relationships: [];
      };
      shirt_valuations: {
        Row: {
          catalog_id: string;
          computed_at: string;
          confidence: string;
          high: number;
          low: number;
          n_exact: number;
          n_similar: number;
          n_trades: number;
          value: number;
        };
        Insert: {
          catalog_id?: string;
          computed_at?: string;
          confidence?: string;
          high?: number;
          low?: number;
          n_exact?: number;
          n_similar?: number;
          n_trades?: number;
          value?: number;
        };
        Update: {
          catalog_id?: string;
          computed_at?: string;
          confidence?: string;
          high?: number;
          low?: number;
          n_exact?: number;
          n_similar?: number;
          n_trades?: number;
          value?: number;
        };
        Relationships: [];
      };
      kit_likes: {
        Row: { user_id: string; kit_id: string; created_at: string; print_name: string | null; print_number: string | null };
        Insert: { user_id?: string; kit_id: string; created_at?: string; print_name?: string | null; print_number?: string | null };
        Update: { user_id?: string; kit_id?: string; created_at?: string; print_name?: string | null; print_number?: string | null };
        Relationships: [];
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
      consume_identify_quota: {
        Args: never;
        Returns: undefined;
      };
      refresh_shirt_valuations: {
        Args: never;
        Returns: number;
      };
      start_market_comp_run: {
        Args: never;
        Returns: number | null;
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
      seller_listings: { Args: { p_handle: string }; Returns: { ask_id: string; shirt_id: string; size: string; amount: number; condition: string | null; created_at: string; thumb_path: string | null }[] };
      seller_review_list: { Args: { p_handle: string }; Returns: { rating: number; comment: string | null; shirt_id: string | null; created_at: string }[] };
      seller_cards: { Args: { p_user_ids: string[] }; Returns: { user_id: string; handle: string | null; rating: number | null; reviews: number; sales: number; dealer: boolean }[] };
      search_collectors: { Args: { p_q: string }; Returns: { handle: string; member_since: string; shirts: number; listings: number; preview: string[]; dealer: boolean; avatar: string | null }[] };
      join_premium_waitlist: { Args: never; Returns: undefined };
      admin_set_premium: { Args: { p_handle: string; p_until: string | null }; Returns: undefined };
      free_shirt_limit: { Args: never; Returns: number };
      public_shirt_photos: { Args: { p_handle: string; p_item_id: string }; Returns: { kind: 'main' | 'back'; path: string; thumb_path: string | null }[] };
      fantasy_matchday: {
        Args: { p_md?: number | null };
        Returns: { id: number; number: number; window_start: string; window_end: string; deadline: string; international: boolean; status: string; cup_name: string; season_name: string; budget: number; fixtures: number; squad: Json | null; lineup: Json | null; chips_used: string[]; previous_id: number | null; next_id: number | null; players: number; rank: number | null }[];
      };
      fantasy_fixtures: {
        Args: { p_md: number };
        Returns: { id: number; competition: string; home_club_id: string | null; away_club_id: string | null; home_name: string; away_name: string; kickoff: string; status: string; home_goals: number | null; away_goals: number | null; home_image: string | null; away_image: string | null }[];
      };
      fantasy_jerseys: {
        Args: { p_md?: number | null };
        Returns: { club_id: string; name: string; league: string; country: string; price: number; delta: number | null; kit_id: string; season: string; kind: string; image_path: string; plays: boolean; fixture: string | null; kickoff: string | null; is_national: boolean; owned: boolean; picked_pct: number }[];
      };
      fantasy_squad_clubs: {
        Args: { p_md?: number | null };
        Returns: { club_id: string; name: string; league: string; price: number; delta: number | null; kit_id: string | null; season: string | null; image_path: string | null; plays: boolean; fixture: string | null; kickoff: string | null; is_national: boolean; owned: boolean; starter: boolean; captain: boolean; in_locked: boolean; opponent: string | null; home: boolean | null }[];
      };
      fantasy_lineup_clubs: {
        Args: { p_md: number; p_user?: string | null };
        Returns: { club_id: string; name: string; league: string; price: number; image_path: string | null; starter: boolean; captain: boolean; played: boolean; base: number; multiplier: number; total: number; detail: Json }[];
      };
      fantasy_matchday_table: {
        Args: { p_md: number; p_limit?: number };
        Returns: { user_id: string; handle: string; avatar: string | null; points: number; hits: number; transfers: number; captain_name: string | null; chip: string | null; is_me: boolean }[];
      };
      fantasy_matchday_stats: { Args: { p_md: number }; Returns: { avg_points: number; top_points: number; managers: number }[] };
      fantasy_club_stats: {
        Args: never;
        Returns: { club_id: string; name: string; league: string; image_path: string | null; price: number; delta: number | null; picked_pct: number; played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number; points: number; ppg: number; updated_at: string | null }[];
      };
      fantasy_price_moves: {
        Args: { p_limit?: number };
        Returns: { club_id: string; name: string; league: string; image_path: string | null; delta: number; price: number; matchday: number }[];
      };
      fantasy_save_squad: { Args: { p_clubs: string[]; p_md?: number | null }; Returns: undefined };
      fantasy_save_lineup: { Args: { p_md: number; p_starters: string[]; p_captain?: string | null; p_bench?: string[] }; Returns: undefined };
      fantasy_play_chip: { Args: { p_md: number; p_chip?: string | null }; Returns: undefined };
      fantasy_rescore: { Args: { p_md: number }; Returns: undefined };
      fantasy_my_leagues: {
        Args: never;
        Returns: { id: string; name: string; format: string; is_public: boolean; members: number; rank: number | null; points: number; h2h_pts: number; is_owner: boolean; invite_code: string }[];
      };
      fantasy_league: {
        Args: { p_id: string };
        Returns: { id: string; name: string; format: string; is_public: boolean; owner_handle: string | null; members: number; is_member: boolean; is_owner: boolean; invite_code: string | null; cup_name: string | null; cup_id: number | null; matchday_id: number | null; matchday_status: string | null }[];
      };
      fantasy_table: {
        Args: { p_scope: string; p_scope_id: string; p_period: string; p_limit?: number };
        Returns: { rank: number; user_id: string; handle: string; avatar: string | null; points: number; played: number; avg_filled: number; wins: number; draws: number; losses: number; h2h_pts: number; is_me: boolean; this_md: number | null }[];
      };
      fantasy_league_members: { Args: { p_id: string }; Returns: { user_id: string; handle: string; avatar: string | null; joined_at: string }[] };
      fantasy_league_pairings: {
        Args: { p_id: string; p_md: number };
        Returns: { user_a: string; handle_a: string; avatar_a: string | null; user_b: string | null; handle_b: string | null; avatar_b: string | null; points_a: number; points_b: number; result: string | null }[];
      };
      fantasy_league_posts: { Args: { p_id: string; p_limit?: number }; Returns: { id: number; user_id: string; handle: string; avatar: string | null; body: string; created_at: string; is_me: boolean }[] };
      fantasy_public_leagues: { Args: { p_limit?: number }; Returns: { id: string; name: string; format: string; members: number; owner_handle: string | null }[] };
      fantasy_my_standing: {
        Args: never;
        Returns: { cup_id: number; cup_name: string; season_id: number; season_name: string; division_id: number | null; division_number: number | null; division_rank: number | null; division_size: number | null; overall_rank: number | null; overall_players: number; season_rank: number | null; season_players: number; cup_points: number; season_points: number }[];
      };
      fantasy_create_league: { Args: { p_name: string; p_format: string; p_public?: boolean }; Returns: string };
      fantasy_join_league: { Args: { p_code: string }; Returns: string };
      fantasy_leave_league: { Args: { p_league: string }; Returns: undefined };
      fantasy_league_post: { Args: { p_league: string; p_body: string }; Returns: number };
      fantasy_report_post: { Args: { p_post: number }; Returns: undefined };
      report_content: { Args: { p_kind: string; p_target: string; p_reason: string; p_note?: string | null }; Returns: undefined };
      block_user: { Args: { p_handle: string }; Returns: undefined };
      unblock_user: { Args: { p_handle: string }; Returns: undefined };
      my_blocks: { Args: never; Returns: { handle: string; avatar: string | null; blocked_at: string }[] };
      admin_reports: {
        Args: { p_status?: string };
        Returns: { id: number; kind: string; target_id: string; reason: string; note: string | null; snapshot: string | null; status: string; created_at: string; reporter: string | null; target_handle: string | null; item_id: string | null; reports_on_user: number }[];
      };
      admin_resolve_report: { Args: { p_id: number; p_action: string }; Returns: undefined };
      fantasy_public_profile: {
        Args: { p_handle: string };
        Returns: { plays: boolean; division_number: number | null; season_points: number; season_rank: number | null; best_points: number | null; best_matchday: number | null; played: number; leagues: number; badges: Json; squad: Json; squad_value: number }[];
      };
      fantasy_admin_fixture: { Args: { p_id: number; p_home: number; p_away: number; p_status?: string }; Returns: undefined };
      fantasy_admin_set_price: { Args: { p_club: string; p_price: number }; Returns: undefined };
      fantasy_admin_matchdays: { Args: never; Returns: { id: number; number: number; window_start: string; status: string; fixtures: number; lineups: number; cup_name: string }[] };
      public_wishlist: {
        Args: { p_handle: string };
        Returns: {
          /** A library kit they want … */
          kit_id: string | null;
          club_id: string | null;
          club_name: string | null;
          season: string | null;
          kind: string | null;
          variant: string | null;
          image_path: string | null;
          print_name: string | null;
          print_number: string | null;
          /** … or a catalogue shirt on their watchlist. */
          shirt_id: string | null;
          added_at: string;
        }[];
      };
      public_collection: {
        Args: { p_handle: string };
        Returns: {
          id: string;
          catalog_id: string | null;
          club: string | null;
          season: string | null;
          variant: string | null;
          version: string | null;
          size: string | null;
          player_name: string | null;
          player_number: string | null;
          grade: number | null;
          visibility: string;
          verified: boolean;
          photo_path: string | null;
          thumb_path: string | null;
          added_at: string;
          /** Valuation inputs: only when the owner shows their collection value. */
          flock: Json | null;
          patches: Json | null;
          signature: Json | null;
          verification_level: string | null;
          inquiries_enabled: boolean;
          /** The library picture of a shirt listed without photos. */
          kit_image: string | null;
          /** One of the owner's top five (shown first). */
          highlighted: boolean;
          likes: number;
          /** The viewer likes it. */
          liked: boolean;
          /** The library kit it is (for the visitor's wishlist). */
          kit_id: string | null;
        }[];
      };
      feed_events: {
        Args: { p_limit?: number };
        Returns: (Database['public']['Functions']['market_exemplars']['Returns'][number] & {
          event_id: number;
          event_kind: 'added' | 'forsale' | 'offers' | 'price_drop' | 'verified';
          event_at: string;
          old_price: number | null;
          new_price: number | null;
        })[];
      };
      market_exemplars: {
        Args: { p_limit?: number };
        Returns: {
          id: string;
          handle: string;
          avatar: string | null;
          dealer: boolean;
          catalog_id: string | null;
          kit_id: string | null;
          kit_image: string | null;
          club: string | null;
          season: string | null;
          kind: string | null;
          variant: string | null;
          league: string | null;
          version: string | null;
          size: string | null;
          grade: number | null;
          visibility: 'public' | 'offers' | 'forsale';
          sale_price: number | null;
          verification_level: string;
          verified: boolean;
          inquiries_enabled: boolean;
          photo_path: string | null;
          thumb_path: string | null;
          added_at: string;
          /** Selling it waits for expert authentication (private.needs_expert_auth). */
          needs_auth: boolean;
        }[];
      };
      discover_collectors: {
        Args: { p_limit?: number };
        Returns: { handle: string; avatar: string | null; shirts: number; followers: number; dealer: boolean; is_following: boolean; preview: Json }[];
      };
      top_collectors: { Args: { p_limit?: number }; Returns: { handle: string; avatar: string | null; shirts: number; followers: number; dealer: boolean }[] };
      make_inquiry: { Args: { p_item_id: string; p_amount?: number | null; p_message?: string | null }; Returns: string };
      answer_inquiry: { Args: { p_id: string; p_reply: string }; Returns: undefined };
      dismiss_inquiry: { Args: { p_id: string }; Returns: undefined };
      my_inquiries: {
        Args: never;
        Returns: { id: string; direction: 'received' | 'sent'; item_id: string; catalog_id: string | null; item_name: string | null; amount: number | null; message: string | null; status: 'open' | 'answered' | 'dismissed'; reply: string | null; created_at: string; other_handle: string | null; other_avatar: string | null }[];
      };
      follow_collector: { Args: { p_handle: string }; Returns: undefined };
      unfollow_collector: { Args: { p_handle: string }; Returns: undefined };
      collector_profile: { Args: { p_handle: string }; Returns: { followers: number; following: number; show_value: boolean; is_following: boolean; is_me: boolean; dealer: boolean; collection_private: boolean; avatar: string | null; bio: string | null; club_id: string | null; club_name: string | null; shirts: number }[] };
      collector_follows: { Args: { p_handle: string }; Returns: { direction: 'following' | 'follower'; handle: string; avatar: string | null; shirts: number }[] };
      following_feed: { Args: { p_before?: string | null; p_limit?: number }; Returns: { id: string; handle: string; avatar: string | null; catalog_id: string | null; kit_id: string | null; kit_image: string | null; club: string | null; season: string | null; variant: string | null; version: string | null; size: string | null; player_name: string | null; player_number: string | null; photo_path: string | null; thumb_path: string | null; added_at: string; likes: number; liked: boolean; comments: number; last_comment: { handle: string | null; body: string } | null }[] };
      community_feed: { Args: { p_seed?: string | null; p_offset?: number; p_limit?: number }; Returns: { id: string; handle: string; avatar: string | null; catalog_id: string | null; kit_id: string | null; kit_image: string | null; club: string | null; season: string | null; variant: string | null; version: string | null; size: string | null; player_name: string | null; player_number: string | null; photo_path: string | null; thumb_path: string | null; added_at: string; likes: number; liked: boolean; comments: number; last_comment: { handle: string | null; body: string } | null }[] };
      following_stories: { Args: never; Returns: { handle: string; avatar: string | null; latest: string; items: { id: string; catalog_id: string | null; kit_image: string | null; club: string | null; season: string | null; variant: string | null; photo_path: string | null; added_at: string }[] }[] };
      admin_set_dealer: { Args: { p_handle: string; p_verified: boolean; p_commission_rate?: number | null }; Returns: undefined };
      admin_dealers: { Args: never; Returns: { handle: string; dealer_verified_at: string | null; commission_rate: number | null; listings: number; sales: number }[] };
      my_follows: { Args: never; Returns: { direction: 'following' | 'follower'; handle: string; avatar: string | null; shirts: number; since: string }[] };
      my_following: { Args: never; Returns: { handle: string; followed_at: string; shirts: number; avatar: string | null }[] };
      make_collection_offer: { Args: { p_item_id: string; p_amount: number; p_message?: string | null }; Returns: string };
      respond_collection_offer: { Args: { p_offer_id: string; p_accept: boolean }; Returns: string | null };
      withdraw_collection_offer: { Args: { p_offer_id: string }; Returns: undefined };
      counter_collection_offer: { Args: { p_offer_id: string; p_amount: number; p_message?: string | null }; Returns: string };
      offer_policy: { Args: never; Returns: { valid_hours: number; max_rounds: number }[] };
      my_collection_offers: {
        Args: never;
        Returns: { id: string; direction: 'received' | 'sent'; item_id: string; catalog_id: string | null; size: string | null; amount: number; message: string | null; status: 'open' | 'accepted' | 'declined' | 'withdrawn' | 'expired'; created_at: string; expires_at: string; other_handle: string | null; order_id: string | null; round: number; by_owner: boolean; awaiting_me: boolean }[];
      };
      feed_listings: {
        Args: { p_limit?: number };
        Returns: { ask_id: string; shirt_id: string; size: string; amount: number; condition: string | null; edition: string | null; player_print: string | null; photos: Json; handle: string | null; dealer: boolean; created_at: string }[];
      };
      is_visible_vault_photo: { Args: { p_name: string }; Returns: boolean };
      report_client_error: { Args: { p_message: string; p_stack?: string; p_url?: string; p_release?: string; p_user_agent?: string }; Returns: undefined };
      admin_health: {
        Args: never;
        Returns: { errors_1h: number; errors_24h: number; failed_payouts: number; failed_refunds: number; stuck_settlements: number; overdue_inspections: number; open_disputes: number; pending_reviews: number }[];
      };
      admin_recent_errors: { Args: never; Returns: { fingerprint: string; message: string; count: number; last_seen: string; url: string | null; release: string | null; stack: string | null }[] };
      my_payout_status: { Args: never; Returns: { connected: boolean; payouts_enabled: boolean }[] };
      order_cancel: { Args: { p_order_id: string }; Returns: undefined };
      order_confirm_receipt: {
        Args: { p_order_id: string; p_photos: Json };
        Returns: undefined;
      };
      order_mark_shipped: {
        Args: { p_order_id: string; p_tracking: string; p_carrier: string; p_photos: Json };
        Returns: undefined;
      };
      order_mark_delivered: { Args: { p_order_id: string }; Returns: undefined };
      public_catalog: { Args: never; Returns: PublicSchema['Tables']['catalog_shirts']['Row'][] };
      public_valuations: { Args: never; Returns: PublicSchema['Tables']['shirt_valuations']['Row'][] };
      shirt_comps: { Args: { p_shirt: string }; Returns: PublicSchema['Tables']['market_comps']['Row'][] };
      value_history: { Args: { p_ids: string[]; p_days: number }; Returns: PublicSchema['Tables']['shirt_value_history']['Row'][] };
      open_bids: { Args: { p_shirt: string; p_size: string }; Returns: PublicSchema['Tables']['bids']['Row'][] };
      open_asks: { Args: { p_shirt: string; p_size: string }; Returns: PublicSchema['Tables']['asks']['Row'][] };
      library_clubs: { Args: never; Returns: PublicSchema['Tables']['kit_clubs']['Row'][] };
      library_kit_counts: { Args: never; Returns: { club_id: string; n: number }[] };
      library_kits: { Args: { p_club: string }; Returns: PublicSchema['Tables']['kits']['Row'][] };
      shared_kit_design: { Args: { p_id: string }; Returns: { id: string; name: string; design: Json; handle: string | null; avatar: string | null; created_at: string; is_mine: boolean }[] };
      item_social: { Args: { p_item: string }; Returns: { likes: number; liked: boolean; is_owner: boolean; comments: Json }[] };
      set_item_like: { Args: { p_item: string; p_like: boolean }; Returns: number };
      add_item_comment: { Args: { p_item: string; p_body: string }; Returns: string };
      delete_item_comment: { Args: { p_id: string }; Returns: undefined };
      my_collector_points: { Args: Record<string, never>; Returns: { total: number; purchases: number }[] };
      my_plan: { Args: Record<string, never>; Returns: { plan: 'free' | 'trial' | 'premium'; trial_until: string | null; premium_until: string | null; scans_used: number; scans_limit: number; scans_reset: string | null }[] };
      latest_news: { Args: { p_limit?: number }; Returns: { id: string; source: string; url: string; title: string; published_on: string; image_path: string | null; excerpt: string | null; club_id: string | null; club_name: string | null; kit_id: string | null; kit_season: string | null; kit_image: string | null }[] };
      news_item: { Args: { p_id: string }; Returns: { id: string; source: string; url: string; title: string; published_on: string; image_path: string | null; excerpt: string | null; club_id: string | null; club_name: string | null; kit_id: string | null; kit_season: string | null; kit_image: string | null }[] };
      popular_kits: { Args: { p_limit?: number }; Returns: { id: string; club_id: string; club_name: string; season: string; kind: string; variant: string; image_path: string | null }[] };
      trending_kits: { Args: { p_limit?: number }; Returns: { id: string; club_id: string; club_name: string; league: string; season: string; season_year: number; kind: string; variant: string; image_path: string | null; likes: number }[] };
      recommended_kits: { Args: { p_limit?: number }; Returns: { id: string; club_id: string; club_name: string; league: string; season: string; season_year: number; kind: string; variant: string; image_path: string | null }[] };
      library_find: { Args: { p_color?: string | null; p_from?: number | null; p_to?: number | null; p_kind?: string | null; p_league?: string | null; p_offset?: number; p_limit?: number }; Returns: { id: string; club_id: string; club_name: string; league: string; season: string; season_year: number; kind: string; variant: string; image_path: string | null; total: number }[] };
      era_kits: { Args: { p_decade: number; p_league?: string | null; p_offset?: number; p_limit?: number }; Returns: { id: string; club_id: string; club_name: string; league: string; season: string; season_year: number; kind: string; variant: string; image_path: string | null }[] };
      legend_kits_for: { Args: { p_legend: string }; Returns: { id: string; club_id: string; club_name: string; season: string; season_year: number; kind: string; variant: string; image_path: string | null; league: string }[] };
      legend_kits: { Args: { p_clubs: string[]; p_from: number[]; p_to: number[] }; Returns: { id: string; club_id: string; club_name: string; season: string; season_year: number; kind: string; variant: string; image_path: string | null }[] };
      feed_kits: { Args: { p_clubs: string[]; p_leagues: string[] }; Returns: { id: string; club_id: string; club_name: string; league: string; season: string; season_year: number; kind: string; variant: string; image_path: string | null }[] };
      my_liked_kits: { Args: never; Returns: ({ id: string; club_id: string; club_name: string; league: string; season: string; season_year: number; kind: string; variant: string; image_path: string | null; liked_at: string; print_name: string | null; print_number: string | null })[] };
      set_favorite_club: { Args: { p_club: string | null }; Returns: undefined };
      my_club_kits: { Args: { p_club: string }; Returns: { kit_id: string; item_id: string }[] };
      daily_kit: {
        Args: { p_day: string };
        Returns: { day: string; image: string; club_id: string; club_name: string; league: string; country: string; season: string; season_year: number; kind: string; library_image: string }[];
      };
      library_kit_owners: {
        Args: { p_club: string };
        Returns: { kit_id: string; item_id: string; handle: string; avatar: string | null; visibility: string; size: string | null; can_ask: boolean }[];
      };
      library_search: {
        Args: { p_club: string; p_year: number | null; p_season: string | null; p_kind: string | null };
        Returns: { id: string; club_id: string; club_name: string; season: string; kind: string; variant: string; image_path: string | null; colors: string[] }[];
      };
      suggest_kit: {
        Args: { p_club: string; p_season: string; p_kind: string; p_brand: string; p_sponsor: string; p_pattern: string; p_colors: string[]; p_note: string };
        Returns: string;
      };
      admin_review_kit: { Args: { p_id: string; p_approve: boolean }; Returns: undefined };
      admin_import_kits: { Args: { p_kits: Json }; Returns: number };
      list_kit_suggestions_for_admin: {
        Args: never;
        Returns: { id: string; club: string; season: string; kind: string; brand: string | null; sponsor: string | null; pattern: string; colors: string[]; note: string | null; created_at: string }[];
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
