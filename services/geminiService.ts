
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from 'mammoth';
import type { AtsData, GroundingSource, JobSearchData, JobListing } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Converts a File object to a GoogleGenerativeAI.Part object.
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME_TYPE = 'application/msword';

export const parseResumeFromFile = async (file: File): Promise<string> => {
    // Handle .docx files with mammoth.js
    if (file.type === DOCX_MIME_TYPE) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } catch (mammothError) {
            console.error("Error parsing DOCX file with Mammoth:", mammothError);
            throw new Error("Failed to read the content of the .docx file. It might be corrupted.");
        }
    }

    // Handle unsupported .doc files by providing a clear error message
    if (file.type === DOC_MIME_TYPE) {
        throw new Error("Legacy .doc files are not supported. Please save the file as a .docx, .pdf, or .txt to proceed.");
    }

    // Use Gemini for other supported file types like PDF and TXT
    try {
        const filePart = await fileToGenerativePart(file);
        const prompt = "Extract all text content from the provided resume document. Return only the raw text, without any formatting, labels, or additional commentary.";

        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: { parts: [filePart, { text: prompt }] },
        });

        const text = response.text;
        if (!text) {
            throw new Error("Could not extract text from the file. The file might be empty or in an unsupported format.");
        }
        return text;
    } catch (error) {
        console.error("Error parsing resume with Gemini:", error);
        if (error instanceof Error) {
            if (error.message.includes('API key not valid')) {
                 throw new Error("The Gemini API key is not valid. Please check your configuration.");
            }
             if (error.message.includes('Unsupported MIME type')) {
                 throw new Error(`The file type (${file.type}) is not supported for parsing. Please use PDF, DOCX, or TXT.`);
             }
             throw new Error(`Failed to process the resume file: ${error.message}`);
        }
        throw new Error("An unknown error occurred while parsing the resume file.");
    }
};

export const analyzeResumeWithThinking = async (resumeText: string, jobDescription: string): Promise<AtsData> => {
    const prompt = `
        You are an expert ATS (Applicant Tracking System) analyzer. Analyze the provided resume against the job description with deep thought.
        1. Calculate a compatibility score from 0 to 100.
        2. Identify key strengths where the resume strongly aligns with the job description.
        3. Pinpoint specific gaps or missing keywords.
        4. Provide actionable recommendations to improve the resume for this specific role.
        
        Resume:
        ${resumeText}
        
        Job Description:
        ${jobDescription}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        ATS_Score: { type: Type.INTEGER },
                        Strengths: { type: Type.STRING },
                        Gaps: { type: Type.STRING },
                        Recommendations: { type: Type.STRING },
                    },
                    required: ['ATS_Score', 'Strengths', 'Gaps', 'Recommendations'],
                }
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AtsData;

    } catch (error) {
        console.error("Error analyzing resume with thinking:", error);
        throw new Error("Failed to get ATS analysis from Gemini.");
    }
};

export const searchJobsWithGrounding = async (jobDescription: string): Promise<JobSearchData> => {
    const prompt = `
        You are an expert job search assistant specializing in sourcing information from LinkedIn.
        Based on the following job description, perform a targeted Google Search focused specifically on LinkedIn.com job postings to find up to 10 of the most relevant and official job openings.
        For each job posting you find, your primary task is to diligently search the content for a publicly listed contact email for HR, the recruiter, or a general application inbox.

        Return the result as a single JSON object with a key "Job_Listings".
        The value of "Job_Listings" should be an array of job objects.
        Each job object must have the following keys: "Title", "Company", "Location", and "Apply_URL".
        If you successfully find a contact email, you MUST include it under the key "Contact_Email". If no email is found for a job, omit this key for that job object.

        Do not include any other text, explanations, or markdown formatting outside of the JSON object.

        Job Description:
        ${jobDescription}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const text = response.text;
        // Clean the response to extract only the JSON part
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const parsedData = JSON.parse(jsonString);

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: GroundingSource[] = groundingChunks
            ?.map((chunk: any) => ({
                title: chunk.web?.title || 'Source',
                uri: chunk.web?.uri,
            }))
            .filter((source: GroundingSource) => source.uri);

        return {
            Job_Listings: parsedData.Job_Listings || [],
            Message: `Found ${parsedData.Job_Listings?.length || 0} relevant jobs.`,
            sources,
        };
    } catch (error) {
        console.error("Error searching for jobs with grounding:", error);
        throw new Error("Failed to get job search results from Gemini.");
    }
};

export const generateCoverLetter = async (resumeText: string, jobListing: JobListing): Promise<string> => {
    const prompt = `
        Based on the provided resume and job listing, generate a professional and concise cover letter.
        The tone should be enthusiastic but professional.
        Highlight the key skills and experiences from the resume that match the job listing.
        Keep it to 3-4 short paragraphs.
        Do not include placeholder names or contact information like "[Your Name]" or "[Hiring Manager Name]". Start directly with "Dear Hiring Team,".

        Resume Content:
        ---
        ${resumeText}
        ---

        Job Listing:
        ---
        Title: ${jobListing.Title}
        Company: ${jobListing.Company}
        ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating cover letter:", error);
        throw new Error("Failed to generate cover letter from Gemini.");
    }
};