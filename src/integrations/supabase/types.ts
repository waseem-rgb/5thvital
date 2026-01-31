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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      booking_items: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          item_id: string
          item_name: string
          item_type: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          item_id: string
          item_name: string
          item_type: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address: string
          coupon_code: string | null
          created_at: string
          custom_booking_id: string | null
          customer_age: number | null
          customer_email: string | null
          customer_gender: string | null
          customer_name: string
          customer_phone: string
          discount_amount: number | null
          discount_percentage: number | null
          final_amount: number
          id: string
          notes: string | null
          preferred_date: string
          preferred_time: string
          status: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          coupon_code?: string | null
          created_at?: string
          custom_booking_id?: string | null
          customer_age?: number | null
          customer_email?: string | null
          customer_gender?: string | null
          customer_name: string
          customer_phone: string
          discount_amount?: number | null
          discount_percentage?: number | null
          final_amount: number
          id?: string
          notes?: string | null
          preferred_date: string
          preferred_time: string
          status?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          coupon_code?: string | null
          created_at?: string
          custom_booking_id?: string | null
          customer_age?: number | null
          customer_email?: string | null
          customer_gender?: string | null
          customer_name?: string
          customer_phone?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          final_amount?: number
          id?: string
          notes?: string | null
          preferred_date?: string
          preferred_time?: string
          status?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      health_profiles: {
        Row: {
          category: string | null
          created_at: string
          customer_price: number
          description: string | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          original_price: number | null
          parameters_count: number | null
          profile_name: string
          report_time: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          customer_price: number
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          original_price?: number | null
          parameters_count?: number | null
          profile_name: string
          report_time?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          customer_price?: number
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          original_price?: number | null
          parameters_count?: number | null
          profile_name?: string
          report_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      medical_tests: {
        Row: {
          body_system: string | null
          created_at: string
          customer_price: number
          description: string | null
          id: string
          is_active: boolean | null
          profile_name: string | null
          report_delivered_in: string | null
          sample_type: string | null
          synonyms: string[] | null
          test_code: string
          test_name: string
          updated_at: string
        }
        Insert: {
          body_system?: string | null
          created_at?: string
          customer_price: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          profile_name?: string | null
          report_delivered_in?: string | null
          sample_type?: string | null
          synonyms?: string[] | null
          test_code: string
          test_name: string
          updated_at?: string
        }
        Update: {
          body_system?: string | null
          created_at?: string
          customer_price?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          profile_name?: string | null
          report_delivered_in?: string | null
          sample_type?: string | null
          synonyms?: string[] | null
          test_code?: string
          test_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_tests_import: {
        Row: {
          id: string
          test_name: string
          test_code: string
          description: string | null
          body_system: string | null
          customer_price: number
          sample_type: string | null
          report_delivered_in: string | null
          synonyms: string | null
          profile_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          test_name: string
          test_code: string
          description?: string | null
          body_system?: string | null
          customer_price: number
          sample_type?: string | null
          report_delivered_in?: string | null
          synonyms?: string | null
          profile_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          test_name?: string
          test_code?: string
          description?: string | null
          body_system?: string | null
          customer_price?: number
          sample_type?: string | null
          report_delivered_in?: string | null
          synonyms?: string | null
          profile_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp: string
          phone: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp: string
          phone: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      packages: {
        Row: {
          id: string
          slug: string
          title: string
          status: string
          is_featured: boolean
          sort_order: number | null
          mrp: number | null
          price: number | null
          discount_percent: number | null
          reports_within_hours: number | null
          tests_included: number | null
          requisites: string | null
          home_collection_minutes: number | null
          highlights: string | null
          description: string | null
          parameters: Json | null
          faqs: Json | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          status?: string
          is_featured?: boolean
          sort_order?: number | null
          mrp?: number | null
          price?: number | null
          discount_percent?: number | null
          reports_within_hours?: number | null
          tests_included?: number | null
          requisites?: string | null
          home_collection_minutes?: number | null
          highlights?: string | null
          description?: string | null
          parameters?: Json | null
          faqs?: Json | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          status?: string
          is_featured?: boolean
          sort_order?: number | null
          mrp?: number | null
          price?: number | null
          discount_percent?: number | null
          reports_within_hours?: number | null
          tests_included?: number | null
          requisites?: string | null
          home_collection_minutes?: number | null
          highlights?: string | null
          description?: string | null
          parameters?: Json | null
          faqs?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_custom_booking_id: { Args: never; Returns: string }
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
  public: {
    Enums: {},
  },
} as const
