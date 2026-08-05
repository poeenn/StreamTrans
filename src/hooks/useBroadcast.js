import { useState, useEffect, useCallback, useRef } from 'react';

const CHANNEL_NAME = 'subtitle-sync-channel';

export const useBroadcast = (onMessageReceived) => {
  const channelRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;
    
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);

    channelRef.current.onmessage = (event) => {
      if (onMessageReceived) {
        onMessageReceived(event.data);
      }
    };

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [onMessageReceived]);

  const broadcastMessage = useCallback((message) => {
    if (channelRef.current) {
      channelRef.current.postMessage(message);
    }
  }, []);

  return { broadcastMessage };
};
