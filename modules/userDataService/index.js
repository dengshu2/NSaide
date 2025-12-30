(function () {
    'use strict';

    console.log('[NS助手] userDataService 模块开始加载');

    /**
     * 全局用户数据服务
     * 提供统一的用户信息获取和缓存管理
     */
    const NSUserDataService = {
        id: 'userDataService',
        name: '用户数据服务',
        description: '提供统一的用户信息缓存和获取服务',

        // 内存缓存
        memoryCache: new Map(),
        // 正在处理的请求（防止重复请求）
        pendingRequests: new Map(),
        // 配置
        config: {
            cacheExpiry: 30 * 60 * 1000,  // 缓存过期时间：30分钟
            maxMemoryCacheSize: 200,       // 内存缓存最大数量
            maxStorageCacheSize: 500,      // 持久化缓存最大数量
            storageCacheKey: 'ns_user_data_cache',
            storageCacheIndexKey: 'ns_user_data_cache_index'
        },

        /**
         * 初始化服务
         */
        init() {
            console.log('[NS助手] 初始化用户数据服务');

            // 清理过期的持久化缓存
            this.cleanExpiredStorageCache();

            // 将服务暴露到全局
            window.NSUserDataService = this;

            console.log('[NS助手] 用户数据服务初始化完成');
        },

        /**
         * 获取用户信息（主入口）
         * @param {string} userId - 用户ID
         * @returns {Promise<Object|null>} 用户信息对象
         */
        async getUserInfo(userId) {
            if (!userId) {
                console.warn('[NS助手] getUserInfo: userId 无效');
                return null;
            }

            // 1. 检查内存缓存
            const memoryData = this.getFromMemoryCache(userId);
            if (memoryData) {
                console.log(`[NS助手] 使用内存缓存: ${userId}`);
                return memoryData;
            }

            // 2. 检查持久化缓存
            const storageData = this.getFromStorageCache(userId);
            if (storageData) {
                console.log(`[NS助手] 使用持久化缓存: ${userId}`);
                // 同时写入内存缓存
                this.setMemoryCache(userId, storageData);
                return storageData;
            }

            // 3. 检查是否有正在进行的请求
            if (this.pendingRequests.has(userId)) {
                console.log(`[NS助手] 等待已有请求: ${userId}`);
                return this.pendingRequests.get(userId);
            }

            // 4. 发起新请求
            console.log(`[NS助手] 获取用户数据: ${userId}`);
            const requestPromise = this.fetchUserInfo(userId);
            this.pendingRequests.set(userId, requestPromise);

            try {
                const data = await requestPromise;
                if (data) {
                    // 写入缓存
                    this.setMemoryCache(userId, data);
                    this.setStorageCache(userId, data);
                }
                return data;
            } finally {
                this.pendingRequests.delete(userId);
            }
        },

        /**
         * 从 API 获取用户信息
         * @param {string} userId - 用户ID
         * @returns {Promise<Object|null>} 用户信息
         */
        async fetchUserInfo(userId) {
            try {
                const response = await fetch(`https://www.nodeseek.com/api/account/getInfo/${userId}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error('API 返回失败状态');
                }

                return data.detail;
            } catch (error) {
                console.error(`[NS助手] 获取用户信息失败 (${userId}):`, error);
                return null;
            }
        },

        /**
         * 从内存缓存获取
         */
        getFromMemoryCache(userId) {
            const cached = this.memoryCache.get(userId);
            if (!cached) return null;

            // 检查是否过期
            if (Date.now() - cached.timestamp > this.config.cacheExpiry) {
                this.memoryCache.delete(userId);
                return null;
            }

            return cached.data;
        },

        /**
         * 写入内存缓存
         */
        setMemoryCache(userId, data) {
            // 清理超出限制的缓存
            if (this.memoryCache.size >= this.config.maxMemoryCacheSize) {
                const firstKey = this.memoryCache.keys().next().value;
                this.memoryCache.delete(firstKey);
            }

            this.memoryCache.set(userId, {
                data,
                timestamp: Date.now()
            });
        },

        /**
         * 从持久化缓存获取
         */
        getFromStorageCache(userId) {
            try {
                const cacheKey = `${this.config.storageCacheKey}_${userId}`;
                const cached = GM_getValue(cacheKey);

                if (!cached) return null;

                const { data, timestamp } = JSON.parse(cached);

                // 检查是否过期
                if (Date.now() - timestamp > this.config.cacheExpiry) {
                    GM_setValue(cacheKey, '');
                    this.removeFromCacheIndex(userId);
                    return null;
                }

                return data;
            } catch (error) {
                console.error(`[NS助手] 读取持久化缓存失败 (${userId}):`, error);
                return null;
            }
        },

        /**
         * 写入持久化缓存
         */
        setStorageCache(userId, data) {
            try {
                const cacheKey = `${this.config.storageCacheKey}_${userId}`;

                GM_setValue(cacheKey, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));

                // 更新缓存索引
                this.addToCacheIndex(userId);
            } catch (error) {
                console.error(`[NS助手] 写入持久化缓存失败 (${userId}):`, error);
            }
        },

        /**
         * 获取缓存索引
         */
        getCacheIndex() {
            try {
                const index = GM_getValue(this.config.storageCacheIndexKey);
                return index ? JSON.parse(index) : [];
            } catch {
                return [];
            }
        },

        /**
         * 保存缓存索引
         */
        saveCacheIndex(index) {
            GM_setValue(this.config.storageCacheIndexKey, JSON.stringify(index));
        },

        /**
         * 添加到缓存索引
         */
        addToCacheIndex(userId) {
            const index = this.getCacheIndex();

            // 如果已存在，先移除（后面会添加到末尾）
            const existingIdx = index.indexOf(userId);
            if (existingIdx > -1) {
                index.splice(existingIdx, 1);
            }

            // 添加到末尾
            index.push(userId);

            // 如果超出限制，删除最旧的
            while (index.length > this.config.maxStorageCacheSize) {
                const oldestUserId = index.shift();
                const cacheKey = `${this.config.storageCacheKey}_${oldestUserId}`;
                GM_setValue(cacheKey, '');
            }

            this.saveCacheIndex(index);
        },

        /**
         * 从缓存索引移除
         */
        removeFromCacheIndex(userId) {
            const index = this.getCacheIndex();
            const idx = index.indexOf(userId);
            if (idx > -1) {
                index.splice(idx, 1);
                this.saveCacheIndex(index);
            }
        },

        /**
         * 清理过期的持久化缓存
         */
        cleanExpiredStorageCache() {
            console.log('[NS助手] 开始清理过期缓存');
            const index = this.getCacheIndex();
            const now = Date.now();
            const validIndex = [];
            let cleanedCount = 0;

            for (const userId of index) {
                const cacheKey = `${this.config.storageCacheKey}_${userId}`;
                try {
                    const cached = GM_getValue(cacheKey);
                    if (cached) {
                        const { timestamp } = JSON.parse(cached);
                        if (now - timestamp <= this.config.cacheExpiry) {
                            validIndex.push(userId);
                        } else {
                            GM_setValue(cacheKey, '');
                            cleanedCount++;
                        }
                    }
                } catch {
                    GM_setValue(cacheKey, '');
                    cleanedCount++;
                }
            }

            this.saveCacheIndex(validIndex);
            console.log(`[NS助手] 缓存清理完成，清理了 ${cleanedCount} 条过期数据，保留 ${validIndex.length} 条有效数据`);
        },

        /**
         * 获取缓存统计信息
         */
        getCacheStats() {
            const index = this.getCacheIndex();
            return {
                memorySize: this.memoryCache.size,
                storageSize: index.length,
                pendingRequests: this.pendingRequests.size
            };
        },

        /**
         * 清除所有缓存（调试用）
         */
        clearAllCache() {
            // 清除内存缓存
            this.memoryCache.clear();

            // 清除持久化缓存
            const index = this.getCacheIndex();
            for (const userId of index) {
                const cacheKey = `${this.config.storageCacheKey}_${userId}`;
                GM_setValue(cacheKey, '');
            }
            this.saveCacheIndex([]);

            console.log('[NS助手] 所有缓存已清除');
        }
    };

    // 等待模块系统就绪
    console.log('[NS助手] 等待模块系统就绪');
    let retryCount = 0;
    const maxRetries = 50;

    const waitForNS = () => {
        retryCount++;
        console.log(`[NS助手] 第 ${retryCount} 次尝试注册 userDataService 模块`);

        if (typeof window.NSRegisterModule === 'function') {
            console.log('[NS助手] 模块系统就绪，开始注册 userDataService');
            window.NSRegisterModule(NSUserDataService);
            console.log('[NS助手] userDataService 模块注册请求已发送');
        } else {
            console.log('[NS助手] 模块系统未就绪');
            if (retryCount < maxRetries) {
                setTimeout(waitForNS, 100);
            } else {
                console.error('[NS助手] 模块系统等待超时，userDataService 模块注册失败');
            }
        }
    };

    waitForNS();
    console.log('[NS助手] userDataService 模块加载完成 v1.0.0');
})();
