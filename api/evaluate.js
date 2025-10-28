// Vercel Serverless Function for AI evaluation
module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { question, correctAnswer, userAnswer, mode } = req.body;

    // Use environment variable for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 800,
                    messages: [{
                        role: 'user',
                        content: mode === 'comedy'
                            ? `You are Anthony Jeselnik conducting a brutal, roast-style US citizenship test interview. You're factually accurate but mercilessly sarcastic and offensive. Use dark humor, sharp wit, and profanity liberally. Mock wrong answers ruthlessly.

IMPORTANT: Current US Government (2025): President = Donald Trump, Vice President = JD Vance, Speaker = Mike Johnson, Party = Republican

Question: "${question}"
Acceptable answer(s): ${correctAnswer}
Student's answer: "${userAnswer}"

Evaluate and roast in JSON format:
{
  "grade": "correct" | "partial" | "incorrect",
  "feedback": "your brutal comedic feedback (100 words or less)"
}

Guidelines:
- NO educational content - just pure roast
- Use profanity freely and creatively
- Keep response under 100 words
- Be brutally honest and offensive
- Channel Anthony Jeselnik's deadpan, dark wit
- CRITICAL: NEVER use repetitive phrases. BANNED PHRASES include: "well well well", "look who", "oh look", "interesting choice"
- MANDATORY: Every single roast must be completely different from the last
- Mix up your approach: dry observations, unexpected angles, absurd metaphors, fake sympathy, mock philosophical musings, hypothetical scenarios
- Examples of DIVERSE styles:
  * Deadpan shock: "I have to sit down. This is unprecedented levels of wrong."
  * Absurd comparison: "I've seen goldfish with better fucking recall."
  * Fake concern: "You know what? I'm not even mad. I'm worried. Are you okay?"
  * Philosophical: "Ever wonder what it's like to confidently be this incorrect? You're living it."
  * Meta commentary: "The beauty of this wrong answer is its complete commitment to being wrong."
- Never repeat a roast style back-to-back
- Be VERY strict with grading - if an answer is vague or incomplete, mark it as PARTIAL or INCORRECT

Respond ONLY with valid JSON, no other text.`
                            : `You are a professional USCIS citizenship test interviewer evaluating a student's answer. Maintain a formal, respectful tone while being strict but fair.

IMPORTANT: Current US Government (2025): President = Donald Trump, Vice President = JD Vance, Speaker = Mike Johnson, Party = Republican

Question: "${question}"
Acceptable answer(s): ${correctAnswer}
Student's answer: "${userAnswer}"

Evaluate the student's answer and respond in JSON format:
{
  "grade": "correct" | "partial" | "incorrect",
  "feedback": "your professional feedback message"
}

Evaluation criteria:
- CORRECT: Answer captures the full meaning and is sufficiently complete → grade: "correct"
- PARTIAL: Has some correct elements but incomplete, vague, or needs clarification → grade: "partial", request clarification professionally
- INCORRECT: Wrong answer → grade: "incorrect", provide correct answer professionally

Guidelines:
- ALWAYS list ALL acceptable answers from the "Acceptable answer(s)" field - this is MANDATORY for learning
- When a question asks for "one" or "three" examples from a list, you MUST provide the COMPLETE list of all options. Example: "Name three of the 13 original states" → List all 13 states even though they only need to name 3
- For numerical questions, ALWAYS provide the actual names/values in addition to numbers. Example: "How many justices?" → "Nine (9). The current justices are: John Roberts (Chief Justice), Clarence Thomas, Samuel Alito, Sonia Sotomayor, Elena Kagan, Neil Gorsuch, Brett Kavanaugh, Amy Coney Barrett, and Ketanji Brown Jackson."
- For "how many" questions, add context with actual examples/names when available to enhance learning
- If CORRECT: Professional acknowledgment. Then COPY AND PASTE the ENTIRE "Acceptable answer(s)" field from above into your response verbatim. Don't summarize. Provide additional context/names. Example: "That's correct. The acceptable answers include: [COPY THE ENTIRE ACCEPTABLE ANSWERS FIELD HERE]. [Add context/names]."
- If PARTIAL: "Can you please be more specific?" or "Could you elaborate on that?" - Use this for answers that are too vague or incomplete (e.g., "change" instead of "a change to the Constitution"). Then COPY AND PASTE the ENTIRE "Acceptable answer(s)" field with context. Example: "Can you please be more specific? The complete acceptable answers are: [COPY THE ENTIRE ACCEPTABLE ANSWERS FIELD HERE]."
- If INCORRECT: "That's not correct." Then COPY AND PASTE the ENTIRE "Acceptable answer(s)" field. Example: "That's not correct. The acceptable answers are: [COPY THE ENTIRE ACCEPTABLE ANSWERS FIELD HERE]. [Add context/examples]."
- Maintain formal, respectful interview tone throughout
- Be VERY strict with grading - if an answer is incomplete, vague, or needs context, mark as partial
- Better to mark partial than fully correct for incomplete answers
- Examples of PARTIAL answers: "change" (needs "to the Constitution"), "freedom" (needs "of what?"), "Congress" without context when more detail is expected

Respond ONLY with valid JSON, no other text.`
                    }]
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error('Anthropic API Error:', data.error);
                return res.status(400).json({ error: JSON.stringify(data.error) });
            }

            // Validate response structure
            if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
                console.error('Invalid API response structure:', JSON.stringify(data));
                return res.status(500).json({
                    error: 'Invalid response from AI',
                    grade: 'incorrect',
                    feedback: 'Unable to evaluate answer. Please try again.'
                });
            }

            if (!data.content[0] || !data.content[0].text) {
                console.error('Missing text in API response:', JSON.stringify(data));
                return res.status(500).json({
                    error: 'Empty response from AI',
                    grade: 'incorrect',
                    feedback: 'Unable to evaluate answer. Please try again.'
                });
            }

            let responseText = data.content[0].text.trim();

            // Remove markdown code blocks if present
            responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Parse JSON response
            let evaluation;
            try {
                evaluation = JSON.parse(responseText);

                // Normalize grade to lowercase (Claude sometimes returns "Correct" instead of "correct")
                if (evaluation.grade) {
                    evaluation.grade = evaluation.grade.toLowerCase();

                    // Fix common typos from Claude
                    if (evaluation.grade === 'corect') {
                        evaluation.grade = 'correct';
                    } else if (evaluation.grade === 'incorect') {
                        evaluation.grade = 'incorrect';
                    }
                }
            } catch (e) {
                console.error('Failed to parse JSON:', responseText);
                console.error('Parse error:', e.message);

                // Try to extract JSON if it's wrapped in extra text
                const jsonMatch = responseText.match(/\{[\s\S]*"grade"[\s\S]*"feedback"[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        evaluation = JSON.parse(jsonMatch[0]);
                        // Apply same normalizations
                        if (evaluation.grade) {
                            evaluation.grade = evaluation.grade.toLowerCase();
                            if (evaluation.grade === 'corect') {
                                evaluation.grade = 'correct';
                            } else if (evaluation.grade === 'incorect') {
                                evaluation.grade = 'incorrect';
                            }
                        }
                    } catch (e2) {
                        // Still failed, use fallback
                        evaluation = {
                            grade: 'incorrect',
                            feedback: responseText || 'Unable to evaluate answer. Please try again.'
                        };
                    }
                } else {
                    // Fallback if AI doesn't return proper JSON
                    evaluation = {
                        grade: 'incorrect',
                        feedback: responseText || 'Unable to evaluate answer. Please try again.'
                    };
                }
            }

            // Final validation: ensure we have valid grade and feedback
            if (!evaluation || !evaluation.grade || !evaluation.feedback) {
                console.error('Invalid evaluation object:', evaluation);
                return res.status(500).json({
                    error: 'Invalid evaluation response',
                    grade: 'incorrect',
                    feedback: 'Unable to evaluate answer. Please try again.'
                });
            }

            // Validate grade is one of the expected values
            const validGrades = ['correct', 'partial', 'incorrect'];
            if (!validGrades.includes(evaluation.grade)) {
                console.error('Invalid grade value:', evaluation.grade);
                evaluation.grade = 'incorrect'; // Default to incorrect if invalid
            }

            return res.json(evaluation);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
