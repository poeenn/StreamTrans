import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Settings, Copy, ExternalLink, Activity, Coffee, Heart, X } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useBroadcast } from '../hooks/useBroadcast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { translateText } from '../lib/translator';

// どねる（Doneru）支援URL
const DONERU_URL = 'https://doneru.jp/poeenn';

const ControlPanel = () => {
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [sourceLang, setSourceLang] = useLocalStorage('jimaku_sourceLang', 'ja-JP');
  const [targetLang, setTargetLang] = useLocalStorage('jimaku_targetLang', 'en-US');
  const [hideTimeout, setHideTimeout] = useLocalStorage('jimaku_hideTimeout', 10);
  const [engine, setEngine] = useLocalStorage('jimaku_engine', 'chrome');
  const [chromeSupported, setChromeSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasTranslation = 'translation' in window;
      const hasAITranslator = window.ai && 'translator' in window.ai;
      const hasModernTranslator = 'Translator' in window;
      if (hasTranslation || hasAITranslator || hasModernTranslator) {
        setChromeSupported(true);
      }
    }
  }, []);
  
  // Design settings
  const [transColor, setTransColor] = useLocalStorage('jimaku_transColor', '#ffffff');
  const [transSize, setTransSize] = useLocalStorage('jimaku_transSize', 28);
  const [origColor, setOrigColor] = useLocalStorage('jimaku_origColor', '#e2e8f0');
  const [origSize, setOrigSize] = useLocalStorage('jimaku_origSize', 20);
  const [strokeColor, setStrokeColor] = useLocalStorage('jimaku_strokeColor', '#000000');
  const [showOriginal, setShowOriginal] = useLocalStorage('jimaku_showOriginal', false);
  const [textOpacity, setTextOpacity] = useLocalStorage('jimaku_textOpacity', 1);
  const [origMaxChars, setOrigMaxChars] = useLocalStorage('jimaku_origMaxChars', 40);
  const [transMaxChars, setTransMaxChars] = useLocalStorage('jimaku_transMaxChars', 40);
  const [downloadProgress, setDownloadProgress] = useState(null);

  useEffect(() => {
    const handleStart = () => setDownloadProgress(0);
    const handleProgress = (e) => setDownloadProgress(e.detail.progress);
    const handleComplete = () => setDownloadProgress(null);
    const handleError = () => setDownloadProgress(null);

    window.addEventListener('translation-download-start', handleStart);
    window.addEventListener('translation-download-progress', handleProgress);
    window.addEventListener('translation-download-complete', handleComplete);
    window.addEventListener('translation-download-error', handleError);

    return () => {
      window.removeEventListener('translation-download-start', handleStart);
      window.removeEventListener('translation-download-progress', handleProgress);
      window.removeEventListener('translation-download-complete', handleComplete);
      window.removeEventListener('translation-download-error', handleError);
    };
  }, []);

  // Pre-initialize translator to check/trigger downloads
  useEffect(() => {
    if (!chromeSupported) return;
    const initTranslator = async () => {
      try {
        await translateText('init', sourceLang, targetLang, 'chrome');
      } catch (err) {
        // Silently fail on init, it will be handled by UI
      }
    };
    if (engine === 'chrome') {
      initTranslator();
    }
  }, [chromeSupported, sourceLang, targetLang, engine]);

  const { broadcastMessage } = useBroadcast();

  // Reference to keep track of current translation to avoid duplicating
  const lastTranslatedText = useRef('');
  const translateTimeoutRef = useRef(null);

  const handleSpeechResult = async ({ finalTranscript, interimTranscript }) => {
    // Broadcast interim immediately (original text only)
    if (interimTranscript) {
      broadcastMessage({
        type: 'SUBTITLE_UPDATE',
        payload: {
          original: finalTranscript + interimTranscript,
          translated: '...',
          isFinal: false
        }
      });
    }

    // Process final transcript
    if (finalTranscript && finalTranscript !== lastTranslatedText.current) {
      lastTranslatedText.current = finalTranscript;
      
      // Clear previous timeout if typing fast
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
      
      // Delay translation slightly to batch close phrases or let user finish sentence
      translateTimeoutRef.current = setTimeout(async () => {
        try {
          const translated = await translateText(finalTranscript, sourceLang, targetLang, engine);
          broadcastMessage({
            type: 'SUBTITLE_UPDATE',
            payload: {
              original: finalTranscript,
              translated: translated,
              isFinal: true
            }
          });
        } catch (err) {
          console.error(err);
        }
      }, 500);
    }
  };

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    lang: sourceLang,
    onResult: handleSpeechResult
  });

  // Broadcast settings changes
  useEffect(() => {
    broadcastMessage({
      type: 'SETTINGS_UPDATE',
      payload: {
        transColor, transSize, origColor, origSize, strokeColor, showOriginal, textOpacity, hideTimeout, origMaxChars, transMaxChars
      }
    });
  }, [transColor, transSize, origColor, origSize, strokeColor, showOriginal, textOpacity, hideTimeout, origMaxChars, transMaxChars, broadcastMessage]);

  const copyOverlayUrl = () => {
    const url = `${window.location.origin}/overlay`;
    navigator.clipboard.writeText(url);
    alert('オーバーレイのURLをコピーしました。OBSのブラウザソースに貼り付けてください。');
  };

  if (!isSupported) {
    return (
      <div className="container">
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h2>お使いのブラウザは音声認識に対応していません</h2>
          <p>Google Chrome をご利用ください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}><Activity /> 配信字幕くん (Live Translator)</h1>
        <button
          type="button"
          onClick={() => setShowSupportModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1.1rem',
            backgroundColor: '#ffffff',
            border: '2px solid #fbcfe8',
            borderRadius: '999px',
            color: '#db2777',
            fontWeight: '700',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(244, 114, 182, 0.15)',
            transition: 'all 0.2s'
          }}
        >
          <Coffee size={18} />
          <span>☕ どねるで応援する</span>
        </button>
      </div>
      
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <span className={`status-indicator ${isListening ? 'listening' : ''}`}></span>
              {isListening ? '音声認識中...' : '停止中'}
            </h2>
            <p className="hint">マイクをオンにして話すと自動で翻訳されます。</p>
          </div>
          <button 
            className={`btn ${isListening ? 'active' : ''}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? <><MicOff size={20}/> 停止する</> : <><Mic size={20}/> 認識開始</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Column 1: Settings & Engine */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'var(--success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                📺 OBSに字幕を表示する方法
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn" onClick={copyOverlayUrl} style={{ backgroundColor: 'var(--success)', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
                  <Copy size={16} /> URLをコピー
                </button>
                <a href="/overlay" target="_blank" rel="noreferrer" title="別タブで開く" style={{ color: 'var(--success)' }}>
                  <ExternalLink size={20} />
                </a>
              </div>
            </div>
            
            <ol style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text)', fontSize: '0.85rem', lineHeight: '1.6' }}>
              <li>上の緑のボタンを押して <b>URLをコピー</b> します。</li>
              <li>OBSを開き、ソースの「<b>＋</b>」ボタンから「<b>ブラウザ</b>」を選択します。</li>
              <li>新規作成で適当な名前（例: 字幕）をつけて「OK」を押します。</li>
              <li><b>URL</b> の欄にさきほどコピーしたURLを貼り付けます。</li>
              <li><b>幅</b> を <code>1920</code> 、<b>高さ</b> を <code>300</code> 程度に設定します。</li>
              <li>「OK」を押すと完了です！この画面で話すとOBS上に字幕が出ます。（背景は自動で透明になります）</li>
            </ol>
          </div>

          <div className="glass-panel">
            <h3 style={{ marginTop: 0 }}><Settings size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}/> 基本設定</h3>
            
            <div className="form-group">
              <label>話す言語 (入力)</label>
              <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} disabled={isListening}>
                <option value="ja-JP">日本語 (Japanese)</option>
                <option value="en-US">英語 (English US)</option>
                <option value="ko-KR">韓国語 (Korean)</option>
                <option value="zh-CN">中国語 (Chinese Simplified)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>翻訳する言語</label>
              <select value={targetLang} onChange={e => setTargetLang(e.target.value)}>
                <option value="en-US">英語 (English US)</option>
                <option value="ja-JP">日本語 (Japanese)</option>
                <option value="ko-KR">韓国語 (Korean)</option>
                <option value="zh-CN">中国語 (Chinese Simplified)</option>
              </select>
            </div>
          </div>

          <div className="glass-panel">
            <h3 style={{ marginTop: 0 }}>翻訳エンジン</h3>
            
            <div className="radio-group" style={{ marginBottom: '1.5rem' }}>
              <label className={`radio-card ${engine === 'cloud' ? 'selected' : ''}`} onClick={() => setEngine('cloud')}>
                <input type="radio" checked={engine === 'cloud'} readOnly />
                <div className="radio-content">
                  <h4>クラウド自動翻訳 (予備)</h4>
                  <p>お使いのブラウザがChrome内蔵AIに非対応の場合に選択してください。</p>
                </div>
              </label>
              
              <label className={`radio-card ${engine === 'chrome' ? 'selected' : ''}`} onClick={() => setEngine('chrome')}>
                <input type="radio" checked={engine === 'chrome'} readOnly />
                <div className="radio-content">
                  <h4>Chrome内蔵 AI翻訳 (おすすめ)</h4>
                  <p>PCのローカルAIを使って超高速・遅延ゼロで翻訳します。※設定不要</p>
                </div>
              </label>
            </div>

            {engine === 'chrome' && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px', border: chromeSupported ? '1px solid var(--success)' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="status-indicator" style={{ backgroundColor: chromeSupported ? 'var(--success)' : 'var(--danger)', boxShadow: chromeSupported ? '0 0 8px var(--success)' : 'none' }}></span>
                  <h4 style={{ margin: 0 }}>ステータス: {chromeSupported ? '利用可能' : '利用不可 (クラウド翻訳をご利用ください)'}</h4>
                </div>
                
                {chromeSupported ? (
                  <>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--success)' }}>✅ <b>ローカル超高速翻訳</b> が作動中！（遅延ゼロ）</p>
                    
                    {downloadProgress !== null && (
                      <div style={{ marginTop: '0.5rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.75rem' }}>
                        <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.8rem', color: '#818cf8', fontWeight: 'bold' }}>
                          ⬇️ 翻訳用AIモデルを初回ダウンロード中... {Math.round(downloadProgress)}%
                        </p>
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${downloadProgress}%`, height: '100%', backgroundColor: '#818cf8', transition: 'width 0.2s' }}></div>
                        </div>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          ※ 初回のみ1回だけ自動でダウンロードが行われます（数分かかる場合があります）。
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--danger)', fontWeight: 'bold' }}>⚠️ 翻訳AIが利用できません</p>
                    <p style={{ margin: '0', color: 'var(--text-muted)' }}>お使いの環境ではChrome内蔵AIが利用できないため、「クラウド自動翻訳」を選択してください。</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Design Settings */}
        <div className="glass-panel">
          <h3 style={{ marginTop: 0 }}>デザイン設定 (OBSでの見え方)</h3>
          <p className="hint">変更はすぐにオーバーレイ画面に反映されます。</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.9rem' }}>翻訳の色</label>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <input type="color" value={transColor} onChange={e => setTransColor(e.target.value)} style={{ width: '40px', padding: '0.1rem' }}/>
                  <input type="text" value={transColor} onChange={e => setTransColor(e.target.value)} style={{ padding: '0.5rem' }}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.9rem' }}>サイズ (px)</label>
                <input type="number" value={transSize} onChange={e => setTransSize(Number(e.target.value))} min="10" max="100" style={{ padding: '0.5rem' }}/>
              </div>
            </div>

            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.9rem' }}>原文の色</label>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <input type="color" value={origColor} onChange={e => setOrigColor(e.target.value)} style={{ width: '40px', padding: '0.1rem' }} disabled={!showOriginal}/>
                  <input type="text" value={origColor} onChange={e => setOrigColor(e.target.value)} disabled={!showOriginal} style={{ padding: '0.5rem' }}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.9rem' }}>サイズ (px)</label>
                <input type="number" value={origSize} onChange={e => setOrigSize(Number(e.target.value))} min="10" max="100" disabled={!showOriginal} style={{ padding: '0.5rem' }}/>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem' }}>文字の縁取り色</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} style={{ width: '40px', padding: '0.1rem' }}/>
                <input type="text" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} style={{ padding: '0.5rem' }}/>
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem' }}>テキストの透過率 ({Math.round(textOpacity * 100)}%)</label>
              <input 
                type="range" 
                min="0.1" max="1" step="0.1" 
                value={textOpacity} 
                onChange={e => setTextOpacity(Number(e.target.value))} 
                style={{ width: '100%' }} 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem' }}>翻訳の改行文字数: {transMaxChars === 100 ? '無制限' : `${transMaxChars}文字`}</label>
              <input 
                type="range" 
                min="10" max="100" step="1" 
                value={transMaxChars} 
                onChange={e => setTransMaxChars(Number(e.target.value))} 
                style={{ width: '100%' }} 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem' }}>原文の改行文字数: {origMaxChars === 100 ? '無制限' : `${origMaxChars}文字`}</label>
              <input 
                type="range" 
                min="10" max="100" step="1" 
                value={origMaxChars} 
                onChange={e => setOrigMaxChars(Number(e.target.value))} 
                style={{ width: '100%' }} 
                disabled={!showOriginal}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem' }}>字幕が消えるまでの秒数: {hideTimeout === 0 ? '消えない' : `${hideTimeout}秒`}</label>
              <input 
                type="range" 
                min="0" max="30" step="1" 
                value={hideTimeout} 
                onChange={e => setHideTimeout(Number(e.target.value))} 
                style={{ width: '100%' }} 
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem', marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, fontSize: '0.9rem' }}>
                <input 
                  type="checkbox" 
                  checked={showOriginal} 
                  onChange={e => setShowOriginal(e.target.checked)} 
                  style={{ width: 'auto', margin: 0 }}
                />
                原文（話した言葉）を表示する
              </label>
            </div>
          </div>
        </div>

      </div>

      {/* Full Width Bottom: Preview */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>プレビュー (OBSでの表示イメージ)</h3>
        <div className="preview-box" style={{
          marginTop: 0,
          '--trans-color': transColor,
          '--trans-size': `${transSize}px`,
          '--orig-color': origColor,
          '--orig-size': `${origSize}px`,
          '--stroke-color': strokeColor,
          '--text-opacity': textOpacity,
          '--orig-max-chars': origMaxChars === 100 ? 9999 : origMaxChars,
          '--trans-max-chars': transMaxChars === 100 ? 9999 : transMaxChars
        }}>
          <div className="subtitle-box">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {showOriginal && (
                <div className="subtitle-text original">
                  こんにちは！今日は良い天気ですね。
                </div>
              )}
              <div className="subtitle-text translated" style={{ color: 'var(--trans-color)' }}>
                Hello! It's a beautiful day today.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Area: Developer Support */}
      <div style={{ marginBottom: '2.5rem' }}>
        {/* Developer Support Section */}
        <div className="glass-panel" style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.45) 0%, rgba(255, 255, 255, 0.95) 100%)',
          borderColor: '#f59e0b',
          borderWidth: '2px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
            <div style={{
              backgroundColor: '#ffedd5',
              color: '#ea580c',
              padding: '0.6rem',
              borderRadius: '12px',
              fontSize: '1.5rem',
              lineHeight: 1
            }}>
              ☕
            </div>
            <div style={{ flex: 1 }}>
              <span style={{
                display: 'inline-block',
                backgroundColor: '#f59e0b',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                padding: '0.15rem 0.6rem',
                borderRadius: '999px',
                marginBottom: '0.4rem'
              }}>
                開発者を応援
              </span>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.15rem', color: '#1e293b' }}>
                ☕ どねる（Doneru）で応援する
              </h3>
              <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                StreamTransは完全無料で誰でもお使いいただけます。配信活動のお役に立ちましたら、継続開発や維持への温かいご支援をいただけると大変励みになります！
              </p>
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="btn"
                style={{
                  fontSize: '0.85rem',
                  padding: '0.5rem 1.1rem',
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderRadius: '999px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <span>どねる（Doneru）で支援する</span>
                <Heart size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }} onClick={() => setShowSupportModal(false)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowSupportModal(false)}
              aria-label="閉じる"
              style={{
                position: 'absolute',
                top: '1.2rem',
                right: '1.2rem',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>☕</div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: '#1e293b' }}>どねる（Doneru）で応援する</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
                StreamTrans（配信字幕くん）をご利用いただきありがとうございます！<br />
                いただいたご支援はサーバー代・開発継続費用に大切に活用させていただきます。
              </p>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.9rem',
              color: '#334155'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🪙</span>
                <span>PayPay / クレジットカード / Amazon Pay などに対応</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.25rem' }}>💬</span>
                <span>応援メッセージを添えて手軽にチップを送れます</span>
              </div>
            </div>

            <a
              href={DONERU_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.9rem 1.5rem',
                borderRadius: '12px',
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '1rem',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                marginBottom: '0.75rem',
                boxSizing: 'border-box',
                transition: 'background-color 0.2s'
              }}
            >
              <span>どねる（Doneru）を開いて応援する</span>
              <ExternalLink size={18} />
            </a>

            <button
              onClick={() => setShowSupportModal(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
