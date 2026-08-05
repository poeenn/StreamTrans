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
    let checkFn = null;
    let createFn = null;

    if (typeof window !== 'undefined') {
      // 1. Chrome 150+ (Translator API with availability method)
      if ('Translator' in window && window.Translator.availability) {
        api = window.Translator;
        checkFn = api.availability.bind(api);
        createFn = api.create.bind(api);
      }
      // 2. Standard API (Chrome 138+ / Older MDN spec)
      else if ('translation' in window && window.translation.canTranslate) {
        api = window.translation;
        checkFn = api.canTranslate.bind(api);
        createFn = api.createTranslator ? api.createTranslator.bind(api) : api.create.bind(api);
      } 
      // 3. Alternative Static API
      else if ('Translator' in window && window.Translator.canTranslate) {
        api = window.Translator;
        checkFn = api.canTranslate.bind(api);
        createFn = api.create ? api.create.bind(api) : api.createTranslator.bind(api);
      }
      // 4. Early Beta API
      else if (window.ai && window.ai.translator) {
        api = window.ai.translator;
        if (api.canTranslate) checkFn = api.canTranslate.bind(api);
        else if (api.capabilities) checkFn = api.capabilities.bind(api);
        
        if (api.createTranslator) createFn = api.createTranslator.bind(api);
        else if (api.create) createFn = api.create.bind(api);
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

    if (!checkFn) {
      throw new Error('Translation API is detected but no valid method found.');
    }

    const canTranslateResult = await checkFn({
      sourceLanguage: sourceCode,
      targetLanguage: targetCode,
    });
    
    let isAvailable = false;
    let needsDownload = false;

    if (typeof canTranslateResult === 'object' && canTranslateResult !== null) {
      const avail = canTranslateResult.available;
      isAvailable = avail !== 'no' && avail !== 'unavailable';
      needsDownload = avail === 'after-download' || avail === 'downloadable';
    } else {
      isAvailable = canTranslateResult !== 'no' && canTranslateResult !== 'unavailable';
      needsDownload = canTranslateResult === 'after-download' || canTranslateResult === 'downloadable';
    }

    if (isAvailable) {
      if (typeof window !== 'undefined' && needsDownload) {
        window.dispatchEvent(new CustomEvent('translation-download-start'));
      }

      if (!createFn) throw new Error('Create method not found');

      cachedTranslator = await createFn({
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
    return `【エラー: ${error.message || '内部エラー'}】`;
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
