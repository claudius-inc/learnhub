import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

type OutlineSection = {
  name: string;
  units: {
    name: string;
    type: 'text' | 'video' | 'quiz';
    description: string;
  }[];
};

// POST /api/ai/generate-outline - Generate course outline from topic
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
    const { topic, level = 'intermediate', unitCount = 5 } = body;

    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      return NextResponse.json(
        { error: 'Topic is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[AI Generate] GEMINI_API_KEY present:', !!apiKey, 'length:', apiKey?.length || 0);
    if (!apiKey) {
      console.error('[AI Generate] GEMINI_API_KEY is not set in environment');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    const prompt = `Generate a course outline for teaching "${topic}" at a ${level} level.

Create a structured course with approximately ${unitCount} learning units organized into logical sections.

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "name": "Course Title",
  "description": "A 2-3 sentence course description",
  "sections": [
    {
      "name": "Section Name",
      "units": [
        {"name": "Unit Title", "type": "text", "description": "Brief description of what this unit covers"},
        {"name": "Quiz: Section Assessment", "type": "quiz", "description": "Test knowledge from this section"}
      ]
    }
  ]
}

Rules:
- Use "text" type for learning content units
- Use "video" type for units that would benefit from video demonstration
- Use "quiz" type for assessment units (typically 1 per section)
- Each section should have 2-4 units
- Make unit names clear and descriptive
- Include practical examples and exercises in descriptions`;

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
              content: 'You are an expert instructional designer. Generate well-structured course outlines. Always respond with valid JSON only, no markdown formatting.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
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
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 502 }
      );
    }

    // Parse the JSON response (handle potential markdown code blocks)
    let outline;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      outline = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 502 }
      );
    }

    // Validate structure
    if (!outline.name || !outline.sections || !Array.isArray(outline.sections)) {
      return NextResponse.json(
        { error: 'Invalid outline structure from AI' },
        { status: 502 }
      );
    }

    return NextResponse.json({ outline });
  } catch (error) {
    console.error('Error generating outline:', error);
    return NextResponse.json(
      { error: 'Failed to generate outline' },
      { status: 500 }
    );
  }
}
