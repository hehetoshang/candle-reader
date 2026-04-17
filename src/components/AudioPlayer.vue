<template>
  <div class="audio-player">
    <v-card density="compact" class="pa-2">
      <v-card-title class="text-h6">听书功能</v-card-title>
      <v-card-text>
        <div v-if="isLoading" class="loading-state">
          <v-progress-circular indeterminate size="48" color="primary"></v-progress-circular>
          <p class="mt-2 text-center">正在生成语音...</p>
        </div>
        <div v-else>
          <div class="controls">
            <v-btn
              icon
              @click="togglePlay"
              :disabled="!audioUrl"
            >
              <v-icon>{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
            </v-btn>
            <v-btn
              icon
              @click="stopPlay"
              :disabled="!audioUrl"
            >
              <v-icon>mdi-stop</v-icon>
            </v-btn>
            <v-slider
              v-model="currentTime"
              :min="0"
              :max="duration"
              :disabled="!audioUrl"
              @change="seek"
              class="flex-grow-1 mx-2"
            ></v-slider>
            <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
          </div>
          <div class="voice-settings mt-4">
            <v-select
              v-model="voice"
              :items="voices"
              item-text="text"
              item-value="value"
              label="选择语音"
              density="compact"
              class="mb-2"
            ></v-select>
            <v-slider
              v-model="volume"
              min="0"
              max="1"
              step="0.1"
              label="音量"
              density="compact"
            ></v-slider>
          </div>
        </div>
      </v-card-text>
    </v-card>
    <audio
      ref="audioRef"
      :src="audioUrl"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @play="onPlay"
      @pause="onPause"
    ></audio>
  </div>
</template>

<script>
import { EdgeSpeechTTS } from '@lobehub/tts';

export default {
  name: 'AudioPlayer',
  props: {
    text: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      audioUrl: null,
      isLoading: false,
      isPlaying: false,
      duration: 0,
      currentTime: 0,
      volume: 0.7,
      voice: 'zh-CN-XiaoxiaoNeural',
      voices: [
        { text: '中文 - 晓晓', value: 'zh-CN-XiaoxiaoNeural' },
        { text: '中文 - 云希', value: 'zh-CN-YunxiNeural' },
        { text: '中文 - 晓辰', value: 'zh-CN-XiaochenNeural' },
        { text: '中文 - 晓雨', value: 'zh-CN-XiaoyuNeural' }
      ],
      tts: null
    };
  },
  mounted() {
    this.tts = new EdgeSpeechTTS({ locale: 'zh-CN' });
    this.$refs.audioRef.volume = this.volume;
  },
  watch: {
    volume(newValue) {
      if (this.$refs.audioRef) {
        this.$refs.audioRef.volume = newValue;
      }
    },
    text(newValue) {
      if (newValue) {
        this.generateSpeech(newValue);
      }
    }
  },
  methods: {
    async generateSpeech(text) {
      if (!text) return;
      
      this.isLoading = true;
      try {
        console.log('开始生成语音，文本长度:', text.length);
        console.log('使用语音:', this.voice);
        
        // 使用 createAudio 方法直接获取 Blob
        const blob = await this.tts.createAudio({
          input: text,
          options: {
            voice: this.voice
          }
        });
        
        console.log('Blob 生成成功，大小:', blob.size);
        
        const url = URL.createObjectURL(blob);
        console.log('创建 URL 成功:', url);
        
        // 释放之前的 URL
        if (this.audioUrl) {
          URL.revokeObjectURL(this.audioUrl);
        }
        
        this.audioUrl = url;
        this.isLoading = false;
        
        // 等待音频元素加载完成后再播放
        setTimeout(() => {
          this.play();
        }, 100);
      } catch (error) {
        console.error('生成语音失败:', error);
        this.isLoading = false;
      }
    },
    play() {
      if (this.$refs.audioRef) {
        this.$refs.audioRef.play();
      }
    },
    pause() {
      if (this.$refs.audioRef) {
        this.$refs.audioRef.pause();
      }
    },
    stopPlay() {
      if (this.$refs.audioRef) {
        this.$refs.audioRef.pause();
        this.$refs.audioRef.currentTime = 0;
        this.currentTime = 0;
        this.isPlaying = false;
      }
    },
    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    },
    seek(time) {
      if (this.$refs.audioRef) {
        this.$refs.audioRef.currentTime = time;
      }
    },
    onLoadedMetadata() {
      if (this.$refs.audioRef) {
        this.duration = this.$refs.audioRef.duration || 0;
      }
    },
    onTimeUpdate() {
      if (this.$refs.audioRef) {
        this.currentTime = this.$refs.audioRef.currentTime || 0;
      }
    },
    onEnded() {
      this.isPlaying = false;
    },
    onPlay() {
      this.isPlaying = true;
    },
    onPause() {
      this.isPlaying = false;
    },
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  },
  beforeUnmount() {
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
  }
};
</script>

<style scoped>
.audio-player {
  width: 100%;
}

.controls {
  display: flex;
  align-items: center;
}

.time-display {
  width: 80px;
  text-align: right;
  font-size: 14px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}
</style>