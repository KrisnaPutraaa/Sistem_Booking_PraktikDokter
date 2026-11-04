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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor: string | null
          at: string
          entry_id: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          actor?: string | null
          at?: string
          entry_id?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor?: string | null
          at?: string
          entry_id?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: []
      }
      closed_days: {
        Row: {
          day: string
          reason: string | null
        }
        Insert: {
          day: string
          reason?: string | null
        }
        Update: {
          day?: string
          reason?: string | null
        }
        Relationships: []
      }
      daily_counters: {
        Row: {
          last_number: number
          queue_date: string
        }
        Insert: {
          last_number?: number
          queue_date: string
        }
        Update: {
          last_number?: number
          queue_date?: string
        }
        Relationships: []
      }
      practice_settings: {
        Row: {
          address: string | null
          avg_minutes: number
          clinic_name: string | null
          close_time: string
          cutoff_time: string | null
          daily_quota: number
          days_ahead: number
          doctor_name: string
          emergency_notice: string | null
          id: number
          max_calls: number
          max_per_whatsapp: number
          open_days: number[]
          open_time: string
          profile_text: string | null
          registration_open_time: string
          updated_at: string
          walk_in_enabled: boolean
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avg_minutes?: number
          clinic_name?: string | null
          close_time?: string
          cutoff_time?: string | null
          daily_quota?: number
          days_ahead?: number
          doctor_name?: string
          emergency_notice?: string | null
          id?: number
          max_calls?: number
          max_per_whatsapp?: number
          open_days?: number[]
          open_time?: string
          profile_text?: string | null
          registration_open_time?: string
          updated_at?: string
          walk_in_enabled?: boolean
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avg_minutes?: number
          clinic_name?: string | null
          close_time?: string
          cutoff_time?: string | null
          daily_quota?: number
          days_ahead?: number
          doctor_name?: string
          emergency_notice?: string | null
          id?: number
          max_calls?: number
          max_per_whatsapp?: number
          open_days?: number[]
          open_time?: string
          profile_text?: string | null
          registration_open_time?: string
          updated_at?: string
          walk_in_enabled?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      queue_entries: {
        Row: {
          call_count: number
          called_at: string | null
          complaint: string | null
          consent_at: string
          created_at: string
          fee_rupiah: number | null
          finished_at: string | null
          id: string
          name: string
          number: number
          public_token: string
          queue_date: string
          source: string
          status: Database["public"]["Enums"]["queue_status"]
          whatsapp: string
        }
        Insert: {
          call_count?: number
          called_at?: string | null
          complaint?: string | null
          consent_at: string
          created_at?: string
          fee_rupiah?: number | null
          finished_at?: string | null
          id?: string
          name: string
          number: number
          public_token?: string
          queue_date: string
          source?: string
          status?: Database["public"]["Enums"]["queue_status"]
          whatsapp: string
        }
        Update: {
          call_count?: number
          called_at?: string | null
          complaint?: string | null
          consent_at?: string
          created_at?: string
          fee_rupiah?: number | null
          finished_at?: string | null
          id?: string
          name?: string
          number?: number
          public_token?: string
          queue_date?: string
          source?: string
          status?: Database["public"]["Enums"]["queue_status"]
          whatsapp?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_availability: {
        Args: never
        Returns: {
          out_date: string
          out_reason: string
          out_remaining: number
          out_status: string
        }[]
      }
      get_my_queue: {
        Args: { p_token: string }
        Returns: {
          out_est_time: string
          out_now_serving: number
          out_number: number
          out_queue_date: string
          out_status: Database["public"]["Enums"]["queue_status"]
          out_waiting_ahead: number
        }[]
      }
      get_next_waiting: {
        Args: { p_limit?: number; p_token: string }
        Returns: {
          out_number: number
        }[]
      }
      get_now_serving: { Args: { p_date?: string }; Returns: number }
      take_queue: {
        Args: {
          p_actor?: string
          p_complaint: string
          p_date: string
          p_name: string
          p_source?: string
          p_whatsapp: string
        }
        Returns: {
          out_est_time: string
          out_number: number
          out_queue_date: string
          out_token: string
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "doctor" | "nurse"
      queue_status: "waiting" | "in_progress" | "done" | "no_show"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "doctor", "nurse"],
      queue_status: ["waiting", "in_progress", "done", "no_show"],
    },
  },
} as const
