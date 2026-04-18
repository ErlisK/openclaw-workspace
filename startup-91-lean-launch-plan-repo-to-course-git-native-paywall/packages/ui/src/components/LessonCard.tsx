import * as React from 'react';
import type { Lesson } from '@teachrepo/types';
import { cn } from '../lib/utils';
import { Badge } from './Badge';

export interface LessonCardProps {
  lesson: Lesson;
  isCompleted?: boolean;
  isLocked?: boolean;
  isCurrent?: boolean;
  onClick?: (lessonId: string) => void;
  className?: string;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  isCompleted,
  isLocked,
  isCurrent,
  onClick,
  className,
}) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={() => onClick?.(lesson.id)}
    onKeyDown={(e) => e.key === 'Enter' && onClick?.(lesson.id)}
    className={cn(
      'flex items-center gap-4 rounded-lg border p-4 transition-colors',
      isCurrent && 'border-indigo-300 bg-indigo-50',
      !isCurrent && 'border-gray-200 bg-white',
      onClick && !isLocked && 'cursor-pointer hover:border-indigo-200 hover:bg-gray-50',
      isLocked && 'cursor-not-allowed opacity-60',
      className
    )}
  >
    {/* Step indicator */}
    <div
      className={cn(
        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium',
        isCompleted && 'bg-green-100 text-green-700',
        isCurrent && !isCompleted && 'bg-indigo-600 text-white',
        !isCompleted && !isCurrent && 'bg-gray-100 text-gray-500'
      )}
    >
      {isCompleted ? '✓' : lesson.orderIndex + 1}
    </div>

    {/* Content */}
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-gray-900">{lesson.title}</p>
      {lesson.estimatedMinutes && (
        <p className="text-xs text-gray-500">{lesson.estimatedMinutes} min</p>
      )}
    </div>

    {/* Badges */}
    <div className="flex flex-shrink-0 gap-2">
      {lesson.isPreview && <Badge variant="secondary">Free preview</Badge>}
      {isLocked && <span className="text-gray-400">🔒</span>}
    </div>
  </div>
);
