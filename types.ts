
export type Action = 'ats_score' | 'job_search' | 'send_email';

export interface AtsData {
  ATS_Score: number;
  Strengths: string;
  Gaps: string;
  Recommendations: string;
}

export interface JobListing {
  Title: string;
  Company: string;
  Location: string;
  Apply_URL: string;
  Contact_Email?: string;
}

export interface GroundingSource {
    title: string;
    uri: string;
}

export interface JobSearchData {
  Job_Listings: JobListing[];
  Message: string;
  sources?: GroundingSource[];
}

export interface EmailSendData {
  Message: string;
}

export type ApiResponse = AtsData | JobSearchData | EmailSendData;

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};
