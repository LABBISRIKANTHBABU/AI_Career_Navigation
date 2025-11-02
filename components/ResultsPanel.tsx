
import React from 'react';
import type { ApiResponse, AtsData, JobListing, JobSearchData, EmailSendData, GroundingSource } from '../types';
import { LoadingSpinner, CheckCircleIcon, ExclamationTriangleIcon, LightBulbIcon, TrendingUpIcon, TrendingDownIcon, PaperAirplaneIcon, ExternalLinkIcon, LinkIcon, SparklesIcon, EnvelopeIcon, CheckIcon, XMarkIcon } from './icons';

// Type guards to robustly identify the response type
const isAtsData = (res: ApiResponse): res is AtsData => 
  typeof (res as AtsData).ATS_Score === 'number';

const isJobSearchData = (res: ApiResponse): res is JobSearchData => 
  Array.isArray((res as JobSearchData).Job_Listings);

const isEmailSendData = (res: ApiResponse): res is EmailSendData => 
  'Message' in res && !isAtsData(res) && !isJobSearchData(res);


const AtsScoreDisplay: React.FC<{ data: AtsData }> = ({ data }) => {
    const scoreColor = data.ATS_Score >= 80 ? 'text-green-400' : data.ATS_Score >= 60 ? 'text-yellow-400' : 'text-red-400';
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (data.ATS_Score / 100) * circumference;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col items-center justify-center p-6 bg-base-100 rounded-xl">
                <h3 className="text-lg font-semibold text-base-content mb-4">ATS Compatibility Score</h3>
                <div className="relative w-32 h-32">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle className="text-base-300" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                        <circle
                            className={`${scoreColor} transition-all duration-1000 ease-out`}
                            strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="45"
                            cx="50"
                            cy="50"
                            transform="rotate(-90 50 50)"
                        />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${scoreColor}`}>
                        {data.ATS_Score}%
                    </span>
                </div>
            </div>
            
            <div className="space-y-4">
                <div className="bg-base-100 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-400 flex items-center mb-2"><TrendingUpIcon className="w-5 h-5 mr-2"/>Strengths</h4>
                    <p className="text-sm text-base-content">{data.Strengths}</p>
                </div>
                <div className="bg-base-100 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-400 flex items-center mb-2"><TrendingDownIcon className="w-5 h-5 mr-2"/>Gaps</h4>
                    <p className="text-sm text-base-content">{data.Gaps}</p>
                </div>
                 <div className="bg-base-100 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-400 flex items-center mb-2"><LightBulbIcon className="w-5 h-5 mr-2"/>Recommendations</h4>
                    <p className="text-sm text-base-content">{data.Recommendations}</p>
                </div>
            </div>
        </div>
    );
};

const JobListingCard: React.FC<{
    listing: JobListing;
    onOpenApplicationModal: (job: JobListing) => void;
    onOneClickApply: (job: JobListing) => void;
    status?: 'sending' | 'sent' | 'error';
}> = ({ listing, onOpenApplicationModal, onOneClickApply, status }) => {
    const hasContactEmail = !!listing.Contact_Email;

    const OneClickApplyButton: React.FC = () => {
        if (status === 'sending') {
            return (
                <button disabled className="flex items-center space-x-2 bg-yellow-500/80 text-white text-sm font-semibold py-2 px-3 rounded-md cursor-wait">
                    <LoadingSpinner className="w-4 h-4 text-white" />
                    <span>Sending</span>
                </button>
            );
        }
        if (status === 'sent') {
            return (
                <button disabled className="flex items-center space-x-2 bg-green-500 text-white text-sm font-semibold py-2 px-3 rounded-md">
                    <CheckIcon className="w-4 h-4" />
                    <span>Sent</span>
                </button>
            );
        }
         if (status === 'error') {
            return (
                <button onClick={() => onOneClickApply(listing)} className="flex items-center space-x-2 bg-red-500 text-white text-sm font-semibold py-2 px-3 rounded-md hover:bg-red-600 transition-colors" title="Retry Sending Application">
                    <XMarkIcon className="w-4 h-4" />
                    <span>Retry</span>
                </button>
            );
        }
        return (
             <button onClick={() => onOneClickApply(listing)} className="flex items-center space-x-2 bg-brand-secondary text-white text-sm font-semibold py-2 px-3 rounded-md hover:bg-purple-500 transition-colors" title="Send application with one click">
                <PaperAirplaneIcon className="w-4 h-4" />
                <span>Send App</span>
            </button>
        );
    };

    return (
        <div className="bg-base-100 p-4 rounded-lg transition-transform hover:scale-[1.02] hover:shadow-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-grow">
                <h4 className="font-bold text-white">{listing.Title}</h4>
                <p className="text-sm text-gray-400">{listing.Company} - {listing.Location}</p>
                {listing.Contact_Email && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-300">
                       <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                       <span className="truncate">{listing.Contact_Email}</span>
                    </div>
                )}
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 self-end sm:self-center">
                <a 
                    href={listing.Apply_URL} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center space-x-2 bg-base-300 text-white text-sm font-semibold py-2 px-3 rounded-md hover:bg-gray-600 transition-colors"
                    title="Apply on company site"
                >
                    <span>Apply</span>
                    <ExternalLinkIcon className="w-4 h-4" />
                </a>
                {hasContactEmail ? (
                   <OneClickApplyButton />
                ) : (
                    <button
                        onClick={() => onOpenApplicationModal(listing)}
                        className="flex items-center space-x-2 bg-brand-primary text-white text-sm font-semibold py-2 px-3 rounded-md hover:bg-brand-secondary transition-colors"
                        title="Generate and send application with AI"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        <span>Generate App</span>
                    </button>
                )}
            </div>
        </div>
    );
};


const GroundingSources: React.FC<{ sources: GroundingSource[] }> = ({ sources }) => (
    <div className="mt-6">
        <h4 className="font-semibold text-base-content mb-2 text-sm">Sources:</h4>
        <div className="flex flex-col space-y-2">
            {sources.map((source, index) => (
                <a 
                    key={index}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-xs text-blue-400 hover:underline truncate"
                >
                    <LinkIcon className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{source.title}</span>
                </a>
            ))}
        </div>
    </div>
);


const JobSearchDisplay: React.FC<{
    data: JobSearchData;
    onOpenApplicationModal: (job: JobListing) => void;
    onOneClickApply: (job: JobListing) => void;
    jobSendingStatus: Record<string, 'sending' | 'sent' | 'error'>;
}> = ({ data, onOpenApplicationModal, onOneClickApply, jobSendingStatus }) => (
    <div className="space-y-4 animate-fade-in flex flex-col h-full">
        <p className="text-sm text-gray-400">{data.Message}</p>
        <div className="space-y-3 flex-grow overflow-y-auto pr-2">
           {data.Job_Listings.length > 0 ? (
                data.Job_Listings.map((job, index) => (
                    <JobListingCard
                        key={index}
                        listing={job}
                        onOpenApplicationModal={onOpenApplicationModal}
                        onOneClickApply={onOneClickApply}
                        status={jobSendingStatus[job.Title + job.Company]}
                    />
                ))
            ) : (
                <p className="text-center text-gray-400 py-4">No job listings found.</p>
            )}
        </div>
        {data.sources && data.sources.length > 0 && <GroundingSources sources={data.sources} />}
    </div>
);

const EmailSendDisplay: React.FC<{ data: EmailSendData }> = ({ data }) => (
    <div className="flex flex-col items-center justify-center text-center h-full animate-fade-in">
        <CheckCircleIcon className="w-16 h-16 text-green-400 mb-4" />
        <h3 className="text-xl font-bold text-white">Success!</h3>
        <p className="text-base-content mt-2">{data.Message}</p>
    </div>
);

interface ResultsPanelProps {
  isLoading: boolean;
  error: string | null;
  result: ApiResponse | null;
  onOpenApplicationModal: (job: JobListing) => void;
  onOneClickApply: (job: JobListing) => void;
  jobSendingStatus: Record<string, 'sending' | 'sent' | 'error'>;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ isLoading, error, result, onOpenApplicationModal, onOneClickApply, jobSendingStatus }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <LoadingSpinner className="h-10 w-10 text-brand-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center text-center h-full text-red-400 animate-fade-in">
                <ExclamationTriangleIcon className="w-12 h-12 mb-4" />
                <h3 className="font-bold">An Error Occurred</h3>
                <p className="text-sm mt-2">{error}</p>
            </div>
        );
    }
    
    if (result) {
        // Use the robust type guards to determine which component to render
        if (isAtsData(result)) return <AtsScoreDisplay data={result} />;
        if (isJobSearchData(result)) return <JobSearchDisplay data={result} onOpenApplicationModal={onOpenApplicationModal} onOneClickApply={onOneClickApply} jobSendingStatus={jobSendingStatus} />;
        if (isEmailSendData(result)) return <EmailSendDisplay data={result} />;
    }

    return (
        <div className="flex flex-col items-center justify-center text-center h-full text-base-content">
            <h3 className="text-lg font-semibold">Welcome to the AI Career Navigator</h3>
            <p className="mt-2 text-sm max-w-sm">
                Use the controls on the left to analyze your resume against a job description or to search for new career opportunities. Your results will appear here.
            </p>
        </div>
    );
};