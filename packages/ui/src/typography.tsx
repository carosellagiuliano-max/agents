import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

export type HeadingProps = PropsWithChildren<{
  level?: 1 | 2 | 3;
  className?: string;
}>;

const LEVEL_TAG: Record<NonNullable<HeadingProps['level']>, keyof JSX.IntrinsicElements> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
};

export function Heading({ level = 1, className, children }: HeadingProps) {
  const Tag = LEVEL_TAG[level];
  return (
    <Tag
      className={clsx(
        'font-semibold tracking-tight text-slate-900 dark:text-slate-100',
        {
          'text-4xl leading-tight': level === 1,
          'text-3xl leading-snug': level === 2,
          'text-2xl leading-snug': level === 3,
        },
        className,
      )}
    >
      {children}
    </Tag>
  );
}
