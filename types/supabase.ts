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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          anonymous_session_id: string | null
          collection_id: string | null
          created_at: string
          event_name: Database["public"]["Enums"]["analytics_event_name"]
          id: string
          metadata: Json
          product_id: string | null
          promotion_id: string | null
          referrer_domain: string | null
          route: string
        }
        Insert: {
          anonymous_session_id?: string | null
          collection_id?: string | null
          created_at?: string
          event_name: Database["public"]["Enums"]["analytics_event_name"]
          id?: string
          metadata?: Json
          product_id?: string | null
          promotion_id?: string | null
          referrer_domain?: string | null
          route: string
        }
        Update: {
          anonymous_session_id?: string | null
          collection_id?: string | null
          created_at?: string
          event_name?: Database["public"]["Enums"]["analytics_event_name"]
          id?: string
          metadata?: Json
          product_id?: string | null
          promotion_id?: string | null
          referrer_domain?: string | null
          route?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      collection_products: {
        Row: {
          collection_id: string
          display_order: number
          product_id: string
        }
        Insert: {
          collection_id: string
          display_order?: number
          product_id: string
        }
        Update: {
          collection_id?: string
          display_order?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_alt_text: string | null
          cover_height: number | null
          cover_object_position: string
          cover_path: string | null
          cover_width: number | null
          created_at: string
          description: string | null
          display_order: number
          ends_at: string | null
          featured: boolean
          id: string
          name: string
          published: boolean
          slug: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          cover_alt_text?: string | null
          cover_height?: number | null
          cover_object_position?: string
          cover_path?: string | null
          cover_width?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          ends_at?: string | null
          featured?: boolean
          id?: string
          name: string
          published?: boolean
          slug: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          cover_alt_text?: string | null
          cover_height?: number | null
          cover_object_position?: string
          cover_path?: string | null
          cover_width?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          ends_at?: string | null
          featured?: boolean
          id?: string
          name?: string
          published?: boolean
          slug?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      galleries: {
        Row: {
          autoplay: boolean
          created_at: string
          display_order: number
          id: string
          name: string
          published: boolean
          route_key: string
          slug: string
          updated_at: string
        }
        Insert: {
          autoplay?: boolean
          created_at?: string
          display_order?: number
          id?: string
          name: string
          published?: boolean
          route_key: string
          slug: string
          updated_at?: string
        }
        Update: {
          autoplay?: boolean
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          published?: boolean
          route_key?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          alt_text: string
          created_at: string
          desktop_object_position: string
          display_order: number
          gallery_id: string
          height: number | null
          id: string
          mobile_object_position: string
          published: boolean
          series_order: number | null
          storage_path: string
          updated_at: string
          visual_series: string | null
          width: number | null
        }
        Insert: {
          alt_text: string
          created_at?: string
          desktop_object_position?: string
          display_order?: number
          gallery_id: string
          height?: number | null
          id?: string
          mobile_object_position?: string
          published?: boolean
          series_order?: number | null
          storage_path: string
          updated_at?: string
          visual_series?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          desktop_object_position?: string
          display_order?: number
          gallery_id?: string
          height?: number | null
          id?: string
          mobile_object_position?: string
          published?: boolean
          series_order?: number | null
          storage_path?: string
          updated_at?: string
          visual_series?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          display_order: number
          height: number | null
          id: string
          is_cover: boolean
          object_position: string
          product_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          alt_text: string
          created_at?: string
          display_order?: number
          height?: number | null
          id?: string
          is_cover?: boolean
          object_position?: string
          product_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          display_order?: number
          height?: number | null
          id?: string
          is_cover?: boolean
          object_position?: string
          product_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          availability_status: Database["public"]["Enums"]["availability_status"]
          brand_id: string | null
          category_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          display_order: number
          featured: boolean
          id: string
          model: string | null
          name: string
          price: number | null
          price_visibility: Database["public"]["Enums"]["price_visibility"]
          published: boolean
          short_description: string | null
          sku: string
          slug: string
          updated_at: string
          updated_by: string | null
          whatsapp_message_override: string | null
        }
        Insert: {
          archived_at?: string | null
          availability_status?: Database["public"]["Enums"]["availability_status"]
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          featured?: boolean
          id?: string
          model?: string | null
          name: string
          price?: number | null
          price_visibility?: Database["public"]["Enums"]["price_visibility"]
          published?: boolean
          short_description?: string | null
          sku: string
          slug: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_message_override?: string | null
        }
        Update: {
          archived_at?: string | null
          availability_status?: Database["public"]["Enums"]["availability_status"]
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          featured?: boolean
          id?: string
          model?: string | null
          name?: string
          price?: number | null
          price_visibility?: Database["public"]["Enums"]["price_visibility"]
          published?: boolean
          short_description?: string | null
          sku?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_message_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Relationships: []
      }
      promotion_products: {
        Row: {
          display_order: number
          product_id: string
          promotion_id: string
        }
        Insert: {
          display_order?: number
          product_id: string
          promotion_id: string
        }
        Update: {
          display_order?: number
          product_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string
          cta_target: string
          ends_at: string
          featured: boolean
          id: string
          image_alt_text: string | null
          image_height: number | null
          image_object_position: string
          image_path: string
          image_width: number | null
          priority: number
          short_description: string | null
          slug: string
          starts_at: string
          title: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label: string
          cta_target?: string
          ends_at: string
          featured?: boolean
          id?: string
          image_alt_text?: string | null
          image_height?: number | null
          image_object_position?: string
          image_path: string
          image_width?: number | null
          priority?: number
          short_description?: string | null
          slug: string
          starts_at: string
          title: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string
          cta_target?: string
          ends_at?: string
          featured?: boolean
          id?: string
          image_alt_text?: string | null
          image_height?: number | null
          image_object_position?: string
          image_path?: string
          image_width?: number | null
          priority?: number
          short_description?: string | null
          slug?: string
          starts_at?: string
          title?: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reorder_gallery_items: {
        Args: { ordered_ids: string[]; target_gallery_id: string }
        Returns: undefined
      }
      reorder_product_images: {
        Args: { ordered_ids: string[]; target_product_id: string }
        Returns: undefined
      }
      set_product_cover: {
        Args: { target_image_id: string; target_product_id: string }
        Returns: undefined
      }
      sync_collection_products: {
        Args: { ordered_product_ids: string[]; target_collection_id: string }
        Returns: undefined
      }
      sync_promotion_products: {
        Args: { ordered_product_ids: string[]; target_promotion_id: string }
        Returns: undefined
      }
    }
    Enums: {
      admin_role: "admin" | "editor" | "attendant"
      analytics_event_name:
        | "page_view"
        | "product_view"
        | "product_whatsapp_click"
        | "collection_view"
        | "promotion_view"
        | "promotion_click"
        | "gallery_interaction"
      availability_status:
        | "available"
        | "last_unit"
        | "consultation"
        | "unavailable"
      price_visibility: "visible" | "consult" | "hidden"
      promotion_type: "promotion" | "highlight" | "launch" | "collection"
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
  public: {
    Enums: {
      admin_role: ["admin", "editor", "attendant"],
      analytics_event_name: [
        "page_view",
        "product_view",
        "product_whatsapp_click",
        "collection_view",
        "promotion_view",
        "promotion_click",
        "gallery_interaction",
      ],
      availability_status: [
        "available",
        "last_unit",
        "consultation",
        "unavailable",
      ],
      price_visibility: ["visible", "consult", "hidden"],
      promotion_type: ["promotion", "highlight", "launch", "collection"],
    },
  },
} as const
