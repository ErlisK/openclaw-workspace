import * as React from 'react';
import type { Course } from '@teachrepo/types';
import { cn } from '../lib/utils';
import { Badge } from './Badge';
import { PriceTag } from './PriceTag';
import { Card, CardHeader, CardContent, CardFooter } from './Card';

export interface CourseCardProps {
  course: Pick<Course, 'id' | 'title' | 'description' | 'priceCents' | 'currency' | 'tags' | 'thumbnailUrl'>;
  lessonCount?: number;
  href?: string;
  onClick?: (courseId: string) => void;
  className?: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  lessonCount,
  href,
  onClick,
  className,
}) => {
  const handleClick = () => onClick?.(course.id);

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow hover:shadow-md',
        (onClick || href) && 'cursor-pointer',
        className
      )}
      onClick={onClick ? handleClick : undefined}
    >
      {course.thumbnailUrl && (
        <div className="aspect-video w-full overflow-hidden bg-gray-100">
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardHeader>
        <h3 className="line-clamp-2 text-base font-semibold text-gray-900">{course.title}</h3>
        {course.description && (
          <p className="line-clamp-2 text-sm text-gray-500">{course.description}</p>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {course.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="justify-between">
        <PriceTag priceCents={course.priceCents} currency={course.currency} />
        {lessonCount !== undefined && (
          <span className="text-xs text-gray-500">{lessonCount} lessons</span>
        )}
      </CardFooter>
    </Card>
  );
};
