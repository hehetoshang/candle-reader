/**
 * audioCache.js
 *
 * 音频缓存管理器，用于缓存 TTS 生成的音频 Blob 对象。
 * 采用 LRU（最近最少使用）策略进行缓存淘汰，避免内存泄漏。
 */

/**
 * 音频缓存类
 * 使用 Map 存储 Blob 对象及其 URL，支持 LRU 淘汰策略
 */
class AudioCache {
  /**
   * 创建 AudioCache 实例
   * @param {number} [maxSize=50] - 缓存最大容量
   */
  constructor(maxSize = 50) {
    /**
     * 缓存存储，key 为缓存键，value 包含 blob、url 和访问顺序
     * @type {Map<string, {blob: Blob, url: string, accessOrder: number}>}
     */
    this._cache = new Map()

    /**
     * 缓存最大容量
     * @type {number}
     */
    this._maxSize = maxSize

    /**
     * 访问计数器，用于追踪最近使用顺序
     * @type {number}
     */
    this._accessCounter = 0
  }

  /**
   * 添加 Blob 到缓存
   * 如果缓存已满，自动淘汰最久未使用的项
   * @param {string} key - 缓存键
   * @param {Blob} blob - 要缓存的 Blob 对象
   */
  set(key, blob) {
    // 如果键已存在，先清理旧的
    if (this._cache.has(key)) {
      this._revokeUrl(this._cache.get(key).url)
      this._cache.delete(key)
    }

    // 如果缓存已满，淘汰最久未使用的项
    if (this._cache.size >= this._maxSize) {
      this._evictOldest()
    }

    // 创建 Blob URL 并添加到缓存
    const url = URL.createObjectURL(blob)
    this._accessCounter++
    this._cache.set(key, {
      blob,
      url,
      accessOrder: this._accessCounter,
    })

    console.log(`[audioCache] set: ${key} (size: ${this._cache.size}/${this._maxSize})`)
  }

  /**
   * 从缓存中获取 Blob URL
   * 访问后会更新该项的使用顺序（标记为最近使用）
   * @param {string} key - 缓存键
   * @returns {string|null} Blob URL，如果不存在则返回 null
   */
  get(key) {
    if (!this._cache.has(key)) {
      console.log(`[audioCache] cache miss: ${key}`)
      return null
    }

    const item = this._cache.get(key)
    this._accessCounter++
    item.accessOrder = this._accessCounter

    console.log(`[audioCache] cache hit: ${key}`)
    return item.url
  }

  /**
   * 释放指定的缓存项
   * 撤销 Blob URL 并从缓存中移除
   * @param {string} key - 缓存键
   */
  release(key) {
    if (!this._cache.has(key)) {
      console.log(`[audioCache] release skipped (not found): ${key}`)
      return
    }

    const item = this._cache.get(key)
    this._revokeUrl(item.url)
    this._cache.delete(key)

    console.log(`[audioCache] released: ${key} (size: ${this._cache.size}/${this._maxSize})`)
  }

  /**
   * 清空缓存并释放所有 Blob URL
   */
  clear() {
    for (const item of this._cache.values()) {
      this._revokeUrl(item.url)
    }
    this._cache.clear()
    this._accessCounter = 0

    console.log('[audioCache] cleared')
  }

  /**
   * 检查缓存中是否存在指定键
   * @param {string} key - 缓存键
   * @returns {boolean} 如果存在返回 true，否则返回 false
   */
  has(key) {
    return this._cache.has(key)
  }

  /**
   * 获取当前缓存大小
   * @returns {number} 缓存中的项数
   */
  get size() {
    return this._cache.size
  }

  /**
   * 淘汰最久未使用的缓存项
   * @private
   */
  _evictOldest() {
    let oldestKey = null
    let oldestOrder = Infinity

    for (const [key, item] of this._cache.entries()) {
      if (item.accessOrder < oldestOrder) {
        oldestOrder = item.accessOrder
        oldestKey = key
      }
    }

    if (oldestKey !== null) {
      const item = this._cache.get(oldestKey)
      this._revokeUrl(item.url)
      this._cache.delete(oldestKey)
      console.log(`[audioCache] evicted: ${oldestKey} (size: ${this._cache.size}/${this._maxSize})`)
    }
  }

  /**
   * 撤销 Blob URL
   * @param {string} url - 要撤销的 URL
   * @private
   */
  _revokeUrl(url) {
    try {
      URL.revokeObjectURL(url)
    } catch (error) {
      console.warn('[audioCache] failed to revoke URL:', error.message)
    }
  }
}

export default AudioCache
