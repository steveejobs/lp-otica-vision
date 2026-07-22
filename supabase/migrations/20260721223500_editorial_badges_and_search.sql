-- Migration: 20260721223500_editorial_badges_and_search.sql
-- Enables Extensions, Editorial Badge Columns, and Security Invoker Public Search RPCs

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 2. Add Editorial Badge Columns to products table
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS editorial_badge_type text CHECK (editorial_badge_type IS NULL OR editorial_badge_type IN ('featured', 'new')),
  ADD COLUMN IF NOT EXISTS editorial_badge_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS editorial_badge_ends_at timestamptz;

-- Constraint: 'new' badge requires editorial_badge_ends_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_editorial_badge_new_has_end_date'
  ) THEN
    ALTER TABLE public.products 
      ADD CONSTRAINT chk_editorial_badge_new_has_end_date 
      CHECK (
        editorial_badge_type IS NULL 
        OR editorial_badge_type != 'new' 
        OR editorial_badge_ends_at IS NOT NULL
      );
  END IF;
END $$;

-- 3. Updated Public Search RPC with Security Invoker, Unaccent Search, and Active Editorial Badge Calculation
CREATE OR REPLACE FUNCTION public.search_catalog_products(
  p_page_offset integer DEFAULT 0,
  p_page_size integer DEFAULT 24,
  p_search_term text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_availability text DEFAULT NULL,
  p_collection_slug text DEFAULT NULL
)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  slug text,
  sku text,
  short_description text,
  price numeric,
  price_visibility public.price_visibility,
  availability_status public.availability_status,
  color text,
  model text,
  featured boolean,
  display_order integer,
  updated_at timestamptz,
  brand_id uuid,
  brand_name text,
  brand_slug text,
  category_id uuid,
  category_name text,
  category_slug text,
  cover_image_id uuid,
  cover_alt_text text,
  cover_width integer,
  cover_height integer,
  cover_object_position text,
  cover_blur_data_url text,
  cover_updated_at timestamptz,
  editorial_badge text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_normalized_search text;
  v_total bigint;
BEGIN
  IF p_search_term IS NOT NULL AND trim(p_search_term) != '' THEN
    v_normalized_search := '%' || lower(extensions.unaccent(trim(p_search_term))) || '%';
  ELSE
    v_normalized_search := NULL;
  END IF;

  RETURN QUERY
  WITH filtered_products AS (
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.sku,
      p.short_description,
      p.price,
      p.price_visibility,
      p.availability_status,
      p.color,
      p.model,
      p.featured,
      p.display_order,
      p.updated_at,
      b.id AS brand_id,
      b.name AS brand_name,
      b.slug AS brand_slug,
      c.id AS category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      pm.id AS cover_image_id,
      pm.alt_text AS cover_alt_text,
      pm.width AS cover_width,
      pm.height AS cover_height,
      pm.object_position AS cover_object_position,
      pm.blur_data_url AS cover_blur_data_url,
      pm.updated_at AS cover_updated_at,
      CASE
        WHEN p.editorial_badge_type = 'new'
          AND (p.editorial_badge_starts_at IS NULL OR p.editorial_badge_starts_at <= NOW())
          AND (p.editorial_badge_ends_at IS NOT NULL AND p.editorial_badge_ends_at > NOW())
        THEN 'new'
        WHEN p.editorial_badge_type = 'featured'
          AND (p.editorial_badge_starts_at IS NULL OR p.editorial_badge_starts_at <= NOW())
          AND (p.editorial_badge_ends_at IS NULL OR p.editorial_badge_ends_at > NOW())
        THEN 'featured'
        ELSE NULL
      END AS active_badge
    FROM public.products p
    LEFT JOIN public.brands b ON b.id = p.brand_id AND b.active = true
    LEFT JOIN public.categories c ON c.id = p.category_id AND c.active = true
    LEFT JOIN public.product_media pm ON pm.product_id = p.id AND pm.is_cover = true
    LEFT JOIN public.collection_products cp ON cp.product_id = p.id
    LEFT JOIN public.collections col ON col.id = cp.collection_id
    WHERE p.published = true
      AND p.deleted_at IS NULL
      AND p.availability_status != 'archived'
      AND (p_brand_slug IS NULL OR b.slug = p_brand_slug)
      AND (p_category_slug IS NULL OR c.slug = p_category_slug)
      AND (p_availability IS NULL OR p.availability_status::text = p_availability)
      AND (p_collection_slug IS NULL OR col.slug = p_collection_slug)
      AND (
        v_normalized_search IS NULL
        OR lower(extensions.unaccent(p.name)) LIKE v_normalized_search
        OR lower(extensions.unaccent(coalesce(b.name, ''))) LIKE v_normalized_search
        OR lower(extensions.unaccent(coalesce(p.model, ''))) LIKE v_normalized_search
        OR lower(extensions.unaccent(coalesce(c.name, ''))) LIKE v_normalized_search
      )
  ),
  counted AS (
    SELECT COUNT(DISTINCT id) AS full_count FROM filtered_products
  )
  SELECT DISTINCT ON (fp.id)
    fp.id,
    fp.name,
    fp.slug,
    fp.sku,
    fp.short_description,
    fp.price,
    fp.price_visibility,
    fp.availability_status,
    fp.color,
    fp.model,
    fp.featured,
    fp.display_order,
    fp.updated_at,
    fp.brand_id,
    fp.brand_name,
    fp.brand_slug,
    fp.category_id,
    fp.category_name,
    fp.category_slug,
    fp.cover_image_id,
    fp.cover_alt_text,
    fp.cover_width,
    fp.cover_height,
    fp.cover_object_position,
    fp.cover_blur_data_url,
    fp.cover_updated_at,
    fp.active_badge,
    cnt.full_count
  FROM filtered_products fp
  CROSS JOIN counted cnt
  ORDER BY fp.id, fp.display_order ASC, fp.updated_at DESC
  OFFSET p_page_offset
  LIMIT p_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_catalog_products TO anon, authenticated;
