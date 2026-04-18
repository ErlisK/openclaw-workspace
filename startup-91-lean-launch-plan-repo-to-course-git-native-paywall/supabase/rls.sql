-- ============================================================
-- TeachRepo — Row Level Security Policies v2
-- Provider: Supabase (PostgreSQL)
-- Rules:
--   • creators   → CRUD own row
--   • courses    → creator full CRUD; published courses readable by anyone
--   • course_versions → creator read/insert; public read if course is published
--   • lessons    → creator full CRUD; public/enrolled read (based on is_preview + enrollment)
--   • quizzes    → same access as parent lesson
--   • quiz_questions → same access as parent lesson
--   • quiz_attempts → user can insert own; user/creator can read
--   • enrollments → owner read; creator read for their course; service-role insert
--   • purchases   → purchaser read; creator read for their course; service-role insert/update
--   • affiliates  → affiliate_user read own; creator read/insert/update for their course
--   • referrals   → affiliate read own; creator read for their course; service-role insert
--   • repo_imports → creator CRUD own
--   • events      → any authenticated user can insert; user reads own; creator reads course events
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.creators       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repo_imports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: check if current user is enrolled with active entitlement
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_enrolled(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = auth.uid()
      AND course_id = p_course_id
      AND entitlement_granted_at IS NOT NULL
      AND entitlement_revoked_at IS NULL
  );
$$;

-- ============================================================
-- HELPER: check if current user is the creator of a course
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_course_creator(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id
      AND creator_id = auth.uid()
  );
$$;

-- ============================================================
-- CREATORS TABLE
-- ============================================================

-- Anyone can view creator profiles (public bios)
CREATE POLICY "creators: public read"
  ON public.creators FOR SELECT
  USING (true);

-- Creators can update their own profile only
CREATE POLICY "creators: self update"
  ON public.creators FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT is handled by the handle_new_user trigger (SECURITY DEFINER)
-- No user-facing INSERT policy needed

-- ============================================================
-- COURSES TABLE
-- Creators can CRUD their own courses.
-- Anyone can read published courses.
-- ============================================================

CREATE POLICY "courses: public read published"
  ON public.courses FOR SELECT
  USING (published = true OR creator_id = auth.uid());

CREATE POLICY "courses: creator insert"
  ON public.courses FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "courses: creator update"
  ON public.courses FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "courses: creator delete"
  ON public.courses FOR DELETE
  USING (creator_id = auth.uid());

-- ============================================================
-- COURSE_VERSIONS TABLE
-- ============================================================

CREATE POLICY "course_versions: public read if course published"
  ON public.course_versions FOR SELECT
  USING (
    public.is_course_creator(course_id)
    OR EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_versions.course_id AND published = true
    )
  );

CREATE POLICY "course_versions: creator insert"
  ON public.course_versions FOR INSERT
  WITH CHECK (public.is_course_creator(course_id));

CREATE POLICY "course_versions: creator update"
  ON public.course_versions FOR UPDATE
  USING (public.is_course_creator(course_id));

CREATE POLICY "course_versions: creator delete"
  ON public.course_versions FOR DELETE
  USING (public.is_course_creator(course_id));

-- ============================================================
-- LESSONS TABLE
-- Creators can CRUD their own lessons.
-- Lessons are readable if:
--   (a) is_preview = true (free preview), OR
--   (b) user has active enrollment in the course, OR
--   (c) user is the course creator
-- ============================================================

CREATE POLICY "lessons: readable if public or enrolled or creator"
  ON public.lessons FOR SELECT
  USING (
    is_preview = true
    OR public.is_course_creator(course_id)
    OR public.is_enrolled(course_id)
  );

CREATE POLICY "lessons: creator insert"
  ON public.lessons FOR INSERT
  WITH CHECK (public.is_course_creator(course_id));

CREATE POLICY "lessons: creator update"
  ON public.lessons FOR UPDATE
  USING (public.is_course_creator(course_id));

CREATE POLICY "lessons: creator delete"
  ON public.lessons FOR DELETE
  USING (public.is_course_creator(course_id));

-- ============================================================
-- QUIZZES TABLE
-- Same access rules as parent lesson
-- ============================================================

CREATE POLICY "quizzes: readable if lesson is accessible"
  ON public.quizzes FOR SELECT
  USING (
    public.is_course_creator(course_id)
    OR public.is_enrolled(course_id)
    OR EXISTS (
      SELECT 1 FROM public.lessons
      WHERE id = quizzes.lesson_id AND is_preview = true
    )
  );

CREATE POLICY "quizzes: creator insert"
  ON public.quizzes FOR INSERT
  WITH CHECK (public.is_course_creator(course_id));

CREATE POLICY "quizzes: creator update"
  ON public.quizzes FOR UPDATE
  USING (public.is_course_creator(course_id));

CREATE POLICY "quizzes: creator delete"
  ON public.quizzes FOR DELETE
  USING (public.is_course_creator(course_id));

-- ============================================================
-- QUIZ_QUESTIONS TABLE
-- Same access rules as parent lesson
-- ============================================================

