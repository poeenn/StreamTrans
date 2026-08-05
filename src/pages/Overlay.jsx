import React, { useState, useEffect } from 'react';
import { useBroadcast } from '../hooks/useBroadcast';

const Overlay = () => {
  const [subtitles, setSubtitles] = useState([]);
  const [settings, setSettings] = useState({
    transColor: '#fbbf24',
    transSize: 36,
    origColor: '#e2e8f0',
    origSize: 24,
    strokeColor: '#000000',
    showOriginal: true,
    textOpacity: 1,
    hideTimeout: 10,
    origMaxChars: 40,
    transMaxChars: 40
  });

  const handleMessage = (data) => {
    if (data.type === 'SETTINGS_UPDATE') {
      setSettings(data.payload);
    } else if (data.type === 'SUBTITLE_UPDATE') {
      const { original, translated, isFinal } = data.payload;
      
      setSubtitles(prev => {
        const hasInterim = prev.length > 0 && !prev[prev.length - 1].isFinal;
        let newSubtitles = [...prev];
        const newSubtitle = { id: Date.now(), timestamp: Date.now(), original, translated, isFinal };

        if (hasInterim) {
          newSubtitle.id = prev[prev.length - 1].id;
          newSubtitles[newSubtitles.length - 1] = newSubtitle;
        } else {
          newSubtitles.push(newSubtitle);
        }

        if (newSubtitles.length > 3) {
          newSubtitles = newSubtitles.slice(newSubtitles.length - 3);
        }
        
        return newSubtitles;
      });
    }
  };

  useBroadcast(handleMessage);

  useEffect(() => {
    if (!settings.hideTimeout || settings.hideTimeout === 0) return;
    
    const interval = setInterval(() => {
      setSubtitles(prev => {
        const now = Date.now();
        const filtered = prev.filter(sub => {
          if (!sub.isFinal) return true;
          return (now - sub.timestamp) < settings.hideTimeout * 1000;
        });
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [settings.hideTimeout]);

  const containerStyle = {
    '--trans-color': settings.transColor,
    '--trans-size': `${settings.transSize}px`,
    '--orig-color': settings.origColor,
    '--orig-size': `${settings.origSize}px`,
    '--stroke-color': settings.strokeColor,
    '--text-opacity': settings.textOpacity,
    '--orig-max-chars': settings.origMaxChars === 100 ? 9999 : settings.origMaxChars,
    '--trans-max-chars': settings.transMaxChars === 100 ? 9999 : settings.transMaxChars,
  };

  return (
    <div className="overlay-container" style={containerStyle}>
      <style>{`
        body { background: transparent !important; }
        .container { display: none; } /* Hide container if accidentally applied */
      `}</style>
      
      <div className="subtitle-box">
        {subtitles.map((sub, index) => (
          <div key={sub.id} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            marginBottom: '1rem',
            opacity: sub.isFinal ? 1 : 0.8
          }}>
            {settings.showOriginal && (
              <div className="subtitle-text original">
                {sub.original}
              </div>
            )}
            {sub.translated && (
              <div className="subtitle-text translated">
                {sub.translated}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Overlay;
