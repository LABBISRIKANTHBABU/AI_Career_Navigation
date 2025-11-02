
import React, { useState, useEffect } from 'react';
import type { JobListing } from '../types';
import { LoadingSpinner, PaperAirplaneIcon, XCircleIcon } from './icons';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobListing | null;
  resumeText: string;
  onSend: (coverLetter: string, recipientEmail: string, job: JobListing) => Promise<void>;
  generateCoverLetter: (resumeText: string, job: JobListing) => Promise<string>;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  isOpen,
  onClose,
  job,
  resumeText,
  onSend,
  generateCoverLetter,
}) => {
  const [coverLetter, setCoverLetter] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && job && resumeText) {
      setRecipientEmail(job.Contact_Email || '');
      const generate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
          const generatedText = await generateCoverLetter(resumeText, job);
          setCoverLetter(generatedText);
        } catch (err) {
          setError('Failed to generate cover letter. You can write one manually.');
        } finally {
          setIsGenerating(false);
        }
      };
      generate();
    } else if (!isOpen) {
      // Reset when modal is closed
      setCoverLetter('');
      setRecipientEmail('');
      setError(null);
    }
  }, [isOpen, job, resumeText, generateCoverLetter]);

  const handleSend = () => {
    if (!recipientEmail) {
        setError('Recipient email is required.');
        return;
    }
    if (job) {
      onSend(coverLetter, recipientEmail, job);
    }
  };
  
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-base-200 w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-base-300 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-white truncate pr-4">Application for {job.Title}</h2>
          <button onClick={onClose} className="text-base-content/50 hover:text-white flex-shrink-0">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto space-y-4">
            {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-sm">{error}</div>}
            
            <div>
                 <label htmlFor="recipient-email" className="block text-sm font-medium text-base-content mb-1">
                    Recipient Email
                 </label>
                 <input
                    id="recipient-email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="Enter HR or application email..."
                    className="w-full bg-base-100 border border-base-300 rounded-lg p-3 text-sm focus:ring-brand-primary focus:border-brand-primary"
                 />
                 {!job.Contact_Email && (
                    <p className="text-xs text-base-content/60 mt-1">We couldn't find a public email. Please find and enter the appropriate contact.</p>
                 )}
            </div>

            <div>
                 <label htmlFor="cover-letter" className="block text-sm font-medium text-base-content mb-1">
                    Generated Cover Letter (Editable)
                 </label>
                 {isGenerating ? (
                    <div className="h-64 flex items-center justify-center bg-base-100 rounded-lg">
                        <LoadingSpinner />
                    </div>
                 ) : (
                    <textarea
                        id="cover-letter"
                        rows={12}
                        className="w-full bg-base-100 border border-base-300 rounded-lg p-3 text-sm focus:ring-brand-primary focus:border-brand-primary"
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                    />
                 )}
            </div>
        </div>

        <div className="p-6 border-t border-base-300 flex justify-end gap-4 flex-shrink-0">
            <button onClick={onClose} className="bg-base-300 text-white font-bold py-2 px-4 rounded-lg hover:bg-base-100 transition-colors">
                Cancel
            </button>
            <button 
                onClick={handleSend}
                disabled={!recipientEmail || !coverLetter || isGenerating}
                className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-secondary transition-colors disabled:bg-base-300 disabled:cursor-not-allowed flex items-center"
            >
                <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                Send Application
            </button>
        </div>
      </div>
    </div>
  );
};
