/**
 * ttsTextSplitter.js
 *
 * 文本分割工具，用于将长文本按标点符号分割为适合TTS处理的句子片段。
 * 支持中英文标点，提供性能日志记录。
 */

/**
 * 性能日志记录器
 * @param {string} label - 日志标签
 * @param {number} startTime - 开始时间戳（毫秒）
 * @param {object} details - 附加详情信息
 */
function logPerformance(label, startTime, details = {}) {
  const duration = performance.now() - startTime
  const info = {
    duration: `${duration.toFixed(2)}ms`,
    ...details,
  }
  console.log(`[ttsTextSplitter] ${label}:`, info)
}

/**
 * 中英文句子级别标点符号正则
 * 匹配：。！？.!?以及可能跟随的引号、括号等
 */
const SENTENCE_PUNCTUATION = /[。！？.!?]+[」）)"'』】\]]*/

/**
 * 中英文段落分隔符正则
 * 匹配：换行符、回车符及其组合
 */
const PARAGRAPH_SEPARATOR = /\n\s*\n|\r\n\s*\r\n|\r\s*\r/

/**
 * 空白字符正则
 */
const WHITESPACE_REGEX = /^\s+|\s+$/g

/**
 * 空字符串或纯空白字符串检测正则
 */
const EMPTY_OR_WHITESPACE_REGEX = /^\s*$/

/**
 * Edge Speech 中文语音选项
 * @constant
 * @type {Array<{name: string, locale: string, voice: string}>}
 */
export const VOICE_OPTIONS = [
  { name: '晓晓（女声-通用）', locale: 'zh-CN', voice: 'zh-CN-XiaoxiaoNeural' },
  { name: '晓艺（女声-情感）', locale: 'zh-CN', voice: 'zh-CN-XiaoyiNeural' },
  { name: '云健（男声-通用）', locale: 'zh-CN', voice: 'zh-CN-YunjianNeural' },
  { name: '云希（男声-新闻）', locale: 'zh-CN', voice: 'zh-CN-YunxiNeural' },
  { name: '云夏（男声-年轻）', locale: 'zh-CN', voice: 'zh-CN-YunxiaNeural' },
  { name: '晓北（女声-辽宁）', locale: 'zh-CN', voice: 'zh-CN-XiaobeiNeural' },
  { name: '晓妮（女声-陕西）', locale: 'zh-CN', voice: 'zh-CN-XiaoniNeural' },
  { name: '晓蓉（女声-四川）', locale: 'zh-CN', voice: 'zh-CN-XiaorongNeural' },
]

/**
 * 过滤无效文本片段
 * 移除空字符串、纯空白字符以及过短的无意义内容
 * @param {string} text - 待过滤的文本
 * @returns {string|null} 过滤后的文本，如果无效则返回 null
 */
function filterText(text) {
  if (!text || EMPTY_OR_WHITESPACE_REGEX.test(text)) {
    return null
  }

  const trimmed = text.replace(WHITESPACE_REGEX, '')

  if (trimmed.length === 0) {
    return null
  }

  return trimmed
}

/**
 * 按句子级别分割文本
 * 根据中英文标点符号（。！？.!?）将长文本分割为多个句子片段
 * 会先按换行符分段，确保标题和正文分开
 * @param {string} text - 待分割的原始文本
 * @param {object} [options] - 配置选项
 * @param {number} [options.maxLength=500] - 单个句子的最大字符数，超过会自动截断
 * @param {boolean} [options.filterEmpty=true] - 是否过滤空片段
 * @returns {Array<{id: string, text: string, startIndex: number, endIndex: number, status: string, audioBlob: null, audioUrl: null}>} 句子片段数组
 */
export function splitText(text, options = {}) {
  const startTime = performance.now()

  const {
    maxLength = 500,
    filterEmpty = true,
  } = options

  if (!text || typeof text !== 'string') {
    logPerformance('splitText', startTime, { inputLength: 0, outputCount: 0 })
    return []
  }

  const sentences = []
  let globalIdCounter = 0

  // 先按换行符分段，确保标题和正文分开
  const lines = text.split(/\n+/).filter(line => line.trim().length > 0)
  
  let globalStartIndex = 0
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) {
      globalStartIndex += line.length
      continue
    }
    
    // 对每一行按标点符号分句
    const lineSentences = splitLineByPunctuation(trimmedLine, maxLength, filterEmpty, globalStartIndex, globalIdCounter)
    sentences.push(...lineSentences)
    
    globalStartIndex += line.length
    globalIdCounter = sentences.length  // 更新全局 ID 计数器
  }

  logPerformance('splitText', startTime, { inputLength: text.length, outputCount: sentences.length })
  return sentences
}

/**
 * 按标点符号分割单行文本
 * @param {string} line - 单行文本
 * @param {number} maxLength - 单个句子最大长度
 * @param {boolean} filterEmpty - 是否过滤空片段
 * @param {number} globalStartIndex - 全局起始索引
 * @param {number} globalIdCounter - 全局 ID 计数器
 * @returns {Array} 句子片段数组
 */
