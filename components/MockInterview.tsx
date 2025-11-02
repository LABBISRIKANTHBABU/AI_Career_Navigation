

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audio';
import { MicrophoneIcon, StopCircleIcon, UserCircleIcon, SparklesIcon } from './icons';
import type { ChatMessage } from '../types';

interface MockInterviewProps {}

type InterviewStatus = 'idle' | 'connecting' | 'active' | 'error' | 'ended';

const statusMessages: Record<InterviewStatus, string> = {
    idle: 'Click "Start Interview" to begin your mock interview session.',
    connecting: 'Connecting to the interview session...',
    active: 'Interview in progress. The AI is listening.',
    error: 'An error occurred. Please try starting a new interview.',
    ended: 'Interview session has ended. You can start a new one.',
};

export const MockInterview: React.FC<MockInterviewProps> = () => {
    const [status, setStatus] = useState<InterviewStatus>('idle');
    const [transcript, setTranscript] = useState<ChatMessage[]>([]);
    
    const sessionRef = useRef<Promise<LiveSession> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
    
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    const cleanup = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.then(session => session.close());
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if(scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if(mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
    }, []);

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);
    
    const startInterview = async () => {
        setStatus('connecting');
        setTranscript([]);
        
        try {
            // Re-initialize AI client just-in-time to ensure the latest API key is used.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const source = audioContextRef.current!.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContextRef.current!.destination);
                        setStatus('active');
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscriptionRef.current;
                            const fullOutput = currentOutputTranscriptionRef.current;
                            setTranscript(prev => {
                                let newTranscript = [...prev];
                                if (fullInput.trim()) newTranscript.push({ role: 'user', content: fullInput });
                                if (fullOutput.trim()) newTranscript.push({ role: 'model', content: fullOutput });
                                return newTranscript;
                            });
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            const outCtx = outputAudioContextRef.current!;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                            
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
                            const source = outCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outCtx.destination);
                            
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setStatus('error');
                        cleanup();
                    },
                    onclose: () => {
                        setStatus('ended');
                        cleanup();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: "You are an expert interviewer conducting a mock technical interview. Start with introductory questions, then move to behavioral, and finally deep technical questions related to common software engineering roles. Be professional and keep your responses concise to maintain a conversational flow.",
                },
            });
            sessionRef.current = sessionPromise;
        } catch (error) {
            console.error('Failed to start interview:', error);
            setStatus('error');
            setTranscript([{ role: 'model', content: "Could not access microphone. Please grant permission and try again." }]);
        }
    };
    
    const endInterview = () => {
        if(sessionRef.current) {
            sessionRef.current.then(session => session.close());
        }
        setStatus('ended');
        cleanup();
    };

    return (
        <div className="flex flex-col h-full max-h-[70vh]">
            <div className="flex-shrink-0 flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Mock Interview Practice</h3>
                <div>
                    {status !== 'active' && (
                        <button onClick={startInterview} className="flex items-center justify-center bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-secondary transition-colors duration-300">
                            <MicrophoneIcon className="w-5 h-5 mr-2" />
                            Start Interview
                        </button>
                    )}
                     {status === 'active' && (
                        <button onClick={endInterview} className="flex items-center justify-center bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors duration-300">
                            <StopCircleIcon className="w-5 h-5 mr-2" />
                            End Interview
                        </button>
                    )}
                </div>
            </div>
            
            <p className="text-sm text-base-content/70 mb-4 h-10">{statusMessages[status]}</p>

            <div className="flex-grow overflow-y-auto pr-4 space-y-6 bg-base-100 p-4 rounded-lg">
                {transcript.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-brand-primary text-white"><SparklesIcon className="w-5 h-5" /></div>}
                        <div className={`max-w-xl rounded-2xl px-4 py-3 text-sm md:text-base ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-base-300 text-base-content rounded-bl-none'}`}>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                        </div>
                        {msg.role === 'user' && <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-base-300 text-base-content"><UserCircleIcon className="w-6 h-6" /></div>}
                    </div>
                ))}
                 {transcript.length === 0 && status !== 'idle' && (
                    <div className="text-center text-base-content/50">
                        The interview will begin shortly. The first question from the AI will appear here.
                    </div>
                )}
            </div>
        </div>
    );
};