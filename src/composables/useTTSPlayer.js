import { ref, computed, watch, onUnmounted } from 'vue'
import { EdgeSpeechTTS } from '@lobehub/tts'
import { splitText } from '../utils/ttsTextSplitter.js'
import AudioCache from '../utils/audioCache.js'

/**
 * TTS 播放器 Composable
 * 
 * 提供完整的文本转语音播放功能，包括：
 * - 文本分割和句子管理
 * - 音频生成和缓存
 * - 播放控制和状态管理
 * - 自动播放和懒加载
 * 
 * @returns {object} 响应式状态和控制方法
 */
export default function useTTSPlayer() {
  /**
   * 音频播放实例
   */
  let audioInstance = null

  /**
   * 音频缓存管理器
   */
  const cache = new AudioCache()

  /**
   * 文本分割后的句子数组
   * @type {import('vue').Ref<Array<{id: string, text: string, startIndex: number, endIndex: number, status: string, audioBlob: Blob|null, audioUrl: string|null}>>}
   */
  const sentences = ref([])

  /**
   * 当前播放的句子索引
   * @type {import('vue').Ref<number>}
   */
  const currentIndex = ref(0)

  /**
   * 是否正在播放
   * @type {import('vue').Ref<boolean>}
   */
  const isPlaying = ref(false)

  /**
   * 是否已暂停
   * @type {import('vue').Ref<boolean>}
   */
  const isPaused = ref(false)

  /**
   * 是否正在生成音频
   * @type {import('vue').Ref<boolean>}
   */
  const isLoading = ref(false)

  /**
   * 播放速率（0.5 - 2.0）
   * @type {import('vue').Ref<number>}
   */
  const playbackRate = ref(1)

  /**
   * 选中的语音
   * @type {import('vue').Ref<string>}
   */
  const voice = ref('zh-CN-YunxiaNeural')

  /**
   * 是否自动播放下一句
   * @type {import('vue').Ref<boolean>}
   */
  const autoPlay = ref(true)

  /**
   * 自动播放是否被浏览器策略阻止
   * @type {import('vue').Ref<boolean>}
   */
  const autoplayBlocked = ref(false)

  /**
   * 播放进度百分比
   * @type {import('vue').ComputedRef<number>}
   */
  const progress = computed(() => {
    if (sentences.value.length === 0) return 0
    return Math.round(((currentIndex.value + 1) / sentences.value.length) * 100)
  })

  /**
   * TTS 实例
   */
  const ttsInstance = new EdgeSpeechTTS()

  /**
   * 生成音频 Blob
   * @param {string} text - 要转换的文本
   * @returns {Promise<Blob>} 音频 Blob
   */
  async function generateAudio(text) {
    try {
      // 使用 @lobehub/tts 的 createAudio 方法，返回 AudioBuffer
      const audioBuffer = await ttsInstance.createAudio({
        input: text,
        options: {
          voice: voice.value
        }
      })
      
      if (!audioBuffer) {
        throw new Error('Failed to generate audio: no audio buffer returned')
      }
      
      console.log(`[useTTSPlayer] Generated AudioBuffer for "${text.substring(0, 20)}...", duration: ${audioBuffer.duration}s, sampleRate: ${audioBuffer.sampleRate}Hz`)
      
      // 将 AudioBuffer 转换为 Blob
      const blob = await audioBufferToWav(audioBuffer)
      console.log(`[useTTSPlayer] Converted to Blob, size: ${blob.size} bytes`)
      
      return blob
    } catch (error) {
      console.error('[useTTSPlayer] Failed to generate audio:', error)
      throw error
    }
  }

  /**
   * 将 AudioBuffer 转换为 WAV Blob
   * @param {AudioBuffer} audioBuffer - 音频缓冲区
   * @returns {Promise<Blob>} WAV 格式的 Blob
   */
  function audioBufferToWav(audioBuffer) {
    return new Promise((resolve) => {
      const numberOfChannels = audioBuffer.numberOfChannels
      const sampleRate = audioBuffer.sampleRate
      const format = 1 // PCM
      const bitDepth = 16
      
      const bytesPerSample = bitDepth / 8
      const blockAlign = numberOfChannels * bytesPerSample
      
      const data = []
      for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = audioBuffer.getChannelData(channel)[i]
          // 将浮点数 (-1 到 1) 转换为 16 位整数
          const intSample = Math.max(-1, Math.min(1, sample))
          data.push(intSample < 0 ? intSample * 0x8000 : intSample * 0x7FFF)
        }
      }
      
      const dataSize = data.length * bytesPerSample
      const headerSize = 44
      const totalSize = headerSize + dataSize
      
      const buffer = new ArrayBuffer(totalSize)
      const view = new DataView(buffer)
      
      // RIFF chunk descriptor
      writeString(view, 0, 'RIFF')
      view.setUint32(4, totalSize - 8, true)
      writeString(view, 8, 'WAVE')
      
      // fmt sub-chunk
      writeString(view, 12, 'fmt ')
      view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
      view.setUint16(20, format, true) // AudioFormat (1 for PCM)
      view.setUint16(22, numberOfChannels, true) // NumChannels
      view.setUint32(24, sampleRate, true) // SampleRate
      view.setUint32(28, sampleRate * blockAlign, true) // ByteRate
      view.setUint16(32, blockAlign, true) // BlockAlign
      view.setUint16(34, bitDepth, true) // BitsPerSample
      
      // data sub-chunk
      writeString(view, 36, 'data')
      view.setUint32(40, dataSize, true)
      
      // Write audio data
      let offset = 44
      for (let i = 0; i < data.length; i++) {
        view.setInt16(offset, data[i], true)
        offset += 2
      }
      
      resolve(new Blob([buffer], { type: 'audio/wav' }))
    })
  }

  /**
   * 写入字符串到 DataView
   * @param {DataView} view - DataView 实例
   * @param {number} offset - 偏移量
   * @param {string} string - 要写入的字符串
   */
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  /**
   * 加载文本并分割为句子
   * @param {string} text - 要加载的文本
   * @param {object} [options] - 配置选项
   * @param {boolean} [options.autoPlay=true] - 是否自动播放
   * @param {number} [options.playbackRate=1] - 播放速率
   * @param {string} [options.voice='zh-CN-YunxiaNeural'] - 语音
   */
  function loadText(text, options = {}) {
    console.log('[useTTSPlayer] loadText:', text.substring(0, 50) + '...')
    
    stop()
    clearCache()
    
    sentences.value = splitText(text, { maxLength: 500, filterEmpty: true })
    
    if (options.autoPlay !== undefined) autoPlay.value = options.autoPlay
    if (options.playbackRate !== undefined) playbackRate.value = options.playbackRate
    if (options.voice !== undefined) voice.value = options.voice
    
    currentIndex.value = 0
    console.log(`[useTTSPlayer] Loaded ${sentences.value.length} sentences`)
  }

  /**
   * 获取或生成句子的音频
   * @param {number} index - 句子索引
   * @returns {Promise<string>} 音频 URL
   */
  async function getAudioForSentence(index) {
    const sentence = sentences.value[index]
    if (!sentence) throw new Error(`Sentence index ${index} out of bounds`)
    
    // 检查缓存
    const cacheKey = `${sentence.id}-${voice.value}`
    const cachedUrl = cache.get(cacheKey)
    if (cachedUrl) {
      sentence.audioUrl = cachedUrl
      sentence.status = 'ready'
      return cachedUrl
    }
    
    // 生成音频
    isLoading.value = true
    sentence.status = 'loading'
    
    try {
      const blob = await generateAudio(sentence.text)
      
      // 调试：检查 blob 是否为有效的 Blob 对象
      console.log(`[useTTSPlayer] Generated blob for sentence ${index}:`, {
        type: blob?.constructor?.name,
        size: blob?.size,
        isBlob: blob instanceof Blob
      })
      
      if (!(blob instanceof Blob)) {
        throw new Error(`Generated audio is not a valid Blob, got: ${typeof blob}`)
      }
      
      cache.set(cacheKey, blob)
      sentence.audioBlob = blob
      sentence.audioUrl = cache.get(cacheKey)
      sentence.status = 'ready'
      
      console.log(`[useTTSPlayer] Generated audio for sentence ${index}`)
      return sentence.audioUrl
    } catch (error) {
      console.error(`[useTTSPlayer] Failed to generate audio for sentence ${index}:`, error)
      sentence.status = 'error'
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 懒加载当前句子及前后 2 句的音频
   * @param {number} index - 当前句子索引
   */
  async function lazyLoadSentences(index) {
    const start = Math.max(0, index - 2)
    const end = Math.min(sentences.value.length - 1, index + 2)
    
    console.log(`[useTTSPlayer] Lazy loading sentences ${start} to ${end}`)
    
    for (let i = start; i <= end; i++) {
      if (i !== index && sentences.value[i].status === 'pending') {
        try {
          await getAudioForSentence(i)
        } catch (error) {
          console.warn(`[useTTSPlayer] Failed to preload sentence ${i}:`, error.message)
        }
      }
    }
  }

  /**
   * 播放当前句子的音频
   */
  async function play() {
    if (sentences.value.length === 0) {
      console.warn('[useTTSPlayer] No sentences loaded')
      return
    }
    
    const sentence = sentences.value[currentIndex.value]
    if (!sentence) return
    
    try {
      // 获取音频
      let audioUrl = sentence.audioUrl
      if (!audioUrl) {
        audioUrl = await getAudioForSentence(currentIndex.value)
      }
      
      // 创建或复用音频实例
      if (!audioInstance) {
        audioInstance = new Audio()
        // 确保事件监听器只添加一次
        audioInstance.addEventListener('ended', handleAudioEnded)
        audioInstance.addEventListener('error', handleAudioError)
        audioInstance.addEventListener('timeupdate', handleTimeUpdate)
      }
      
      audioInstance.src = audioUrl
      audioInstance.playbackRate = playbackRate.value
      
      console.log(`[useTTSPlayer] Playing sentence ${currentIndex.value}, URL: ${audioUrl}, duration: ${audioInstance.duration || 'unknown'}`)
      
      await audioInstance.play()
      isPlaying.value = true
      isPaused.value = false
      autoplayBlocked.value = false
      
      console.log(`[useTTSPlayer] Playing sentence ${currentIndex.value}`)
      
      // 懒加载邻近句子
      lazyLoadSentences(currentIndex.value)
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        console.warn('[useTTSPlayer] Autoplay blocked by browser policy')
        autoplayBlocked.value = true
        isPlaying.value = false
      } else {
        console.error('[useTTSPlayer] Play failed:', error)
        isPlaying.value = false
      }
    }
  }

  /**
   * 处理音频播放结束事件
   */
  function handleAudioEnded() {
    console.log('[useTTSPlayer] Audio ended - triggering next sentence')
    isPlaying.value = false
    isPaused.value = false
    
    if (autoPlay.value && currentIndex.value < sentences.value.length - 1) {
      console.log('[useTTSPlayer] Auto playing next sentence, current index:', currentIndex.value, '->', currentIndex.value + 1)
      currentIndex.value++
      play()
    } else {
      console.log('[useTTSPlayer] No more sentences or autoPlay disabled')
    }
  }

  /**
   * 处理音频播放进度更新
   */
  function handleTimeUpdate() {
    if (audioInstance) {
      // 可以在这里更新播放进度
      // console.log('[useTTSPlayer] Time update:', audioInstance.currentTime, '/', audioInstance.duration)
    }
  }

  /**
   * 处理音频错误事件
   * @param {Event} event - 错误事件
   */
  function handleAudioError(event) {
    console.error('[useTTSPlayer] Audio error:', event)
    isPlaying.value = false
    isLoading.value = false
  }

  /**
   * 暂停当前播放
   */
  function pause() {
    if (audioInstance && isPlaying.value) {
      audioInstance.pause()
      isPlaying.value = false
      isPaused.value = true
      console.log('[useTTSPlayer] Paused')
    }
  }

  /**
   * 停止播放并重置到第一句
   */
  function stop() {
    if (audioInstance) {
      audioInstance.pause()
      audioInstance.src = ''
      isPlaying.value = false
      isPaused.value = false
      isLoading.value = false
    }
    currentIndex.value = 0
    console.log('[useTTSPlayer] Stopped and reset')
  }

  /**
   * 播放下一句
   */
  function playNext() {
    if (currentIndex.value < sentences.value.length - 1) {
      currentIndex.value++
      play()
    } else {
      console.log('[useTTSPlayer] Already at last sentence')
    }
  }

  /**
   * 播放上一句
   */
  function playPrevious() {
    if (currentIndex.value > 0) {
      currentIndex.value--
      play()
    } else {
      console.log('[useTTSPlayer] Already at first sentence')
    }
  }

  /**
   * 跳转到指定句子
   * @param {number} index - 目标句子索引
   */
  function seekTo(index) {
    if (index >= 0 && index < sentences.value.length) {
      currentIndex.value = index
      play()
    } else {
      console.warn(`[useTTSPlayer] Invalid seek index: ${index}`)
    }
  }

  /**
   * 设置播放速率
   * @param {number} rate - 播放速率（0.5 - 2.0）
   */
  function setPlaybackRate(rate) {
    const clampedRate = Math.max(0.5, Math.min(2.0, rate))
    playbackRate.value = clampedRate
    
    if (audioInstance) {
      audioInstance.playbackRate = clampedRate
    }
    console.log(`[useTTSPlayer] Playback rate set to ${clampedRate}`)
  }

  /**
   * 设置语音并重新生成当前句子
   * @param {string} newVoice - 新的语音标识符
   */
  async function setVoice(newVoice) {
    console.log(`[useTTSPlayer] Voice changed to ${newVoice}`)
    voice.value = newVoice
    
    // 清除旧缓存并重新生成当前句子
    const currentSentence = sentences.value[currentIndex.value]
    if (currentSentence) {
      const oldCacheKey = `${currentSentence.id}-${voice.value}`
      cache.release(oldCacheKey)
      
      currentSentence.status = 'pending'
      currentSentence.audioUrl = null
      currentSentence.audioBlob = null
      
      if (isPlaying.value || isPaused.value) {
        await play()
      }
    }
  }

  /**
   * 清空音频缓存
   */
  function clearCache() {
    cache.clear()
    console.log('[useTTSPlayer] Cache cleared')
  }

  /**
   * 监听 currentIndex 变化，更新句子状态
   */
  watch(currentIndex, (newIndex) => {
    console.log(`[useTTSPlayer] Current index changed to ${newIndex}`)
  })

  /**
   * 监听 voice 变化
   */
  watch(voice, (newVoice) => {
    console.log(`[useTTSPlayer] Voice changed to ${newVoice}`)
  })

  /**
   * 组件卸载时清理资源
   */
  onUnmounted(() => {
    console.log('[useTTSPlayer] Unmounting, cleaning up resources')
    
    if (audioInstance) {
      audioInstance.pause()
      audioInstance.src = ''
      audioInstance.removeEventListener('ended', handleAudioEnded)
      audioInstance.removeEventListener('error', handleAudioError)
      audioInstance = null
    }
    
    clearCache()
    
    // 重置所有句子状态
    sentences.value.forEach(sentence => {
      sentence.status = 'pending'
      sentence.audioUrl = null
      sentence.audioBlob = null
    })
  })

  return {
    sentences,
    currentIndex,
    isPlaying,
    isPaused,
    isLoading,
    playbackRate,
    voice,
    autoPlay,
    autoplayBlocked,
    progress,
    loadText,
    play,
    pause,
    stop,
    playNext,
    playPrevious,
    seekTo,
    setPlaybackRate,
    setVoice,
    clearCache,
  }
}