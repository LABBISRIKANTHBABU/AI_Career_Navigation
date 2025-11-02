
import React from 'react';
import { BriefcaseIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-base-200/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
             <div className="bg-brand-primary p-2 rounded-lg">
               <BriefcaseIcon className="h-6 w-6 text-white" />
             </div>
            <h1 className="text-2xl font-bold text-white">
              AI Career Navigator
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};
