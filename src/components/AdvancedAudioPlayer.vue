<template>
  <v-card class="audio-player" elevation="2">
    <!-- 顶部：当前播放信息 -->
    <div class="now-playing pa-4">
      <v-chip v-if="sentences.length > 0" color="primary" variant="outlined">
        正在播放：第 {{ currentIndex + 1 }} 句 / 共 {{ sentences.length }} 句
      </v-chip>
      <v-progress-linear
        v-if="sentences.length > 0"
        :value="(currentIndex + 1) / sentences.length * 100"
        class="mt-3"
        height="4"
      />
    </div>
    
    <!-- 中部：句子列表（虚拟滚动） -->
    <div v-if="sentences.length > 0" class="sentences-container" style="max-height: 300px; overflow-y: auto;">
      <v-virtual-scroll
        :items="sentences"
        :item-height="60"
        height="300"
        class="pa-2"
      >
        <template #default="{ item, index }">
          <div
            :class="['sentence-item', { active: index === currentIndex }]"
            @click="seekTo(index)"
          >
            <v-card
              :class="{
                'sentence-card': true,
                'active-card': index === currentIndex
              }"
              elevation="1"
            >
              <v-card-item>
                <div class="flex-grow-1">
                  <div class="sentence-text">{{ item.text }}</div>
                  <div v-if="item.status === 'loading'" class="text-xs text-secondary">
                    加载中...
                  </div>
                  <div v-else-if="item.status === 'error'" class="text-xs text-error">
                    加载失败
                  </div>
                </div>
                <v-icon
                  v-if="index === currentIndex && isPlaying"
                  class="text-primary animate-pulse"
                >
                  mdi-volume-high
                </v-icon>
              </v-card-item>
            </v-card>
          </div>
        </template>
      </v-virtual-scroll>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state pa-8 text-center">
      <v-icon size="48" color="grey">mdi-book-open-variant</v-icon>
      <div class="mt-4 text-h6">暂无文本</div>
      <div class="text-body-2 text-secondary">请选择要朗读的文本</div>
    </div>
    
    <!-- 底部：控制面板 -->
    <div class="controls pa-4">
      <!-- 播放控制按钮 -->
      <div class="flex justify-center mb-4">
        <v-btn
          icon
          @click="playPrevious"
          :disabled="currentIndex === 0 || isLoading"
        >
          <v-icon>mdi-skip-previous</v-icon>
        </v-btn>
        
        <v-btn
          icon
          size="large"
          :loading="isLoading"
          @click="isPlaying ? pause() : play()"
          class="mx-4"
        >
          <v-icon v-if="!isLoading">{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
        </v-btn>
        
        <v-btn
          icon
          @click="playNext"
          :disabled="currentIndex >= sentences.length - 1 || isLoading"
        >
          <v-icon>mdi-skip-next</v-icon>
        </v-btn>
      </div>
      
      <!-- 音频调节 -->
      <div class="audio-controls">
        <!-- 语速调节 -->
        <div class="control-item">
          <div class="flex justify-between mb-1">
            <span class="text-caption">语速</span>
            <span class="text-caption">{{ playbackRate.toFixed(1) }}x</span>
          </div>
          <v-slider
            v-model="playbackRate"
            :min="0.5"
            :max="2"
            :step="0.1"
            @update:modelValue="setPlaybackRate"
          />
        </div>
        
        <!-- 音量调节 -->
        <div class="control-item">
          <div class="flex justify-between mb-1">
            <span class="text-caption">音量</span>
            <span class="text-caption">{{ Math.round(volume * 100) }}%</span>
          </div>
          <v-slider
            v-model="volume"
            :min="0"
            :max="1"
            :step="0.1"
            @update:modelValue="setVolume"
          />
        </div>
        
        <!-- 音色选择 -->
        <div class="control-item">
          <div class="text-caption mb-1">音色</div>
          <v-select
            v-model="voice"
            :items="voiceOptions"
            dense
            variant="outlined"
            hide-details
          />
        </div>
        
        <!-- 连续播放 -->
        <div class="control-item flex items-center">
          <v-checkbox
            v-model="continuousPlay"
            @update:modelValue="setContinuousPlay"
            hide-details
          />
          <span class="text-caption ml-2">连续播放</span>
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useTTSPlayer } from '@/composables/useTTSPlayer';
import { VOICE_OPTIONS } from '@/utils/ttsTextSplitter';

// Props
const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  autoPlay: {
    type: Boolean,
    default: false
  }
});

// 播放器逻辑
const {
  sentences,
  currentIndex,
  isPlaying,
  isLoading,
  playbackRate,
  voice,
  volume,
  continuousPlay,
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
} = useTTSPlayer();

// 语音选项
const voiceOptions = ref(VOICE_OPTIONS);

// 监听文本变化
watch(() => props.text, (newText) => {
  if (newText) {
    loadText(newText);
    if (props.autoPlay) {
      setTimeout(() => {
        play();
      }, 100);
    }
  }
}, { immediate: true });

// 键盘事件处理
const handleKeydown = (event) => {
  if (event.key === 'ArrowLeft') {
    playPrevious();
  } else if (event.key === 'ArrowRight') {
    playNext();
  } else if (event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    isPlaying.value ? pause() : play();
  }
};

// 组件挂载
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

// 组件卸载
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  cleanup();
});
</script>

<style scoped>
.audio-player {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.sentence-item {
  margin-bottom: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.sentence-item:hover {
  transform: translateX(4px);
}

.sentence-card {
  transition: all 0.3s;
}

.active-card {
  border-left: 4px solid var(--v-primary-base);
  background-color: rgba(25, 118, 210, 0.05);
}

.sentence-text {
  line-height: 1.4;
  white-space: normal;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.control-item {
  margin-bottom: 16px;
}

.animate-pulse {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
