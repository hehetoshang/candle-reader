<template>
  <!-- 高级听书模式主容器 -->
  <v-card class="advanced-audio-player" elevation="2">
    <!-- 标题区域 -->
    <v-card-title class="d-flex align-center justify-space-between">
      <span class="text-h6">高级听书模式</span>
      <!-- 加载状态指示器 -->
      <v-progress-circular
        v-if="isLoading"
        indeterminate
        size="24"
        color="primary"
      />
    </v-card-title>

    <v-card-text>
      <!-- 自动播放被阻止的提示 -->
      <v-alert
        v-if="autoplayBlocked"
        type="info"
        variant="tonal"
        closable
        class="mb-4"
      >
        浏览器已阻止自动播放，请点击播放按钮开始
      </v-alert>

      <!-- 正在播放状态 -->
      <div class="now-playing-section mb-4">
        <!-- 当前播放进度信息 -->
        <v-chip
          color="primary"
          variant="tonal"
          size="small"
          class="mb-2"
        >
          正在播放：第 {{ currentIndex + 1 }} 句 / 共 {{ sentences.length }} 句
        </v-chip>

        <!-- 进度条 -->
        <v-progress-linear
          :model-value="progress"
          color="primary"
          height="8"
          rounded
          striped
        />
      </div>

      <!-- 章节列表区域 -->
      <div class="chapter-list-section mb-4">
        <v-label class="mb-2 text-subtitle-1">章节列表</v-label>
        <v-virtual-scroll
          v-if="chapters && chapters.length > 0"
          :items="chapters"
          :height="200"
          item-height="40"
          class="chapter-list"
        >
          <template v-slot:default="{ item, index }">
            <div
              :class="[
                'chapter-item',
                { 'chapter-item--active': index === activeChapterIndex }
              ]"
              @click="handleChapterClick(index)"
            >
              <v-icon 
                :color="index === activeChapterIndex ? 'primary' : 'grey'" 
                class="mr-2"
                size="small"
              >
                {{ index === activeChapterIndex ? 'mdi-book-open-page-variant' : 'mdi-book' }}
              </v-icon>
              <span :class="['chapter-text', { 'text-primary': index === activeChapterIndex }]">
                {{ item.label || `第${index + 1}章` }}
              </span>
              <v-chip 
                v-if="index === activeChapterIndex" 
                color="primary" 
                size="x-small"
                class="ml-2"
              >
                播放中
              </v-chip>
            </div>
          </template>
        </v-virtual-scroll>
        <div v-else class="text-center text-grey py-4">
          暂无章节信息
        </div>
      </div>

      <!-- 句子列表区域 -->
      <div v-if="sentences.length > 0" class="sentence-list-section mb-4">
        <v-label class="mb-2 text-subtitle-1">句子列表</v-label>
        <v-virtual-scroll
          :items="sentences"
          :height="300"
          item-height="40"
          class="sentence-list"
        >
          <template v-slot:default="{ item, index }">
            <!-- 单个句子项 -->
            <div
              :class="[
                'sentence-item',
                { 'sentence-item--active': index === currentIndex }
              ]"
              @click="seekTo(index)"
            >
              <span class="sentence-index">{{ index + 1 }}.</span>
              <span class="sentence-text">
                {{ truncateText(item.text, 50) }}
              </span>
            </div>
          </template>
        </v-virtual-scroll>
      </div>

      <!-- 控制面板 -->
      <div class="control-panel mb-4">
        <div class="d-flex align-center justify-center ga-3">
          <!-- 上一句按钮 -->
          <v-btn
            icon="mdi-skip-previous"
            size="large"
            variant="tonal"
            color="primary"
            :disabled="currentIndex === 0"
            @click="playPrevious"
          />

          <!-- 播放/暂停按钮 -->
          <v-btn
            :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
            size="x-large"
            variant="flat"
            color="primary"
            @click="togglePlayPause"
          />

          <!-- 停止按钮 -->
          <v-btn
            icon="mdi-stop"
            size="large"
            variant="tonal"
            color="error"
            @click="stop"
          />

          <!-- 下一句按钮 -->
          <v-btn
            icon="mdi-skip-next"
            size="large"
            variant="tonal"
            color="primary"
            :disabled="currentIndex >= sentences.length - 1"
            @click="playNext"
          />
        </div>
      </div>

      <!-- 设置区域 -->
      <div class="settings-section">
        <v-divider class="mb-4" />

        <!-- 语速控制 -->
        <div class="setting-item mb-4">
          <v-slider
            :model-value="playbackRate"
            :min="0.5"
            :max="2.0"
            :step="0.1"
            label="语速"
            thumb-label
            track-color="grey-lighten-3"
            thumb-color="primary"
            @update:model-value="setPlaybackRate"
          >
            <template v-slot:append>
              <span class="text-body-2 font-weight-medium">
                {{ playbackRate.toFixed(1) }}x
              </span>
            </template>
          </v-slider>
        </div>

        <!-- 音色选择 -->
        <div class="setting-item mb-4">
          <v-select
            :model-value="voice"
            :items="voiceDisplayNames"
            label="音色"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="onVoiceChange"
          />
        </div>

        <!-- 自动连续播放开关 -->
        <div class="setting-item">
          <v-switch
            :model-value="autoPlay"
            label="自动连续播放"
            color="primary"
            hide-details
            @update:model-value="onAutoPlayChange"
          />
        </div>
      </div>
    </v-card-text>

    <!-- 隐藏的 audio 元素用于实际播放 -->
    <audio
      ref="audioElement"
      style="display: none"
      @ended="onAudioEnded"
      @error="onAudioError"
    />
  </v-card>
