export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface QuizResult {
  mcqs: MCQ[];
  userAnswers: string[];
  score: number;
  total: number;
  timeSpent: number;
}

export enum QuizState {
  IDLE = 'idle',
  PROCESSING = 'processing',
  QUIZ = 'quiz',
  REVIEW = 'review'
}
