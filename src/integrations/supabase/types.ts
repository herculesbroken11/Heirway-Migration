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
      assessments: {
        Row: {
          adi_score: number
          aeti_score: number
          created_at: string
          created_by: string | null
          csi_score: number
          id: string
          isi_score: number
          lai_score: number
          pfi_score: number
          primary_profile: string | null
          prospect_id: string
          q1_situation: string[]
          q10_change_concern: string
          q11_exit_comfort: string
          q12_veto_power: string[]
          q13_blame_allocation: string
          q14_audit_perception: string
          q15_aggressiveness_concern: string
          q16_control_importance: string
          q17_trustee_acceptance: string
          q18_holding_period: string
          q19_existing_trusts: string
          q2_annual_income: string
          q20_intent: string
          q21_fee_preference: string
          q22_savings_share: string
          q23_pricing_priority: string
          q3_net_worth: string
          q4_income_source: string
          q5_tax_burden: string
          q6_avoided_strategies: string
          q7_mindset: string
          q8_decision_style: string
          q9_regret_pattern: string
          scs_score: number
          secondary_profile: string | null
          viewed_at: string | null
        }
        Insert: {
          adi_score?: number
          aeti_score?: number
          created_at?: string
          created_by?: string | null
          csi_score?: number
          id?: string
          isi_score?: number
          lai_score?: number
          pfi_score?: number
          primary_profile?: string | null
          prospect_id: string
          q1_situation?: string[]
          q10_change_concern: string
          q11_exit_comfort: string
          q12_veto_power?: string[]
          q13_blame_allocation: string
          q14_audit_perception: string
          q15_aggressiveness_concern: string
          q16_control_importance: string
          q17_trustee_acceptance: string
          q18_holding_period: string
          q19_existing_trusts: string
          q2_annual_income: string
          q20_intent: string
          q21_fee_preference: string
          q22_savings_share: string
          q23_pricing_priority: string
          q3_net_worth: string
          q4_income_source: string
          q5_tax_burden: string
          q6_avoided_strategies: string
          q7_mindset: string
          q8_decision_style: string
          q9_regret_pattern: string
          scs_score?: number
          secondary_profile?: string | null
          viewed_at?: string | null
        }
        Update: {
          adi_score?: number
          aeti_score?: number
          created_at?: string
          created_by?: string | null
          csi_score?: number
          id?: string
          isi_score?: number
          lai_score?: number
          pfi_score?: number
          primary_profile?: string | null
          prospect_id?: string
          q1_situation?: string[]
          q10_change_concern?: string
          q11_exit_comfort?: string
          q12_veto_power?: string[]
          q13_blame_allocation?: string
          q14_audit_perception?: string
          q15_aggressiveness_concern?: string
          q16_control_importance?: string
          q17_trustee_acceptance?: string
          q18_holding_period?: string
          q19_existing_trusts?: string
          q2_annual_income?: string
          q20_intent?: string
          q21_fee_preference?: string
          q22_savings_share?: string
          q23_pricing_priority?: string
          q3_net_worth?: string
          q4_income_source?: string
          q5_tax_burden?: string
          q6_avoided_strategies?: string
          q7_mindset?: string
          q8_decision_style?: string
          q9_regret_pattern?: string
          scs_score?: number
          secondary_profile?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_log: {
        Row: {
          consent_type: string
          created_at: string
          email: string | null
          form_context: string
          full_name: string | null
          id: string
          ip_address: string | null
          privacy_policy_version: string | null
          terms_version: string | null
          user_id: string | null
        }
        Insert: {
          consent_type?: string
          created_at?: string
          email?: string | null
          form_context?: string
          full_name?: string | null
          id?: string
          ip_address?: string | null
          privacy_policy_version?: string | null
          terms_version?: string | null
          user_id?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string
          email?: string | null
          form_context?: string
          full_name?: string | null
          id?: string
          ip_address?: string | null
          privacy_policy_version?: string | null
          terms_version?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          message_thread_id: string | null
          opt_in: boolean
          phone: string | null
          prospect_id: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
          message_thread_id?: string | null
          opt_in?: boolean
          phone?: string | null
          prospect_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          message_thread_id?: string | null
          opt_in?: boolean
          phone?: string | null
          prospect_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_message_thread_id_fkey"
            columns: ["message_thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      heirway_admin_notifications: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          notification_type: string
          target_client_id: string | null
          target_plans: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          notification_type?: string
          target_client_id?: string | null
          target_plans?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          notification_type?: string
          target_client_id?: string | null
          target_plans?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "heirway_admin_notifications_target_client_id_fkey"
            columns: ["target_client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_admin_requests: {
        Row: {
          admin_notes: string | null
          client_id: string
          created_at: string
          description: string
          id: string
          related_minute_id: string | null
          request_type: string
          status: string
          ticket_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          client_id: string
          created_at?: string
          description?: string
          id?: string
          related_minute_id?: string | null
          request_type: string
          status?: string
          ticket_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          related_minute_id?: string | null
          request_type?: string
          status?: string
          ticket_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heirway_admin_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heirway_admin_requests_related_minute_id_fkey"
            columns: ["related_minute_id"]
            isOneToOne: false
            referencedRelation: "heirway_meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_assets: {
        Row: {
          asset_type: string
          client_id: string
          created_at: string
          entity_name: string | null
          entity_type: string | null
          estimated_value: number | null
          id: string
          in_private_trust: boolean
          llc_state: string | null
          name: string
          notes: string | null
          trust_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type?: string
          client_id: string
          created_at?: string
          entity_name?: string | null
          entity_type?: string | null
          estimated_value?: number | null
          id?: string
          in_private_trust?: boolean
          llc_state?: string | null
          name: string
          notes?: string | null
          trust_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          client_id?: string
          created_at?: string
          entity_name?: string | null
          entity_type?: string | null
          estimated_value?: number | null
          id?: string
          in_private_trust?: boolean
          llc_state?: string | null
          name?: string
          notes?: string | null
          trust_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heirway_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heirway_assets_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "heirway_trust_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_clients: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          avatar_url: string | null
          business_ownership: string
          created_at: string
          creator_available: boolean
          email: string | null
          employment_type: string
          full_name: string | null
          has_children: boolean
          id: string
          is_18_plus: boolean
          is_married: boolean
          miro_board_url: string | null
          over_1m_assets: boolean
          owns_real_estate: boolean
          phone: string | null
          plan_started_at: string | null
          plan_status: string
          premium_access_granted: boolean
          questionnaire_answers: Json | null
          recommended_plan: string
          selected_plan: string | null
          silver_spot_price: number | null
          state: string
          trust_name_pool: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          business_ownership?: string
          created_at?: string
          creator_available?: boolean
          email?: string | null
          employment_type?: string
          full_name?: string | null
          has_children?: boolean
          id?: string
          is_18_plus?: boolean
          is_married?: boolean
          miro_board_url?: string | null
          over_1m_assets?: boolean
          owns_real_estate?: boolean
          phone?: string | null
          plan_started_at?: string | null
          plan_status?: string
          premium_access_granted?: boolean
          questionnaire_answers?: Json | null
          recommended_plan: string
          selected_plan?: string | null
          silver_spot_price?: number | null
          state: string
          trust_name_pool?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          business_ownership?: string
          created_at?: string
          creator_available?: boolean
          email?: string | null
          employment_type?: string
          full_name?: string | null
          has_children?: boolean
          id?: string
          is_18_plus?: boolean
          is_married?: boolean
          miro_board_url?: string | null
          over_1m_assets?: boolean
          owns_real_estate?: boolean
          phone?: string | null
          plan_started_at?: string | null
          plan_status?: string
          premium_access_granted?: boolean
          questionnaire_answers?: Json | null
          recommended_plan?: string
          selected_plan?: string | null
          silver_spot_price?: number | null
          state?: string
          trust_name_pool?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      heirway_plan_catalog: {
        Row: {
          active: boolean
          client_portal_tier: string | null
          content_access_keys: string[]
          created_at: string
          display_name: string
          internal_key: string
          metadata: Json
          offered: boolean
          plan_category: string
          selected_plan_key: string
          sort_order: number
          stripe_checkout_key: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_portal_tier?: string | null
          content_access_keys?: string[]
          created_at?: string
          display_name: string
          internal_key: string
          metadata?: Json
          offered?: boolean
          plan_category: string
          selected_plan_key: string
          sort_order?: number
          stripe_checkout_key?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_portal_tier?: string | null
          content_access_keys?: string[]
          created_at?: string
          display_name?: string
          internal_key?: string
          metadata?: Json
          offered?: boolean
          plan_category?: string
          selected_plan_key?: string
          sort_order?: number
          stripe_checkout_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      heirway_plan_prices: {
        Row: {
          active: boolean
          created_at: string
          id: string
          metadata: Json
          plan_catalog_key: string
          price_role: string
          stripe_price_id: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          metadata?: Json
          plan_catalog_key: string
          price_role: string
          stripe_price_id: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          metadata?: Json
          plan_catalog_key?: string
          price_role?: string
          stripe_price_id?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heirway_plan_prices_plan_catalog_key_fkey"
            columns: ["plan_catalog_key"]
            isOneToOne: false
            referencedRelation: "heirway_plan_catalog"
            referencedColumns: ["internal_key"]
          },
        ]
      }
      heirway_document_templates: {
        Row: {
          conditional_fields: Json
          created_at: string
          created_by: string | null
          description: string
          file_path: string | null
          id: string
          is_active: boolean
          is_builtin: boolean
          merge_fields: Json
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          conditional_fields?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          file_path?: string | null
          id?: string
          is_active?: boolean
          is_builtin?: boolean
          merge_fields?: Json
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          conditional_fields?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          file_path?: string | null
          id?: string
          is_active?: boolean
          is_builtin?: boolean
          merge_fields?: Json
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      heirway_documents: {
        Row: {
          category: string
          client_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          user_id: string
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heirway_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_generated_documents: {
        Row: {
          client_id: string
          created_at: string
          edited_file_path: string | null
          file_path_docx: string | null
          file_path_pdf: string | null
          generated_by: string | null
          id: string
          is_admin_edited: boolean
          merge_data_snapshot: Json | null
          notes: string | null
          status: string
          template_id: string
          trust_id: string
          updated_at: string
          version: number
        }
        Insert: {
          client_id: string
          created_at?: string
          edited_file_path?: string | null
          file_path_docx?: string | null
          file_path_pdf?: string | null
          generated_by?: string | null
          id?: string
          is_admin_edited?: boolean
          merge_data_snapshot?: Json | null
          notes?: string | null
          status?: string
          template_id: string
          trust_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          edited_file_path?: string | null
          file_path_docx?: string | null
          file_path_pdf?: string | null
          generated_by?: string | null
          id?: string
          is_admin_edited?: boolean
          merge_data_snapshot?: Json | null
          notes?: string | null
          status?: string
          template_id?: string
          trust_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "heirway_generated_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heirway_generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "heirway_document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heirway_generated_documents_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "heirway_trust_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_intake: {
        Row: {
          additional_dependents: Json | null
          beneficiaries: Json | null
          biggest_fear: string | null
          business_description: string | null
          business_name: string | null
          business_revenue: string | null
          business_type: string | null
          client_id: string
          completed: boolean | null
          confident_plan_works: string | null
          confirmed: boolean | null
          cpa_email: string | null
          cpa_name: string | null
          cpa_phone: string | null
          created_at: string
          current_section: number | null
          date_of_birth: string | null
          dependents: Json | null
          estate_plan_last_reviewed: string | null
          estimated_current_income: number | null
          existing_documents: string[] | null
          expects_inheritance: string | null
          first_name: string | null
          id: string
          inheritance_details: string | null
          last_name: string | null
          last_tax_year: string | null
          legacy_recipients: Json | null
          major_tax_events: string | null
          managing_trustee_phone: string | null
          middle_name: string | null
          mobile_phone: string | null
          preferred_name: string | null
          spouse_dob: string | null
          spouse_full_name: string | null
          spouse_phone: string | null
          spouse_preferred_name: string | null
          successor_trustees: Json | null
          suffix: string | null
          support_preference: string | null
          tax_return_other: string | null
          tax_return_types: string[] | null
          top_priorities: string[] | null
          trust_address_city: string | null
          trust_address_state: string | null
          trust_address_street: string | null
          trust_address_zip: string | null
          trust_domicile_state: string | null
          trust_email: string | null
          trust_name: string | null
          trust_names: string[] | null
          trustees: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_dependents?: Json | null
          beneficiaries?: Json | null
          biggest_fear?: string | null
          business_description?: string | null
          business_name?: string | null
          business_revenue?: string | null
          business_type?: string | null
          client_id: string
          completed?: boolean | null
          confident_plan_works?: string | null
          confirmed?: boolean | null
          cpa_email?: string | null
          cpa_name?: string | null
          cpa_phone?: string | null
          created_at?: string
          current_section?: number | null
          date_of_birth?: string | null
          dependents?: Json | null
          estate_plan_last_reviewed?: string | null
          estimated_current_income?: number | null
          existing_documents?: string[] | null
          expects_inheritance?: string | null
          first_name?: string | null
          id?: string
          inheritance_details?: string | null
          last_name?: string | null
          last_tax_year?: string | null
          legacy_recipients?: Json | null
          major_tax_events?: string | null
          managing_trustee_phone?: string | null
          middle_name?: string | null
          mobile_phone?: string | null
          preferred_name?: string | null
          spouse_dob?: string | null
          spouse_full_name?: string | null
          spouse_phone?: string | null
          spouse_preferred_name?: string | null
          successor_trustees?: Json | null
          suffix?: string | null
          support_preference?: string | null
          tax_return_other?: string | null
          tax_return_types?: string[] | null
          top_priorities?: string[] | null
          trust_address_city?: string | null
          trust_address_state?: string | null
          trust_address_street?: string | null
          trust_address_zip?: string | null
          trust_domicile_state?: string | null
          trust_email?: string | null
          trust_name?: string | null
          trust_names?: string[] | null
          trustees?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_dependents?: Json | null
          beneficiaries?: Json | null
          biggest_fear?: string | null
          business_description?: string | null
          business_name?: string | null
          business_revenue?: string | null
          business_type?: string | null
          client_id?: string
          completed?: boolean | null
          confident_plan_works?: string | null
          confirmed?: boolean | null
          cpa_email?: string | null
          cpa_name?: string | null
          cpa_phone?: string | null
          created_at?: string
          current_section?: number | null
          date_of_birth?: string | null
          dependents?: Json | null
          estate_plan_last_reviewed?: string | null
          estimated_current_income?: number | null
          existing_documents?: string[] | null
          expects_inheritance?: string | null
          first_name?: string | null
          id?: string
          inheritance_details?: string | null
          last_name?: string | null
          last_tax_year?: string | null
          legacy_recipients?: Json | null
          major_tax_events?: string | null
          managing_trustee_phone?: string | null
          middle_name?: string | null
          mobile_phone?: string | null
          preferred_name?: string | null
          spouse_dob?: string | null
          spouse_full_name?: string | null
          spouse_phone?: string | null
          spouse_preferred_name?: string | null
          successor_trustees?: Json | null
          suffix?: string | null
          support_preference?: string | null
          tax_return_other?: string | null
          tax_return_types?: string[] | null
          top_priorities?: string[] | null
          trust_address_city?: string | null
          trust_address_state?: string | null
          trust_address_street?: string | null
          trust_address_zip?: string | null
          trust_domicile_state?: string | null
          trust_email?: string | null
          trust_name?: string | null
          trust_names?: string[] | null
          trustees?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heirway_intake_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_intake_questions: {
        Row: {
          admin_response: string | null
          client_id: string | null
          created_at: string
          id: string
          question: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          question: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          question?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heirway_intake_questions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_intake_videos: {
        Row: {
          id: string
          section_key: string
          title: string
          updated_at: string
          updated_by: string | null
          video_url: string
        }
        Insert: {
          id?: string
          section_key: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          video_url: string
        }
        Update: {
          id?: string
          section_key?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          video_url?: string
        }
        Relationships: []
      }
      heirway_kb_requests: {
        Row: {
          admin_notes: string | null
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          status: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heirway_kb_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_knowledgebase: {
        Row: {
          allowed_plans: string[]
          category: string
          content: string
          content_type: string
          created_at: string
          created_by: string | null
          document_name: string | null
          document_url: string | null
          external_url: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          slug: string
          summary: string
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          allowed_plans?: string[]
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_url?: string | null
          external_url?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          slug: string
          summary?: string
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          allowed_plans?: string[]
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_url?: string | null
          external_url?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          slug?: string
          summary?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: []
      }
      heirway_learning_content: {
        Row: {
          allowed_plans: string[]
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          created_by: string | null
          description: string
          difficulty: string
          duration_minutes: number | null
          id: string
          is_active: boolean
          is_free: boolean
          module_id: string
          module_ref_id: string | null
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          allowed_plans?: string[]
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          module_id: string
          module_ref_id?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          allowed_plans?: string[]
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          module_id?: string
          module_ref_id?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heirway_learning_content_module_ref_id_fkey"
            columns: ["module_ref_id"]
            isOneToOne: false
            referencedRelation: "heirway_learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_learning_modules: {
        Row: {
          allowed_plans: string[]
          created_at: string
          created_by: string | null
          description: string
          difficulty: string
          id: string
          is_active: boolean
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allowed_plans?: string[]
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allowed_plans?: string[]
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      heirway_learning_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          module_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          module_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: []
      }
      heirway_meeting_minutes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          meeting_date: string
          minute_number: number | null
          title: string
          trust_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          id?: string
          meeting_date?: string
          minute_number?: number | null
          title: string
          trust_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          meeting_date?: string
          minute_number?: number | null
          title?: string
          trust_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heirway_meeting_minutes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heirway_meeting_minutes_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "heirway_trust_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      heirway_referrals: {
        Row: {
          created_at: string
          credit_applied: boolean
          id: string
          referee_email: string
          referee_first_name: string
          referee_last_name: string
          referee_phone: string
          referrer_client_id: string
          referrer_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_applied?: boolean
          id?: string
          referee_email: string
          referee_first_name: string
          referee_last_name: string
          referee_phone: string
          referrer_client_id: string
          referrer_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_applied?: boolean
          id?: string
          referee_email?: string
          referee_first_name?: string
          referee_last_name?: string
          referee_phone?: string
          referrer_client_id?: string
          referrer_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "heirway_referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      heirway_trust_progress: {
        Row: {
          annual_meeting_date: string | null
          beneficiaries: Json
          client_id: string
          created_at: string
          creator_address_city: string | null
          creator_address_state: string | null
          creator_address_street: string | null
          creator_address_zip: string | null
          creator_name: string | null
          has_bank_account: boolean
          id: string
          stage: string
          stage_notes: string | null
          trust_code: string | null
          trust_name: string
          trust_type: string
          trustees: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_meeting_date?: string | null
          beneficiaries?: Json
          client_id: string
          created_at?: string
          creator_address_city?: string | null
          creator_address_state?: string | null
          creator_address_street?: string | null
          creator_address_zip?: string | null
          creator_name?: string | null
          has_bank_account?: boolean
          id?: string
          stage?: string
          stage_notes?: string | null
          trust_code?: string | null
          trust_name: string
          trust_type?: string
          trustees?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_meeting_date?: string | null
          beneficiaries?: Json
          client_id?: string
          created_at?: string
          creator_address_city?: string | null
          creator_address_state?: string | null
          creator_address_street?: string | null
          creator_address_zip?: string | null
          creator_name?: string | null
          has_bank_account?: boolean
          id?: string
          stage?: string
          stage_notes?: string | null
          trust_code?: string | null
          trust_name?: string
          trust_type?: string
          trustees?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heirway_trust_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      message_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_name: string | null
          sender_role: string
          sender_user_id: string | null
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_name?: string | null
          sender_role?: string
          sender_user_id?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_name?: string | null
          sender_role?: string
          sender_user_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_thread_participants: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          thread_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
          thread_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          contact_email: string
          contact_full_name: string
          contact_message_id: string | null
          created_at: string
          id: string
          last_message_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          contact_email: string
          contact_full_name: string
          contact_message_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string
          contact_full_name?: string
          contact_message_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_contact_message_id_fkey"
            columns: ["contact_message_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prospect_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          prospect_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          prospect_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          prospect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_notes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          quiz_answers: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          quiz_answers?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          quiz_answers?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      successor_vault: {
        Row: {
          additional_notes: string | null
          client_id: string
          created_at: string
          funeral_instructions: string | null
          healthcare_directives: string | null
          hipaa_authorization: string | null
          id: string
          power_of_attorney: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_notes?: string | null
          client_id: string
          created_at?: string
          funeral_instructions?: string | null
          healthcare_directives?: string | null
          hipaa_authorization?: string | null
          id?: string
          power_of_attorney?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_notes?: string | null
          client_id?: string
          created_at?: string
          funeral_instructions?: string | null
          healthcare_directives?: string | null
          hipaa_authorization?: string | null
          id?: string
          power_of_attorney?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "successor_vault_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      successor_vault_accounts: {
        Row: {
          account_name: string
          created_at: string
          id: string
          notes: string | null
          password: string | null
          pin: string | null
          safety_instructions: string | null
          user_id: string
          username: string | null
          vault_id: string
          website_url: string | null
        }
        Insert: {
          account_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          password?: string | null
          pin?: string | null
          safety_instructions?: string | null
          user_id: string
          username?: string | null
          vault_id: string
          website_url?: string | null
        }
        Update: {
          account_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          password?: string | null
          pin?: string | null
          safety_instructions?: string | null
          user_id?: string
          username?: string | null
          vault_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "successor_vault_accounts_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "successor_vault"
            referencedColumns: ["id"]
          },
        ]
      }
      successor_vault_contacts: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          relationship: string
          user_id: string
          vault_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          relationship?: string
          user_id: string
          vault_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          relationship?: string
          user_id?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "successor_vault_contacts_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "successor_vault"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      trust_access_approvals: {
        Row: {
          approved: boolean
          approved_at: string | null
          created_at: string | null
          id: string
          request_id: string
          trustee_member_id: string
          trustee_user_id: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          created_at?: string | null
          id?: string
          request_id: string
          trustee_member_id: string
          trustee_user_id: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          created_at?: string | null
          id?: string
          request_id?: string
          trustee_member_id?: string
          trustee_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_access_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "trust_access_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_access_approvals_trustee_member_id_fkey"
            columns: ["trustee_member_id"]
            isOneToOne: false
            referencedRelation: "trust_members"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_access_requests: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          requested_by: string
          resource_id: string | null
          resource_type: string
          status: string
          trust_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          requested_by: string
          resource_id?: string | null
          resource_type: string
          status?: string
          trust_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          requested_by?: string
          resource_id?: string | null
          resource_type?: string
          status?: string
          trust_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_access_requests_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "heirway_trust_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_member_assignments: {
        Row: {
          created_at: string
          id: string
          member_id: string
          power_level: string
          trust_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          power_level?: string
          trust_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          power_level?: string
          trust_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_member_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "trust_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_member_assignments_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "heirway_trust_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_members: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          invite_email: string | null
          invite_status: string
          invite_token: string | null
          invited_at: string | null
          invited_by: string | null
          is_billable: boolean | null
          member_type: string
          power_level: string
          trust_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_email?: string | null
          invite_status?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_billable?: boolean | null
          member_type: string
          power_level?: string
          trust_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_email?: string | null
          invite_status?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_billable?: boolean | null
          member_type?: string
          power_level?: string
          trust_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "heirway_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_members_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "heirway_trust_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_plan_content: {
        Args: { _allowed_plans: string[] }
        Returns: boolean
      }
      current_user_plan: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_can_access_message_thread: {
        Args: { _thread_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin" | "viewer"
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
      app_role: ["admin", "user", "super_admin", "viewer"],
    },
  },
} as const
