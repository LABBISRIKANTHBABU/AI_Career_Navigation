
import type { Action, ApiResponse, JobListing } from '../types';

const N8N_WEBHOOK_URL = 'https://gowri1234.app.n8n.cloud/webhook/ats-resume-screening';

interface RequestPayload {
    action: Action;
    resume?: string;
    job_description?: string;
    job_title?: string;
    location?: string;
    // New fields for sending application
    cover_letter?: string;
    recipient_email?: string;
    job_details?: JobListing;
}

export const callN8nWebhook = async (payload: RequestPayload): Promise<ApiResponse> => {
    // Add a slight delay to allow UI to update to loading state, improving UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText || 'An unknown error occurred'}`);
    }

    try {
        const data = await response.json();
        return data as ApiResponse;
    } catch (e) {
        throw new Error("Failed to parse JSON response from the server.");
    }
};