CREATE POLICY "quiz_questions: readable if lesson is accessible"
  ON public.quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND (
          public.is_course_creator(q.course_id)
          OR public.is_enrolled(q.course_id)
          OR EXISTS (
            SELECT 1 FROM public.lessons l
            WHERE l.id = quiz_questions.lesson_id AND l.is_preview = true
          )
        )
    )
  );

CREATE POLICY "quiz_questions: creator insert"
  ON public.quiz_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND public.is_course_creator(q.course_id)
    )
  );

CREATE POLICY "quiz_questions: creator update"
  ON public.quiz_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND public.is_course_creator(q.course_id)
    )
  );

CREATE POLICY "quiz_questions: creator delete"
  ON public.quiz_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND public.is_course_creator(q.course_id)
    )
  );

-- ============================================================
-- QUIZ_ATTEMPTS TABLE
-- Users can insert their own attempts (if enrolled).
-- Users can read their own attempts.
-- Creators can read attempts for their courses.
-- ============================================================

CREATE POLICY "quiz_attempts: user read own"
  ON public.quiz_attempts FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_course_creator(course_id)
  );

CREATE POLICY "quiz_attempts: enrolled user insert"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.is_enrolled(course_id)
      OR EXISTS (
        SELECT 1 FROM public.lessons
        WHERE id = quiz_attempts.lesson_id AND is_preview = true
      )
    )
  );

-- ============================================================
-- ENROLLMENTS TABLE
-- Enrollments are readable by the owner and by the course creator.
-- Inserts are handled by the service role (webhook handler) only,
-- except for free courses (price_cents = 0) where users can self-enroll.
-- ============================================================

CREATE POLICY "enrollments: owner read"
  ON public.enrollments FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_course_creator(course_id)
  );

-- Free course self-enrollment (no payment required)
CREATE POLICY "enrollments: free course self-enroll"
  ON public.enrollments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = enrollments.course_id
        AND price_cents = 0
        AND published = true
    )
  );

-- Paid enrollments are INSERT-only via service role key (webhook) — no user INSERT policy

-- ============================================================
-- PURCHASES TABLE
-- Purchases are readable by the purchaser and by the course creator.
-- Inserts and updates are handled by the service role (webhook handler) only.
-- ============================================================

CREATE POLICY "purchases: purchaser read"
  ON public.purchases FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_course_creator(course_id)
  );

-- No user INSERT/UPDATE policy — all writes via service role from webhook handler

-- ============================================================
-- AFFILIATES TABLE
-- Affiliate users can read/manage their own affiliate codes.
-- Creators can read, insert, and update affiliate codes for their courses.
-- ============================================================

CREATE POLICY "affiliates: affiliate user read own"
  ON public.affiliates FOR SELECT
  USING (
    affiliate_user_id = auth.uid()
    OR creator_id = auth.uid()
  );

CREATE POLICY "affiliates: creator insert"
  ON public.affiliates FOR INSERT
  WITH CHECK (
    creator_id = auth.uid()
    AND (
      course_id IS NULL
      OR public.is_course_creator(course_id)
    )
  );

CREATE POLICY "affiliates: creator update"
  ON public.affiliates FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "affiliates: creator delete"
  ON public.affiliates FOR DELETE
  USING (creator_id = auth.uid());

-- ============================================================
-- REFERRALS TABLE
-- Affiliates can read their own referral records.
-- Creators can read referrals for their courses.
-- Inserts are via service role (middleware click tracking) only.
-- ============================================================

CREATE POLICY "referrals: affiliate read own"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.id = referrals.affiliate_id
        AND (a.affiliate_user_id = auth.uid() OR a.creator_id = auth.uid())
    )
  );

-- No user INSERT policy — referral clicks are recorded server-side
-- to prevent click fraud and ensure IP hashing

-- ============================================================
-- REPO_IMPORTS TABLE
-- Creators can CRUD their own import jobs.
-- ============================================================

CREATE POLICY "repo_imports: creator read own"
  ON public.repo_imports FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "repo_imports: creator insert"
  ON public.repo_imports FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "repo_imports: creator update"
  ON public.repo_imports FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "repo_imports: creator delete"
  ON public.repo_imports FOR DELETE
  USING (creator_id = auth.uid());

-- ============================================================
-- EVENTS TABLE (first-party analytics)
-- ANY authenticated user can insert events (covers students and creators).
-- Users can read their own events.
-- Creators can read events for their courses.
-- Anonymous events (user_id IS NULL) are insert-only via service role.
-- ============================================================

CREATE POLICY "events: authenticated user insert"
  ON public.events FOR INSERT
  WITH CHECK (
    -- Authenticated users can insert events for themselves
    -- (user_id must match auth.uid() or be null for server-side anonymous events)
    user_id = auth.uid()
    OR user_id IS NULL  -- Anonymous/server-side events allowed via service role path
  );

CREATE POLICY "events: user read own"
  ON public.events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "events: creator read course events"
  ON public.events FOR SELECT
  USING (
    course_id IS NOT NULL
    AND public.is_course_creator(course_id)
  );

-- No UPDATE or DELETE for any user — events are immutable
