-- Voxco Portal Enhancement Migration
-- This migration adds:
-- 1. draft_orders table for saving order progress
-- 2. number_requirements table for combination-specific requirements
-- 3. notifications table for in-app notification system
-- 4. Seeds all world countries

-- =============================================
-- 1. DRAFT ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.draft_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  number_id UUID NOT NULL REFERENCES public.numbers(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  customer_type VARCHAR CHECK (customer_type IN ('individual', 'business')),
  uploaded_documents JSONB DEFAULT '{}',
  notes TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookup by customer
CREATE INDEX IF NOT EXISTS idx_draft_orders_customer_id ON public.draft_orders(customer_id);
-- Index for cleanup job to find expired drafts
CREATE INDEX IF NOT EXISTS idx_draft_orders_expires_at ON public.draft_orders(expires_at);

-- RLS policies for draft_orders
ALTER TABLE public.draft_orders ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON public.draft_orders TO authenticated;
GRANT ALL ON public.draft_orders TO service_role;

CREATE POLICY "Users can view their own draft orders" ON public.draft_orders
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own draft orders" ON public.draft_orders
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own draft orders" ON public.draft_orders
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own draft orders" ON public.draft_orders
  FOR DELETE USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 2. NUMBER REQUIREMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.number_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  number_type VARCHAR NOT NULL CHECK (number_type IN ('Geographic', 'Mobile', 'Toll-Free')),
  direction VARCHAR NOT NULL CHECK (direction IN ('Inbound only', 'Outbound only', 'Both')),
  sms_capability VARCHAR NOT NULL CHECK (sms_capability IN ('SMS only', 'Voice only', 'Both')),
  requirements JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(country_id, number_type, direction, sms_capability)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_number_requirements_country_id ON public.number_requirements(country_id);
CREATE INDEX IF NOT EXISTS idx_number_requirements_combination ON public.number_requirements(country_id, number_type, direction, sms_capability);

-- RLS policies for number_requirements
ALTER TABLE public.number_requirements ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON public.number_requirements TO authenticated;
GRANT ALL ON public.number_requirements TO service_role;
GRANT SELECT ON public.number_requirements TO anon;

CREATE POLICY "Anyone can view number requirements" ON public.number_requirements
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage number requirements" ON public.number_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =============================================
-- 3. NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL CHECK (type IN ('order_status', 'draft_reminder', 'admin_action', 'system', 'signup_approved', 'signup_rejected')),
  title VARCHAR NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookup by user and unread status
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can insert notifications for any user" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =============================================
-- 4. ADD is_disabled COLUMN TO CUSTOMERS
-- =============================================
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false;

ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- =============================================
-- 5. SEED ALL WORLD COUNTRIES
-- =============================================
-- First, let's clear existing countries that might conflict (optional - comment out if you want to keep existing)
-- DELETE FROM public.countries WHERE id NOT IN (SELECT DISTINCT country_id FROM public.numbers);

-- Insert all world countries (ISO 3166-1)
-- Using ON CONFLICT to handle existing countries
INSERT INTO public.countries (name, country_code, regulator, requirements) VALUES
('Afghanistan', 'AF', 'Afghanistan Telecom Regulatory Authority (ATRA)', '{}'),
('Albania', 'AL', 'Electronic and Postal Communications Authority (AKEP)', '{}'),
('Algeria', 'DZ', 'Autorité de Régulation de la Poste et des Télécommunications (ARPT)', '{}'),
('Andorra', 'AD', 'Autoritat Nacional de Telecomunicacions d''Andorra', '{}'),
('Angola', 'AO', 'Instituto Angolano das Comunicações (INACOM)', '{}'),
('Antigua and Barbuda', 'AG', 'National Telecommunications Regulatory Commission (NTRC)', '{}'),
('Argentina', 'AR', 'Ente Nacional de Comunicaciones (ENACOM)', '{}'),
('Armenia', 'AM', 'Public Services Regulatory Commission', '{}'),
('Australia', 'AU', 'Australian Communications and Media Authority (ACMA)', '{}'),
('Austria', 'AT', 'Rundfunk und Telekom Regulierungs-GmbH (RTR)', '{}'),
('Azerbaijan', 'AZ', 'Ministry of Transport, Communications and High Technologies', '{}'),
('Bahamas', 'BS', 'Utilities Regulation and Competition Authority (URCA)', '{}'),
('Bahrain', 'BH', 'Telecommunications Regulatory Authority (TRA)', '{}'),
('Bangladesh', 'BD', 'Bangladesh Telecommunication Regulatory Commission (BTRC)', '{}'),
('Barbados', 'BB', 'Telecommunications Unit', '{}'),
('Belarus', 'BY', 'Ministry of Communications and Informatization', '{}'),
('Belgium', 'BE', 'Belgian Institute for Postal Services and Telecommunications (BIPT)', '{}'),
('Belize', 'BZ', 'Public Utilities Commission (PUC)', '{}'),
('Benin', 'BJ', 'Autorité de Régulation des Communications Électroniques et de la Poste (ARCEP)', '{}'),
('Bhutan', 'BT', 'Bhutan InfoComm and Media Authority (BICMA)', '{}'),
('Bolivia', 'BO', 'Autoridad de Regulación y Fiscalización de Telecomunicaciones y Transportes (ATT)', '{}'),
('Bosnia and Herzegovina', 'BA', 'Communications Regulatory Agency (CRA)', '{}'),
('Botswana', 'BW', 'Botswana Communications Regulatory Authority (BOCRA)', '{}'),
('Brazil', 'BR', 'Agência Nacional de Telecomunicações (ANATEL)', '{}'),
('Brunei', 'BN', 'Authority for Info-communications Technology Industry (AITI)', '{}'),
('Bulgaria', 'BG', 'Communications Regulation Commission (CRC)', '{}'),
('Burkina Faso', 'BF', 'Autorité de Régulation des Communications Électroniques et des Postes (ARCEP)', '{}'),
('Burundi', 'BI', 'Agence de Régulation et de Contrôle des Télécommunications (ARCT)', '{}'),
('Cabo Verde', 'CV', 'Agência Nacional das Comunicações (ANAC)', '{}'),
('Cambodia', 'KH', 'Telecommunication Regulator of Cambodia (TRC)', '{}'),
('Cameroon', 'CM', 'Telecommunications Regulatory Board (TRB)', '{}'),
('Canada', 'CA', 'Canadian Radio-television and Telecommunications Commission (CRTC)', '{}'),
('Central African Republic', 'CF', 'Agence de Régulation des Télécommunications (ART)', '{}'),
('Chad', 'TD', 'Autorité de Régulation des Communications Électroniques et des Postes (ARCEP)', '{}'),
('Chile', 'CL', 'Subsecretaría de Telecomunicaciones (SUBTEL)', '{}'),
('China', 'CN', 'Ministry of Industry and Information Technology (MIIT)', '{}'),
('Colombia', 'CO', 'Comisión de Regulación de Comunicaciones (CRC)', '{}'),
('Comoros', 'KM', 'Autorité Nationale de Régulation des TIC (ANRTIC)', '{}'),
('Congo (Democratic Republic)', 'CD', 'Autorité de Régulation de la Poste et des Télécommunications du Congo (ARPTC)', '{}'),
('Congo (Republic)', 'CG', 'Agence de Régulation des Postes et des Communications Électroniques (ARPCE)', '{}'),
('Costa Rica', 'CR', 'Superintendencia de Telecomunicaciones (SUTEL)', '{}'),
('Croatia', 'HR', 'Croatian Regulatory Authority for Network Industries (HAKOM)', '{}'),
('Cuba', 'CU', 'Ministerio de Comunicaciones', '{}'),
('Cyprus', 'CY', 'Office of the Commissioner of Electronic Communications and Postal Regulation (OCECPR)', '{}'),
('Czech Republic', 'CZ', 'Czech Telecommunication Office (CTU)', '{}'),
('Denmark', 'DK', 'Danish Business Authority', '{}'),
('Djibouti', 'DJ', 'Ministère de la Communication', '{}'),
('Dominica', 'DM', 'National Telecommunications Regulatory Commission (NTRC)', '{}'),
('Dominican Republic', 'DO', 'Instituto Dominicano de las Telecomunicaciones (INDOTEL)', '{}'),
('Ecuador', 'EC', 'Agencia de Regulación y Control de las Telecomunicaciones (ARCOTEL)', '{}'),
('Egypt', 'EG', 'National Telecom Regulatory Authority (NTRA)', '{}'),
('El Salvador', 'SV', 'Superintendencia General de Electricidad y Telecomunicaciones (SIGET)', '{}'),
('Equatorial Guinea', 'GQ', 'Ministerio de Transportes, Tecnología, Correos y Telecomunicaciones', '{}'),
('Eritrea', 'ER', 'Ministry of Transport and Communications', '{}'),
('Estonia', 'EE', 'Consumer Protection and Technical Regulatory Authority (TTJA)', '{}'),
('Eswatini', 'SZ', 'Eswatini Communications Commission (ESCCOM)', '{}'),
('Ethiopia', 'ET', 'Ethiopian Communications Authority (ECA)', '{}'),
('Fiji', 'FJ', 'Telecommunications Authority of Fiji (TAF)', '{}'),
('Finland', 'FI', 'Finnish Transport and Communications Agency (Traficom)', '{}'),
('France', 'FR', 'Autorité de Régulation des Communications Électroniques et des Postes (ARCEP)', '{}'),
('Gabon', 'GA', 'Autorité de Régulation des Communications Électroniques et des Postes (ARCEP)', '{}'),
('Gambia', 'GM', 'Public Utilities Regulatory Authority (PURA)', '{}'),
('Georgia', 'GE', 'Georgian National Communications Commission (GNCC)', '{}'),
('Germany', 'DE', 'Federal Network Agency (Bundesnetzagentur)', '{}'),
('Ghana', 'GH', 'National Communications Authority (NCA)', '{}'),
('Greece', 'GR', 'Hellenic Telecommunications and Post Commission (EETT)', '{}'),
('Grenada', 'GD', 'National Telecommunications Regulatory Commission (NTRC)', '{}'),
('Guatemala', 'GT', 'Superintendencia de Telecomunicaciones (SIT)', '{}'),
('Guinea', 'GN', 'Autorité de Régulation des Postes et Télécommunications (ARPT)', '{}'),
('Guinea-Bissau', 'GW', 'Autoridade Reguladora Nacional das Tecnologias de Informação e Comunicação (ARN)', '{}'),
('Guyana', 'GY', 'Telecommunications Agency', '{}'),
('Haiti', 'HT', 'Conseil National des Télécommunications (CONATEL)', '{}'),
('Honduras', 'HN', 'Comisión Nacional de Telecomunicaciones (CONATEL)', '{}'),
('Hungary', 'HU', 'National Media and Infocommunications Authority (NMHH)', '{}'),
('Iceland', 'IS', 'Post and Telecom Administration (PTA)', '{}'),
('India', 'IN', 'Telecom Regulatory Authority of India (TRAI)', '{}'),
('Indonesia', 'ID', 'Ministry of Communication and Information Technology (Kominfo)', '{}'),
('Iran', 'IR', 'Communications Regulatory Authority (CRA)', '{}'),
('Iraq', 'IQ', 'Communications and Media Commission (CMC)', '{}'),
('Ireland', 'IE', 'Commission for Communications Regulation (ComReg)', '{}'),
('Israel', 'IL', 'Ministry of Communications', '{}'),
('Italy', 'IT', 'Autorità per le Garanzie nelle Comunicazioni (AGCOM)', '{}'),
('Ivory Coast', 'CI', 'Autorité de Régulation des Télécommunications/TIC de Côte d''Ivoire (ARTCI)', '{}'),
('Jamaica', 'JM', 'Office of Utilities Regulation (OUR)', '{}'),
('Japan', 'JP', 'Ministry of Internal Affairs and Communications (MIC)', '{}'),
('Jordan', 'JO', 'Telecommunications Regulatory Commission (TRC)', '{}'),
('Kazakhstan', 'KZ', 'Ministry of Digital Development, Innovations and Aerospace Industry', '{}'),
('Kenya', 'KE', 'Communications Authority of Kenya (CA)', '{}'),
('Kiribati', 'KI', 'Communications Commission of Kiribati', '{}'),
('Kuwait', 'KW', 'Communication and Information Technology Regulatory Authority (CITRA)', '{}'),
('Kyrgyzstan', 'KG', 'State Communications Agency', '{}'),
('Laos', 'LA', 'Ministry of Post, Telecommunications and Communications', '{}'),
('Latvia', 'LV', 'Public Utilities Commission (SPRK)', '{}'),
('Lebanon', 'LB', 'Telecommunications Regulatory Authority (TRA)', '{}'),
('Lesotho', 'LS', 'Lesotho Communications Authority (LCA)', '{}'),
('Liberia', 'LR', 'Liberia Telecommunications Authority (LTA)', '{}'),
('Libya', 'LY', 'General Authority for Communications and Informatics (GACI)', '{}'),
('Liechtenstein', 'LI', 'Office for Communications (AK)', '{}'),
('Lithuania', 'LT', 'Communications Regulatory Authority (RRT)', '{}'),
('Luxembourg', 'LU', 'Institut Luxembourgeois de Régulation (ILR)', '{}'),
('Madagascar', 'MG', 'Autorité de Régulation des Technologies de Communication (ARTEC)', '{}'),
('Malawi', 'MW', 'Malawi Communications Regulatory Authority (MACRA)', '{}'),
('Malaysia', 'MY', 'Malaysian Communications and Multimedia Commission (MCMC)', '{}'),
('Maldives', 'MV', 'Communications Authority of Maldives (CAM)', '{}'),
('Mali', 'ML', 'Autorité Malienne de Régulation des Télécommunications/TIC et Postes (AMRTP)', '{}'),
('Malta', 'MT', 'Malta Communications Authority (MCA)', '{}'),
('Marshall Islands', 'MH', 'National Telecommunications Authority (NTA)', '{}'),
('Mauritania', 'MR', 'Autorité de Régulation (ARE)', '{}'),
('Mauritius', 'MU', 'Information and Communication Technologies Authority (ICTA)', '{}'),
('Mexico', 'MX', 'Instituto Federal de Telecomunicaciones (IFT)', '{}'),
('Micronesia', 'FM', 'Department of Transportation, Communications and Infrastructure', '{}'),
('Moldova', 'MD', 'National Regulatory Agency for Electronic Communications and Information Technology (ANRCETI)', '{}'),
('Monaco', 'MC', 'Direction des Communications Électroniques', '{}'),
('Mongolia', 'MN', 'Communications Regulatory Commission (CRC)', '{}'),
('Montenegro', 'ME', 'Agency for Electronic Communications and Postal Services (EKIP)', '{}'),
('Morocco', 'MA', 'Agence Nationale de Réglementation des Télécommunications (ANRT)', '{}'),
('Mozambique', 'MZ', 'Instituto Nacional das Comunicações de Moçambique (INCM)', '{}'),
('Myanmar', 'MM', 'Posts and Telecommunications Department (PTD)', '{}'),
('Namibia', 'NA', 'Communications Regulatory Authority of Namibia (CRAN)', '{}'),
('Nauru', 'NR', 'Nauru Telecommunications Authority', '{}'),
('Nepal', 'NP', 'Nepal Telecommunications Authority (NTA)', '{}'),
('Netherlands', 'NL', 'Authority for Consumers and Markets (ACM)', '{}'),
('New Zealand', 'NZ', 'Commerce Commission', '{}'),
('Nicaragua', 'NI', 'Instituto Nicaragüense de Telecomunicaciones y Correos (TELCOR)', '{}'),
('Niger', 'NE', 'Autorité de Régulation des Communications Électroniques et de la Poste (ARCEP)', '{}'),
('Nigeria', 'NG', 'Nigerian Communications Commission (NCC)', '{}'),
('North Korea', 'KP', 'Ministry of Post and Telecommunications', '{}'),
('North Macedonia', 'MK', 'Agency for Electronic Communications (AEC)', '{}'),
('Norway', 'NO', 'Norwegian Communications Authority (Nkom)', '{}'),
('Oman', 'OM', 'Telecommunications Regulatory Authority (TRA)', '{}'),
('Pakistan', 'PK', 'Pakistan Telecommunication Authority (PTA)', '{}'),
('Palau', 'PW', 'Ministry of Public Infrastructure, Industries and Commerce', '{}'),
('Palestine', 'PS', 'Ministry of Telecommunications and Information Technology (MTIT)', '{}'),
('Panama', 'PA', 'Autoridad Nacional de los Servicios Públicos (ASEP)', '{}'),
('Papua New Guinea', 'PG', 'National Information and Communications Technology Authority (NICTA)', '{}'),
('Paraguay', 'PY', 'Comisión Nacional de Telecomunicaciones (CONATEL)', '{}'),
('Peru', 'PE', 'Organismo Supervisor de Inversión Privada en Telecomunicaciones (OSIPTEL)', '{}'),
('Philippines', 'PH', 'National Telecommunications Commission (NTC)', '{}'),
('Poland', 'PL', 'Office of Electronic Communications (UKE)', '{}'),
('Portugal', 'PT', 'Autoridade Nacional de Comunicações (ANACOM)', '{}'),
('Qatar', 'QA', 'Communications Regulatory Authority (CRA)', '{}'),
('Romania', 'RO', 'National Authority for Management and Regulation in Communications (ANCOM)', '{}'),
('Russia', 'RU', 'Federal Service for Supervision in the Sphere of Telecom (Roskomnadzor)', '{}'),
('Rwanda', 'RW', 'Rwanda Utilities Regulatory Authority (RURA)', '{}'),
('Saint Kitts and Nevis', 'KN', 'National Telecommunications Regulatory Commission (NTRC)', '{}'),
('Saint Lucia', 'LC', 'National Telecommunications Regulatory Commission (NTRC)', '{}'),
('Saint Vincent and the Grenadines', 'VC', 'National Telecommunications Regulatory Commission (NTRC)', '{}'),
('Samoa', 'WS', 'Office of the Regulator', '{}'),
('San Marino', 'SM', 'Autorità per la Regolamentazione dei Servizi Pubblici', '{}'),
('Sao Tome and Principe', 'ST', 'Autoridade Geral de Regulação (AGER)', '{}'),
('Saudi Arabia', 'SA', 'Communications, Space and Technology Commission (CST)', '{}'),
('Senegal', 'SN', 'Autorité de Régulation des Télécommunications et des Postes (ARTP)', '{}'),
('Serbia', 'RS', 'Regulatory Agency for Electronic Communications and Postal Services (RATEL)', '{}'),
('Seychelles', 'SC', 'Department of Information Communications Technology (DICT)', '{}'),
('Sierra Leone', 'SL', 'National Telecommunications Commission (NATCOM)', '{}'),
('Singapore', 'SG', 'Infocomm Media Development Authority (IMDA)', '{}'),
('Slovakia', 'SK', 'Regulatory Authority for Electronic Communications and Postal Services (RU)', '{}'),
('Slovenia', 'SI', 'Agency for Communication Networks and Services (AKOS)', '{}'),
('Solomon Islands', 'SB', 'Telecommunications Commission of Solomon Islands (TCSI)', '{}'),
('Somalia', 'SO', 'National Communications Authority (NCA)', '{}'),
('South Africa', 'ZA', 'Independent Communications Authority of South Africa (ICASA)', '{}'),
('South Korea', 'KR', 'Korea Communications Commission (KCC)', '{}'),
('South Sudan', 'SS', 'National Communications Authority (NCA)', '{}'),
('Spain', 'ES', 'Comisión Nacional de los Mercados y la Competencia (CNMC)', '{}'),
('Sri Lanka', 'LK', 'Telecommunications Regulatory Commission of Sri Lanka (TRCSL)', '{}'),
('Sudan', 'SD', 'Telecommunications and Post Regulatory Authority (TPRA)', '{}'),
('Suriname', 'SR', 'Telecommunicatie Autoriteit Suriname (TAS)', '{}'),
('Sweden', 'SE', 'Swedish Post and Telecom Authority (PTS)', '{}'),
('Switzerland', 'CH', 'Federal Communications Commission (ComCom)', '{}'),
('Syria', 'SY', 'Syrian Telecommunications Establishment (STE)', '{}'),
('Taiwan', 'TW', 'National Communications Commission (NCC)', '{}'),
('Tajikistan', 'TJ', 'Communications Service under the Government', '{}'),
('Tanzania', 'TZ', 'Tanzania Communications Regulatory Authority (TCRA)', '{}'),
('Thailand', 'TH', 'National Broadcasting and Telecommunications Commission (NBTC)', '{}'),
('Timor-Leste', 'TL', 'Autoridade Nacional de Comunicações (ANC)', '{}'),
('Togo', 'TG', 'Autorité de Réglementation des secteurs de Postes et de Télécommunications (ARTP)', '{}'),
('Tonga', 'TO', 'Ministry of Information and Communications', '{}'),
('Trinidad and Tobago', 'TT', 'Telecommunications Authority of Trinidad and Tobago (TATT)', '{}'),
('Tunisia', 'TN', 'Instance Nationale des Télécommunications (INT)', '{}'),
('Turkey', 'TR', 'Information and Communication Technologies Authority (BTK)', '{}'),
('Turkmenistan', 'TM', 'Ministry of Communication', '{}'),
('Tuvalu', 'TV', 'Ministry of Communications and Transport', '{}'),
('Uganda', 'UG', 'Uganda Communications Commission (UCC)', '{}'),
('Ukraine', 'UA', 'National Commission for the State Regulation of Electronic Communications (NCEC)', '{}'),
('United Arab Emirates', 'AE', 'Telecommunications and Digital Government Regulatory Authority (TDRA)', '{}'),
('United Kingdom', 'GB', 'Office of Communications (Ofcom)', '{}'),
('United States', 'US', 'Federal Communications Commission (FCC)', '{}'),
('Uruguay', 'UY', 'Unidad Reguladora de Servicios de Comunicaciones (URSEC)', '{}'),
('Uzbekistan', 'UZ', 'Ministry for Development of Information Technologies and Communications', '{}'),
('Vanuatu', 'VU', 'Telecommunications and Radiocommunications Regulator (TRR)', '{}'),
('Vatican City', 'VA', 'Governorate of Vatican City State', '{}'),
('Venezuela', 'VE', 'Comisión Nacional de Telecomunicaciones (CONATEL)', '{}'),
('Vietnam', 'VN', 'Ministry of Information and Communications (MIC)', '{}'),
('Yemen', 'YE', 'Ministry of Telecommunications and Information Technology', '{}'),
('Zambia', 'ZM', 'Zambia Information and Communications Technology Authority (ZICTA)', '{}'),
('Zimbabwe', 'ZW', 'Postal and Telecommunications Regulatory Authority of Zimbabwe (POTRAZ)', '{}')
ON CONFLICT (name) DO UPDATE SET 
  country_code = EXCLUDED.country_code,
  regulator = EXCLUDED.regulator
WHERE public.countries.regulator IS NULL OR public.countries.regulator = '';

-- Also insert UK alias if not exists
INSERT INTO public.countries (name, country_code, regulator, requirements)
VALUES ('UK', 'UK', 'Office of Communications (Ofcom)', '{}')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 6. FUNCTION TO CLEAN UP EXPIRED DRAFTS
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.draft_orders WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. FUNCTION TO GET REQUIREMENTS BY COMBINATION
-- =============================================
CREATE OR REPLACE FUNCTION get_number_requirements(
  p_country_id UUID,
  p_number_type VARCHAR,
  p_direction VARCHAR,
  p_sms_capability VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- First try exact match
  SELECT requirements INTO result
  FROM public.number_requirements
  WHERE country_id = p_country_id
    AND number_type = p_number_type
    AND direction = p_direction
    AND sms_capability = p_sms_capability;
  
  -- If not found, try with 'Both' combinations
  IF result IS NULL THEN
    SELECT requirements INTO result
    FROM public.number_requirements
    WHERE country_id = p_country_id
      AND (number_type = p_number_type OR number_type = 'Geographic')
      AND (direction = p_direction OR direction = 'Both')
      AND (sms_capability = p_sms_capability OR sms_capability = 'Both')
    LIMIT 1;
  END IF;
  
  -- If still not found, fall back to country's default requirements
  IF result IS NULL THEN
    SELECT requirements INTO result
    FROM public.countries
    WHERE id = p_country_id;
  END IF;
  
  RETURN COALESCE(result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_number_requirements(UUID, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_drafts() TO service_role;

