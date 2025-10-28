import { EvaluationResponse, QuizMode } from '../types';

// API Configuration
// Use production domain (automatically routes to latest deployment)
const API_URL = 'https://www.theeclodapps.com';

export const evaluateAnswer = async (
  question: string,
  correctAnswer: string,
  userAnswer: string,
  mode: QuizMode
): Promise<EvaluationResponse | null> => {
  try {
    console.log('Evaluating answer via API:', { question, userAnswer });

    const response = await fetch(`${API_URL}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        correctAnswer,
        userAnswer,
        mode,
      }),
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      console.error('API response not OK:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('API response data:', data);

    if (data.error) {
      console.error('API Error:', data.error);
      // If the error response includes grade and feedback, use it
      if (data.grade && data.feedback) {
        return {
          grade: data.grade,
          feedback: data.feedback
        };
      }
      return null;
    }

    // Handle case where API might return stringified JSON
    let evaluation = data;
    if (typeof data === 'string') {
      try {
        evaluation = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse stringified response:', data);
        return null;
      }
    }

    // Ensure we have valid grade and feedback fields
    if (!evaluation.grade || !evaluation.feedback) {
      console.error('Invalid evaluation response:', evaluation);
      console.error('Full response data:', JSON.stringify(data, null, 2));
      return null;
    }

    return evaluation as EvaluationResponse;
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return null;
  }
};
