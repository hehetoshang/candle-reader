/**
 * 音频缓存管理器
 * - 使用 Map 存储 Blob 对象
 * - LRU 淘汰策略
 * - 自动释放过期缓存
 */
export class AudioCache {
  constructor(maxSize = 50, maxAge = 10 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAge; // 默认 10 分钟
    this.accessTimes = new Map(); // 记录访问时间
  }
  
  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {Blob} blob - 音频 Blob 对象
   */
  set(key, blob) {
    // 检查缓存大小
    if (this.cache.size >= this.maxSize) {
      // 删除最旧的缓存
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.release(oldestKey);
      }
    }
    
    // 更新缓存和访问时间
    this.cache.set(key, blob);
    this.accessTimes.set(key, Date.now());
  }
  
  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {Blob|null} 音频 Blob 对象
   */
  get(key) {
    // 检查缓存是否存在
    if (!this.cache.has(key)) {
      return null;
    }
    
    // 检查缓存是否过期
    const accessTime = this.accessTimes.get(key);
    if (Date.now() - accessTime > this.maxAge) {
      this.release(key);
      return null;
    }
    
    // 更新访问时间
    this.accessTimes.set(key, Date.now());
    return this.cache.get(key);
  }
  
  /**
   * 释放指定缓存
   * @param {string} key - 缓存键
   */
  release(key) {
    const blob = this.cache.get(key);
    if (blob) {
      // 释放 Blob URL
      try {
        const url = URL.createObjectURL(blob);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('释放 Blob URL 失败:', error);
      }
      this.cache.delete(key);
      this.accessTimes.delete(key);
    }
  }
  
  /**
   * 清除所有缓存
   */
  clear() {
    for (const key of this.cache.keys()) {
      this.release(key);
    }
  }
  
  /**
   * 获取最旧的缓存键
   * @returns {string|null} 最旧的缓存键
   */
  getOldestKey() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.accessTimes.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  /**
   * 获取缓存大小
   * @returns {number} 缓存大小
   */
  size() {
    return this.cache.size;
  }
  
  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在
   */
  has(key) {
    return this.cache.has(key);
  }
}

// 创建默认缓存实例
export const audioCache = new AudioCache();
