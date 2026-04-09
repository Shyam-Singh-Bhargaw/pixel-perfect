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
      ai_chat_history: {
        Row: {
          content: string
          context_type: string | null
          created_at: string | null
          id: string
          role: string | null
          session_date: string | null
          user_id: string
        }
        Insert: {
          content: string
          context_type?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          session_date?: string | null
          user_id: string
        }
        Update: {
          content?: string
          context_type?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          session_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coding_practice: {
        Row: {
          created_at: string | null
          date_solved: string | null
          difficulty: string | null
          id: string
          note: string | null
          platform: string
          title: string
          topic: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_solved?: string | null
          difficulty?: string | null
          id?: string
          note?: string | null
          platform: string
          title: string
          topic?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_solved?: string | null
          difficulty?: string | null
          id?: string
          note?: string | null
          platform?: string
          title?: string
          topic?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          mood: string | null
          notes: string | null
          streak: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          mood?: string | null
          notes?: string | null
          streak?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          mood?: string | null
          notes?: string | null
          streak?: number | null
          user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applied_date: string | null
          company: string
          created_at: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          role: string
          status: string | null
          user_id: string
        }
        Insert: {
          applied_date?: string | null
          company: string
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          role: string
          status?: string | null
          user_id: string
        }
        Update: {
          applied_date?: string | null
          company?: string
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          role?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      network_log: {
        Row: {
          contacted: boolean | null
          created_at: string | null
          date: string | null
          id: string
          name: string
          next_action: string | null
          note: string | null
          platform: string | null
          user_id: string
        }
        Insert: {
          contacted?: boolean | null
          created_at?: string | null
          date?: string | null
          id?: string
          name: string
          next_action?: string | null
          note?: string | null
          platform?: string | null
          user_id: string
        }
        Update: {
          contacted?: boolean | null
          created_at?: string | null
          date?: string | null
          id?: string
          name?: string
          next_action?: string | null
          note?: string | null
          platform?: string | null
          user_id?: string
        }
        Relationships: []
      }
      revision_items: {
        Row: {
          added_date: string | null
          created_at: string | null
          id: string
          next_rev: string | null
          original_date: string | null
          rev_count: number | null
          rev_dates: string[] | null
          source_note: string | null
          source_type: string | null
          source_url: string | null
          text: string
          topic: string | null
          user_id: string
        }
        Insert: {
          added_date?: string | null
          created_at?: string | null
          id?: string
          next_rev?: string | null
          original_date?: string | null
          rev_count?: number | null
          rev_dates?: string[] | null
          source_note?: string | null
          source_type?: string | null
          source_url?: string | null
          text: string
          topic?: string | null
          user_id: string
        }
        Update: {
          added_date?: string | null
          created_at?: string | null
          id?: string
          next_rev?: string | null
          original_date?: string | null
          rev_count?: number | null
          rev_dates?: string[] | null
          source_note?: string | null
          source_type?: string | null
          source_url?: string | null
          text?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_hours: {
        Row: {
          created_at: string | null
          date: string | null
          hours: number
          id: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          hours: number
          id?: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          hours?: number
          id?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          date: string | null
          done: boolean | null
          id: string
          priority: string | null
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          done?: boolean | null
          id?: string
          priority?: string | null
          text: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          done?: boolean | null
          id?: string
          priority?: string | null
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          created_at: string | null
          id: string
          studied_subtopics: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          studied_subtopics?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          studied_subtopics?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