</template>

<script setup>
/**
 * AdvancedAudioPlayer - 高级听书模式组件
 * 
 * 提供完整的文本转语音播放功能，包括：
 * - 句子级别的播放控制（上一句/下一句/跳转）
 * - 可视化句子列表，支持点击跳转
 * - 播放进度显示
 * - 语速、音色、自动播放等设置
 * 
 * 使用示例:
 * <AdvancedAudioPlayer :text="bookContent" />
 */

import { ref, watch, computed, onMounted } from 'vue'
import useTTSPlayer from '@/composables/useTTSPlayer'
import { VOICE_OPTIONS } from '@/utils/ttsTextSplitter'

/**
 * 组件 Props 定义
 */
const props = defineProps({
  /**
   * 要朗读的文本内容
   * @type {string}
   */
  text: {
    type: String,
    required: true,
    default: ''
  },
  /**
   * 当前章节标题
   * @type {string}
   */
  chapterTitle: {
    type: String,
    default: '当前章节'
  },
  /**
   * 所有章节列表
   * @type {Array<{index: number, label: string, isActive: boolean}>}
   */
  chapters: {
    type: Array,
    default: () => []
  },
  /**
   * 当前活跃的章节索引
   * @type {number}
   */
  activeChapterIndex: {
    type: Number,
    default: 0
  }
})

/**
 * 组件事件定义
 */
const emit = defineEmits(['chapter-end', 'chapter-click'])

/**
 * 初始化 TTS 播放器 composable
 * 解构所有需要的状态和方法
 */
const {
  sentences,
  currentIndex,
  isPlaying,
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
} = useTTSPlayer()

/**
 * audio 元素的引用
 * 注意：实际音频控制由 useTTSPlayer 内部管理
 */
const audioElement = ref(null)

/**
 * 计算属性：将 VOICE_OPTIONS 转换为显示名称数组
 * 用于 v-select 的 items
 * @returns {string[]} 语音显示名称数组
 */
const voiceDisplayNames = computed(() => {
  return VOICE_OPTIONS.map(v => v.name)
})

/**
 * 监听 text prop 变化，自动加载文本
 * 当父组件传入新的文本时，自动调用 loadText 初始化播放器
 */
watch(
  () => props.text,
  (newText) => {
    if (newText && newText.trim()) {
      loadText(newText)
    }
  },
  { immediate: true }
)

/**
 * 监听播放完成事件
 * 当一章播放完成时，触发 chapter-end 事件通知父组件
 */
