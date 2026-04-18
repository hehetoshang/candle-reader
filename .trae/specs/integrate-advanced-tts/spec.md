# 高级 TTS 听书功能集成规格

## Why
现有 AudioPlayer.vue 组件仅支持基础播放功能（播放/暂停/停止、进度条、音量调节），缺少长文本分句朗读、语速调节、连续播放、上一句/下一句导航等核心听书功能。需要基于 @lobehub/tts 库实现完整的听书体验，支持万字以上小说的智能分句和连续播放。

## What Changes
- **新增** 文本分句工具函数（ttsTextSplitter.js）
- **新增** TTS 播放器 composable（useTTSPlayer.js）
- **新增** 高级播放器组件（AdvancedAudioPlayer.vue）
- **新增** 音频缓存管理器（audioCache.js）
- **修改** EpubReader.vue 集成新播放器
- **修改** AudioPlayer.vue 保留向后兼容

## Impact
- **影响的能力**: TTS 听书功能增强
- **影响的文件**:
  - 新增：`src/utils/ttsTextSplitter.js`
  - 新增：`src/utils/audioCache.js`
  - 新增：`src/composables/useTTSPlayer.js`
  - 新增：`src/components/AdvancedAudioPlayer.vue`
  - 修改：`src/components/EpubReader.vue`
  - 可选修改：`src/components/AudioPlayer.vue`（保留向后兼容）

## ADDED Requirements

### Requirement: 智能文本分句
系统 SHALL 提供文本分句工具，支持按标点符号智能切分长文本，返回结构化的句子数组。

#### Scenario: 成功分句
- **WHEN** 输入 1 万字以上的小说文本
- **THEN** 按句号、叹号、问号等标点切分为句子数组
- **AND** 每个句子包含 id、文本内容、起始/结束位置、音频状态
- **AND** 分句耗时 < 100ms

#### Scenario: 过滤无效文本
- **WHEN** 输入包含空白字符、特殊符号的文本
- **THEN** 自动过滤空字符串和无效段落
- **AND** 保留有效的中文内容

### Requirement: TTS 播放器核心逻辑
系统 SHALL 提供 TTS 播放器 composable，封装播放控制、状态管理、连续播放逻辑。

#### Scenario: 播放控制
- **WHEN** 用户点击播放/暂停/停止
- **THEN** 播放器正确切换状态
- **AND** 更新 isPlaying 响应式状态

#### Scenario: 连续播放
- **WHEN** 当前句子播放完成
- **THEN** 自动加载并播放下一句
- **AND** 更新 currentIndex 状态

#### Scenario: 语速调节
- **WHEN** 用户调整语速滑块（0.5x - 2.0x）
- **THEN** 当前和后续音频播放速率立即生效
- **AND** 播放状态不受影响

#### Scenario: 上一句/下一句导航
- **WHEN** 用户点击上一句/下一句按钮
- **THEN** 播放器跳转到对应句子
- **AND** 自动开始播放
- **AND** 边界检查（第一句时禁用上一句，最后一句时禁用下一句）

### Requirement: 音频缓存管理
系统 SHALL 提供音频缓存管理器，使用 LRU 策略缓存已生成的音频 Blob，减少重复生成。

#### Scenario: 缓存命中
- **WHEN** 请求已缓存的句子音频
- **THEN** 直接返回缓存的 Blob
- **AND** 不调用 TTS API

#### Scenario: 缓存淘汰
- **WHEN** 缓存数量超过上限（默认 50 个）
- **THEN** 自动释放最旧的缓存
- **AND** 保持缓存大小在限制内

#### Scenario: 资源释放
- **WHEN** 组件卸载或页面关闭
- **THEN** 释放所有缓存的 Blob URL
- **AND** 清除所有缓存记录
- **AND** 无内存泄漏

### Requirement: 高级播放器 UI
系统 SHALL 提供高级播放器组件，使用 Vuetify 3 组件库，支持完整的播放控制和状态展示。

#### Scenario: 播放状态展示
- **WHEN** 播放器处于播放状态
- **THEN** 显示当前句子编号和总句数
- **AND** 显示进度条（基于句子索引）
- **AND** 当前句子高亮显示

#### Scenario: 句子列表
- **WHEN** 加载长文本后
- **THEN** 显示句子列表（虚拟滚动，支持 100+ 句）
- **AND** 当前播放句自动滚动到可视区域
- **AND** 支持点击句子直接跳转

### Requirement: 浏览器自动播放策略处理
系统 SHALL 处理浏览器自动播放限制，提供降级方案。

#### Scenario: 自动播放被阻止
- **WHEN** 浏览器阻止自动播放
- **THEN** 显示提示消息"点击播放按钮开始听书"
- **AND** 等待用户交互后恢复播放

#### Scenario: 首次播放解锁
- **WHEN** 用户首次点击播放按钮
- **THEN** 解锁浏览器的自动播放限制
- **AND** 后续播放无需额外交互

## MODIFIED Requirements

### Requirement: EpubReader.vue 集成
**修改原因**: 需要将新的高级播放器集成到现有的听书功能中

**修改内容**:
- 在浮动工具栏"从这里听"按钮中，调用新播放器的 loadText 方法
- 替换或并行使用 AdvancedAudioPlayer.vue 和 AudioPlayer.vue
- 保持向后兼容，不破坏现有功能

### Requirement: 音色切换
**修改原因**: 扩展现有的音色选择功能，支持完整的 Edge Speech 中文语音列表

**修改内容**:
- 添加完整的中文语音选项（至少 6 种）
- 保存用户选择的音色到 localStorage
- 切换音色时自动重新生成当前句音频

## REMOVED Requirements
**无** - 所有现有功能保持向后兼容
