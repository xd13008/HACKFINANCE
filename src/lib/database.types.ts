
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "affiliate_links": {
                  Row: {
                    "active": boolean,"commission": string | null,"created_at": string,"id": string,"network": string | null,"software_id": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"commission"?: string | null,"created_at"?: string,"id"?: string,"network"?: string | null,"software_id": string,"url": string
                  }
                  Update: {
                    "active"?: boolean,"commission"?: string | null,"created_at"?: string,"id"?: string,"network"?: string | null,"software_id"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "affiliate_links_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"agent_runs": {
                  Row: {
                    "agent": string,"cost_usd": number,"created_at": string,"duration_ms": number | null,"error": string | null,"finished_at": string | null,"id": string,"input": NonNullable<Json>,"output": Json | null,"started_by": string | null,"status": string,"target_id": string | null,"triggered_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "agent": string,"cost_usd"?: number,"created_at"?: string,"duration_ms"?: number | null,"error"?: string | null,"finished_at"?: string | null,"id"?: string,"input"?: NonNullable<Json>,"output"?: Json | null,"started_by"?: string | null,"status"?: string,"target_id"?: string | null,"triggered_by"?: string | null
                  }
                  Update: {
                    "agent"?: string,"cost_usd"?: number,"created_at"?: string,"duration_ms"?: number | null,"error"?: string | null,"finished_at"?: string | null,"id"?: string,"input"?: NonNullable<Json>,"output"?: Json | null,"started_by"?: string | null,"status"?: string,"target_id"?: string | null,"triggered_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"agent_settings": {
                  Row: {
                    "agent": string,"allowed_domains": (string)[],"enabled": boolean,"max_cost_per_month": number,"max_cost_per_run": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agent": string,"allowed_domains"?: (string)[],"enabled"?: boolean,"max_cost_per_month"?: number,"max_cost_per_run"?: number,"updated_at"?: string
                  }
                  Update: {
                    "agent"?: string,"allowed_domains"?: (string)[],"enabled"?: boolean,"max_cost_per_month"?: number,"max_cost_per_run"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"analytics_events": {
                  Row: {
                    "category_id": string | null,"device": string | null,"entity_id": string | null,"event_type": string,"id": number,"link_kind": string | null,"occurred_at": string,"page_type": string | null,"path": string,"placement_id": string | null,"props": NonNullable<Json>,"referrer_host": string | null,"rubrique": string | null,"session_hash": string,"site_id": string,"utm_campaign": string | null,"utm_medium": string | null,"utm_source": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"device"?: string | null,"entity_id"?: string | null,"event_type": string,"id"?: never,"link_kind"?: string | null,"occurred_at"?: string,"page_type"?: string | null,"path": string,"placement_id"?: string | null,"props"?: NonNullable<Json>,"referrer_host"?: string | null,"rubrique"?: string | null,"session_hash": string,"site_id": string,"utm_campaign"?: string | null,"utm_medium"?: string | null,"utm_source"?: string | null
                  }
                  Update: {
                    "category_id"?: string | null,"device"?: string | null,"entity_id"?: string | null,"event_type"?: string,"id"?: never,"link_kind"?: string | null,"occurred_at"?: string,"page_type"?: string | null,"path"?: string,"placement_id"?: string | null,"props"?: NonNullable<Json>,"referrer_host"?: string | null,"rubrique"?: string | null,"session_hash"?: string,"site_id"?: string,"utm_campaign"?: string | null,"utm_medium"?: string | null,"utm_source"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "analytics_events_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_kind": string,"after": Json | null,"agent_run_id": string | null,"at": string,"before": Json | null,"id": number,"row_id": string | null,"source_url": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_kind"?: string,"after"?: Json | null,"agent_run_id"?: string | null,"at"?: string,"before"?: Json | null,"id"?: never,"row_id"?: string | null,"source_url"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_kind"?: string,"after"?: Json | null,"agent_run_id"?: string | null,"at"?: string,"before"?: Json | null,"id"?: never,"row_id"?: string | null,"source_url"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"criteria": NonNullable<Json>,"description": string | null,"id": string,"kind": Database["public"]['Enums']["category_kind"],"name": string,"parent_id": string | null,"short_name": string | null,"site_id": string,"slug": string,"sort": number,"status": string,"updated_at": string,"value_score": number,"vertical_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"criteria"?: NonNullable<Json>,"description"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["category_kind"],"name": string,"parent_id"?: string | null,"short_name"?: string | null,"site_id": string,"slug": string,"sort"?: number,"status"?: string,"updated_at"?: string,"value_score"?: number,"vertical_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"criteria"?: NonNullable<Json>,"description"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["category_kind"],"name"?: string,"parent_id"?: string | null,"short_name"?: string | null,"site_id"?: string,"slug"?: string,"sort"?: number,"status"?: string,"updated_at"?: string,"value_score"?: number,"vertical_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "categories_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "categories_vertical_id_fkey"
      columns: ["vertical_id"]
isOneToOne: false
      referencedRelation: "verticals"
      referencedColumns: ["id"]
    }
                  ]
                },"commercial_contracts": {
                  Row: {
                    "amount_eur": number | null,"client_name": string,"created_at": string,"created_by": string | null,"ends_on": string,"id": string,"notes": string | null,"reference": string,"site_id": string,"starts_on": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_eur"?: number | null,"client_name": string,"created_at"?: string,"created_by"?: string | null,"ends_on": string,"id"?: string,"notes"?: string | null,"reference": string,"site_id": string,"starts_on": string,"status"?: string
                  }
                  Update: {
                    "amount_eur"?: number | null,"client_name"?: string,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string,"id"?: string,"notes"?: string | null,"reference"?: string,"site_id"?: string,"starts_on"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "commercial_contracts_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"consent_log": {
                  Row: {
                    "choices": NonNullable<Json>,"created_at": string,"id": number,"site_id": string,"version": string,"visitor_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "choices": NonNullable<Json>,"created_at"?: string,"id"?: number,"site_id": string,"version": string,"visitor_id"?: string | null
                  }
                  Update: {
                    "choices"?: NonNullable<Json>,"created_at"?: string,"id"?: number,"site_id"?: string,"version"?: string,"visitor_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "consent_log_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consent_log_visitor_id_fkey"
      columns: ["visitor_id"]
isOneToOne: false
      referencedRelation: "visitors"
      referencedColumns: ["id"]
    }
                  ]
                },"content_items": {
                  Row: {
                    "blocked_reason": string | null,"category_id": string | null,"cluster": string | null,"created_at": string,"created_by": string | null,"facet_id": string | null,"first_published_at": string | null,"id": string,"is_fictional": boolean,"path": string | null,"pillar_id": string | null,"primary_keyword_id": string | null,"published_at": string | null,"published_version_id": string | null,"regulated_topic": string | null,"review_due_at": string | null,"robots": string,"site_id": string,"slug": string,"software_b_id": string | null,"software_id": string | null,"status": Database["public"]['Enums']["item_status"],"title": string,"type": Database["public"]['Enums']["content_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_reason"?: string | null,"category_id"?: string | null,"cluster"?: string | null,"created_at"?: string,"created_by"?: string | null,"facet_id"?: string | null,"first_published_at"?: string | null,"id"?: string,"is_fictional"?: boolean,"path"?: never,"pillar_id"?: string | null,"primary_keyword_id"?: string | null,"published_at"?: string | null,"published_version_id"?: string | null,"regulated_topic"?: string | null,"review_due_at"?: string | null,"robots"?: string,"site_id": string,"slug": string,"software_b_id"?: string | null,"software_id"?: string | null,"status"?: Database["public"]['Enums']["item_status"],"title": string,"type": Database["public"]['Enums']["content_type"],"updated_at"?: string
                  }
                  Update: {
                    "blocked_reason"?: string | null,"category_id"?: string | null,"cluster"?: string | null,"created_at"?: string,"created_by"?: string | null,"facet_id"?: string | null,"first_published_at"?: string | null,"id"?: string,"is_fictional"?: boolean,"path"?: never,"pillar_id"?: string | null,"primary_keyword_id"?: string | null,"published_at"?: string | null,"published_version_id"?: string | null,"regulated_topic"?: string | null,"review_due_at"?: string | null,"robots"?: string,"site_id"?: string,"slug"?: string,"software_b_id"?: string | null,"software_id"?: string | null,"status"?: Database["public"]['Enums']["item_status"],"title"?: string,"type"?: Database["public"]['Enums']["content_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_items_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_facet_id_fkey"
      columns: ["facet_id"]
isOneToOne: false
      referencedRelation: "facets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_primary_keyword_id_fkey"
      columns: ["primary_keyword_id"]
isOneToOne: true
      referencedRelation: "keyword_targets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_published_version_fk"
      columns: ["published_version_id"]
isOneToOne: false
      referencedRelation: "content_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_published_version_fk"
      columns: ["published_version_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["version_id"]
    },{
      foreignKeyName: "content_items_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_software_b_id_fkey"
      columns: ["software_b_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"content_sources": {
                  Row: {
                    "accessed_at": string,"content_version_id": string,"excerpt": string | null,"id": string,"title": string | null,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accessed_at": string,"content_version_id": string,"excerpt"?: string | null,"id"?: string,"title"?: string | null,"url": string
                  }
                  Update: {
                    "accessed_at"?: string,"content_version_id"?: string,"excerpt"?: string | null,"id"?: string,"title"?: string | null,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_sources_content_version_id_fkey"
      columns: ["content_version_id"]
isOneToOne: false
      referencedRelation: "content_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_sources_content_version_id_fkey"
      columns: ["content_version_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["version_id"]
    }
                  ]
                },"content_versions": {
                  Row: {
                    "author_id": string | null,"author_kind": string,"body": string,"content_item_id": string,"created_at": string,"data": NonNullable<Json>,"decided_at": string | null,"decided_by": string | null,"decision_comment": string | null,"faq": NonNullable<Json>,"h1": string,"id": string,"meta_description": string,"meta_title": string,"seo_report": Json | null,"status": Database["public"]['Enums']["version_status"],"submitted_at": string | null,"summary": string,"updated_at": string,"version_no": number
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"author_kind"?: string,"body"?: string,"content_item_id": string,"created_at"?: string,"data"?: NonNullable<Json>,"decided_at"?: string | null,"decided_by"?: string | null,"decision_comment"?: string | null,"faq"?: NonNullable<Json>,"h1"?: string,"id"?: string,"meta_description"?: string,"meta_title"?: string,"seo_report"?: Json | null,"status"?: Database["public"]['Enums']["version_status"],"submitted_at"?: string | null,"summary"?: string,"updated_at"?: string,"version_no": number
                  }
                  Update: {
                    "author_id"?: string | null,"author_kind"?: string,"body"?: string,"content_item_id"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"decided_at"?: string | null,"decided_by"?: string | null,"decision_comment"?: string | null,"faq"?: NonNullable<Json>,"h1"?: string,"id"?: string,"meta_description"?: string,"meta_title"?: string,"seo_report"?: Json | null,"status"?: Database["public"]['Enums']["version_status"],"submitted_at"?: string | null,"summary"?: string,"updated_at"?: string,"version_no"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_versions_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_versions_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_versions_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_versions_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    }
                  ]
                },"error_reports": {
                  Row: {
                    "consent_at": string,"created_at": string,"due_at": string,"handled_by": string | null,"id": string,"kind": string,"message": string,"page_path": string,"reporter_email": string,"reporter_name": string | null,"response": string | null,"site_id": string,"source_url": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_at": string,"created_at"?: string,"due_at"?: string,"handled_by"?: string | null,"id"?: string,"kind"?: string,"message": string,"page_path": string,"reporter_email": string,"reporter_name"?: string | null,"response"?: string | null,"site_id": string,"source_url"?: string | null,"status"?: string
                  }
                  Update: {
                    "consent_at"?: string,"created_at"?: string,"due_at"?: string,"handled_by"?: string | null,"id"?: string,"kind"?: string,"message"?: string,"page_path"?: string,"reporter_email"?: string,"reporter_name"?: string | null,"response"?: string | null,"site_id"?: string,"source_url"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "error_reports_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"facets": {
                  Row: {
                    "category_id": string,"facet_type": Database["public"]['Enums']["facet_type"],"id": string,"is_landing": boolean,"name": string,"rule": NonNullable<Json>,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"facet_type": Database["public"]['Enums']["facet_type"],"id"?: string,"is_landing"?: boolean,"name": string,"rule"?: NonNullable<Json>,"slug": string
                  }
                  Update: {
                    "category_id"?: string,"facet_type"?: Database["public"]['Enums']["facet_type"],"id"?: string,"is_landing"?: boolean,"name"?: string,"rule"?: NonNullable<Json>,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "facets_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"gsc_metrics": {
                  Row: {
                    "clicks": number,"ctr": number,"date": string,"impressions": number,"page": string,"position": number,"query": string,"site_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clicks"?: number,"ctr"?: number,"date": string,"impressions"?: number,"page": string,"position"?: number,"query": string,"site_id": string
                  }
                  Update: {
                    "clicks"?: number,"ctr"?: number,"date"?: string,"impressions"?: number,"page"?: string,"position"?: number,"query"?: string,"site_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gsc_metrics_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"integrations": {
                  Row: {
                    "kind": string,"name": string,"software_id": string,"source_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "kind"?: string,"name": string,"software_id": string,"source_url"?: string | null
                  }
                  Update: {
                    "kind"?: string,"name"?: string,"software_id"?: string,"source_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "integrations_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"job_offers": {
                  Row: {
                    "apply_email": string | null,"apply_url": string | null,"city": string | null,"company_name": string | null,"company_siren": string | null,"contract": string,"created_at": string,"department": string | null,"description": string,"experience": string | null,"expires_at": string | null,"external_id": string | null,"family": string,"featured": boolean,"id": string,"latitude": number | null,"longitude": number | null,"postal_code": string | null,"posted_by_member": string | null,"provider_id": string | null,"published_at": string | null,"reject_reason": string | null,"remote": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"salary_max": number | null,"salary_min": number | null,"salary_text": string | null,"site_id": string,"slug": string,"source": string,"source_created_at": string | null,"source_url": string | null,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "apply_email"?: string | null,"apply_url"?: string | null,"city"?: string | null,"company_name"?: string | null,"company_siren"?: string | null,"contract": string,"created_at"?: string,"department"?: string | null,"description": string,"experience"?: string | null,"expires_at"?: string | null,"external_id"?: string | null,"family": string,"featured"?: boolean,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"postal_code"?: string | null,"posted_by_member"?: string | null,"provider_id"?: string | null,"published_at"?: string | null,"reject_reason"?: string | null,"remote"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_text"?: string | null,"site_id": string,"slug": string,"source": string,"source_created_at"?: string | null,"source_url"?: string | null,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "apply_email"?: string | null,"apply_url"?: string | null,"city"?: string | null,"company_name"?: string | null,"company_siren"?: string | null,"contract"?: string,"created_at"?: string,"department"?: string | null,"description"?: string,"experience"?: string | null,"expires_at"?: string | null,"external_id"?: string | null,"family"?: string,"featured"?: boolean,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"postal_code"?: string | null,"posted_by_member"?: string | null,"provider_id"?: string | null,"published_at"?: string | null,"reject_reason"?: string | null,"remote"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_text"?: string | null,"site_id"?: string,"slug"?: string,"source"?: string,"source_created_at"?: string | null,"source_url"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_offers_posted_by_member_fkey"
      columns: ["posted_by_member"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_offers_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_offers_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_by_category"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_offers_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_offers_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"job_orders": {
                  Row: {
                    "amount_cents": number,"created_at": string,"id": string,"job_id": string,"member_id": string | null,"paid_at": string | null,"product_code": string,"status": string,"stripe_invoice_id": string | null,"stripe_payment_intent": string | null,"stripe_session_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"id"?: string,"job_id": string,"member_id"?: string | null,"paid_at"?: string | null,"product_code": string,"status"?: string,"stripe_invoice_id"?: string | null,"stripe_payment_intent"?: string | null,"stripe_session_id"?: string | null
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"id"?: string,"job_id"?: string,"member_id"?: string | null,"paid_at"?: string | null,"product_code"?: string,"status"?: string,"stripe_invoice_id"?: string | null,"stripe_payment_intent"?: string | null,"stripe_session_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_orders_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "job_offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_orders_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_orders_product_code_fkey"
      columns: ["product_code"]
isOneToOne: false
      referencedRelation: "job_products"
      referencedColumns: ["code"]
    }
                  ]
                },"job_products": {
                  Row: {
                    "active": boolean,"amount_cents": number,"code": string,"description": string | null,"duration_days": number,"featured": boolean,"label": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"amount_cents": number,"code": string,"description"?: string | null,"duration_days"?: number,"featured"?: boolean,"label": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"amount_cents"?: number,"code"?: string,"description"?: string | null,"duration_days"?: number,"featured"?: boolean,"label"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"keyword_questions": {
                  Row: {
                    "cluster": string,"created_at": string,"id": string,"question": string,"site_id": string,"source": string,"used_in": string | null,"volume": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cluster": string,"created_at"?: string,"id"?: string,"question": string,"site_id": string,"source"?: string,"used_in"?: string | null,"volume"?: number
                  }
                  Update: {
                    "cluster"?: string,"created_at"?: string,"id"?: string,"question"?: string,"site_id"?: string,"source"?: string,"used_in"?: string | null,"volume"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "keyword_questions_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "keyword_questions_used_in_fkey"
      columns: ["used_in"]
isOneToOne: false
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "keyword_questions_used_in_fkey"
      columns: ["used_in"]
isOneToOne: false
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "keyword_questions_used_in_fkey"
      columns: ["used_in"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "keyword_questions_used_in_fkey"
      columns: ["used_in"]
isOneToOne: false
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    }
                  ]
                },"keyword_targets": {
                  Row: {
                    "cluster": string | null,"cpc_eur": number,"current_position": number | null,"id": string,"intent": string,"kd": number,"keyword": string,"priority": number | null,"refreshed_at": string,"site_id": string,"source": string,"status": string,"target_content_id": string | null,"volume": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cluster"?: string | null,"cpc_eur"?: number,"current_position"?: number | null,"id"?: string,"intent"?: string,"kd"?: number,"keyword": string,"priority"?: never,"refreshed_at"?: string,"site_id": string,"source"?: string,"status"?: string,"target_content_id"?: string | null,"volume"?: number
                  }
                  Update: {
                    "cluster"?: string | null,"cpc_eur"?: number,"current_position"?: number | null,"id"?: string,"intent"?: string,"kd"?: number,"keyword"?: string,"priority"?: never,"refreshed_at"?: string,"site_id"?: string,"source"?: string,"status"?: string,"target_content_id"?: string | null,"volume"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "keyword_targets_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "keyword_targets_target_content_id_fkey"
      columns: ["target_content_id"]
isOneToOne: false
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "keyword_targets_target_content_id_fkey"
      columns: ["target_content_id"]
isOneToOne: false
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "keyword_targets_target_content_id_fkey"
      columns: ["target_content_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "keyword_targets_target_content_id_fkey"
      columns: ["target_content_id"]
isOneToOne: false
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_requests": {
                  Row: {
                    "category_id": string | null,"checks": NonNullable<Json>,"city": string | null,"company_name": string,"consent_at": string,"consent_text": string,"contact_email": string,"contact_name": string,"contact_role": string | null,"created_at": string,"created_provider_id": string | null,"created_software_id": string | null,"decided_at": string | null,"decided_by": string | null,"decision_comment": string | null,"id": string,"kind": string,"message": string | null,"product_name": string | null,"profession": string | null,"siren": string | null,"site_id": string,"status": string,"utm": NonNullable<Json>,"website": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"checks"?: NonNullable<Json>,"city"?: string | null,"company_name": string,"consent_at": string,"consent_text": string,"contact_email": string,"contact_name": string,"contact_role"?: string | null,"created_at"?: string,"created_provider_id"?: string | null,"created_software_id"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"decision_comment"?: string | null,"id"?: string,"kind": string,"message"?: string | null,"product_name"?: string | null,"profession"?: string | null,"siren"?: string | null,"site_id": string,"status"?: string,"utm"?: NonNullable<Json>,"website": string
                  }
                  Update: {
                    "category_id"?: string | null,"checks"?: NonNullable<Json>,"city"?: string | null,"company_name"?: string,"consent_at"?: string,"consent_text"?: string,"contact_email"?: string,"contact_name"?: string,"contact_role"?: string | null,"created_at"?: string,"created_provider_id"?: string | null,"created_software_id"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"decision_comment"?: string | null,"id"?: string,"kind"?: string,"message"?: string | null,"product_name"?: string | null,"profession"?: string | null,"siren"?: string | null,"site_id"?: string,"status"?: string,"utm"?: NonNullable<Json>,"website"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_requests_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_requests_created_provider_id_fkey"
      columns: ["created_provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_requests_created_provider_id_fkey"
      columns: ["created_provider_id"]
isOneToOne: false
      referencedRelation: "providers_by_category"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_requests_created_provider_id_fkey"
      columns: ["created_provider_id"]
isOneToOne: false
      referencedRelation: "providers_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_requests_created_software_id_fkey"
      columns: ["created_software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_requests_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"member_projects": {
                  Row: {
                    "category_id": string,"created_at": string,"horizon": string,"member_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"created_at"?: string,"horizon": string,"member_id": string
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"horizon"?: string,"member_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_projects_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_projects_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"member_software": {
                  Row: {
                    "created_at": string,"id": string,"member_id": string,"relation": string,"satisfaction": number | null,"software_id": string | null,"software_name": string,"source": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"member_id": string,"relation": string,"satisfaction"?: number | null,"software_id"?: string | null,"software_name": string,"source"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"member_id"?: string,"relation"?: string,"satisfaction"?: number | null,"software_id"?: string | null,"software_name"?: string,"source"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_software_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_software_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"member_tokens": {
                  Row: {
                    "created_at": string,"expires_at": string,"kind": string,"member_id": string,"token_hash": string,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"kind": string,"member_id": string,"token_hash": string,"used_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"kind"?: string,"member_id"?: string,"token_hash"?: string,"used_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_tokens_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "company_name": string | null,"company_size": string | null,"confirmed_at": string | null,"consent_at": string,"consent_newsletter": boolean,"consent_text": string,"created_at": string,"email": string,"erp": string | null,"finance_team_size": string | null,"first_name": string | null,"id": string,"job_title": string | null,"last_seen_at": string | null,"newsletter_consent_at": string | null,"notes": string | null,"region": string | null,"sector": string | null,"site_id": string,"source_path": string | null,"status": string,"updated_at": string,"utm": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "company_name"?: string | null,"company_size"?: string | null,"confirmed_at"?: string | null,"consent_at": string,"consent_newsletter"?: boolean,"consent_text": string,"created_at"?: string,"email": string,"erp"?: string | null,"finance_team_size"?: string | null,"first_name"?: string | null,"id"?: string,"job_title"?: string | null,"last_seen_at"?: string | null,"newsletter_consent_at"?: string | null,"notes"?: string | null,"region"?: string | null,"sector"?: string | null,"site_id": string,"source_path"?: string | null,"status"?: string,"updated_at"?: string,"utm"?: NonNullable<Json>
                  }
                  Update: {
                    "company_name"?: string | null,"company_size"?: string | null,"confirmed_at"?: string | null,"consent_at"?: string,"consent_newsletter"?: boolean,"consent_text"?: string,"created_at"?: string,"email"?: string,"erp"?: string | null,"finance_team_size"?: string | null,"first_name"?: string | null,"id"?: string,"job_title"?: string | null,"last_seen_at"?: string | null,"newsletter_consent_at"?: string | null,"notes"?: string | null,"region"?: string | null,"sector"?: string | null,"site_id"?: string,"source_path"?: string | null,"status"?: string,"updated_at"?: string,"utm"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"placement_inventory": {
                  Row: {
                    "active": boolean,"base_price_month": number | null,"category_id": string | null,"content_item_id": string | null,"id": string,"label": string,"placement_type": Database["public"]['Enums']["placement_type"],"site_id": string,"slot": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"base_price_month"?: number | null,"category_id"?: string | null,"content_item_id"?: string | null,"id"?: string,"label"?: string,"placement_type": Database["public"]['Enums']["placement_type"],"site_id": string,"slot"?: number
                  }
                  Update: {
                    "active"?: boolean,"base_price_month"?: number | null,"category_id"?: string | null,"content_item_id"?: string | null,"id"?: string,"label"?: string,"placement_type"?: Database["public"]['Enums']["placement_type"],"site_id"?: string,"slot"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "placement_inventory_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"placement_requests": {
                  Row: {
                    "advertiser_name": string,"budget_range": string | null,"category_ids": (string)[],"consent_at": string,"consent_text": string,"contact_email": string,"contact_name": string,"contact_phone": string | null,"contract_id": string | null,"created_at": string,"id": string,"message": string | null,"notes": string | null,"owner_id": string | null,"period_end": string | null,"period_start": string | null,"placement_types": (Database["public"]['Enums']["placement_type"])[],"quoted_amount": number | null,"site_id": string,"status": string,"updated_at": string,"utm": NonNullable<Json>,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "advertiser_name": string,"budget_range"?: string | null,"category_ids"?: (string)[],"consent_at": string,"consent_text": string,"contact_email": string,"contact_name": string,"contact_phone"?: string | null,"contract_id"?: string | null,"created_at"?: string,"id"?: string,"message"?: string | null,"notes"?: string | null,"owner_id"?: string | null,"period_end"?: string | null,"period_start"?: string | null,"placement_types"?: (Database["public"]['Enums']["placement_type"])[],"quoted_amount"?: number | null,"site_id": string,"status"?: string,"updated_at"?: string,"utm"?: NonNullable<Json>,"website"?: string | null
                  }
                  Update: {
                    "advertiser_name"?: string,"budget_range"?: string | null,"category_ids"?: (string)[],"consent_at"?: string,"consent_text"?: string,"contact_email"?: string,"contact_name"?: string,"contact_phone"?: string | null,"contract_id"?: string | null,"created_at"?: string,"id"?: string,"message"?: string | null,"notes"?: string | null,"owner_id"?: string | null,"period_end"?: string | null,"period_start"?: string | null,"placement_types"?: (Database["public"]['Enums']["placement_type"])[],"quoted_amount"?: number | null,"site_id"?: string,"status"?: string,"updated_at"?: string,"utm"?: NonNullable<Json>,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "placement_requests_contract_id_fkey"
      columns: ["contract_id"]
isOneToOne: false
      referencedRelation: "commercial_contracts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_requests_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"pricing_plans": {
                  Row: {
                    "billing_period": string,"conditions": string | null,"created_at": string,"created_by": string | null,"id": string,"per_unit": string | null,"plan_name": string,"price_eur": number | null,"software_id": string,"sort": number,"source_date": string,"source_url": string,"status": Database["public"]['Enums']["fact_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_period"?: string,"conditions"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"per_unit"?: string | null,"plan_name": string,"price_eur"?: number | null,"software_id": string,"sort"?: number,"source_date": string,"source_url": string,"status"?: Database["public"]['Enums']["fact_status"]
                  }
                  Update: {
                    "billing_period"?: string,"conditions"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"per_unit"?: string | null,"plan_name"?: string,"price_eur"?: number | null,"software_id"?: string,"sort"?: number,"source_date"?: string,"source_url"?: string,"status"?: Database["public"]['Enums']["fact_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "pricing_plans_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_claims": {
                  Row: {
                    "claimant_email": string,"claimant_name": string,"claimant_role": string | null,"consent_at": string,"created_at": string,"decided_at": string | null,"decided_by": string | null,"email_domain_match": boolean | null,"id": string,"proposed_changes": NonNullable<Json>,"status": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claimant_email": string,"claimant_name": string,"claimant_role"?: string | null,"consent_at": string,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"email_domain_match"?: boolean | null,"id"?: string,"proposed_changes"?: NonNullable<Json>,"status"?: string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "claimant_email"?: string,"claimant_name"?: string,"claimant_role"?: string | null,"consent_at"?: string,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"email_domain_match"?: boolean | null,"id"?: string,"proposed_changes"?: NonNullable<Json>,"status"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"provider_categories": {
                  Row: {
                    "category_id": string,"provider_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"provider_id": string
                  }
                  Update: {
                    "category_id"?: string,"provider_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_categories_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_categories_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_by_category"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_categories_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_public"
      referencedColumns: ["id"]
    }
                  ]
                },"providers": {
                  Row: {
                    "city": string | null,"city_slug": string | null,"coverage": string | null,"created_at": string,"deal_size_range": string | null,"department": string | null,"description": string | null,"id": string,"internal_contact": NonNullable<Json>,"is_fictional": boolean,"latitude": number | null,"longitude": number | null,"name": string,"offices": (string)[],"postal_code": string | null,"profession": string,"public_references": NonNullable<Json>,"region": string | null,"regulated_profession": boolean,"siren": string | null,"slug": string,"specialties": (string)[],"status": string,"updated_at": string,"verification_status": string,"verified_at": string | null,"verified_by": string | null,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"city_slug"?: string | null,"coverage"?: string | null,"created_at"?: string,"deal_size_range"?: string | null,"department"?: string | null,"description"?: string | null,"id"?: string,"internal_contact"?: NonNullable<Json>,"is_fictional"?: boolean,"latitude"?: number | null,"longitude"?: number | null,"name": string,"offices"?: (string)[],"postal_code"?: string | null,"profession": string,"public_references"?: NonNullable<Json>,"region"?: string | null,"regulated_profession"?: boolean,"siren"?: string | null,"slug": string,"specialties"?: (string)[],"status"?: string,"updated_at"?: string,"verification_status"?: string,"verified_at"?: string | null,"verified_by"?: string | null,"website"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"city_slug"?: string | null,"coverage"?: string | null,"created_at"?: string,"deal_size_range"?: string | null,"department"?: string | null,"description"?: string | null,"id"?: string,"internal_contact"?: NonNullable<Json>,"is_fictional"?: boolean,"latitude"?: number | null,"longitude"?: number | null,"name"?: string,"offices"?: (string)[],"postal_code"?: string | null,"profession"?: string,"public_references"?: NonNullable<Json>,"region"?: string | null,"regulated_profession"?: boolean,"siren"?: string | null,"slug"?: string,"specialties"?: (string)[],"status"?: string,"updated_at"?: string,"verification_status"?: string,"verified_at"?: string | null,"verified_by"?: string | null,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"redirects": {
                  Row: {
                    "created_at": string,"from_path": string,"id": string,"reason": string | null,"site_id": string,"status_code": number,"to_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_path": string,"id"?: string,"reason"?: string | null,"site_id": string,"status_code"?: number,"to_path": string
                  }
                  Update: {
                    "created_at"?: string,"from_path"?: string,"id"?: string,"reason"?: string | null,"site_id"?: string,"status_code"?: number,"to_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "redirects_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"resource_leads": {
                  Row: {
                    "company_size": string | null,"consent_at": string,"consent_newsletter": boolean,"consent_text": string,"created_at": string,"email": string,"id": string,"job_title": string | null,"origin_path": string | null,"resource_content_id": string | null,"site_id": string,"utm": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "company_size"?: string | null,"consent_at": string,"consent_newsletter"?: boolean,"consent_text": string,"created_at"?: string,"email": string,"id"?: string,"job_title"?: string | null,"origin_path"?: string | null,"resource_content_id"?: string | null,"site_id": string,"utm"?: NonNullable<Json>
                  }
                  Update: {
                    "company_size"?: string | null,"consent_at"?: string,"consent_newsletter"?: boolean,"consent_text"?: string,"created_at"?: string,"email"?: string,"id"?: string,"job_title"?: string | null,"origin_path"?: string | null,"resource_content_id"?: string | null,"site_id"?: string,"utm"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "resource_leads_resource_content_id_fkey"
      columns: ["resource_content_id"]
isOneToOne: false
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resource_leads_resource_content_id_fkey"
      columns: ["resource_content_id"]
isOneToOne: false
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resource_leads_resource_content_id_fkey"
      columns: ["resource_content_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resource_leads_resource_content_id_fkey"
      columns: ["resource_content_id"]
isOneToOne: false
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resource_leads_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"review_quotes": {
                  Row: {
                    "author_kind": string,"author_label": string,"created_at": string,"created_by": string | null,"id": string,"quote": string,"rating": number | null,"review_date": string,"review_source_id": string,"review_url": string,"sentiment": string,"status": Database["public"]['Enums']["fact_status"],"translated": boolean,"validated_at": string | null,"validated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_kind"?: string,"author_label": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"quote": string,"rating"?: number | null,"review_date": string,"review_source_id": string,"review_url": string,"sentiment": string,"status"?: Database["public"]['Enums']["fact_status"],"translated"?: boolean,"validated_at"?: string | null,"validated_by"?: string | null
                  }
                  Update: {
                    "author_kind"?: string,"author_label"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"quote"?: string,"rating"?: number | null,"review_date"?: string,"review_source_id"?: string,"review_url"?: string,"sentiment"?: string,"status"?: Database["public"]['Enums']["fact_status"],"translated"?: boolean,"validated_at"?: string | null,"validated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_quotes_review_source_id_fkey"
      columns: ["review_source_id"]
isOneToOne: false
      referencedRelation: "review_sources"
      referencedColumns: ["id"]
    }
                  ]
                },"review_sources": {
                  Row: {
                    "author_kind": string,"captured_at": string,"created_at": string,"created_by": string | null,"id": string,"platform": string,"platform_name": string | null,"provider_id": string | null,"rating": number | null,"rating_scale": number,"review_count": number | null,"software_id": string | null,"status": Database["public"]['Enums']["fact_status"],"url": string,"validated_at": string | null,"validated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_kind"?: string,"captured_at": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"platform": string,"platform_name"?: string | null,"provider_id"?: string | null,"rating"?: number | null,"rating_scale"?: number,"review_count"?: number | null,"software_id"?: string | null,"status"?: Database["public"]['Enums']["fact_status"],"url": string,"validated_at"?: string | null,"validated_by"?: string | null
                  }
                  Update: {
                    "author_kind"?: string,"captured_at"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"platform"?: string,"platform_name"?: string | null,"provider_id"?: string | null,"rating"?: number | null,"rating_scale"?: number,"review_count"?: number | null,"software_id"?: string | null,"status"?: Database["public"]['Enums']["fact_status"],"url"?: string,"validated_at"?: string | null,"validated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_sources_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_sources_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_by_category"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_sources_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_sources_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"review_summaries": {
                  Row: {
                    "author_kind": string,"based_on": number,"created_at": string,"created_by": string | null,"id": string,"likes": (string)[],"period_end": string | null,"period_start": string | null,"provider_id": string | null,"software_id": string | null,"status": Database["public"]['Enums']["fact_status"],"summary": string,"validated_at": string | null,"validated_by": string | null,"watchouts": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_kind"?: string,"based_on": number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"likes"?: (string)[],"period_end"?: string | null,"period_start"?: string | null,"provider_id"?: string | null,"software_id"?: string | null,"status"?: Database["public"]['Enums']["fact_status"],"summary": string,"validated_at"?: string | null,"validated_by"?: string | null,"watchouts"?: (string)[]
                  }
                  Update: {
                    "author_kind"?: string,"based_on"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"likes"?: (string)[],"period_end"?: string | null,"period_start"?: string | null,"provider_id"?: string | null,"software_id"?: string | null,"status"?: Database["public"]['Enums']["fact_status"],"summary"?: string,"validated_at"?: string | null,"validated_by"?: string | null,"watchouts"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_summaries_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_summaries_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_by_category"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_summaries_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_summaries_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"review_tasks": {
                  Row: {
                    "assigned_to": string | null,"blocking": boolean,"closed_at": string | null,"comment": string | null,"content_item_id": string | null,"content_version_id": string | null,"created_at": string,"created_by": string | null,"decision": string | null,"details": NonNullable<Json>,"id": string,"kind": string,"reason": string,"site_id": string | null,"software_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"blocking"?: boolean,"closed_at"?: string | null,"comment"?: string | null,"content_item_id"?: string | null,"content_version_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"decision"?: string | null,"details"?: NonNullable<Json>,"id"?: string,"kind": string,"reason": string,"site_id"?: string | null,"software_id"?: string | null,"status"?: string
                  }
                  Update: {
                    "assigned_to"?: string | null,"blocking"?: boolean,"closed_at"?: string | null,"comment"?: string | null,"content_item_id"?: string | null,"content_version_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"decision"?: string | null,"details"?: NonNullable<Json>,"id"?: string,"kind"?: string,"reason"?: string,"site_id"?: string | null,"software_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_tasks_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_tasks_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_tasks_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_tasks_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_tasks_content_version_id_fkey"
      columns: ["content_version_id"]
isOneToOne: false
      referencedRelation: "content_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_tasks_content_version_id_fkey"
      columns: ["content_version_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["version_id"]
    },{
      foreignKeyName: "review_tasks_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_tasks_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"scores": {
                  Row: {
                    "criterion_key": string,"id": string,"justification": string,"score": number,"status": string,"test_run_id": string,"validated_at": string | null,"validated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "criterion_key": string,"id"?: string,"justification": string,"score": number,"status"?: string,"test_run_id": string,"validated_at"?: string | null,"validated_by"?: string | null
                  }
                  Update: {
                    "criterion_key"?: string,"id"?: string,"justification"?: string,"score"?: number,"status"?: string,"test_run_id"?: string,"validated_at"?: string | null,"validated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "scores_test_run_id_fkey"
      columns: ["test_run_id"]
isOneToOne: false
      referencedRelation: "editorial_rankings"
      referencedColumns: ["test_run_id"]
    },{
      foreignKeyName: "scores_test_run_id_fkey"
      columns: ["test_run_id"]
isOneToOne: false
      referencedRelation: "software_category_scores"
      referencedColumns: ["test_run_id"]
    },{
      foreignKeyName: "scores_test_run_id_fkey"
      columns: ["test_run_id"]
isOneToOne: false
      referencedRelation: "test_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"seo_briefs": {
                  Row: {
                    "competitors": NonNullable<Json>,"content_item_id": string,"created_at": string,"created_by": string | null,"cta": string | null,"entities": (string)[],"id": string,"outline": NonNullable<Json>,"primary_keyword": string,"questions": (string)[],"required_links": (string)[],"secondary_keywords": (string)[],"target_words": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "competitors"?: NonNullable<Json>,"content_item_id": string,"created_at"?: string,"created_by"?: string | null,"cta"?: string | null,"entities"?: (string)[],"id"?: string,"outline"?: NonNullable<Json>,"primary_keyword": string,"questions"?: (string)[],"required_links"?: (string)[],"secondary_keywords"?: (string)[],"target_words"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "competitors"?: NonNullable<Json>,"content_item_id"?: string,"created_at"?: string,"created_by"?: string | null,"cta"?: string | null,"entities"?: (string)[],"id"?: string,"outline"?: NonNullable<Json>,"primary_keyword"?: string,"questions"?: (string)[],"required_links"?: (string)[],"secondary_keywords"?: (string)[],"target_words"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seo_briefs_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: true
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "seo_briefs_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: true
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "seo_briefs_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: true
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "seo_briefs_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: true
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    }
                  ]
                },"sites": {
                  Row: {
                    "audience": string | null,"base_path": string,"created_at": string,"description": string | null,"domain": string,"gsc_property": string | null,"id": string,"key": string,"name": string,"status": string,"tagline": string | null,"theme": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: string | null,"base_path"?: string,"created_at"?: string,"description"?: string | null,"domain": string,"gsc_property"?: string | null,"id"?: string,"key": string,"name": string,"status"?: string,"tagline"?: string | null,"theme"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "audience"?: string | null,"base_path"?: string,"created_at"?: string,"description"?: string | null,"domain"?: string,"gsc_property"?: string | null,"id"?: string,"key"?: string,"name"?: string,"status"?: string,"tagline"?: string | null,"theme"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"software": {
                  Row: {
                    "claimed_at": string | null,"claimed_by_email": string | null,"created_at": string,"created_by": string | null,"founded_year": number | null,"g2_product_id": string | null,"hq_country": string | null,"id": string,"is_fictional": boolean,"logo_path": string | null,"name": string,"slug": string,"status": string,"tagline": string | null,"updated_at": string,"vendor": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "claimed_at"?: string | null,"claimed_by_email"?: string | null,"created_at"?: string,"created_by"?: string | null,"founded_year"?: number | null,"g2_product_id"?: string | null,"hq_country"?: string | null,"id"?: string,"is_fictional"?: boolean,"logo_path"?: string | null,"name": string,"slug": string,"status"?: string,"tagline"?: string | null,"updated_at"?: string,"vendor": string,"website"?: string | null
                  }
                  Update: {
                    "claimed_at"?: string | null,"claimed_by_email"?: string | null,"created_at"?: string,"created_by"?: string | null,"founded_year"?: number | null,"g2_product_id"?: string | null,"hq_country"?: string | null,"id"?: string,"is_fictional"?: boolean,"logo_path"?: string | null,"name"?: string,"slug"?: string,"status"?: string,"tagline"?: string | null,"updated_at"?: string,"vendor"?: string,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"software_categories": {
                  Row: {
                    "category_id": string,"is_primary": boolean,"software_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"is_primary"?: boolean,"software_id": string
                  }
                  Update: {
                    "category_id"?: string,"is_primary"?: boolean,"software_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "software_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "software_categories_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"software_facts": {
                  Row: {
                    "author_kind": string,"collected_at": string,"created_at": string,"created_by": string | null,"fact_type": string,"id": string,"note": string | null,"software_id": string,"source_url": string,"status": Database["public"]['Enums']["fact_status"],"validated_at": string | null,"validated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "author_kind"?: string,"collected_at"?: string,"created_at"?: string,"created_by"?: string | null,"fact_type": string,"id"?: string,"note"?: string | null,"software_id": string,"source_url": string,"status"?: Database["public"]['Enums']["fact_status"],"validated_at"?: string | null,"validated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "author_kind"?: string,"collected_at"?: string,"created_at"?: string,"created_by"?: string | null,"fact_type"?: string,"id"?: string,"note"?: string | null,"software_id"?: string,"source_url"?: string,"status"?: Database["public"]['Enums']["fact_status"],"validated_at"?: string | null,"validated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "software_facts_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"sponsored_placements": {
                  Row: {
                    "contract_id": string | null,"created_at": string,"cta_label": string | null,"cta_url": string | null,"ends_on": string,"headline": string | null,"id": string,"inventory_id": string,"provider_id": string | null,"software_id": string | null,"starts_on": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contract_id"?: string | null,"created_at"?: string,"cta_label"?: string | null,"cta_url"?: string | null,"ends_on": string,"headline"?: string | null,"id"?: string,"inventory_id": string,"provider_id"?: string | null,"software_id"?: string | null,"starts_on": string,"status"?: string
                  }
                  Update: {
                    "contract_id"?: string | null,"created_at"?: string,"cta_label"?: string | null,"cta_url"?: string | null,"ends_on"?: string,"headline"?: string | null,"id"?: string,"inventory_id"?: string,"provider_id"?: string | null,"software_id"?: string | null,"starts_on"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sponsored_placements_contract_id_fkey"
      columns: ["contract_id"]
isOneToOne: false
      referencedRelation: "commercial_contracts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sponsored_placements_inventory_id_fkey"
      columns: ["inventory_id"]
isOneToOne: false
      referencedRelation: "placement_inventory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sponsored_placements_inventory_id_fkey"
      columns: ["inventory_id"]
isOneToOne: false
      referencedRelation: "placement_inventory_priced"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sponsored_placements_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sponsored_placements_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_by_category"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sponsored_placements_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sponsored_placements_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"staff_profiles": {
                  Row: {
                    "bio": string | null,"display_name": string,"is_public": boolean,"job_title": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"display_name": string,"is_public"?: boolean,"job_title"?: string | null,"user_id": string
                  }
                  Update: {
                    "bio"?: string | null,"display_name"?: string,"is_public"?: boolean,"job_title"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"test_runs": {
                  Row: {
                    "best_for": string | null,"category_id": string,"cons": (string)[],"created_at": string,"evidence": NonNullable<Json>,"id": string,"is_fictional": boolean,"product_version": string | null,"pros": (string)[],"protocol": string,"requested_by_vendor": boolean,"software_id": string,"status": Database["public"]['Enums']["test_status"],"tested_at": string,"tester_id": string,"updated_at": string,"validated_at": string | null,"validated_by": string | null,"verdict": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "best_for"?: string | null,"category_id": string,"cons"?: (string)[],"created_at"?: string,"evidence"?: NonNullable<Json>,"id"?: string,"is_fictional"?: boolean,"product_version"?: string | null,"pros"?: (string)[],"protocol": string,"requested_by_vendor"?: boolean,"software_id": string,"status"?: Database["public"]['Enums']["test_status"],"tested_at": string,"tester_id": string,"updated_at"?: string,"validated_at"?: string | null,"validated_by"?: string | null,"verdict"?: string | null
                  }
                  Update: {
                    "best_for"?: string | null,"category_id"?: string,"cons"?: (string)[],"created_at"?: string,"evidence"?: NonNullable<Json>,"id"?: string,"is_fictional"?: boolean,"product_version"?: string | null,"pros"?: (string)[],"protocol"?: string,"requested_by_vendor"?: boolean,"software_id"?: string,"status"?: Database["public"]['Enums']["test_status"],"tested_at"?: string,"tester_id"?: string,"updated_at"?: string,"validated_at"?: string | null,"validated_by"?: string | null,"verdict"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "test_runs_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_runs_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "granted_at": string,"granted_by": string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"granted_by"?: string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "granted_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"verticals": {
                  Row: {
                    "description": string | null,"id": string,"name": string,"site_id": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: string,"name": string,"site_id": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "description"?: string | null,"id"?: string,"name"?: string,"site_id"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "verticals_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"visitor_events": {
                  Row: {
                    "category_id": string | null,"entity_id": string | null,"event_type": string,"id": number,"occurred_at": string,"page_type": string | null,"path": string,"props": NonNullable<Json>,"visitor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"entity_id"?: string | null,"event_type": string,"id"?: number,"occurred_at"?: string,"page_type"?: string | null,"path": string,"props"?: NonNullable<Json>,"visitor_id": string
                  }
                  Update: {
                    "category_id"?: string | null,"entity_id"?: string | null,"event_type"?: string,"id"?: number,"occurred_at"?: string,"page_type"?: string | null,"path"?: string,"props"?: NonNullable<Json>,"visitor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visitor_events_visitor_id_fkey"
      columns: ["visitor_id"]
isOneToOne: false
      referencedRelation: "visitors"
      referencedColumns: ["id"]
    }
                  ]
                },"visitor_searches": {
                  Row: {
                    "company_size": string | null,"id": number,"need_slug": string | null,"occurred_at": string,"result_slugs": (string)[],"stack": (string)[],"universe_slug": string | null,"visitor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_size"?: string | null,"id"?: number,"need_slug"?: string | null,"occurred_at"?: string,"result_slugs"?: (string)[],"stack"?: (string)[],"universe_slug"?: string | null,"visitor_id": string
                  }
                  Update: {
                    "company_size"?: string | null,"id"?: number,"need_slug"?: string | null,"occurred_at"?: string,"result_slugs"?: (string)[],"stack"?: (string)[],"universe_slug"?: string | null,"visitor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visitor_searches_visitor_id_fkey"
      columns: ["visitor_id"]
isOneToOne: false
      referencedRelation: "visitors"
      referencedColumns: ["id"]
    }
                  ]
                },"visitors": {
                  Row: {
                    "consent": NonNullable<Json>,"consent_version": string,"consented_at": string,"created_at": string,"id": string,"last_seen_at": string,"member_id": string | null,"site_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consent": NonNullable<Json>,"consent_version": string,"consented_at": string,"created_at"?: string,"id"?: string,"last_seen_at"?: string,"member_id"?: string | null,"site_id": string
                  }
                  Update: {
                    "consent"?: NonNullable<Json>,"consent_version"?: string,"consented_at"?: string,"created_at"?: string,"id"?: string,"last_seen_at"?: string,"member_id"?: string | null,"site_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visitors_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visitors_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "active_sponsored_placements": {
                  Row: {
                    "category_id": string | null,"content_item_id": string | null,"cta_label": string | null,"cta_url": string | null,"headline": string | null,"id": string,"label": string,"placement_type": Database["public"]['Enums']["placement_type"],"provider_id": string | null,"site_id": string,"slot": number,"software_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "placement_inventory_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sponsored_placements_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sponsored_placements_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_by_category"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sponsored_placements_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sponsored_placements_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"editorial_rankings": {
                  Row: {
                    "category_id": string,"criteria_scores": Json | null,"editorial_rank": number | null,"overall_score": number | null,"requested_by_vendor": boolean,"software_id": string,"test_run_id": string,"tested_at": string,"tester_id": string,"validated_at": string | null,"validated_by": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "test_runs_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_runs_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"internal_link_stats": {
                  Row: {
                    "id": string,"inbound_body_links": number | null,"outbound_body_links": number | null,"path": string | null,"site_id": string,"type": Database["public"]['Enums']["content_type"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "content_items_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"placement_inventory_priced": {
                  Row: {
                    "active": boolean,"base_price_month": number | null,"category_id": string | null,"category_name": string | null,"category_slug": string | null,"content_item_id": string | null,"id": string,"indicative_price_month": number | null,"label": string,"placement_type": Database["public"]['Enums']["placement_type"],"site_id": string,"slot": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "placement_inventory_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_content_item_id_fkey"
      columns: ["content_item_id"]
isOneToOne: false
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placement_inventory_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"providers_by_category": {
                  Row: {
                    "category_id": string,"city": string | null,"city_slug": string | null,"coverage": string | null,"deal_size_range": string | null,"department": string | null,"description": string | null,"id": string,"is_fictional": boolean,"latitude": number | null,"longitude": number | null,"name": string,"offices": (string)[],"postal_code": string | null,"profession": string,"public_references": NonNullable<Json>,"region": string | null,"regulated_profession": boolean,"slug": string,"specialties": (string)[],"updated_at": string,"verification_status": string,"verified_at": string | null,"website": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "provider_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"providers_public": {
                  Row: {
                    "city": string | null,"city_slug": string | null,"coverage": string | null,"deal_size_range": string | null,"department": string | null,"description": string | null,"id": string,"is_fictional": boolean,"latitude": number | null,"longitude": number | null,"name": string,"offices": (string)[],"postal_code": string | null,"profession": string,"public_references": NonNullable<Json>,"region": string | null,"regulated_profession": boolean,"slug": string,"specialties": (string)[],"updated_at": string,"verification_status": string,"verified_at": string | null,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "city"?: string | null,"city_slug"?: string | null,"coverage"?: string | null,"deal_size_range"?: string | null,"department"?: string | null,"description"?: string | null,"id"?: string | null,"is_fictional"?: boolean | null,"latitude"?: number | null,"longitude"?: number | null,"name"?: string | null,"offices"?: (string)[] | null,"postal_code"?: string | null,"profession"?: string | null,"public_references"?: Json | null,"region"?: string | null,"regulated_profession"?: boolean | null,"slug"?: string | null,"specialties"?: (string)[] | null,"updated_at"?: string | null,"verification_status"?: string | null,"verified_at"?: string | null,"website"?: string | null
                         }
                        Update: {
                           "city"?: string | null,"city_slug"?: string | null,"coverage"?: string | null,"deal_size_range"?: string | null,"department"?: string | null,"description"?: string | null,"id"?: string | null,"is_fictional"?: boolean | null,"latitude"?: number | null,"longitude"?: number | null,"name"?: string | null,"offices"?: (string)[] | null,"postal_code"?: string | null,"profession"?: string | null,"public_references"?: Json | null,"region"?: string | null,"regulated_profession"?: boolean | null,"slug"?: string | null,"specialties"?: (string)[] | null,"updated_at"?: string | null,"verification_status"?: string | null,"verified_at"?: string | null,"website"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"published_content": {
                  Row: {
                    "author_id": string | null,"author_kind": string,"body": string,"category_id": string | null,"cluster": string | null,"content_updated_at": string,"data": NonNullable<Json>,"facet_id": string | null,"faq": NonNullable<Json>,"first_published_at": string | null,"h1": string,"id": string,"is_fictional": boolean,"meta_description": string,"meta_title": string,"path": string | null,"pillar_id": string | null,"published_at": string | null,"robots": string,"site_id": string,"slug": string,"software_b_id": string | null,"software_id": string | null,"summary": string,"type": Database["public"]['Enums']["content_type"],"validated_at": string | null,"validated_by": string | null,"version_id": string,"version_no": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "content_items_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_facet_id_fkey"
      columns: ["facet_id"]
isOneToOne: false
      referencedRelation: "facets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "content_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "internal_link_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "published_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "stale_content"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_software_b_id_fkey"
      columns: ["software_b_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"software_category_scores": {
                  Row: {
                    "category_id": string,"criteria_scores": Json | null,"overall_score": number | null,"requested_by_vendor": boolean,"software_id": string,"test_run_id": string,"tested_at": string,"tester_id": string,"validated_at": string | null,"validated_by": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "test_runs_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_runs_software_id_fkey"
      columns: ["software_id"]
isOneToOne: false
      referencedRelation: "software"
      referencedColumns: ["id"]
    }
                  ]
                },"stale_content": {
                  Row: {
                    "id": string,"path": string | null,"published_at": string | null,"review_due_at": string | null,"site_id": string,"title": string,"type": Database["public"]['Enums']["content_type"]
                  }
                  ComputedFields: never
                  Insert: {
                           "id"?: string | null,"path"?: string | null,"published_at"?: string | null,"review_due_at"?: string | null,"site_id"?: string | null,"title"?: string | null,"type"?: Database["public"]['Enums']["content_type"] | null
                         }
                        Update: {
                           "id"?: string | null,"path"?: string | null,"published_at"?: string | null,"review_due_at"?: string | null,"site_id"?: string | null,"title"?: string | null,"type"?: Database["public"]['Enums']["content_type"] | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "content_items_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "agent_month_cost":
{ Args: { "p_agent": string }; Returns: number
                           },
"analytics_by_rubrique":
{ Args: { "p_from": string,"p_site": string,"p_to": string }; Returns: {
              "click_rate": number,"form_submits": number,"outbound_clicks": number,"pageviews": number,"rubrique": string,"sessions": number
            }[]
                           },
"analytics_daily":
{ Args: { "p_from": string,"p_site": string,"p_to": string }; Returns: {
              "day": string,"form_submits": number,"outbound_clicks": number,"pageviews": number,"sessions": number,"sponsored_clicks": number
            }[]
                           },
"analytics_funnel":
{ Args: { "p_from": string,"p_rubrique"?: string,"p_site": string,"p_to": string }; Returns: {
              "label": string,"sessions": number,"step": number
            }[]
                           },
"analytics_journeys":
{ Args: { "p_from": string,"p_rubrique"?: string,"p_site": string,"p_to": string }; Returns: {
              "from_step": string,"to_step": string,"transitions": number
            }[]
                           },
"analytics_placements":
{ Args: { "p_from": string,"p_site": string,"p_to": string }; Returns: {
              "clicks": number,"ctr": number,"impressions": number,"placement_id": string
            }[]
                           },
"analytics_sources":
{ Args: { "p_from": string,"p_site": string,"p_to": string }; Returns: {
              "pageviews": number,"sessions": number,"source": string
            }[]
                           },
"analytics_top_pages":
{ Args: { "p_from": string,"p_limit"?: number,"p_site": string,"p_to": string }; Returns: {
              "entries": number,"outbound_clicks": number,"page_type": string,"pageviews": number,"path": string,"rubrique": string,"sessions": number
            }[]
                           },
"approve_imported_jobs":
{ Args: { "p_family"?: string,"p_site": string }; Returns: number
                           },
"approve_version":
{ Args: { "p_comment"?: string,"p_version": string }; Returns: undefined
                           },
"audit_workflow":
{ Args: { "p_action": string,"p_details": Json,"p_row": string,"p_table": string }; Returns: undefined
                           },
"block_item":
{ Args: { "p_item": string,"p_reason": string }; Returns: undefined
                           },
"current_actor_kind":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"expire_jobs":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"gsc_summary":
{ Args: { "p_days"?: number,"p_site": string }; Returns: {
              "avg_position": number,"clicks": number,"ctr": number,"impressions": number,"page": string,"query": string,"site_id": string
            }[]
                           },
"has_role":
{ Args: { "r": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"is_agent":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"provider_locations":
{ Args: { "p_category": string }; Returns: {
              "city": string,"city_slug": string,"department": string,"providers": number
            }[]
                           },
"publish_providers":
{ Args: { "p_category": string,"p_city_slug"?: string,"p_department"?: string,"p_publish"?: boolean }; Returns: number
                           },
"purge_analytics":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"purge_member_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"record_event":
{ Args: { "p_category_id"?: string,"p_device"?: string,"p_entity_id"?: string,"p_event_type": string,"p_link_kind"?: string,"p_page_type"?: string,"p_path": string,"p_placement_id"?: string,"p_props"?: Json,"p_referrer_host"?: string,"p_rubrique"?: string,"p_session_hash": string,"p_site_key": string,"p_utm_campaign"?: string,"p_utm_medium"?: string,"p_utm_source"?: string }; Returns: undefined
                           },
"refresh_keyword_positions":
{ Args: { "p_days"?: number,"p_site": string }; Returns: number
                           },
"reject_version":
{ Args: { "p_comment": string,"p_version": string }; Returns: undefined
                           },
"require_staff":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"review_interval":
{ Args: { "t": Database["public"]['Enums']["content_type"] }; Returns: string
                           },
"seo_check":
{ Args: { "p_version": string }; Returns: Json
                           },
"slugify":
{ Args: { "txt": string }; Returns: string
                           },
"submit_version":
{ Args: { "p_version": string }; Returns: Json
                           },
"unblock_item":
{ Args: { "p_item": string }; Returns: undefined
                           },
"unpublish_item":
{ Args: { "p_item": string,"p_reason": string }; Returns: undefined
                           },
"upsert_imported_jobs":
{ Args: { "p_rows": Json,"p_site": string }; Returns: number
                           },
"user_is_human_editor":
{ Args: { "uid": string }; Returns: boolean
                           },
"validate_test_run":
{ Args: { "p_test_run": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "admin"|"editor"|"sales"|"compliance"|"agent","category_kind": "software"|"provider","content_type": "home"|"software_review"|"pricing"|"alternatives"|"category_ranking"|"facet_landing"|"duel"|"guide"|"pillar"|"simulator"|"resource"|"provider_directory"|"glossary"|"page","facet_type": "price"|"company_size"|"sector"|"feature"|"integration"|"city","fact_status": "draft"|"validated"|"rejected"|"superseded","item_status": "draft"|"published"|"unpublished"|"blocked","placement_type": "category_sponsored"|"enhanced_listing"|"guide_banner"|"newsletter"|"simulator_sponsor"|"directory_featured","test_status": "draft"|"completed"|"validated"|"withdrawn","version_status": "draft"|"submitted"|"approved"|"superseded"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["admin", "editor", "sales", "compliance", "agent"],"category_kind": ["software", "provider"],"content_type": ["home", "software_review", "pricing", "alternatives", "category_ranking", "facet_landing", "duel", "guide", "pillar", "simulator", "resource", "provider_directory", "glossary", "page"],"facet_type": ["price", "company_size", "sector", "feature", "integration", "city"],"fact_status": ["draft", "validated", "rejected", "superseded"],"item_status": ["draft", "published", "unpublished", "blocked"],"placement_type": ["category_sponsored", "enhanced_listing", "guide_banner", "newsletter", "simulator_sponsor", "directory_featured"],"test_status": ["draft", "completed", "validated", "withdrawn"],"version_status": ["draft", "submitted", "approved", "superseded"]
          }
        }
} as const
