import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { type, token, signupId, sessionId, testerId, answers, completionTimeSeconds, attentionCheckQuestion, attentionCheckAnswer, attentionCheckPassed } = body

  if (!type || !token || !signupId || !sessionId) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify token matches signup
  const { data: signup } = await supabase
    .from('session_signups')
    .select('id, tester_id, pre_survey_completed')
    .eq('consent_token', token)
    .eq('id', signupId)
    .single()

  if (!signup) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 403 })
  }

  if (type === 'pre') {
    // Prevent double-submission
    if (signup.pre_survey_completed) {
      return NextResponse.json({ success: true, message: 'Already submitted' })
    }

    const { error } = await supabase.from('pre_session_surveys').insert({
      signup_id: signupId,
      session_id: sessionId,
      tester_id: signup.tester_id,
      experience_level: answers.experience_level || null,
      games_per_month: answers.games_per_month || null,
      familiar_with_genre: answers.familiar_with_genre ?? null,
      preferred_role: answers.preferred_role || null,
      device_type: answers.device_type || null,
      timezone: answers.timezone || null,
      accessibility_needs: answers.accessibility_needs || null,
      availability_notes: answers.availability_notes || null,
      raw_answers: answers,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Mark pre-survey done on signup
    await supabase
      .from('session_signups')
      .update({
        pre_survey_completed: true,
        pre_survey_completed_at: new Date().toISOString(),
      })
      .eq('id', signupId)

    return NextResponse.json({ success: true })
  }

  if (type === 'post') {
    const {
      overall_rating, clarity_rating, fun_rating,
      confusion_areas, rules_clarity_notes, suggested_changes,
      most_enjoyed, time_played_minutes, would_play_again,
    } = answers

    const { error } = await supabase.from('session_feedback').insert({
      session_id: sessionId,
      signup_id: signupId,
      tester_id: signup.tester_id,
      overall_rating: overall_rating || null,
      clarity_rating: clarity_rating || null,
      fun_rating: fun_rating || null,
      confusion_areas: confusion_areas || null,
      rules_clarity_notes: rules_clarity_notes || null,
      suggested_changes: suggested_changes || null,
      most_enjoyed: most_enjoyed || null,
      time_played_minutes: time_played_minutes || null,
      completion_time_seconds: completionTimeSeconds ?? null,
      attention_check_question: attentionCheckQuestion ?? null,
      attention_check_answer: attentionCheckAnswer ?? null,
      attention_check_passed: attentionCheckPassed ?? null,
      would_play_again: would_play_again ?? null,
      feedback_type: 'post',
      raw_feedback: answers,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: 'Unknown survey type' }, { status: 400 })
}
