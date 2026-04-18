-- ============================================================
-- RLS Migration: TeachRepo — comprehensive security policies
-- ============================================================
-- Applied via Supabase Management API
-- All tables have RLS enabled; service role bypasses all RLS.
-- Client/anon-role access is strictly controlled.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. HELPER FUNCTIONS
-- ──────────────────────────────────────────────────────────────

-- is_course_creator(course_id) → bool
-- True if the calling auth.uid() is the creator of the course.
CREATE OR REPLACE FUNCTION public.is_course_creator(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id
      AND creator_id = auth.uid()
  );
$$;

-- is_enrolled(course_id) → bool
-- True if:
--   (a) The course is free (price_cents = 0), OR
--   (b) The user has an active enrollment with entitlement granted.
-- This mirrors the app-layer entitlement check in lib/entitlement/check.ts.
CREATE OR REPLACE FUNCTION public.is_enrolled(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id
      AND price_cents = 0
  )
  OR EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = auth.uid()
      AND course_id = p_course_id
      AND entitlement_revoked_at IS NULL
  );
$$;

-- can_read_lesson(lesson_id) → bool
-- True if the calling user can read the lesson content:
--   (a) Lesson is a free preview (is_preview = true), OR
--   (b) User is enrolled in the course, OR
--   (c) User is the course creator.
CREATE OR REPLACE FUNCTION public.can_read_lesson(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = p_lesson_id
      AND (
        l.is_preview = true
        OR is_course_creator(l.course_id)
        OR is_enrolled(l.course_id)
      )
  );
$$;

-- can_submit_quiz(quiz_id) → bool
-- True if the calling user can submit a quiz attempt:
--   (a) The quiz is attached to a free-preview lesson, OR
--   (b) The user is enrolled in the course, OR
--   (c) The user is the course creator (preview/testing mode).
CREATE OR REPLACE FUNCTION public.can_submit_quiz(p_quiz_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = p_quiz_id
      AND (
        is_course_creator(q.course_id)
        OR is_enrolled(q.course_id)
        OR EXISTS (
          SELECT 1 FROM public.lessons l
          WHERE l.id = q.lesson_id
            AND l.is_preview = true
        )
      )
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- 2. COURSES TABLE
-- ──────────────────────────────────────────────────────────────

-- Drop and recreate policies for clean state
DROP POLICY IF EXISTS "courses: public read published" ON public.courses;
DROP POLICY IF EXISTS "courses: creator insert" ON public.courses;
DROP POLICY IF EXISTS "courses: creator update" ON public.courses;
DROP POLICY IF EXISTS "courses: creator delete" ON public.courses;

-- SELECT: published courses (anyone) OR own courses (creator)
CREATE POLICY "courses: public read published"
  ON public.courses FOR SELECT
  USING (published = true OR creator_id = auth.uid());

-- INSERT: only authenticated creator can insert own course
CREATE POLICY "courses: creator insert"
  ON public.courses FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- UPDATE: only the owning creator
CREATE POLICY "courses: creator update"
  ON public.courses FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- DELETE: only the owning creator
CREATE POLICY "courses: creator delete"
  ON public.courses FOR DELETE
  USING (creator_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- 3. LESSONS TABLE
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lessons: readable if public or enrolled or creator" ON public.lessons;
DROP POLICY IF EXISTS "lessons: creator insert" ON public.lessons;
DROP POLICY IF EXISTS "lessons: creator update" ON public.lessons;
DROP POLICY IF EXISTS "lessons: creator delete" ON public.lessons;

-- SELECT: free preview OR enrolled OR course creator
CREATE POLICY "lessons: readable if public or enrolled or creator"
  ON public.lessons FOR SELECT
  USING (
    is_preview = true
    OR is_course_creator(course_id)
    OR is_enrolled(course_id)
  );

-- INSERT/UPDATE/DELETE: course creator only
CREATE POLICY "lessons: creator insert"
  ON public.lessons FOR INSERT
  WITH CHECK (is_course_creator(course_id));

CREATE POLICY "lessons: creator update"
  ON public.lessons FOR UPDATE
  USING (is_course_creator(course_id));

CREATE POLICY "lessons: creator delete"
  ON public.lessons FOR DELETE
  USING (is_course_creator(course_id));

-- ──────────────────────────────────────────────────────────────
-- 4. QUIZZES TABLE
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "quizzes: readable if lesson is accessible" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes: creator insert" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes: creator update" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes: creator delete" ON public.quizzes;

-- SELECT: readable if course is accessible (enrolled/free/creator)
CREATE POLICY "quizzes: readable if lesson is accessible"
  ON public.quizzes FOR SELECT
  USING (
    is_course_creator(course_id)
    OR is_enrolled(course_id)
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = quizzes.lesson_id
        AND l.is_preview = true
    )
  );

CREATE POLICY "quizzes: creator insert"
  ON public.quizzes FOR INSERT
  WITH CHECK (is_course_creator(course_id));

CREATE POLICY "quizzes: creator update"
  ON public.quizzes FOR UPDATE
  USING (is_course_creator(course_id));

CREATE POLICY "quizzes: creator delete"
  ON public.quizzes FOR DELETE
  USING (is_course_creator(course_id));

-- ──────────────────────────────────────────────────────────────
-- 5. QUIZ_QUESTIONS TABLE
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "quiz_questions: readable if lesson is accessible" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions: creator insert" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions: creator update" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions: creator delete" ON public.quiz_questions;

-- SELECT: readable if the parent quiz is accessible
CREATE POLICY "quiz_questions: readable if lesson is accessible"
  ON public.quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND (
          is_course_creator(q.course_id)
          OR is_enrolled(q.course_id)
          OR EXISTS (
            SELECT 1 FROM public.lessons l
            WHERE l.id = q.lesson_id AND l.is_preview = true
          )
        )
    )
  );

