-- TeachRepo Row Level Security (RLS) Policies
-- Provider: Supabase (PostgreSQL)
-- Version: 1.0
-- Last updated: 2025-04
--
-- Security model:
--   - auth.uid() = the currently authenticated user's UUID
--   - Service role key bypasses ALL RLS (used in webhook handlers)
--   - Anon key is subject to all policies below

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS TABLE
-- ============================================================

-- Anyone can view public profiles
CREATE POLICY "users: public read"
  ON public.users FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "users: self update"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert is handled by the handle_new_user trigger (SECURITY DEFINER)
-- so no INSERT policy is needed for authenticated users

-- ============================================================
-- COURSES TABLE
-- ============================================================

-- Anyone can view published courses
CREATE POLICY "courses: public read published"
  ON public.courses FOR SELECT
  USING (published = true OR creator_id = auth.uid());

-- Creators can insert their own courses
CREATE POLICY "courses: creator insert"
  ON public.courses FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- Creators can update their own courses
CREATE POLICY "courses: creator update"
  ON public.courses FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Creators can delete their own unpublished courses
-- (Published courses with enrollments should be soft-deleted, but let creators decide)
CREATE POLICY "courses: creator delete"
  ON public.courses FOR DELETE
  USING (creator_id = auth.uid());

-- ============================================================
-- LESSONS TABLE
-- ============================================================

-- Preview lessons are publicly readable
-- Non-preview lessons: readable only by enrolled users or the creator
CREATE POLICY "lessons: public read preview"
  ON public.lessons FOR SELECT
  USING (
    is_preview = true
    OR
    -- Creator can always read their own lessons
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
        AND courses.creator_id = auth.uid()
    )
    OR
    -- Enrolled students with active entitlement can read
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.user_id = auth.uid()
        AND enrollments.course_id = lessons.course_id
        AND enrollments.entitlement_granted_at IS NOT NULL
        AND enrollments.entitlement_revoked_at IS NULL
    )
  );

-- Only the course creator can insert/update/delete lessons
CREATE POLICY "lessons: creator insert"
  ON public.lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
        AND courses.creator_id = auth.uid()
    )
  );

CREATE POLICY "lessons: creator update"
  ON public.lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
        AND courses.creator_id = auth.uid()
    )
  );

CREATE POLICY "lessons: creator delete"
  ON public.lessons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
        AND courses.creator_id = auth.uid()
    )
  );

-- ============================================================
-- QUIZ QUESTIONS TABLE
-- ============================================================

-- Quiz questions follow the same access rules as lessons
-- Readable if lesson is a preview, user is enrolled, or user is creator
CREATE POLICY "quiz_questions: same access as lesson"
  ON public.quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      WHERE lessons.id = quiz_questions.lesson_id
        AND (
          lessons.is_preview = true
          OR EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = lessons.course_id
              AND courses.creator_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.enrollments
            WHERE enrollments.user_id = auth.uid()
              AND enrollments.course_id = lessons.course_id
              AND enrollments.entitlement_granted_at IS NOT NULL
              AND enrollments.entitlement_revoked_at IS NULL
          )
        )
    )
  );

-- Only creator can insert/update/delete quiz questions
CREATE POLICY "quiz_questions: creator insert"
  ON public.quiz_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.courses ON courses.id = lessons.course_id
      WHERE lessons.id = quiz_questions.lesson_id
        AND courses.creator_id = auth.uid()
    )
  );

CREATE POLICY "quiz_questions: creator update"
  ON public.quiz_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.courses ON courses.id = lessons.course_id
      WHERE lessons.id = quiz_questions.lesson_id
        AND courses.creator_id = auth.uid()
    )
  );

CREATE POLICY "quiz_questions: creator delete"
  ON public.quiz_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.courses ON courses.id = lessons.course_id
      WHERE lessons.id = quiz_questions.lesson_id
        AND courses.creator_id = auth.uid()
    )
  );

