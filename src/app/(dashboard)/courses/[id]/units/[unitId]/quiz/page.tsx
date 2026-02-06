'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Question = {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching';
  question_text: string;
  options_json: string | null;
  points: number;
  sort_order: number;
};

type QuizAttempt = {
  id: string;
  enrollment_id: string;
  unit_id: string;
  score: number | null;
  passed: number | null;
  started_at: string;
  completed_at: string | null;
};

type Unit = {
  id: string;
  name: string;
  course_id: string;
  settings_json: string;
};

type Course = {
  id: string;
  name: string;
};

type Answer = {
  question_id: string;
  answer: string;
};

export default function QuizPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id: courseId, unitId } = use(params);

  const [course, setCourse] = useState<Course | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    earnedPoints: number;
    totalPoints: number;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch quiz data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch course
        const courseRes = await fetch(`/api/courses/${courseId}`);
        if (!courseRes.ok) {
          setError('Course not found');
          return;
        }
        const courseData = await courseRes.json();
        setCourse(courseData.course);

        // Find unit
        const targetUnit = courseData.units?.find((u: Unit) => u.id === unitId);
        if (!targetUnit || targetUnit.type !== 'quiz') {
          setError('Quiz not found');
          return;
        }
        setUnit(targetUnit);

        // Fetch questions
        const questionsRes = await fetch(`/api/questions?unit_id=${unitId}`);
        const questionsData = await questionsRes.json();
        setQuestions(questionsData.questions || []);

        // Start or resume attempt
        const attemptRes = await fetch('/api/quiz-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unit_id: unitId }),
        });

        if (!attemptRes.ok) {
          const err = await attemptRes.json();
          setError(err.error || 'Failed to start quiz');
          return;
        }

        const attemptData = await attemptRes.json();
        setAttempt(attemptData.attempt);

        // If resuming, load existing answers
        if (attemptData.resumed && attemptData.attempt.id) {
          const attemptDetails = await fetch(`/api/quiz-attempts/${attemptData.attempt.id}`);
          const details = await attemptDetails.json();
          if (details.answers?.length > 0) {
            const existingAnswers = new Map<string, string>();
            details.answers.forEach((a: { question_id: string; answer: string }) => {
              if (a.answer) existingAnswers.set(a.question_id, a.answer);
            });
            setAnswers(existingAnswers);
          }
        }

        // Set up timer if time limit exists
        const settings = JSON.parse(targetUnit.settings_json || '{}');
        if (settings.time_limit_minutes && !attemptData.attempt.completed_at) {
          const startTime = new Date(attemptData.attempt.started_at).getTime();
          const limitMs = settings.time_limit_minutes * 60 * 1000;
          const remaining = Math.max(0, startTime + limitMs - Date.now());
          setTimeRemaining(Math.floor(remaining / 1000));
        }
      } catch (err) {
        console.error('Failed to load quiz:', err);
        setError('Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, unitId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || result) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, result]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      newAnswers.set(questionId, answer);
      return newAnswers;
    });
  };

  const handleSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);

    try {
      const answersArray: Answer[] = [];
      questions.forEach((q) => {
        answersArray.push({
          question_id: q.id,
          answer: answers.get(q.id) || '',
        });
      });

      const res = await fetch(`/api/quiz-attempts/${attempt.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArray }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to submit quiz');
        return;
      }

      const data = await res.json();
      setResult({
        score: data.score,
        passed: data.passed,
        earnedPoints: data.earnedPoints,
        totalPoints: data.totalPoints,
      });
      setAttempt(data.attempt);
    } catch (err) {
      console.error('Failed to submit:', err);
      setError('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseOptions = (optionsJson: string | null): string[] => {
    if (!optionsJson) return [];
    try {
      return JSON.parse(optionsJson);
    } catch {
      return [];
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = answers.size;
  const totalQuestions = questions.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-slate-500">Loading quiz...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">{error}</h2>
          <Link
            href={`/learn/${courseId}`}
            className="text-blue-600 hover:underline"
          >
            Return to course
          </Link>
        </div>
      </div>
    );
  }

  // Show results
  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 py-6 md:py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 text-center">
            {result.passed ? (
              <>
                <div className="w-16 md:w-20 h-16 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <CheckCircle2 className="w-8 md:w-10 h-8 md:h-10 text-green-600" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                  Congratulations! 🎉
                </h1>
                <p className="text-slate-600 mb-4 md:mb-6">You passed the quiz!</p>
              </>
            ) : (
              <>
                <div className="w-16 md:w-20 h-16 md:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <XCircle className="w-8 md:w-10 h-8 md:h-10 text-red-600" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                  Not quite there
                </h1>
                <p className="text-slate-600 mb-4 md:mb-6">
                  Review the material and try again!
                </p>
              </>
            )}

            <div className="bg-slate-50 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
              <div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
                {result.score}%
              </div>
              <div className="text-sm md:text-base text-slate-500">
                {result.earnedPoints} / {result.totalPoints} points
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
              <Link
                href={`/learn/${courseId}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 border border-slate-300 rounded-lg hover:bg-slate-50 min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Course
              </Link>
              {!result.passed && (
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </button>
              )}
              {result.passed && (
                <Link
                  href="/my-certificates"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
                >
                  <Award className="w-4 h-4" />
                  View Certificate
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <Link
              href={`/learn/${courseId}`}
              className="p-2 hover:bg-slate-100 rounded-lg shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <div className="text-xs md:text-sm text-slate-500 truncate">{course?.name}</div>
              <h1 className="font-semibold text-slate-900 text-sm md:text-base truncate">{unit?.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {timeRemaining !== null && (
              <div
                className={cn(
                  'flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-sm',
                  timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-slate-100'
                )}
              >
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timeRemaining)}</span>
              </div>
            )}
            <div className="text-xs md:text-sm text-slate-500">
              {answeredCount}/{totalQuestions}
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(i)}
                className={cn(
                  'flex-1 h-2 rounded-full transition-colors min-w-[8px]',
                  i === currentQuestionIndex
                    ? 'bg-blue-600'
                    : answers.has(q.id)
                    ? 'bg-green-400'
                    : 'bg-slate-200'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {currentQuestion && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <span className="text-xs md:text-sm text-slate-500">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="text-xs md:text-sm text-slate-500">
                {currentQuestion.points} pt{currentQuestion.points !== 1 ? 's' : ''}
              </span>
            </div>

            <h2 className="text-base md:text-xl font-medium text-slate-900 mb-4 md:mb-6">
              {currentQuestion.question_text}
            </h2>

            {/* Multiple Choice */}
            {currentQuestion.type === 'multiple_choice' && (
              <div className="space-y-2 md:space-y-3">
                {parseOptions(currentQuestion.options_json).map((option, idx) => (
                  <label
                    key={idx}
                    className={cn(
                      'flex items-center gap-3 p-3 md:p-4 rounded-lg border cursor-pointer transition-colors',
                      answers.get(currentQuestion.id) === option
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers.get(currentQuestion.id) === option}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-sm md:text-base">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* True/False */}
            {currentQuestion.type === 'true_false' && (
              <div className="space-y-2 md:space-y-3">
                {['True', 'False'].map((option) => (
                  <label
                    key={option}
                    className={cn(
                      'flex items-center gap-3 p-3 md:p-4 rounded-lg border cursor-pointer transition-colors',
                      answers.get(currentQuestion.id) === option
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers.get(currentQuestion.id) === option}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-sm md:text-base">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Fill in the Blank */}
            {currentQuestion.type === 'fill_blank' && (
              <input
                type="text"
                value={answers.get(currentQuestion.id) || ''}
                onChange={(e) =>
                  handleAnswerChange(currentQuestion.id, e.target.value)
                }
                placeholder="Type your answer..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 md:mt-6">
          <button
            onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] order-2 sm:order-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-6 py-2.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 min-h-[44px] order-1 sm:order-2"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))
              }
              className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px] order-1 sm:order-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
