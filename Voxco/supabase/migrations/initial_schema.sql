-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  name character varying,
  role character varying NOT NULL DEFAULT 'admin'::character varying CHECK (role::text = ANY (ARRAY['admin'::character varying, 'super_admin'::character varying, 'support'::character varying]::text[])),
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  table_name character varying NOT NULL,
  record_id uuid NOT NULL,
  action character varying NOT NULL CHECK (action::text = ANY (ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying]::text[])),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_by_type character varying CHECK (changed_by_type::text = ANY (ARRAY['admin'::character varying, 'customer'::character varying, 'system'::character varying]::text[])),
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.countries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  country_code character varying NOT NULL UNIQUE,
  regulator character varying,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  prefix_area_code jsonb DEFAULT '{}'::jsonb,
  last_updated_at timestamp with time zone DEFAULT now(),
  updated_by character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT countries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  phone character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  country_id uuid NOT NULL,
  number character varying NOT NULL UNIQUE,
  number_type character varying NOT NULL CHECK (number_type::text = ANY (ARRAY['Geographic'::character varying, 'Mobile'::character varying, 'Toll-Free'::character varying]::text[])),
  sms_capability character varying NOT NULL CHECK (sms_capability::text = ANY (ARRAY['SMS only'::character varying, 'Voice only'::character varying, 'Both'::character varying]::text[])),
  direction character varying NOT NULL CHECK (direction::text = ANY (ARRAY['Inbound only'::character varying, 'Outbound only'::character varying, 'Both'::character varying]::text[])),
  mrc numeric NOT NULL DEFAULT 0.00,
  nrc numeric NOT NULL DEFAULT 0.00,
  currency character varying NOT NULL DEFAULT 'USD'::character varying,
  moq integer NOT NULL DEFAULT 1,
  other_charges jsonb DEFAULT '{}'::jsonb,
  features jsonb DEFAULT '{}'::jsonb,
  is_available boolean NOT NULL DEFAULT true,
  is_reserved boolean NOT NULL DEFAULT false,
  reserved_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT numbers_pkey PRIMARY KEY (id),
  CONSTRAINT numbers_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL,
  number_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'granted'::character varying, 'rejected'::character varying]::text[])),
  mrc_at_order numeric,
  nrc_at_order numeric,
  currency_at_order character varying,
  admin_notes text,
  rejected_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  granted_at timestamp with time zone,
  rejected_at timestamp with time zone,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT orders_number_id_fkey FOREIGN KEY (number_id) REFERENCES public.numbers(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.template_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  part_type text NOT NULL,
  template_type_id uuid,
  is_required boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT template_parts_pkey PRIMARY KEY (id),
  CONSTRAINT template_parts_template_type_id_fkey FOREIGN KEY (template_type_id) REFERENCES public.template_types(id)
);
CREATE TABLE public.template_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT template_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_type_id uuid NOT NULL,
  content jsonb NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL,
  is_public boolean DEFAULT false,
  version integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT templates_pkey PRIMARY KEY (id),
  CONSTRAINT templates_template_type_id_fkey FOREIGN KEY (template_type_id) REFERENCES public.template_types(id),
  CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);