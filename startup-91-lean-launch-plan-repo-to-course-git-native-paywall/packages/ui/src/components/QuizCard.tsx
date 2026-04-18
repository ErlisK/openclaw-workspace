import * as React from 'react';
import type { QuizQuestion } from '@teachrepo/types';
import { cn } from '../lib/utils';
import { Button } from './Button';

export interface QuizCardProps {
  question: QuizQuestion;
  onAnswer: (questionId: string, selectedIndex: number | boolean) => void;
  selectedAnswer?: number | boolean | null;
  isCorrect?: boolean | null;
  showExplanation?: boolean;
  disabled?: boolean;
  className?: string;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  onAnswer,
  selectedAnswer,
  isCorrect,
  showExplanation,
  disabled,
  className,
}) => {
  const hasAnswered = selectedAnswer !== undefined && selectedAnswer !== null;

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6', className)}>
      <p className="mb-4 text-base font-medium text-gray-900">{question.question}</p>

      {question.type === 'multiple_choice' && question.options && (
        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isThisCorrect = question.correctIndex === index;

            return (
              <button
                key={index}
                onClick={() => !disabled && onAnswer(question.id, index)}
                disabled={disabled || hasAnswered}
                className={cn(
                  'w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                  !hasAnswered && 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50',
                  isSelected && isCorrect === true && 'border-green-500 bg-green-50 text-green-800',
                  isSelected && isCorrect === false && 'border-red-500 bg-red-50 text-red-800',
                  hasAnswered && isThisCorrect && !isSelected && 'border-green-300 bg-green-50',
                  !isSelected && !isThisCorrect && hasAnswered && 'border-gray-200 text-gray-500'
                )}
              >
                <span className="mr-3 font-mono text-xs text-gray-400">
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="flex gap-3">
          {[true, false].map((value) => {
            const isSelected = selectedAnswer === value;
            const isThisCorrect = question.correctBool === value;
            return (
              <Button
                key={String(value)}
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => !disabled && onAnswer(question.id, value)}
                disabled={disabled || hasAnswered}
                className={cn(
                  hasAnswered && isThisCorrect && 'border-green-500 bg-green-600 hover:bg-green-600',
                  hasAnswered && isSelected && !isThisCorrect && 'border-red-500 bg-red-600 hover:bg-red-600'
                )}
              >
                {value ? 'True' : 'False'}
              </Button>
            );
          })}
        </div>
      )}

      {showExplanation && question.explanation && (
        <div
          className={cn(
            'mt-4 rounded-lg p-3 text-sm',
            isCorrect ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
          )}
        >
          <span className="font-medium">{isCorrect ? '✓ Correct! ' : '✗ Not quite. '}</span>
          {question.explanation}
        </div>
      )}
    </div>
  );
};
