# Tasks

- [x] Task 1: 创建文本分句工具函数（ttsTextSplitter.js）
  - [x] SubTask 1.1: 实现 splitText 函数，按标点符号切分文本
  - [x] SubTask 1.2: 实现 splitByParagraph 函数，按段落切分文本
  - [x] SubTask 1.3: 添加文本过滤逻辑（去除空白、特殊符号）
  - [x] SubTask 1.4: 定义 Sentence 数据结构（id, text, startIndex, endIndex, status, audioBlob）
  - [x] SubTask 1.5: 编写单元测试，验证分句正确性和性能

- [x] Task 2: 创建音频缓存管理器（audioCache.js）
  - [x] SubTask 2.1: 实现 AudioCache 类，使用 Map 存储 Blob 对象
  - [x] SubTask 2.2: 实现 LRU 淘汰策略（默认 50 个缓存）
  - [x] SubTask 2.3: 实现 set/get/release/clear 方法
  - [x] SubTask 2.4: 实现自动释放过期缓存（基于时间或大小）
  - [x] SubTask 2.5: 编写单元测试，验证缓存功能和内存释放

- [x] Task 3: 创建 TTS 播放器 composable（useTTSPlayer.js）
  - [x] SubTask 3.1: 初始化 EdgeSpeechTTS 实例
  - [x] SubTask 3.2: 实现状态管理（sentences, currentIndex, isPlaying, playbackRate, voice）
  - [x] SubTask 3.3: 实现 loadText 方法，加载文本并调用分句工具
  - [x] SubTask 3.4: 实现 play/pause/stop 方法
  - [x] SubTask 3.5: 实现 playNext/playPrevious 方法，带边界检查
  - [x] SubTask 3.6: 实现 seekTo 方法，跳转到指定句子
  - [x] SubTask 3.7: 实现自动连续播放逻辑（监听音频 ended 事件）
  - [x] SubTask 3.8: 实现语速调节（修改 audio.playbackRate）
  - [x] SubTask 3.9: 实现懒加载音频（只加载当前句及前后各 2 句）
  - [x] SubTask 3.10: 实现资源释放（onUnmounted 清理）
  - [x] SubTask 3.11: 处理浏览器自动播放策略限制

- [x] Task 4: 创建高级播放器组件（AdvancedAudioPlayer.vue）
  - [x] SubTask 4.1: 创建组件骨架，引入 Vuetify 3 组件
  - [x] SubTask 4.2: 实现播放控制面板（播放/暂停/停止、上一句/下一句）
  - [x] SubTask 4.3: 实现语速滑块（0.5x - 2.0x，0.1 步进）
  - [x] SubTask 4.4: 实现音色选择下拉框（至少 6 种中文语音）
  - [x] SubTask 4.5: 实现进度条（基于句子索引）
  - [x] SubTask 4.6: 实现句子列表虚拟滚动（v-virtual-scroll）
  - [x] SubTask 4.7: 实现当前句子高亮和自动滚动
  - [x] SubTask 4.8: 实现加载状态显示（生成语音时的进度提示）
  - [x] SubTask 4.9: 实现自动播放被阻止时的提示信息
  - [x] SubTask 4.10: 适配暗色模式

- [x] Task 5: 集成到 EpubReader.vue
  - [x] SubTask 5.1: 导入 AdvancedAudioPlayer 组件
  - [x] SubTask 5.2: 修改浮动工具栏"从这里听"按钮逻辑
  - [x] SubTask 5.3: 在音频面板中使用新播放器
  - [x] SubTask 5.4: 传递选中文本到新播放器
  - [x] SubTask 5.5: 测试完整流程（选中文本 -> 点击听 -> 播放 -> 控制）

- [x] Task 6: 性能优化和测试
  - [x] SubTask 6.1: 测试万字文本分句性能（< 100ms）
  - [x] SubTask 6.2: 测试长文本播放内存占用
  - [x] SubTask 6.3: 验证资源释放（页面关闭后无内存泄漏）
  - [x] SubTask 6.4: 测试移动端触摸操作
  - [x] SubTask 6.5: 测试不同浏览器的兼容性
  - [x] SubTask 6.6: 测试暗色模式显示

- [x] Task 7: 文档和代码清理
  - [x] SubTask 7.1: 添加 JSDoc 注释到所有工具函数
  - [x] SubTask 7.2: 编写使用说明（README 或注释）
  - [x] SubTask 7.3: 清理调试代码和 console.log
  - [x] SubTask 7.4: 验证 ESLint 通过，无语法错误

# Task Dependencies

- [Task 2] depends on [Task 1]（需要 Sentence 数据结构）
- [Task 3] depends on [Task 1] and [Task 2]（需要分句工具和缓存管理）
- [Task 4] depends on [Task 3]（需要 composable 逻辑）
- [Task 5] depends on [Task 4]（需要播放器组件）
- [Task 6] depends on [Task 5]（需要完整集成后测试）
- [Task 7] depends on [Task 6]（测试通过后清理）

# Parallelizable Work

- [Task 1] 和 [Task 2] 可以并行开发（但 Task 2 需要 Task 1 的接口定义）
- [Task 4 的 SubTask 4.1-4.4] 和 [Task 4 的 SubTask 4.5-4.8] 可以并行
- [Task 6 的 SubTask 6.1-6.3] 和 [Task 6 的 SubTask 6.4-6.6] 可以并行
