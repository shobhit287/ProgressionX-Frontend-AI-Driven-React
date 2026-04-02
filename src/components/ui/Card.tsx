import { memo } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const Card = memo(function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl bg-surface border border-border p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export default Card;
