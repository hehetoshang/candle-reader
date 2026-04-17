import { ref, computed, onUnmounted } from 'vue';
import { getTTSInstance } from '@/plugins/tts';
import { splitText } from '@/utils/ttsTextSplitter';
import { audioCache } from '@/utils/audioCache';

/**
 * TTS 播放器逻辑封装（Vue 3 Composition API）
 * @returns {object} 播放器状态和方法
 */
export function useTTSPlayer() {
  const sentences = ref([]);
  const currentIndex = ref(0);
  const isPlaying = ref(false);
  const isLoading = ref(false);
  const playbackRate = ref(1);
  const voice = ref('zh-CN-YunxiaNeural');
  const volume = ref(1);
  const continuousPlay = ref(true);
  
  let audio = null;
  let ttsInstance = null;
  let preloadTimer = null;
  
  /**
   * 初始化 TTS 实例
   */
  const initTTS = () => {
    if (!ttsInstance) {
      ttsInstance = getTTSInstance();
    }
  };
  
  /**
   * 加载文本并分句
   * @param {string} text - 原始文本
   * @param {object} options - 分句选项
   */
  const loadText = (text, options = {}) => {
    sentences.value = splitText(text, options);
    currentIndex.value = 0;
    stop();
  };
  
  /**
   * 生成音频缓存键
   * @param {number} index - 句子索引
   * @returns {string} 缓存键
   */
  const getCacheKey = (index) => {
    const sentence = sentences.value[index];
    if (!sentence) return '';
    return `${voice.value}_${playbackRate.value}_${sentence.text}`;
  };
  
  /**
   * 生成音频
   * @param {number} index - 句子索引
   * @returns {Promise<Blob>} 音频 Blob
   */
  const generateAudio = async (index) => {
    const sentence = sentences.value[index];
    if (!sentence) return null;
    
    // 检查缓存
    const cacheKey = getCacheKey(index);
    const cachedAudio = audioCache.get(cacheKey);
    if (cachedAudio) {
      sentence.audioBlob = cachedAudio;
      sentence.status = 'ready';
      return cachedAudio;
    }
    
    // 生成新音频
    sentence.status = 'loading';
    try {
      initTTS();
      const blob = await ttsInstance.speak(sentence.text, {
        voice,
        rate: playbackRate.value
      });
      
      // 缓存音频
      audioCache.set(cacheKey, blob);
      sentence.audioBlob = blob;
      sentence.status = 'ready';
      return blob;
    } catch (error) {
      console.error('生成音频失败:', error);
      sentence.status = 'error';
      return null;
    }
  };
  
  /**
   * 预加载音频
   * @param {number} index - 句子索引
   */
  const preloadAudio = (index) => {
    // 预加载当前句及前后各 2 句
    const start = Math.max(0, index - 2);
    const end = Math.min(sentences.value.length - 1, index + 2);
    
    for (let i = start; i <= end; i++) {
      if (sentences.value[i] && sentences.value[i].status === 'pending') {
        generateAudio(i);
      }
    }
  };
  
  /**
   * 播放当前句
   */
  const play = async () => {
    if (currentIndex.value >= sentences.value.length) return;
    
    isLoading.value = true;
    try {
      const blob = await generateAudio(currentIndex.value);
      if (!blob) {
        isLoading.value = false;
        return;
      }
      
      // 创建音频对象
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      
      audio = new Audio(URL.createObjectURL(blob));
      audio.playbackRate = playbackRate.value;
      audio.volume = volume.value;
      
      // 播放完成事件
      audio.onended = () => {
        isPlaying.value = false;
        if (continuousPlay.value && currentIndex.value < sentences.value.length - 1) {
          // 自动播放下一句
          playNext();
        }
      };
      
      // 开始播放
      await audio.play();
      isPlaying.value = true;
      isLoading.value = false;
      
      // 预加载下一句
      preloadAudio(currentIndex.value + 1);
    } catch (error) {
      console.error('播放失败:', error);
      isLoading.value = false;
      isPlaying.value = false;
    }
  };
  
  /**
   * 暂停
   */
  const pause = () => {
    if (audio) {
      audio.pause();
      isPlaying.value = false;
    }
  };
  
  /**
   * 停止
   */
  const stop = () => {
    if (audio) {
      audio.pause();
      audio.src = '';
      audio = null;
    }
    isPlaying.value = false;
    isLoading.value = false;
  };
  
  /**
   * 播放下一句
   */
  const playNext = () => {
    if (currentIndex.value < sentences.value.length - 1) {
      currentIndex.value++;
      play();
    }
  };
  
  /**
   * 播放上一句
   */
  const playPrevious = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--;
      play();
    }
  };
  
  /**
   * 跳转到指定句子
   * @param {number} index - 句子索引
   */
  const seekTo = (index) => {
    if (index >= 0 && index < sentences.value.length) {
      currentIndex.value = index;
      play();
    }
  };
  
  /**
   * 设置语速
   * @param {number} rate - 语速 (0.5-2.0)
   */
  const setPlaybackRate = (rate) => {
    playbackRate.value = rate;
    if (audio) {
      audio.playbackRate = rate;
    }
  };
  
  /**
   * 设置音量
   * @param {number} vol - 音量 (0-1)
   */
  const setVolume = (vol) => {
    volume.value = vol;
    if (audio) {
      audio.volume = vol;
    }
  };
  
  /**
   * 切换连续播放模式
   * @param {boolean} value - 是否连续播放
   */
  const setContinuousPlay = (value) => {
    continuousPlay.value = value;
  };
  
  /**
   * 清理资源
   */
  const cleanup = () => {
    stop();
    if (preloadTimer) {
      clearTimeout(preloadTimer);
    }
  };
  
  // 组件卸载时清理资源
  onUnmounted(() => {
    cleanup();
  });
  
  return {
    // 状态
    sentences,
    currentIndex,
    isPlaying,
    isLoading,
    playbackRate,
    voice,
    volume,
    continuousPlay,
    
    // 方法
    loadText,
    play,
    pause,
    stop,
    playNext,
    playPrevious,
    seekTo,
    setPlaybackRate,
    setVolume,
    setContinuousPlay,
    cleanup
  };
}
