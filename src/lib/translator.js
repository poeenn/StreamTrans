let cachedTranslator = null;
let currentSource = '';
let currentTarget = '';

export const translateText = async (text, sourceLang, targetLang, engineType = 'cloud') => {
  if (!text || !text.trim()) return '';
  if (engineType === 'chrome') {
    return translateWithChromeOrError(text, sourceLang, targetLang);
  } else {
    return translateWithGoogle(text, sourceLang, targetLang);
  }
};

const translateWithChromeOrError = async (text, sourceLang, targetLang) => {
  try {
    let api = null;
    if (typeof window !== 'undefined') {
      if ('Translator' in window) {
        api = window.Translator; // Modern API (Chrome 138+)
      } else if ('translation' in window) {
        api = window.translation; // Older beta API
      } else if (window.ai && 'translator' in window.ai) {
        api = window.ai.translator; // Very old beta API
      }
    }
    
    if (!api) {
      return '【エラー: Chrome内蔵AIの設定が未完了です。画面の手順に沿って設定するか、クラウド自動翻訳を使用してください】';
    }
    
    const sourceCode = sourceLang.split('-')[0];
    const targetCode = targetLang.split('-')[0];

    if (cachedTranslator && currentSource === sourceCode && currentTarget === targetCode) {
      return await cachedTranslator.translate(text);
    }

    const canTranslate = await api.canTranslate({
      sourceLanguage: sourceCode,
      targetLanguage: targetCode,
    });

    if (canTranslate !== 'no') {
      if (typeof window !== 'undefined' && canTranslate === 'after-download') {
        window.dispatchEvent(new CustomEvent('translation-download-start'));
      }

      cachedTranslator = await api.createTranslator({
        sourceLanguage: sourceCode,
        targetLanguage: targetCode,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const progress = (e.loaded / e.total) * 100;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('translation-download-progress', { 
                detail: { progress, loaded: e.loaded, total: e.total } 
              }));
            }
          });
        }
      });
      
      currentSource = sourceCode;
      currentTarget = targetCode;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('translation-download-complete'));
      }

      return await cachedTranslator.translate(text);
    } else {
      console.warn(`Chrome AI translation not supported for ${sourceCode} -> ${targetCode}`);
      return '【エラー: 選択された言語ペアはChrome内蔵AIでは未対応です】';
    }
  } catch (error) {
    console.error('Chrome Translation Error:', error);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('translation-download-error'));
    }
    return '【エラー: Chrome内蔵AIで問題が発生しました。設定を確認するかクラウド翻訳を使用してください】';
  }
};

const translateWithGoogle = async (text, sourceLang, targetLang) => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    let translatedText = '';
    
    if (data && data[0]) {
      data[0].forEach((item) => {
        if (item[0]) translatedText += item[0];
      });
    }
    return translatedText;
  } catch (error) {
    console.error('Google Translation Error:', error);
    return '【翻訳エラー: ネットワークを確認してください】';
  }
};