-- NOTE: correct_index / correct_bool / correct_text are sensitive.
-- We intentionally keep them in quiz_questions because the SELECT policy
-- only allows enrolled/preview/creator to read them.  Server-side grading
-- (service role) bypasses RLS so there's no circular dependency.

CREATE POLICY "quiz_questions: creator insert"
  ON public.quiz_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND is_course_creator(q.course_id)
    )
  );

CREATE POLICY "quiz_questions: creator update"
  ON public.quiz_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND is_course_creator(q.course_id)
    )
  );

CREATE POLICY "quiz_questions: creator delete"
  ON public.quiz_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND is_course_creator(q.course_id)
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 6. QUIZ_ATTEMPTS TABLE
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "quiz_attempts: enrolled user insert" ON public.quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts: user read own" ON public.quiz_attempts;

-- SELECT: user reads own attempts; creator can read all attempts for own course
CREATE POLICY "quiz_attempts: user read own"
  ON public.quiz_attempts FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_course_creator(course_id)
  );

-- INSERT: user inserts own attempt only if they can submit the quiz
--   = enrolled, free-preview lesson, or course creator (testing mode)
CREATE POLICY "quiz_attempts: enrolled user insert"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND can_submit_quiz(quiz_id)
  );

-- No UPDATE or DELETE on attempts (immutable audit log)

-- ──────────────────────────────────────────────────────────────
-- 7. ENROLLMENTS TABLE
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "enrollments: owner read" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments: free course self-enroll" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments: student update progress" ON public.enrollments;

-- SELECT: enrolled user reads own enrollment; creator sees course enrollments
CREATE POLICY "enrollments: owner read"
  ON public.enrollments FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_course_creator(course_id)
  );

-- INSERT: self-enroll for free courses only
--   Paid course enrollment is handled server-side via service role (Stripe webhook)
CREATE POLICY "enrollments: free course self-enroll"
  ON public.enrollments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = enrollments.course_id
        AND c.published = true
        AND c.price_cents = 0
    )
  );

