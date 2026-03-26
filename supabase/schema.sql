-- ============================================
-- Schema: CMS Kinesiología - Constanza Anjarí
-- ============================================

-- Servicios
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon_svg TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reseñas
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_subtitle TEXT,
  content TEXT NOT NULL,
  rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FAQ
CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Perfil (single-row table)
CREATE TABLE IF NOT EXISTS profile (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  about_text_1 TEXT,
  about_text_2 TEXT,
  phone TEXT,
  email TEXT,
  whatsapp_number TEXT,
  instagram_url TEXT,
  hero_image_url TEXT DEFAULT '/foto-coni.jpg',
  profile_image_url TEXT DEFAULT '/foto-coni.jpg',
  coverage_zones JSONB DEFAULT '[
    {"name": "Viña del Mar", "detail": "Cobertura completa"},
    {"name": "Valparaíso", "detail": "Cobertura completa"},
    {"name": "Quilpué", "detail": "Cobertura completa"},
    {"name": "Con Con", "detail": "Cobertura completa"},
    {"name": "Villa Alemana", "detail": "Consultar disponibilidad"}
  ]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Solicitudes de reserva
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  preferred_date DATE,
  preferred_time TEXT,
  message TEXT,
  status TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Public read access for landing page data
CREATE POLICY "Public can read services" ON services FOR SELECT USING (true);
CREATE POLICY "Public can read active reviews" ON reviews FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read active faqs" ON faqs FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read profile" ON profile FOR SELECT USING (true);

-- Public can insert bookings (contact form)
CREATE POLICY "Public can insert bookings" ON bookings FOR INSERT WITH CHECK (true);

-- Authenticated users (admin) can do everything
CREATE POLICY "Admin full access services" ON services FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access reviews" ON reviews FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access faqs" ON faqs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access profile" ON profile FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access bookings" ON bookings FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- Seed data (from existing index.html)
-- ============================================

-- Services
INSERT INTO services (slug, title, icon_svg, items, sort_order) VALUES
(
  'musculoesqueletica',
  'Rehabilitación Musculoesquelética',
  '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 3H7a2 2 0 00-2 2v2m0 0a2 2 0 002 2h2m-4 0v8m0 0a2 2 0 002 2h2m0 0h2a2 2 0 002-2v-2m0 0a2 2 0 00-2-2h-2m4-8h2a2 2 0 012 2v2m0 0a2 2 0 01-2 2h-2m4 0v8m0 0a2 2 0 01-2 2h-2"/></svg>',
  '["Lesiones musculares y articulares", "Artrosis y artritis", "Postoperatorios", "Tendinitis y bursitis"]',
  1
),
(
  'neurorehabilitacion',
  'Neurorehabilitación',
  '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>',
  '["Accidente Cerebrovascular (ACV)", "Enfermedad de Parkinson", "Traumatismo Encéfalo Craneano", "Enfermedades neurológicas"]',
  2
),
(
  'adulto-mayor',
  'Kinesiología Adulto Mayor',
  '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
  '["Prevención de caídas", "Fortalecimiento muscular", "Mejora del equilibrio", "Mantención funcional"]',
  3
),
(
  'respiratoria',
  'Kinesiología Respiratoria',
  '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v4m0 0C10 8 7 9 5 12s-1 6 1 8c1.5 1.5 3 1.5 4 1 .5-.25 1-.75 1.5-1.5M12 8c2 0 5 1 7 4s1 6-1 8c-1.5 1.5-3 1.5-4 1-.5-.25-1-.75-1.5-1.5"/></svg>',
  '["EPOC y enfermedades crónicas", "Neumonía y bronquitis", "Manejo de secreciones", "Rehabilitación post-COVID"]',
  4
);

