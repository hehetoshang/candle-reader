/**
 * 智能文本分句工具
 * @param {string} text - 原始文本
 * @param {object} options - 配置选项
 * @returns {Array<Sentence>} 分句结果
 */
export function splitText(text, options = {}) {
  const {
    mode = 'sentence',
    punctuation = ['。', '！', '？', '.', '!', '?'],
    minLength = 5,
    maxLength = 500
  } = options;

  if (!text || typeof text !== 'string') {
    return [];
  }

  // 处理特殊符号
  let processedText = text
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/g, '\n')
    .trim();

  if (mode === 'paragraph') {
    return splitByParagraph(processedText);
  }

  // 按标点分句
  const sentences = [];
  let currentSentence = '';
  let startIndex = 0;

  for (let i = 0; i < processedText.length; i++) {
    const char = processedText[i];
    currentSentence += char;

    // 检查是否是标点符号
    if (punctuation.includes(char)) {
      const trimmedSentence = currentSentence.trim();
      if (trimmedSentence.length >= minLength) {
        sentences.push({
          id: sentences.length,
          text: trimmedSentence,
          startIndex,
          endIndex: i + 1,
          audioBlob: null,
          status: 'pending'
        });
        startIndex = i + 1;
        currentSentence = '';
      }
    }

    // 处理超长句子
    if (currentSentence.length > maxLength) {
      const trimmedSentence = currentSentence.trim();
      if (trimmedSentence.length >= minLength) {
        sentences.push({
          id: sentences.length,
          text: trimmedSentence,
          startIndex,
          endIndex: i + 1,
          audioBlob: null,
          status: 'pending'
        });
        startIndex = i + 1;
        currentSentence = '';
      }
    }
  }

  // 处理最后一句
  const finalSentence = currentSentence.trim();
  if (finalSentence.length >= minLength) {
    sentences.push({
      id: sentences.length,
      text: finalSentence,
      startIndex,
      endIndex: processedText.length,
      audioBlob: null,
      status: 'pending'
    });
  }

  return sentences;
}

/**
 * 段落处理（保留段落结构）
 * @param {string} text - 原始文本
 * @returns {Array<Sentence>} 分句结果
 */
export function splitByParagraph(text) {
  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
  const sentences = [];

  let startIndex = 0;
  paragraphs.forEach((paragraph, index) => {
    const trimmedParagraph = paragraph.trim();
    if (trimmedParagraph.length > 0) {
      sentences.push({
        id: sentences.length,
        text: trimmedParagraph,
        startIndex,
        endIndex: startIndex + paragraph.length,
        audioBlob: null,
        status: 'pending'
      });
      startIndex += paragraph.length + 1; // +1 for the newline
    }
  });

  return sentences;
}

/**
 * Edge Speech 语音选项映射
 */
export const VOICE_OPTIONS = [
  // 女声
  { text: '晓晓 - 温柔女声', value: 'zh-CN-XiaoxiaoNeural' },
  { text: '晓辰 - 成熟女声', value: 'zh-CN-XiaochenNeural' },
  { text: '晓雨 - 甜美女声', value: 'zh-CN-XiaoyuNeural' },
  { text: '晓伊 - 知性女声', value: 'zh-CN-XiaoyiNeural' },
  
  // 男声
  { text: '云希 - 磁性男声', value: 'zh-CN-YunxiNeural' },
  { text: '云夏 - 阳光男声', value: 'zh-CN-YunxiaNeural' },
  { text: '云扬 - 稳重男声', value: 'zh-CN-YunyangNeural' },
  
  // 方言（可选）
  { text: '云希（粤语）', value: 'zh-HK-WanLungNeural' },
];
