import React, { useRef } from 'react';
import { DocumentScannerIcon, FileUploadIcon, XCircleIcon } from './icons';

interface AtsScoreCheckerProps {
  resumeFile: File | null;
  resumeText: string;
  jobDescription: string;
  setJobDescription: (value: string) => void;
  onFileChange: (file: File) => void;
  onClearFile: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const ACCEPTED_FILES = ".pdf,.docx,.txt";

export const AtsScoreChecker: React.FC<AtsScoreCheckerProps> = ({
  resumeFile,
  resumeText,
  jobDescription,
  setJobDescription,
  onFileChange,
  onClearFile,
  onSubmit,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-grow flex flex-col space-y-4">
        <div>
          <label className="block text-sm font-medium text-base-content mb-2">
            Upload Resume
          </label>
          {!resumeFile ? (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept={ACCEPTED_FILES}
                disabled={isLoading}
              />
              <button
                onClick={handleButtonClick}
                disabled={isLoading}
                className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-base-300 rounded-lg hover:bg-base-100/50 transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed"
              >
                <FileUploadIcon className="w-10 h-10 text-base-content/50 mb-2" />
                <span className="text-sm font-semibold text-brand-primary">Click to upload a file</span>
                <span className="text-xs text-base-content/60 mt-1">PDF, DOCX, or TXT</span>
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between p-3 bg-base-100 border border-base-300 rounded-lg">
                <span className="text-sm font-medium truncate pr-2">{resumeFile.name}</span>
                <button onClick={onClearFile} disabled={isLoading} className="text-base-content/50 hover:text-white transition-colors">
                    <XCircleIcon className="w-5 h-5" />
                </button>
            </div>
          )}
        </div>

        {resumeText && (
           <div>
             <label htmlFor="resume-text" className="block text-sm font-medium text-base-content mb-1">
                Parsed Resume Content (Read-only)
             </label>
             <textarea
                id="resume-text"
                readOnly
                rows={4}
                className="w-full bg-base-100 border border-base-300 rounded-lg p-3 text-sm focus:ring-brand-primary focus:border-brand-primary transition"
                value={resumeText}
             />
           </div>
        )}

        <div>
          <label htmlFor="job-description" className="block text-sm font-medium text-base-content mb-1">
            Job Description
          </label>
          <textarea
            id="job-description"
            name="job-description"
            rows={8}
            className="w-full bg-base-100 border border-base-300 rounded-lg p-3 text-sm focus:ring-brand-primary focus:border-brand-primary transition"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>
      <button
        onClick={onSubmit}
        disabled={isLoading || !resumeText || !jobDescription}
        className="w-full flex items-center justify-center bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary transition-colors duration-300 disabled:bg-base-300 disabled:cursor-not-allowed"
      >
        <DocumentScannerIcon className="w-5 h-5 mr-2" />
        {isLoading ? 'Processing...' : 'Get ATS Score'}
      </button>
    </div>
  );
};