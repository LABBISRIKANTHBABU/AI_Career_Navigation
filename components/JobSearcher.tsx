import React from 'react';
import { SearchIcon } from './icons';

interface JobSearcherProps {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const JobSearcher: React.FC<JobSearcherProps> = ({
  jobDescription,
  setJobDescription,
  onSubmit,
  isLoading,
}) => {
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-grow space-y-4">
        <div>
          <label htmlFor="job-description-search" className="block text-sm font-medium text-base-content mb-1">
            Job Description
          </label>
          <textarea
            id="job-description-search"
            name="job-description-search"
            rows={12}
            className="w-full bg-base-100 border border-base-300 rounded-lg p-3 text-sm focus:ring-brand-primary focus:border-brand-primary transition"
            placeholder="Paste a full job description here for a more accurate search..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>
       <button
        onClick={onSubmit}
        disabled={isLoading || !jobDescription}
        className="w-full flex items-center justify-center bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary transition-colors duration-300 disabled:bg-base-300 disabled:cursor-not-allowed"
      >
        <SearchIcon className="w-5 h-5 mr-2" />
        {isLoading ? 'Searching...' : 'Find Jobs'}
      </button>
    </div>
  );
};