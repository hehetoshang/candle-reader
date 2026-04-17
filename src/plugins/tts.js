import { EdgeSpeechTTS } from '@lobehub/tts';

let ttsInstance = null;

/**
 * 初始化 TTS 实例
 * @returns {EdgeSpeechTTS} TTS 实例
 */
export function initTTS() {
  if (!ttsInstance) {
    ttsInstance = new EdgeSpeechTTS({ locale: 'zh-CN' });
  }
  return ttsInstance;
}

/**
 * 获取 TTS 实例
 * @returns {EdgeSpeechTTS} TTS 实例
 */
export function getTTSInstance() {
  return ttsInstance || initTTS();
}

export { EdgeSpeechTTS };
