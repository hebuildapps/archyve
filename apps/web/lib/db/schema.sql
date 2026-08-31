-- SQL schema script for Supabase Database
-- Run this in your Supabase SQL editor to create the required tables for Archyve V2.

-- 1. Papers table
CREATE TABLE IF NOT EXISTS public.papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    title TEXT NOT NULL,
    authors TEXT[] NOT NULL DEFAULT '{}',
    doi TEXT UNIQUE,
    publisher TEXT NOT NULL,
    publication_year INTEGER,
    venue TEXT,
    url TEXT UNIQUE NOT NULL,
    abstract TEXT,
    publisher_id TEXT,
    confidence_score REAL NOT NULL DEFAULT 1.0
);

CREATE INDEX IF NOT EXISTS papers_doi_idx ON public.papers(doi);
CREATE INDEX IF NOT EXISTS papers_url_idx ON public.papers(url);

-- 2. Research Results table
CREATE TABLE IF NOT EXISTS public.research_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paper_id UUID NOT NULL UNIQUE REFERENCES public.papers(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    key_contributions TEXT[] NOT NULL DEFAULT '{}',
    read_recommendation JSONB NOT NULL,
    open_access JSONB NOT NULL,
    research_context TEXT NOT NULL,
    related_concepts TEXT[] NOT NULL DEFAULT '{}',
    related_papers JSONB[] NOT NULL DEFAULT '{}',
    implementations JSONB[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS research_results_paper_id_idx ON public.research_results(paper_id);

-- 3. Sources table
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    research_result_id UUID NOT NULL REFERENCES public.research_results(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    confidence REAL
);

CREATE INDEX IF NOT EXISTS sources_research_result_id_idx ON public.sources(research_result_id);

-- 4. Analytics table
CREATE TABLE IF NOT EXISTS public.analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paper_id UUID REFERENCES public.papers(id) ON DELETE SET NULL,
    trigger_type TEXT NOT NULL,
    cache_hit BOOLEAN NOT NULL,
    latency_ms INTEGER NOT NULL
);

-- 5. Row Level Security (RLS) policies
-- Enable read access for anonymous and authenticated users on public research corpus
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to papers" ON public.papers FOR SELECT USING (true);

ALTER TABLE public.research_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to research_results" ON public.research_results FOR SELECT USING (true);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to sources" ON public.sources FOR SELECT USING (true);

