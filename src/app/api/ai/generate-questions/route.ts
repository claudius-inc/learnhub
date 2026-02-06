import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

type GeneratedQuestion = {
  type: 'multiple_choice' | 'true_false' | 'fill_blank';
  question_text: string;
  options?: string[];
  correct_answer: string;
  points: number;
};

// POST /api/ai/generate-questions - Generate quiz questions from content
export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser || currentUser.role === 'learner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      course_id, 
      content, 
      count = 5, 
      types = ['multiple_choice', 'true_false', 'fill_blank'] 
    } = body;

    if (!course_id) {
      return NextResponse.json(
        { error: 'course_id is required' },
        { status: 400 }
      );
    }

    // If no content provided, fetch from course units
    let sourceContent = content;
    if (!sourceContent) {
      const units = await query<{ name: string; content: string | null }>(
        `SELECT name, content FROM units WHERE course_id = ? AND type = 'text' ORDER BY sort_order`,
        [course_id]
      );
      
      if (units.length === 0) {
        return NextResponse.json(
          { error: 'No text content found in course. Please provide content or add text units.' },
          { status: 400 }
        );
      }

      sourceContent = units
        .map((u) => `${u.name}\n${u.content || ''}`)
        .join('\n\n')
        .slice(0, 8000); // Limit content length
    }

    if (!sourceContent || sourceContent.trim().length < 50) {
      return NextResponse.json(
        { error: 'Content must be at least 50 characters' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    const allowedTypes = types.join(', ');
    
    const prompt = `Based on the following course content, generate ${count} quiz questions.

CONTENT:
${sourceContent}

Generate exactly ${count} questions using these types: ${allowedTypes}

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question_text": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "points": 1
    },
    {
      "type": "true_false",
      "question_text": "Statement to evaluate as true or false",
      "correct_answer": "True",
      "points": 1
    },
    {
      "type": "fill_blank",
      "question_text": "The _____ is responsible for...",
      "correct_answer": "answer word",
      "points": 1
    }
  ]
}

Rules:
- multiple_choice: Must have exactly 4 options, correct_answer must be one of the options
- true_false: correct_answer must be exactly "True" or "False"
- fill_blank: Use _____ to indicate the blank, correct_answer is the missing word/phrase
- Questions should test understanding, not just memorization
- Vary question difficulty (mix easy and moderate questions)
- Each question is worth 1 point unless particularly complex (then 2)`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          messages: [
            {
              role: 'system',
              content: 'You are an expert quiz creator. Generate clear, fair questions that test understanding. Always respond with valid JSON only, no markdown formatting.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2500,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'AI service error' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 502 }
      );
    }

    // Parse the JSON response
    let result;
    try {
      const cleanContent = responseContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseContent);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 502 }
      );
    }

    // Validate and clean questions
    if (!result.questions || !Array.isArray(result.questions)) {
      return NextResponse.json(
        { error: 'Invalid response structure from AI' },
        { status: 502 }
      );
    }

    const validatedQuestions: GeneratedQuestion[] = result.questions
      .filter((q: GeneratedQuestion) => {
        if (!q.type || !q.question_text || !q.correct_answer) return false;
        if (q.type === 'multiple_choice' && (!q.options || q.options.length !== 4)) return false;
        if (q.type === 'true_false' && !['True', 'False'].includes(q.correct_answer)) return false;
        return true;
      })
      .map((q: GeneratedQuestion) => ({
        type: q.type,
        question_text: q.question_text,
        options: q.options || null,
        correct_answer: q.correct_answer,
        points: q.points || 1,
      }));

    return NextResponse.json({ 
      questions: validatedQuestions,
      count: validatedQuestions.length 
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