watch(
  () => currentIndex.value,
  (newIndex) => {
    // 如果已经播放到最后一个句子，触发章节结束事件
    if (sentences.value.length > 0 && newIndex >= sentences.value.length - 1) {
      console.log('[AdvancedAudioPlayer] Chapter finished playing')
      emit('chapter-end')
    }
  }
)

/**
 * 截断文本到指定长度
 * 用于在句子列表中显示时避免文本过长
 * 
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大字符数
 * @returns {string} 截断后的文本，超出部分添加省略号
 */
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}

/**
 * 处理章节点击事件
 * @param {number} index - 被点击的章节索引
 */
function handleChapterClick(index) {
  console.log('[AdvancedAudioPlayer] Chapter clicked:', index)
  emit('chapter-click', index)
}

/**
 * 切换播放/暂停状态
 * 如果正在播放则暂停，否则继续播放
 */
function togglePlayPause() {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

/**
 * 处理音色选择变化
 * 将用户选择的显示名称转换为实际的 voice 标识符
 * 
 * @param {string} selectedName - 用户选择的音色显示名称
 */
function onVoiceChange(selectedName) {
  const selectedVoice = VOICE_OPTIONS.find(v => v.name === selectedName)
  if (selectedVoice) {
    setVoice(selectedVoice.voice)
  }
}

/**
 * 处理自动播放开关变化
 * 
 * @param {boolean} value - 新的自动播放状态
 */
function onAutoPlayChange(value) {
  autoPlay.value = value
}

/**
 * 处理音频播放结束事件
 * 当 audio 元素触发 ended 事件时调用
 */
function onAudioEnded() {
  // 使用 composable 内部的自动播放逻辑
  if (autoPlay.value && currentIndex.value < sentences.value.length - 1) {
    currentIndex.value++
    play()
  }
}

/**
 * 处理音频错误事件
 * 当 audio 元素触发 error 事件时调用
 */
function onAudioError() {
  console.error('[AdvancedAudioPlayer] Audio playback error')
  // 错误处理由 useTTSPlayer 内部管理
}

/**
 * 组件挂载时初始化
 */
onMounted(() => {
  console.log('[AdvancedAudioPlayer] Component mounted')
})
</script>

<style scoped>
/**
 * 高级听书模式组件样式
 * 
 * 包含以下样式模块：
 * - 播放器容器
 * - 正在播放区域
 * - 句子列表及交互效果
 * - 控制面板
 * - 设置区域
 */

.advanced-audio-player {
  max-width: 800px;
  margin: 0 auto;
}

.now-playing-section {
  padding: 8px 0;
}

.chapter-list-section {
  padding: 8px 0;
}

.chapter-list {
  border-radius: 8px;
  background-color: rgb(var(--v-theme-surface-variant));
  padding: 8px;
}

.chapter-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgb(var(--v-theme-primary));
    opacity: 0.1;
  }
  
  &.chapter-item--active {
    background-color: rgb(var(--v-theme-primary));
    opacity: 0.2;
    
    .chapter-text {
      font-weight: 600;
    }
  }
}

.chapter-text {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sentence-list-section {
  border-radius: 8px;
  background-color: rgb(var(--v-theme-surface-variant));
  padding: 12px;
}

.sentence-list {
  border-radius: 4px;
}

/* 句子列表项基础样式 */
.sentence-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: transparent;
}

/* 鼠标悬停效果 */
.sentence-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
  transform: translateX(4px);
}

/* 当前播放句子高亮样式 - 蓝色背景 */
.sentence-item--active {
  background-color: rgb(var(--v-theme-primary), 0.15);
  border-left: 3px solid rgb(var(--v-theme-primary));
  font-weight: 500;
}

.sentence-item--active:hover {
  background-color: rgba(var(--v-theme-primary), 0.25);
}

/* 句子序号样式 */
.sentence-index {
  min-width: 32px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  font-size: 0.875rem;
}

/* 句子文本样式 */
.sentence-text {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 控制面板样式 */
.control-panel {
  padding: 16px 0;
}

/* 设置区域样式 */
.settings-section {
  padding-top: 8px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
