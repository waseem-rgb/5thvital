import { Headphones, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
const API_BASE = import.meta.env.VITE_API_URL ?? '';
import { RetellWebClient } from 'retell-client-js-sdk';

interface VoiceAgentProps {
  className?: string;
}

interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

declare global {
  interface Window {
    RetellWebClient?: any;
  }
}

const VoiceAgent = ({ className }: VoiceAgentProps) => {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [retellLoaded, setRetellLoaded] = useState(false);
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
  const webClientRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedCountRef = useRef<number>(0);

  // Initialize Retell SDK readiness (using npm package)
  useEffect(() => {
    try {
      // If the import succeeded, SDK is available
      setRetellLoaded(true);
      console.log('✅ Retell Web SDK (npm) ready');
    } catch (e) {
      console.error('Retell SDK init error:', e);
      setRetellLoaded(false);
    }
  }, []);

  const addTranscriptMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: TranscriptMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date().toLocaleTimeString()
    };
    setTranscriptMessages(prev => [...prev, newMessage]);
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptMessages]);

  const startCall = async () => {
    if (!retellLoaded) {
      // SDK not ready yet
      return;
    }

    // Using npm SDK import - no window check needed

    setIsConnecting(true);
    setTranscriptMessages([]); // Clear previous messages
    processedCountRef.current = 0; // Reset processed count

    try {
      const res = await fetch(`${API_BASE}/api/retell/token`, { method: 'POST' });
      const data = res.ok ? await res.json() : null;
      const error = res.ok ? null : new Error(`Failed (${res.status})`);
      
      if (error || !data?.access_token) {
        console.error('Failed to get access token:', error);
        toast.error('Failed to start call - authentication failed');
        return;
      }

      webClientRef.current = new RetellWebClient();
      
      // Set up event listeners
      webClientRef.current.on('call_started', () => {
        console.log('Retell conversation started');
        setIsCallActive(true);
        setIsConnecting(false);
        setIsTranscriptOpen(true);
        addTranscriptMessage('assistant', 'Hello! How can I help you today?');
        toast.success('Voice call connected! Start speaking.');
      });

      webClientRef.current.on('call_ended', (payload?: any) => {
        const code = payload?.code;
        const reason = payload?.reason;
        console.log('Retell conversation ended:', code, reason);
        setIsCallActive(false);
        setIsConnecting(false);
        setIsTranscriptOpen(false);
        addTranscriptMessage('assistant', 'Call ended. Thank you!');
        toast.info('Call ended');
      });

      webClientRef.current.on('error', (error: any) => {
        console.error('Retell error:', error);
        setIsCallActive(false);
        setIsConnecting(false);
        toast.error('Call failed: ' + error.message);
      });

      webClientRef.current.on('update', (update: any) => {
        console.log('Retell update:', update);
        
        // Retell often sends the FULL transcript array on every update.
        // To avoid duplicates and support partial growth of the last item,
        // rebuild the transcript UI from the latest snapshot on each update.
        if (Array.isArray(update.transcript)) {
          const mapped: TranscriptMessage[] = update.transcript
            .filter((item: any) => item?.content && item?.role)
            .map((item: any, idx: number) => ({
              id: `${idx}-${item.role}-${item.timestamp ?? ''}`,
              role: (item.role === 'agent' ? 'assistant' : item.role) as 'user' | 'assistant',
              content: item.content,
              timestamp: new Date().toLocaleTimeString(),
            }));

          setTranscriptMessages(mapped);
          processedCountRef.current = update.transcript.length; // Keep for reference/debug
        }
      });

      await webClientRef.current.startCall({
        accessToken: data.access_token,
      });

    } catch (error) {
      console.error('Error starting call:', error);
      setIsConnecting(false);
      toast.error('Failed to start call');
    }
  };

  const endCall = () => {
    if (webClientRef.current) {
      webClientRef.current.stopCall();
      webClientRef.current = null;
    }
    setIsCallActive(false);
    setIsConnecting(false);
  };

  const toggleTranscript = () => {
    if (!retellLoaded || isConnecting) return;
    if (!isCallActive) {
      startCall();
    } else {
      setIsTranscriptOpen(!isTranscriptOpen);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* CTA Button */}
      <div className="flex flex-col items-center">
        <button
          onClick={toggleTranscript}
          disabled={!retellLoaded || isConnecting}
          className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-3 rounded-full hover:bg-white/20 transition-all duration-300 shadow-lg hover:shadow-xl group disabled:opacity-50"
        >
          <Headphones className="w-5 h-5 group-hover:animate-pulse" />
          <span className="text-sm font-medium">
            {isConnecting ? 'Connecting...' : isCallActive ? 'Call Active' : 'Talk to our AI agent'}
          </span>
        </button>

        {/* Transcript Box - Centered with Dark Overlay */}
        {isTranscriptOpen && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsTranscriptOpen(false)} />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[800px] lg:max-w-[900px] bg-slate-900/40 backdrop-blur-xl border border-slate-700/30 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-700/30 bg-slate-800/20">
                <h3 className="text-white font-semibold text-sm sm:text-base">AI Voice Assistant</h3>
                <div className="flex items-center gap-3">
                  {isCallActive && (
                    <button
                      onClick={endCall}
                      className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200"
                    >
                      End Call
                    </button>
                  )}
                  <button
                    onClick={() => setIsTranscriptOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="p-3 sm:p-4 max-h-[60vh] sm:max-h-[65vh] md:max-h-[70vh] overflow-y-auto space-y-3">
                {transcriptMessages.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">
                    {isConnecting ? 'Connecting to AI agent...' : 'Start a call to see the conversation'}
                  </p>
                ) : (
                  <>
                    {transcriptMessages.map((message) => (
                      <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] p-3 sm:p-3.5 rounded-xl ${
                          message.role === 'user' 
                            ? 'bg-blue-600/80 text-white' 
                            : 'bg-slate-700/70 text-white'
                        }`}>
                          <p className="text-sm sm:text-base break-words whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1.5">{message.timestamp}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Status / Controls */}
              {(isConnecting || isCallActive) && (
                <div className="px-3 sm:px-4 py-3 border-t border-slate-700/30 bg-slate-800/20 flex items-center justify-between gap-3">
                  <p className="text-slate-300 text-xs sm:text-sm flex items-center gap-2">
                    {isConnecting ? (
                      <>
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span>Call active - Speak naturally</span>
                      </>
                    )}
                  </p>
                  {isCallActive && (
                    <button
                      onClick={endCall}
                      className="px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-red-600/80 hover:bg-red-600 text-white transition-all duration-200"
                    >
                      End Call
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

import ErrorBoundary from '@/components/ErrorBoundary';

const VoiceAgentSafe = (props: VoiceAgentProps) => (
  <ErrorBoundary fallbackMessage="Voice assistant is unavailable right now">
    <VoiceAgent {...props} />
  </ErrorBoundary>
);

export default VoiceAgentSafe;