import { EvaluationResponse, QuizMode } from '../types';

// API Configuration
// Temporarily using production URL for testing on physical device
const API_URL = 'https://claude-test-hlcqzyuqn-bryan-hs-projects-3bca947e.vercel.app'; // Production
// const API_URL = __DEV__
//   ? 'http://localhost:3000'  // Local development
//   : 'https://claude-test-hlcqzyuqn-bryan-hs-projects-3bca947e.vercel.app'; // Production

export const evaluateAnswer = async (
  question: string,
  correctAnswer: string,
  userAnswer: string,
  mode: QuizMode
): Promise<EvaluationResponse | null> => {
  try {
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

    const data = await response.json();

    if (data.error) {
      console.error('API Error:', data.error);
      return null;
    }

    return data as EvaluationResponse;
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return null;
  }
};