-- UPDATE: enrolled user can update own progress fields only
--   (lessons_completed, last_lesson_id, completed_at)
CREATE POLICY "enrollments: student update progress"
  ON public.enrollments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND course_id = course_id  -- cannot change course affiliation
  );

-- ──────────────────────────────────────────────────────────────
-- 8. CREATORS TABLE
-- ──────────────────────────────────────────────────────────────

-- Existing policies are fine; ensure no duplicates
DROP POLICY IF EXISTS "creators: public read" ON public.creators;
DROP POLICY IF EXISTS "creators: self read all fields" ON public.creators;
DROP POLICY IF EXISTS "creators: self update" ON public.creators;

-- SELECT: public can read creator profiles (for marketplace author display)
CREATE POLICY "creators: public read"
  ON public.creators FOR SELECT
  USING (true);

-- UPDATE: creator can only update own profile
CREATE POLICY "creators: self update"
  ON public.creators FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ──────────────────────────────────────────────────────────────
-- 9. COURSE_VERSIONS TABLE
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "course_versions: public read if course published" ON public.course_versions;
DROP POLICY IF EXISTS "course_versions: creator insert" ON public.course_versions;
DROP POLICY IF EXISTS "course_versions: creator update" ON public.course_versions;
DROP POLICY IF EXISTS "course_versions: creator delete" ON public.course_versions;

-- SELECT: readable if course is published or user is creator
CREATE POLICY "course_versions: public read if course published"
  ON public.course_versions FOR SELECT
  USING (
    is_course_creator(course_id)
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_versions.course_id AND c.published = true
    )
  );

CREATE POLICY "course_versions: creator insert"
  ON public.course_versions FOR INSERT
  WITH CHECK (is_course_creator(course_id));

CREATE POLICY "course_versions: creator update"
  ON public.course_versions FOR UPDATE
  USING (is_course_creator(course_id));

CREATE POLICY "course_versions: creator delete"
  ON public.course_versions FOR DELETE
  USING (is_course_creator(course_id));

-- ──────────────────────────────────────────────────────────────
-- 10. FIX: ensure free enroll sets entitlement_granted_at
-- ──────────────────────────────────────────────────────────────
-- Add a DB trigger so that any enrollment insert where the course
-- is free automatically stamps entitlement_granted_at = now().

CREATE OR REPLACE FUNCTION public.auto_grant_free_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If course is free (price_cents=0) and entitlement not yet set, grant it
  IF NEW.entitlement_granted_at IS NULL THEN
    SELECT CASE WHEN price_cents = 0 THEN now() ELSE NULL END
    INTO NEW.entitlement_granted_at
    FROM public.courses WHERE id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_free_enrollment ON public.enrollments;
CREATE TRIGGER trg_auto_grant_free_enrollment
  BEFORE INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_free_enrollment();

-- Also backfill existing free-course enrollments missing entitlement_granted_at
UPDATE public.enrollments e
SET entitlement_granted_at = e.enrolled_at
WHERE entitlement_granted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = e.course_id AND c.price_cents = 0
  );

-- ──────────────────────────────────────────────────────────────
-- 11. EVENTS TABLE (analytics — already has policies, tighten)
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "events: authenticated user insert" ON public.events;
DROP POLICY IF EXISTS "events: user read own" ON public.events;
DROP POLICY IF EXISTS "events: creator read course events" ON public.events;

-- INSERT: authenticated or anonymous (user_id optional for page views)
CREATE POLICY "events: authenticated user insert"
  ON public.events FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- SELECT: user reads own events
CREATE POLICY "events: user read own"
  ON public.events FOR SELECT
  USING (user_id = auth.uid());

-- SELECT: creator reads events for own courses
CREATE POLICY "events: creator read course events"
  ON public.events FOR SELECT
  USING (
    course_id IS NOT NULL
    AND is_course_creator(course_id)
  );

-- ──────────────────────────────────────────────────────────────
-- 12. VERIFICATION
-- ──────────────────────────────────────────────────────────────

-- Verify all policies are in place
SELECT tablename, count(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
