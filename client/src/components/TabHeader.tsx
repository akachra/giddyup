import React from 'react';
import { DateNavigation } from './DateNavigation';

interface TabHeaderProps {
  title: string;
  showDateNavigation?: boolean;
  rightContent?: React.ReactNode;
}

export function TabHeader({ title, showDateNavigation = true, rightContent }: TabHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 px-4">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      
      <div className="flex items-center space-x-4">
        {rightContent}
        {showDateNavigation && (
          <DateNavigation className="ml-4" />
        )}
      </div>
    </div>
  );
}