import { useState, useEffect, useCallback, useRef } from 'react';

export const useSpeechRecognition = ({ lang = 'ja-JP', onResult }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);

  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (onResultRef.current) {
        onResultRef.current({ finalTranscript, interimTranscript });
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'network' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current && recognitionRef.current.isListeningIntended) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('Failed to restart recognition', e);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.isListeningIntended = false;
        recognitionRef.current.stop();
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
    };
  }, [lang]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.isListeningIntended = true;
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error('Start listening error:', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.isListeningIntended = false;
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (e) {
      console.error('Stop listening error:', e);
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening
  };
};
