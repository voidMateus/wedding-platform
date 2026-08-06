export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          wedding_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          wedding_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "wedding_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "audit_logs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          access_token_id: string
          channel: string
          created_at: string
          id: string
          opened_at: string | null
          sent_at: string | null
          type: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          access_token_id: string
          channel: string
          created_at?: string
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          type: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          access_token_id?: string
          channel?: string
          created_at?: string
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          type?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_access_token_id_fkey"
            columns: ["access_token_id"]
            isOneToOne: false
            referencedRelation: "guest_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "communications_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      companions: {
        Row: {
          created_at: string
          deleted_at: string | null
          dietary_restrictions: string | null
          full_name: string
          id: string
          invite_id: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          dietary_restrictions?: string | null
          full_name: string
          id?: string
          invite_id: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          dietary_restrictions?: string | null
          full_name?: string
          id?: string
          invite_id?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companions_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "companions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          key: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "entitlements_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_segments: {
        Row: {
          created_at: string
          display_order: number
          ends_at: string | null
          id: string
          image_url: string | null
          same_venue_as: string | null
          starts_at: string | null
          title: string
          updated_at: string
          venue_address: string | null
          venue_latitude: number | null
          venue_longitude: number | null
          venue_name: string | null
          wedding_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          same_venue_as?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
          venue_address?: string | null
          venue_latitude?: number | null
          venue_longitude?: number | null
          venue_name?: string | null
          wedding_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          same_venue_as?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
          venue_address?: string | null
          venue_latitude?: number | null
          venue_longitude?: number | null
          venue_name?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_segments_same_venue_as_fkey"
            columns: ["same_venue_as"]
            isOneToOne: false
            referencedRelation: "event_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_segments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "event_segments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_categories_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "gift_categories_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_contributions: {
        Row: {
          amount_cents: number
          contributed_at: string
          contributor_name: string | null
          created_at: string
          gift_id: string
          giver_phone: string | null
          group_id: string | null
          guest_id: string | null
          id: string
          message: string | null
          quota_count: number | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          amount_cents: number
          contributed_at?: string
          contributor_name?: string | null
          created_at?: string
          gift_id: string
          giver_phone?: string | null
          group_id?: string | null
          guest_id?: string | null
          id?: string
          message?: string | null
          quota_count?: number | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          amount_cents?: number
          contributed_at?: string
          contributor_name?: string | null
          created_at?: string
          gift_id?: string
          giver_phone?: string | null
          group_id?: string | null
          guest_id?: string | null
          id?: string
          message?: string | null
          quota_count?: number | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_contributions_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_contributions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_contributions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_contributions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "gift_contributions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_payments: {
        Row: {
          amount_cents: number
          confirmed_at: string | null
          created_at: string
          failure_reason: string | null
          gift_id: string
          giver_name: string
          giver_phone: string | null
          guest_message: string | null
          id: string
          invite_id: string | null
          kind: string
          last_provider_response: Json | null
          provider_checkout_url: string | null
          provider_invoice_slug: string | null
          provider_order_nsu: string
          provider_transaction_nsu: string | null
          quota_count: number | null
          resulting_contribution_id: string | null
          resulting_reservation_id: string | null
          status: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          amount_cents: number
          confirmed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          gift_id: string
          giver_name: string
          giver_phone?: string | null
          guest_message?: string | null
          id?: string
          invite_id?: string | null
          kind: string
          last_provider_response?: Json | null
          provider_checkout_url?: string | null
          provider_invoice_slug?: string | null
          provider_order_nsu: string
          provider_transaction_nsu?: string | null
          quota_count?: number | null
          resulting_contribution_id?: string | null
          resulting_reservation_id?: string | null
          status?: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          amount_cents?: number
          confirmed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          gift_id?: string
          giver_name?: string
          giver_phone?: string | null
          guest_message?: string | null
          id?: string
          invite_id?: string | null
          kind?: string
          last_provider_response?: Json | null
          provider_checkout_url?: string | null
          provider_invoice_slug?: string | null
          provider_order_nsu?: string
          provider_transaction_nsu?: string | null
          quota_count?: number | null
          resulting_contribution_id?: string | null
          resulting_reservation_id?: string | null
          status?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_payments_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_payments_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_payments_resulting_contribution_id_fkey"
            columns: ["resulting_contribution_id"]
            isOneToOne: false
            referencedRelation: "gift_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_payments_resulting_reservation_id_fkey"
            columns: ["resulting_reservation_id"]
            isOneToOne: false
            referencedRelation: "gift_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "gift_payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_reservations: {
        Row: {
          contributor_name: string | null
          created_at: string
          gift_id: string
          giver_phone: string | null
          group_id: string | null
          guest_id: string | null
          id: string
          message: string | null
          reserved_at: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          contributor_name?: string | null
          created_at?: string
          gift_id: string
          giver_phone?: string | null
          group_id?: string | null
          guest_id?: string | null
          id?: string
          message?: string | null
          reserved_at?: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          contributor_name?: string | null
          created_at?: string
          gift_id?: string
          giver_phone?: string | null
          group_id?: string | null
          guest_id?: string | null
          id?: string
          message?: string | null
          reserved_at?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_reservations_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_reservations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_reservations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "gift_reservations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          display_style: string
          emotional_icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_group_gift: boolean
          price_cents: number | null
          quantity_available: number | null
          quota_amount_cents: number | null
          target_amount_cents: number | null
          title: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_style?: string
          emotional_icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_group_gift?: boolean
          price_cents?: number | null
          quantity_available?: number | null
          quota_amount_cents?: number | null
          target_amount_cents?: number | null
          title: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_style?: string
          emotional_icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_group_gift?: boolean
          price_cents?: number | null
          quantity_available?: number | null
          quota_amount_cents?: number | null
          target_amount_cents?: number | null
          title?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gifts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "gift_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "gifts_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_access_tokens: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          invite_id: string
          revoked_at: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          invite_id: string
          revoked_at?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          invite_id?: string
          revoked_at?: string | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_access_tokens_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_access_tokens_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guest_access_tokens_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_parties: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_parties_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guest_parties_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          birth_date: string | null
          created_at: string
          deleted_at: string | null
          dietary_restrictions: string | null
          email: string | null
          full_name: string
          group_id: string | null
          id: string
          invite_id: string | null
          nickname: string | null
          notes: string | null
          party_id: string | null
          party_order: number
          phone: string | null
          photo_path: string | null
          sex: string | null
          updated_at: string
          wedding_id: string
          wedding_role: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          dietary_restrictions?: string | null
          email?: string | null
          full_name: string
          group_id?: string | null
          id?: string
          invite_id?: string | null
          nickname?: string | null
          notes?: string | null
          party_id?: string | null
          party_order?: number
          phone?: string | null
          photo_path?: string | null
          sex?: string | null
          updated_at?: string
          wedding_id: string
          wedding_role?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          dietary_restrictions?: string | null
          email?: string | null
          full_name?: string
          group_id?: string | null
          id?: string
          invite_id?: string | null
          nickname?: string | null
          notes?: string | null
          party_id?: string | null
          party_order?: number
          phone?: string | null
          photo_path?: string | null
          sex?: string | null
          updated_at?: string
          wedding_id?: string
          wedding_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "guest_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_events: {
        Row: {
          event_type: string
          id: string
          invite_id: string
          metadata: Json
          occurred_at: string
          wedding_id: string
        }
        Insert: {
          event_type: string
          id?: string
          invite_id: string
          metadata?: Json
          occurred_at?: string
          wedding_id: string
        }
        Update: {
          event_type?: string
          id?: string
          invite_id?: string
          metadata?: Json
          occurred_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_events_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_events_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "invite_events_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_tag_links: {
        Row: {
          created_at: string
          invite_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          invite_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          invite_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_tag_links_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "invite_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_tags_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "invite_tags_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          internal_code: string
          max_companions: number | null
          name: string
          notes: string | null
          responsible_guest_id: string | null
          rsvp_message: string | null
          rsvp_message_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          internal_code: string
          max_companions?: number | null
          name: string
          notes?: string | null
          responsible_guest_id?: string | null
          rsvp_message?: string | null
          rsvp_message_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          internal_code?: string
          max_companions?: number | null
          name?: string
          notes?: string | null
          responsible_guest_id?: string | null
          rsvp_message?: string | null
          rsvp_message_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_responsible_guest_id_fkey"
            columns: ["responsible_guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          payload: Json
          run_at: string
          status: string
          type: string
          updated_at: string
          wedding_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          run_at?: string
          status?: string
          type: string
          updated_at?: string
          wedding_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          run_at?: string
          status?: string
          type?: string
          updated_at?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "jobs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          focal_x: number
          focal_y: number
          id: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          wedding_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          focal_x?: number
          focal_y?: number
          id?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          wedding_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          focal_x?: number
          focal_y?: number
          id?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "wedding_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "photos_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          id: string
          max_gifts: number | null
          max_guests: number | null
          name: string
          storage_limit_mb: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_gifts?: number | null
          max_guests?: number | null
          name: string
          storage_limit_mb?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_gifts?: number | null
          max_guests?: number | null
          name?: string
          storage_limit_mb?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      rsvp_responses: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          invite_id: string
          responded_at: string | null
          status: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          invite_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          invite_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_responses_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_responses_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_responses_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "rsvp_responses_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          started_at: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          started_at?: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          started_at?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "subscriptions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          guest_count: number
          storage_used_mb: number
          updated_at: string
          wedding_id: string
        }
        Insert: {
          guest_count?: number
          storage_used_mb?: number
          updated_at?: string
          wedding_id: string
        }
        Update: {
          guest_count?: number
          storage_used_mb?: number
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "usage_counters_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_members: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_rsvp_summary"
            referencedColumns: ["wedding_id"]
          },
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          child_max_age: number
          couple_names: string
          created_at: string
          event_date: string
          event_time: string | null
          guest_list_mode: string
          id: string
          infinitepay_handle: string | null
          physical_gift_delivery_mode: string
          rsvp_deadline: string | null
          slug: string
          theme_config: Json
          updated_at: string
        }
        Insert: {
          child_max_age?: number
          couple_names: string
          created_at?: string
          event_date: string
          event_time?: string | null
          guest_list_mode?: string
          id?: string
          infinitepay_handle?: string | null
          physical_gift_delivery_mode?: string
          rsvp_deadline?: string | null
          slug: string
          theme_config?: Json
          updated_at?: string
        }
        Update: {
          child_max_age?: number
          couple_names?: string
          created_at?: string
          event_date?: string
          event_time?: string | null
          guest_list_mode?: string
          id?: string
          infinitepay_handle?: string | null
          physical_gift_delivery_mode?: string
          rsvp_deadline?: string | null
          slug?: string
          theme_config?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      wedding_rsvp_summary: {
        Row: {
          responses_confirmed: number | null
          responses_declined: number | null
          total_companions_confirmed: number | null
          total_guests: number | null
          total_invites: number | null
          wedding_id: string | null
        }
        Insert: {
          responses_confirmed?: never
          responses_declined?: never
          total_companions_confirmed?: never
          total_guests?: never
          total_invites?: never
          wedding_id?: string | null
        }
        Update: {
          responses_confirmed?: never
          responses_declined?: never
          total_companions_confirmed?: never
          total_guests?: never
          total_invites?: never
          wedding_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_gift_reservation: {
        Args: {
          p_group_id?: string
          p_guest_id?: string
          p_reservation_id: string
          p_skip_ownership_check?: boolean
        }
        Returns: undefined
      }
      confirm_gift_payment: {
        Args: { p_payment_id: string }
        Returns: {
          amount_cents: number
          confirmed_at: string | null
          created_at: string
          failure_reason: string | null
          gift_id: string
          giver_name: string
          giver_phone: string | null
          guest_message: string | null
          id: string
          invite_id: string | null
          kind: string
          last_provider_response: Json | null
          provider_checkout_url: string | null
          provider_invoice_slug: string | null
          provider_order_nsu: string
          provider_transaction_nsu: string | null
          quota_count: number | null
          resulting_contribution_id: string | null
          resulting_reservation_id: string | null
          status: string
          updated_at: string
          wedding_id: string
        }
        SetofOptions: {
          from: "*"
          to: "gift_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_invite_rsvp: {
        Args: {
          p_companions?: Json
          p_invite_id: string
          p_message?: string
          p_source?: string
          p_wedding_id: string
        }
        Returns: {
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          internal_code: string
          max_companions: number | null
          name: string
          notes: string | null
          responsible_guest_id: string | null
          rsvp_message: string | null
          rsvp_message_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
          wedding_id: string
        }
        SetofOptions: {
          from: "*"
          to: "invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guest_is_child: {
        Args: { p_birth_date: string; p_wedding_id: string }
        Returns: boolean
      }
      guest_name_matches: {
        Args: { p_full_name: string; p_nickname: string; p_query: string }
        Returns: boolean
      }
      is_wedding_member: { Args: { p_wedding_id: string }; Returns: boolean }
      is_wedding_owner: { Args: { p_wedding_id: string }; Returns: boolean }
      reserve_gift:
        | {
            Args: {
              p_contributor_name?: string
              p_gift_id: string
              p_group_id?: string
              p_guest_id?: string
            }
            Returns: {
              contributor_name: string | null
              created_at: string
              gift_id: string
              giver_phone: string | null
              group_id: string | null
              guest_id: string | null
              id: string
              message: string | null
              reserved_at: string
              updated_at: string
              wedding_id: string
            }
            SetofOptions: {
              from: "*"
              to: "gift_reservations"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_contributor_name?: string
              p_gift_id: string
              p_group_id?: string
              p_guest_id?: string
              p_message?: string
            }
            Returns: {
              contributor_name: string | null
              created_at: string
              gift_id: string
              giver_phone: string | null
              group_id: string | null
              guest_id: string | null
              id: string
              message: string | null
              reserved_at: string
              updated_at: string
              wedding_id: string
            }
            SetofOptions: {
              from: "*"
              to: "gift_reservations"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_contributor_name?: string
              p_gift_id: string
              p_giver_phone?: string
              p_group_id?: string
              p_guest_id?: string
              p_message?: string
            }
            Returns: {
              contributor_name: string | null
              created_at: string
              gift_id: string
              giver_phone: string | null
              group_id: string | null
              guest_id: string | null
              id: string
              message: string | null
              reserved_at: string
              updated_at: string
              wedding_id: string
            }
            SetofOptions: {
              from: "*"
              to: "gift_reservations"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      search_guests_by_name: {
        Args: { p_limit?: number; p_query: string; p_wedding_id: string }
        Returns: {
          full_name: string
          id: string
          nickname: string
        }[]
      }
      sync_guest_party: {
        Args: {
          p_companions?: Json
          p_invite?: Json
          p_primary: Json
          p_removed_guest_ids?: string[]
          p_wedding_id: string
        }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      upsert_guest_rsvp: {
        Args: {
          p_dietary_restrictions?: string
          p_guest_id: string
          p_ip?: string
          p_source?: string
          p_status: string
          p_user_agent?: string
          p_wedding_id: string
        }
        Returns: {
          created_at: string
          guest_id: string
          id: string
          invite_id: string
          responded_at: string | null
          status: string
          updated_at: string
          wedding_id: string
        }
        SetofOptions: {
          from: "*"
          to: "rsvp_responses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
