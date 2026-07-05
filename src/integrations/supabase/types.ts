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
      galaxies: {
        Row: {
          created_at: string
          description: string
          difficulty: string
          id: string
          name: string
          stars: Json
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          name: string
          stars?: Json
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          name?: string
          stars?: Json
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      ic_codes: {
        Row: {
          code: string
          created_at: string
          used_at: string | null
          used_by: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          used_at?: string | null
          used_by?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          used_at?: string | null
          used_by?: string | null
          value?: number
        }
        Relationships: []
      }
      inventory: {
        Row: {
          acquired_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_codes: {
        Row: {
          code: string
          created_at: string
          topic: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          topic: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          topic?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content: Json
          created_at: string
          galaxy_id: string
          star_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          galaxy_id: string
          star_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          galaxy_id?: string
          star_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_galaxy_id_fkey"
            columns: ["galaxy_id"]
            isOneToOne: false
            referencedRelation: "galaxies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_customization: Json
          created_at: string
          display_name: string | null
          email: string | null
          ic: number
          id: string
          last_active_date: string | null
          streak_days: number
          updated_at: string
        }
        Insert: {
          avatar_customization?: Json
          created_at?: string
          display_name?: string | null
          email?: string | null
          ic?: number
          id: string
          last_active_date?: string | null
          streak_days?: number
          updated_at?: string
        }
        Update: {
          avatar_customization?: Json
          created_at?: string
          display_name?: string | null
          email?: string | null
          ic?: number
          id?: string
          last_active_date?: string | null
          streak_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      progress: {
        Row: {
          completed_stars: string[]
          galaxy_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_stars?: string[]
          galaxy_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_stars?: string[]
          galaxy_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_galaxy_id_fkey"
            columns: ["galaxy_id"]
            isOneToOne: false
            referencedRelation: "galaxies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