function splitLineByPunctuation(line, maxLength, filterEmpty, globalStartIndex, globalIdCounter) {
  const sentences = []
  let currentIndex = 0
  let localIdCounter = globalIdCounter

  const regex = new RegExp(SENTENCE_PUNCTUATION.source, 'g')
  let match

  while ((match = regex.exec(line)) !== null) {
    const endIndex = match.index + match[0].length
    let segmentText = line.slice(currentIndex, endIndex)

    if (filterEmpty) {
      const filtered = filterText(segmentText)
      if (filtered === null) {
        currentIndex = endIndex
        continue
      }
      segmentText = filtered
    }

    // 如果片段超过最大长度，进一步拆分
    if (segmentText.length > maxLength) {
      const subSegments = splitByLength(segmentText, maxLength, currentIndex + globalStartIndex)
      sentences.push(...subSegments)
      localIdCounter = sentences.length
    } else {
      sentences.push({
        id: `sentence-${localIdCounter++}`,
        text: segmentText,
        startIndex: currentIndex + globalStartIndex,
        endIndex: currentIndex + segmentText.length + globalStartIndex,
        status: 'pending',
        audioBlob: null,
        audioUrl: null,
      })
    }

    currentIndex = endIndex
  }

  // 处理剩余的文本
  if (currentIndex < line.length) {
    const remaining = line.slice(currentIndex)
    const filtered = filterEmpty ? filterText(remaining) : remaining

    if (filtered !== null) {
      sentences.push({
        id: `sentence-${localIdCounter++}`,
        text: filtered,
        startIndex: currentIndex + globalStartIndex,
        endIndex: currentIndex + filtered.length + globalStartIndex,
        status: 'pending',
        audioBlob: null,
        audioUrl: null,
      })
    }
  }

  return sentences
}

/**
 * 按长度分割超长文本
 * 当单个句子超过最大长度时，按逗号、分号等进一步拆分
 * @param {string} text - 待分割的文本
 * @param {number} maxLength - 最大长度
 * @param {number} baseIndex - 原始文本中的起始索引
 * @returns {Array<{id: string, text: string, startIndex: number, endIndex: number, status: string, audioBlob: null, audioUrl: null}>} 分割后的片段数组
 */
function splitByLength(text, maxLength, baseIndex) {
  const segments = []
  let idCounter = 0

  // 次级分割标点：，,；;：:
  const subPunctuation = /[，,；;：:]+/

  let remaining = text

  while (remaining.length > maxLength) {
    // 在 maxLength 范围内寻找最后一个次级标点
    const searchArea = remaining.slice(0, maxLength)
    const regex = new RegExp(subPunctuation.source, 'g')
    let lastMatch = null
    let m

    while ((m = regex.exec(searchArea)) !== null) {
      lastMatch = m
    }

    let splitPoint
    if (lastMatch) {
      splitPoint = lastMatch.index + lastMatch[0].length
    } else {
      // 没有标点则强制截断
      splitPoint = maxLength
    }

    const chunk = remaining.slice(0, splitPoint)
    const filtered = filterText(chunk)

    if (filtered !== null) {
      segments.push({
        id: `sentence-sub-${idCounter++}`,
        text: filtered,
        startIndex: baseIndex,
        endIndex: baseIndex + filtered.length,
        status: 'pending',
        audioBlob: null,
        audioUrl: null,
      })
    }

    remaining = remaining.slice(splitPoint)
    baseIndex += splitPoint
  }

  if (remaining.length > 0) {
    const filtered = filterText(remaining)
    if (filtered !== null) {
      segments.push({
        id: `sentence-sub-${idCounter++}`,
        text: filtered,
        startIndex: baseIndex,
        endIndex: baseIndex + filtered.length,
        status: 'pending',
        audioBlob: null,
        audioUrl: null,
      })
    }
  }

  return segments
}

/**
 * 按段落级别分割文本
 * 根据段落分隔符（空行、换行）将文本分割为段落
 * @param {string} text - 待分割的原始文本
 * @param {object} [options] - 配置选项
 * @param {boolean} [options.filterEmpty=true] - 是否过滤空段落
 * @returns {Array<{id: string, text: string, startIndex: number, endIndex: number, status: string, audioBlob: null, audioUrl: null}>} 段落片段数组
 */
export function splitByParagraph(text, options = {}) {
  const startTime = performance.now()

  const {
    filterEmpty = true,
  } = options

  if (!text || typeof text !== 'string') {
    logPerformance('splitByParagraph', startTime, { inputLength: 0, outputCount: 0 })
    return []
  }

  const paragraphs = []
  const splits = text.split(PARAGRAPH_SEPARATOR)
  let currentIndex = 0
  let idCounter = 0

  for (const paragraph of splits) {
    const trimmed = paragraph.replace(WHITESPACE_REGEX, '')

    if (filterEmpty && EMPTY_OR_WHITESPACE_REGEX.test(trimmed)) {
      currentIndex += paragraph.length + 2
      continue
    }

    const startIndex = currentIndex
    const endIndex = startIndex + paragraph.length

    paragraphs.push({
      id: `paragraph-${idCounter++}`,
      text: trimmed || paragraph,
      startIndex,
      endIndex,
      status: 'pending',
      audioBlob: null,
      audioUrl: null,
    })

    currentIndex = endIndex + 2
  }

  logPerformance('splitByParagraph', startTime, {
    inputLength: text.length,
    outputCount: paragraphs.length,
  })

  return paragraphs
}