-- Reviews
INSERT INTO reviews (author_name, author_subtitle, content, rating, sort_order) VALUES
(
  'María José Herrera',
  'Hija de paciente · Viña del Mar',
  'Después del ACV de mi papá, Constanza fue fundamental en su recuperación. Su paciencia y profesionalismo son admirables. En tres meses mi padre volvió a caminar de forma independiente. No puedo agradecerle lo suficiente.',
  5, 1
),
(
  'Carlos Reyes Molina',
  'Paciente · Quilpué',
  'Tuve una tendinitis de hombro que me impedía trabajar. Constanza me evaluó el primer día y diseñó un plan de tratamiento claro. A las 6 sesiones ya tenía un 90% de movilidad. Muy recomendable, puntual y muy dedicada.',
  5, 2
),
(
  'Andrea Figueroa',
  'Hija de paciente · Viña del Mar',
  'Mi mamá tiene Parkinson y temíamos que perdiera la movilidad. Con Coni encontramos una kinesióloga que la trata con un cariño enorme. Los ejercicios la tienen mucho más activa y ella siempre espera la sesión con alegría.',
  5, 3
);

-- FAQs
INSERT INTO faqs (question, answer, sort_order) VALUES
('¿Cuánto dura cada sesión?', 'Cada sesión tiene una duración aproximada de 45 a 60 minutos, dependiendo del tipo de tratamiento y la evolución del paciente. La primera sesión puede extenderse un poco más, ya que incluye la evaluación inicial completa.', 1),
('¿Qué debo tener preparado en casa?', 'Solo necesitas un espacio libre de al menos 2 metros cuadrados y una silla o cama disponible. Yo llevo todo el material necesario: implementos de evaluación, elementos para ejercicios y cualquier equipo que requiera el tratamiento.', 2),
('¿Acepta Fonasa o Isapre?', 'Actualmente trabajo con pago particular. Si tienes Isapre, puedo emitir boleta con el código de prestación correspondiente para que tú puedas solicitar el reembolso directamente a tu seguro de salud. Consulta los montos de reembolso con tu Isapre.', 3),
('¿Cuántas sesiones necesitaré?', 'Depende del diagnóstico y los objetivos de cada persona. En general, una lesión aguda puede resolverse en 6 a 10 sesiones, mientras que procesos neurológicos o patologías crónicas requieren tratamiento más prolongado y continuo. Lo definimos juntos en la evaluación inicial.', 4),
('¿A qué comunas llega la atención?', 'Atiendo en Viña del Mar, Valparaíso, Quilpué, Villa Alemana y Con Con. Si tienes dudas sobre si llego a tu sector, escríbeme y lo confirmamos sin compromiso.', 5);

-- Profile
INSERT INTO profile (id, about_text_1, about_text_2, phone, email, whatsapp_number, instagram_url) VALUES (
  1,
  'Soy Constanza Anjarí, kinesióloga titulada de la Universidad Andrés Bello con vocación por el cuidado del adulto mayor y la rehabilitación integral. Desde que me titulé, decidí llevar la kinesiología directamente al hogar de mis pacientes, porque creo que la recuperación es más efectiva en un entorno familiar y seguro.',
  'Me enfoco en neurorehabilitación, kinesiología musculoesquelética, respiratoria y en la mantención funcional del adulto mayor. Cada tratamiento lo diseño de forma personalizada, considerando la historia clínica, el entorno del hogar y los objetivos de cada persona y su familia.',
  '+56 9 8292 7833',
  'klga.conianjari@gmail.com',
  '56982927833',
  ''
);

-- ============================================
-- Supabase Storage (Images Bucket)
-- ============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" 
  ON storage.objects FOR SELECT 
  USING ( bucket_id = 'images' );

CREATE POLICY "Auth Insert" 
  ON storage.objects FOR INSERT 
  WITH CHECK ( bucket_id = 'images' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Update" 
  ON storage.objects FOR UPDATE 
  WITH CHECK ( bucket_id = 'images' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Delete" 
  ON storage.objects FOR DELETE 
  USING ( bucket_id = 'images' AND auth.role() = 'authenticated' );
