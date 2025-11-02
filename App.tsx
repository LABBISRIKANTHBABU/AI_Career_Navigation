
import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Header } from './components/Header';
import { AtsScoreChecker } from './components/AtsScoreChecker';
import { JobSearcher } from './components/JobSearcher';
import { Chatbot } from './components/Chatbot';
import { ApplicationModal } from './components/ApplicationModal';
import { MockInterview } from './components/MockInterview';
import { ResultsPanel } from './components/ResultsPanel';
import { callN8nWebhook } from './services/n8nService';
import { parseResumeFromFile, analyzeResumeWithThinking, searchJobsWithGrounding, generateCoverLetter } from './services/geminiService';
import type { ApiResponse, ChatMessage, JobListing } from './types';
import { ChatBubbleLeftRightIcon, MicrophoneIcon } from './components/icons';

type ActiveTab = 'ats' | 'search' | 'chat' | 'interview';

// Define the type for the job sending status
type JobSendingStatus = Record<string, 'sending' | 'sent' | 'error'>;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ats');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  // Form state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>(''); // For ATS
  const [searchJobDescription, setSearchJobDescription] = useState<string>(''); // For Job Search
  
  // Application Modal state
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // One-click apply state
  const [jobSendingStatus, setJobSendingStatus] = useState<JobSendingStatus>({});

  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatClientRef = useRef<Chat | null>(null);
  
  const clearCommonState = () => {
      setError(null);
      setResult(null);
  };
  
  const handleFileChange = useCallback(async (file: File) => {
    setResumeFile(file);
    setIsLoading(true);
    clearCommonState();
    setResumeText('');
    try {
      const text = await parseResumeFromFile(file);
      setResumeText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume file.');
      setResumeFile(null); // Clear file on parsing error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setResumeFile(null);
    setResumeText('');
    clearCommonState();
  }, []);

  const handleAtsCheck = useCallback(async () => {
    if (!resumeText || !jobDescription) {
      setError('Please provide a parsed resume and a job description.');
      return;
    }
    setIsLoading(true);
    clearCommonState();
    try {
      const response = await analyzeResumeWithThinking(resumeText, jobDescription);
      setResult(response);
    // FIX: Corrected syntax error in catch block and provided a relevant error message.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during ATS analysis.');
    } finally {
        setIsLoading(false);
    }
  }, [resumeText, jobDescription]);

  // FIX: Added missing handleJobSearch function.
  const handleJobSearch = useCallback(async () => {
    if (!searchJobDescription) {
        setError('Please provide a job description for the search.');
        return;
    }
    setIsLoading(true);
    clearCommonState();
    try {
        const response = await searchJobsWithGrounding(searchJobDescription);
        setResult(response);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while searching for jobs.');
    } finally {
        setIsLoading(false);
    }
  }, [searchJobDescription]);

  // FIX: Added missing handleSendMessage function for the chatbot.
  const handleSendMessage = useCallback(async (message: string) => {
    if (!chatClientRef.current) {
        // Initialize chat on first message
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        chatClientRef.current = ai.chats.create({
            model: 'gemini-flash-lite-latest',
            history: chatHistory.map(m => ({
                role: m.role,
                parts: [{ text: m.content }],
            })),
        });
    }

    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setIsStreaming(true);
    
    try {
        const result = await chatClientRef.current.sendMessageStream({ message });
        
        let modelMessageAdded = false;
        let currentModelMessage = '';
        for await (const chunk of result) {
            currentModelMessage += chunk.text;
            if (!modelMessageAdded) {
                setChatHistory(prev => [...prev, { role: 'model', content: currentModelMessage }]);
                modelMessageAdded = true;
            } else {
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    if (newHistory.length > 0 && newHistory[newHistory.length - 1].role === 'model') {
                        newHistory[newHistory.length - 1].content = currentModelMessage;
                    }
                    return newHistory;
                });
            }
        }

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during chat.';
        setError(errorMessage);
        setChatHistory(prev => [...prev, { role: 'model', content: `Sorry, something went wrong: ${errorMessage}` }]);
    } finally {
        setIsStreaming(false);
    }
  }, [chatHistory]);

  // FIX: Added missing handler functions for the application modal.
  const handleOpenApplicationModal = (job: JobListing) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };
  
  const handleCloseApplicationModal = () => {
    setSelectedJob(null);
    setIsModalOpen(false);
  };
  
  const handleSendApplication = async (coverLetter: string, recipientEmail: string, job: JobListing) => {
    setIsLoading(true);
    setError(null);
    try {
        await callN8nWebhook({
            action: 'send_email',
            resume: resumeText,
            cover_letter: coverLetter,
            recipient_email: recipientEmail,
            job_details: job,
        });
        setResult({ Message: "Application sent successfully!" });
        setIsModalOpen(false); // Close modal on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while sending the application.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleOneClickApply = async (job: JobListing) => {
    if (!resumeText || !job.Contact_Email) {
        setError('Resume not parsed or no contact email available for this job.');
        return;
    }

    const jobId = job.Title + job.Company; // Create a unique ID for the job
    setJobSendingStatus(prev => ({ ...prev, [jobId]: 'sending' }));
    setError(null); // Clear main error panel

    try {
        const coverLetter = await generateCoverLetter(resumeText, job);
        await callN8nWebhook({
            action: 'send_email',
            resume: resumeText,
            cover_letter: coverLetter,
            recipient_email: job.Contact_Email,
            job_details: job,
        });
        setJobSendingStatus(prev => ({ ...prev, [jobId]: 'sent' }));
    } catch (err) {
        setJobSendingStatus(prev => ({ ...prev, [jobId]: 'error' }));
        // Set a specific error for the main panel to show, as there's no modal
        setError(err instanceof Error ? `Failed to send application: ${err.message}` : 'An unknown error occurred while sending the application.');
    }
  };
  
  const TabButton: React.FC<{tab: ActiveTab; label: string; icon?: React.ReactNode}> = ({ tab, label, icon }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        clearCommonState();
      }}
      className={`flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-200 focus:ring-brand-primary ${
        activeTab === tab
          ? 'bg-brand-primary text-white'
          : 'bg-base-200 text-base-content hover:bg-base-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const isFullWidthTab = activeTab === 'chat' || activeTab === 'interview';

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className={`grid ${isFullWidthTab ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-8 h-full`}>
          <div className="bg-base-200 p-6 rounded-2xl shadow-lg flex flex-col">
            <div className="flex flex-wrap gap-2 mb-6">
              <TabButton tab="ats" label="ATS Score Checker" />
              <TabButton tab="search" label="Job Search" />
              <TabButton tab="chat" label="Chat" icon={<ChatBubbleLeftRightIcon className="w-4 h-4" />} />
              <TabButton tab="interview" label="Mock Interview" icon={<MicrophoneIcon className="w-4 h-4" />} />
            </div>
            <div className="flex-grow">
              {activeTab === 'ats' && (
                <AtsScoreChecker
                  resumeFile={resumeFile}
                  resumeText={resumeText}
                  jobDescription={jobDescription}
                  setJobDescription={setJobDescription}
                  onFileChange={handleFileChange}
                  onClearFile={handleClearFile}
                  onSubmit={handleAtsCheck}
                  isLoading={isLoading}
                />
              )}
              {activeTab === 'search' && (
                <JobSearcher 
                  jobDescription={searchJobDescription}
                  setJobDescription={setSearchJobDescription}
                  onSubmit={handleJobSearch}
                  isLoading={isLoading}
                />
              )}
              {activeTab === 'chat' && (
                  <Chatbot 
                    history={chatHistory}
                    onSendMessage={handleSendMessage}
                    isLoading={isStreaming}
                  />
              )}
              {activeTab === 'interview' && (
                <MockInterview />
              )}
            </div>
          </div>
          {!isFullWidthTab && (
            <div className="bg-base-200 p-6 rounded-2xl shadow-lg flex flex-col min-h-[60vh] lg:min-h-0">
              <h2 className="text-xl font-bold mb-4 text-white">Results</h2>
              <ResultsPanel
                isLoading={isLoading}
                error={error}
                result={result}
                onOpenApplicationModal={handleOpenApplicationModal}
                onOneClickApply={handleOneClickApply}
                jobSendingStatus={jobSendingStatus}
              />
            </div>
           )}
        </div>
      </main>
      <ApplicationModal
        isOpen={isModalOpen}
        onClose={handleCloseApplicationModal}
        job={selectedJob}
        resumeText={resumeText}
        onSend={handleSendApplication}
        generateCoverLetter={generateCoverLetter}
      />
    </div>
  );
};

export default App;
