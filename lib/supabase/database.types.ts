// Tipos de la base. Regenerar después de cada migración con:  npm run db:types
// (usa la Management API de Supabase con SUPABASE_ACCESS_TOKEN).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          body_md: string
          cover_image_alt: string
          cover_image_url: string | null
          created_at: string
          donation_note: string | null
          donation_url: string
          id: string
          is_featured: boolean
          progress_percent: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["campaign_status"]
          summary: string
          tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string
          cover_image_alt?: string
          cover_image_url?: string | null
          created_at?: string
          donation_note?: string | null
          donation_url: string
          id?: string
          is_featured?: boolean
          progress_percent?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          summary: string
          tag?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          cover_image_alt?: string
          cover_image_url?: string | null
          created_at?: string
          donation_note?: string | null
          donation_url?: string
          id?: string
          is_featured?: boolean
          progress_percent?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          summary?: string
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      heartbeat: {
        Row: {
          id: number
          pinged_at: string
          source: string
        }
        Insert: {
          id?: never
          pinged_at?: string
          source: string
        }
        Update: {
          id?: never
          pinged_at?: string
          source?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          about: Json
          contact: Json
          created_at: string
          help: Json
          hero: Json
          how_to_donate: Json
          id: number
          privacy_md: string
          seo: Json
          socials: Json
          updated_at: string
        }
        Insert: {
          about?: Json
          contact?: Json
          created_at?: string
          help?: Json
          hero?: Json
          how_to_donate?: Json
          id?: number
          privacy_md?: string
          seo?: Json
          socials?: Json
          updated_at?: string
        }
        Update: {
          about?: Json
          contact?: Json
          created_at?: string
          help?: Json
          hero?: Json
          how_to_donate?: Json
          id?: number
          privacy_md?: string
          seo?: Json
          socials?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      last_heartbeat: { Args: never; Returns: string }
      record_heartbeat: { Args: { source: string }; Returns: Json }
      set_featured_campaign: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
    }
    Enums: {
      campaign_status: "draft" | "active" | "hidden"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