-- ============================================================
-- ENROLLMENTS TABLE
-- Entitlement records — write only via service role (webhook)
-- ============================================================

-- Students can read their own enrollments; creators can read enrollments in their courses
CREATE POLICY "enrollments: user read own"
  ON public.enrollments FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
        AND courses.creator_id = auth.uid()
    )
  );

-- INSERT via service role only (webhook handler) — no authenticated user INSERT
-- If you want to allow free enrollments (price_cents = 0), add:
CREATE POLICY "enrollments: free course self-enroll"
  ON public.enrollments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
        AND courses.price_cents = 0
        AND courses.published = true
    )
  );

-- No UPDATE or DELETE for authenticated users — service role only

-- ============================================================
-- QUIZ ATTEMPTS TABLE
-- ============================================================

-- Students can read their own attempts; creators can read attempts for their courses
CREATE POLICY "quiz_attempts: user read own"
  ON public.quiz_attempts FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.lessons
      JOIN public.courses ON courses.id = lessons.course_id
      WHERE lessons.id = quiz_attempts.lesson_id
        AND courses.creator_id = auth.uid()
    )
  );

-- Students can insert their own attempts (only if enrolled)
CREATE POLICY "quiz_attempts: enrolled user insert"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.enrollments
      JOIN public.lessons ON lessons.id = quiz_attempts.lesson_id
      WHERE enrollments.user_id = auth.uid()
        AND enrollments.course_id = lessons.course_id
        AND enrollments.entitlement_granted_at IS NOT NULL
        AND enrollments.entitlement_revoked_at IS NULL
    )
  );

-- ============================================================
-- AFFILIATES TABLE
-- ============================================================

-- Affiliates can read their own records; creators can read affiliates for their courses
CREATE POLICY "affiliates: read own"
  ON public.affiliates FOR SELECT
  USING (
    user_id = auth.uid()
    OR creator_id = auth.uid()
  );

-- Creators can create affiliate codes for their courses
CREATE POLICY "affiliates: creator insert"
  ON public.affiliates FOR INSERT
  WITH CHECK (
    creator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = affiliates.course_id
        AND courses.creator_id = auth.uid()
    )
  );

-- Creators can update/deactivate affiliate codes
CREATE POLICY "affiliates: creator update"
  ON public.affiliates FOR UPDATE
  USING (creator_id = auth.uid());

-- ============================================================
-- AFFILIATE CLICKS TABLE
-- ============================================================

-- Affiliates and creators can read click stats
CREATE POLICY "affiliate_clicks: read"
  ON public.affiliate_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = affiliate_clicks.affiliate_id
        AND (affiliates.user_id = auth.uid() OR affiliates.creator_id = auth.uid())
    )
  );

-- Clicks are inserted via service role (middleware/server-side) only
-- No authenticated user INSERT policy — prevents click fraud

-- ============================================================
-- AFFILIATE CONVERSIONS TABLE
-- ============================================================

-- Affiliates can read their own conversions; creators can read conversions for their courses
CREATE POLICY "affiliate_conversions: read"
  ON public.affiliate_conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = affiliate_conversions.affiliate_id
        AND (affiliates.user_id = auth.uid() OR affiliates.creator_id = auth.uid())
    )
  );

-- Conversions are inserted via service role only (webhook handler)
-- No authenticated user INSERT policy

-- ============================================================
-- ANALYTICS EVENTS TABLE
-- ============================================================

-- Users can read their own analytics events (for their profile/stats page)
CREATE POLICY "analytics_events: user read own"
  ON public.analytics_events FOR SELECT
  USING (user_id = auth.uid());

-- Creators can read events for their courses (course-level analytics)
CREATE POLICY "analytics_events: creator read course events"
  ON public.analytics_events FOR SELECT
  USING (
    course_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = analytics_events.course_id
        AND courses.creator_id = auth.uid()
    )
  );

-- INSERT is via service role only (server-side) — prevents spoofing
-- Client-side analytics should call a server Route Handler, not insert directly
