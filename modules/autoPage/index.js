(function() {
    'use strict';
    
    console.log('[NS助手] autoPage 模块开始加载');

    const NSAutoPage = {
        id: 'autoPage',
        name: '自动翻页',
        description: '自动加载下一页内容，支持无缝加载和普通跳转两种模式',

        config: {
            storage: {
                POST_STATUS: 'ns_autopage_post_status',
                POST_THRESHOLD: 'ns_autopage_post_threshold',
                COMMENT_STATUS: 'ns_autopage_comment_status',
                COMMENT_THRESHOLD: 'ns_autopage_comment_threshold',
                NORMAL_POST_STATUS: 'ns_autopage_normal_post_status',
                NORMAL_POST_THRESHOLD: 'ns_autopage_normal_post_threshold',
                NORMAL_COMMENT_STATUS: 'ns_autopage_normal_comment_status',
                NORMAL_COMMENT_THRESHOLD: 'ns_autopage_normal_comment_threshold'
            },
            post: {
                pathPattern: /^\/(categories\/|page|award|search|$)/,
                scrollThreshold: 200,
                nextPagerSelector: '.nsk-pager a.pager-next',
                postListSelector: 'ul.post-list:not(.topic-carousel-panel)',
                topPagerSelector: 'div.nsk-pager.pager-top',
                bottomPagerSelector: 'div.nsk-pager.pager-bottom',
                type: '【无缝】帖子列表'
            },
            comment: {
                pathPattern: /^\/post-/,
                scrollThreshold: 200,
                nextPagerSelector: '.nsk-pager a.pager-next',
                postListSelector: 'ul.comments',
                topPagerSelector: 'div.nsk-pager.post-top-pager',
                bottomPagerSelector: 'div.nsk-pager.post-bottom-pager',
                type: '【无缝】评论区'
            },
            normalPost: {
                pathPattern: /^\/(categories\/|page|award|search|$)/,
                scrollThreshold: 300,
                nextPagerSelector: '.nsk-pager a.pager-next',
                type: '【普通】帖子列表'
            },
            normalComment: {
                pathPattern: /^\/post-/,
                scrollThreshold: 300,
                nextPagerSelector: '.nsk-pager a.pager-next',
                type: '【普通】评论区'
            }
        },

        settings: {
            items: [
                {
                    id: 'post_status',
                    type: 'switch',
                    label: '无缝帖子列表',
                    default: false,
                    value: () => GM_getValue('ns_autopage_post_status', false)
                },
                {
                    id: 'post_threshold',
                    type: 'number',
                    label: '无缝帖子触发阈值',
                    default: 200,
                    value: () => GM_getValue('ns_autopage_post_threshold', 200)
                },
                {
                    id: 'comment_status',
                    type: 'switch',
                    label: '无缝评论区',
                    default: false,
                    value: () => GM_getValue('ns_autopage_comment_status', false)
                },
                {
                    id: 'comment_threshold',
                    type: 'number',
                    label: '无缝评论区触发阈值',
                    default: 100,
                    value: () => GM_getValue('ns_autopage_comment_threshold', 100)
                },
                {
                    id: 'normal_post_status',
                    type: 'switch',
                    label: '普通帖子列表',
                    default: false,
                    value: () => GM_getValue('ns_autopage_normal_post_status', false)
                },
                {
                    id: 'normal_post_threshold',
                    type: 'number',
                    label: '普通帖子触发阈值',
                    default: 300,
                    value: () => GM_getValue('ns_autopage_normal_post_threshold', 300)
                },
                {
                    id: 'normal_comment_status',
                    type: 'switch',
                    label: '普通评论区',
                    default: false,
                    value: () => GM_getValue('ns_autopage_normal_comment_status', false)
                },
                {
                    id: 'normal_comment_threshold',
                    type: 'number',
                    label: '普通评论区触发阈值',
                    default: 300,
                    value: () => GM_getValue('ns_autopage_normal_comment_threshold', 300)
                }
            ],
            
            handleChange(settingId, value, settingsManager) {
                console.log(`[NS助手] 自动翻页设置变更: ${settingId} = ${value}`);
                switch(settingId) {
                    case 'post_status':
                        settingsManager.cacheValue('ns_autopage_post_status', value);
                        console.log(`[NS助手] 无缝帖子列表自动翻页已${value ? '启用' : '禁用'}`);
                        break;
                    case 'post_threshold':
                        settingsManager.cacheValue('ns_autopage_post_threshold', parseInt(value));
                        console.log(`[NS助手] 无缝帖子列表触发阈值已设置为: ${value}px`);
                        break;
                    case 'comment_status':
                        settingsManager.cacheValue('ns_autopage_comment_status', value);
                        console.log(`[NS助手] 无缝评论区自动翻页已${value ? '启用' : '禁用'}`);
                        break;
                    case 'comment_threshold':
                        settingsManager.cacheValue('ns_autopage_comment_threshold', parseInt(value));
                        console.log(`[NS助手] 无缝评论区触发阈值已设置为: ${value}px`);
                        break;
                    case 'normal_post_status':
                        settingsManager.cacheValue('ns_autopage_normal_post_status', value);
                        console.log(`[NS助手] 普通帖子列表自动翻页已${value ? '启用' : '禁用'}`);
                        break;
                    case 'normal_post_threshold':
                        settingsManager.cacheValue('ns_autopage_normal_post_threshold', parseInt(value));
                        console.log(`[NS助手] 普通帖子列表触发阈值已设置为: ${value}px`);
                        break;
                    case 'normal_comment_status':
                        settingsManager.cacheValue('ns_autopage_normal_comment_status', value);
                        console.log(`[NS助手] 普通评论区自动翻页已${value ? '启用' : '禁用'}`);
                        break;
                    case 'normal_comment_threshold':
                        settingsManager.cacheValue('ns_autopage_normal_comment_threshold', parseInt(value));
                        console.log(`[NS助手] 普通评论区触发阈值已设置为: ${value}px`);
                        break;
                }
            }
        },

        utils: {
            windowScroll(callback) {
                let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                let ticking = false;
                let userInteracting = false;
                let interactionTimeout = null;
                
                const setUserInteracting = () => {
                    userInteracting = true;
                    if (interactionTimeout) {
                        clearTimeout(interactionTimeout);
                    }
                    interactionTimeout = setTimeout(() => {
                        userInteracting = false;
                    }, 500);
                };
                
                window.addEventListener('wheel', setUserInteracting, { passive: true });
                window.addEventListener('touchstart', setUserInteracting, { passive: true });
                window.addEventListener('touchmove', setUserInteracting, { passive: true });
                window.addEventListener('keydown', (e) => {
                    if (e.key === 'PageDown' || e.key === 'PageUp' || 
                        e.key === 'ArrowDown' || e.key === 'ArrowUp' || 
                        e.key === 'Home' || e.key === 'End' || 
                        e.key === ' ') {
                        setUserInteracting();
                    }
                }, { passive: true });
            
                window.addEventListener('scroll', function(e) {
                    let currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    
                    if (!ticking && userInteracting) {
                        window.requestAnimationFrame(function() {
                            let direction = currentScrollTop > lastScrollTop ? 'down' : 'up';
                            callback(direction, e);
                            lastScrollTop = currentScrollTop;
                            ticking = false;
                        });
                        
                        ticking = true;
                    }
                }, { passive: true });
                console.log('[NS助手] 滚动监听器已启动，已启用用户交互检测');
            },

            b64DecodeUnicode(str) {
                return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
            },

            processCommentMenus(commentElements) {
                const existingMenu = document.querySelector('.comment-menu');
                if (!existingMenu || !existingMenu.__vue__) {
                    console.warn('[NS助手] 未找到评论菜单Vue实例');
                    return;
                }

                const vue = existingMenu.__vue__;
                let startIndex = document.querySelectorAll('.content-item').length - commentElements.length;
                console.log(`[NS助手] 开始处理新加载的评论菜单，起始索引: ${startIndex}`);

                commentElements.forEach((comment, index) => {
                    const menuMount = document.createElement('div');
                    menuMount.className = 'comment-menu-mount';
                    comment.appendChild(menuMount);

                    let menuInstance = new vue.$root.constructor(vue.$options);
                    menuInstance.setIndex(startIndex + index);
                    menuInstance.$mount(menuMount);
                });
                console.log(`[NS助手] 成功处理 ${commentElements.length} 个评论菜单`);
            }
        },

        normalAutoLoading() {
            let opt = {};
            let isEnabled = false;
            let threshold = 0;

            if (this.config.normalPost.pathPattern.test(location.pathname)) { 
                opt = this.config.normalPost;
                isEnabled = GM_getValue(this.config.storage.NORMAL_POST_STATUS, false);
                threshold = GM_getValue(this.config.storage.NORMAL_POST_THRESHOLD, opt.scrollThreshold);
                console.log(`[NS助手] 当前页面类型: ${opt.type}, 自动翻页状态: ${isEnabled ? '开启' : '关闭'}, 触发阈值: ${threshold}px`);
            }
            else if (this.config.normalComment.pathPattern.test(location.pathname)) { 
                opt = this.config.normalComment;
                isEnabled = GM_getValue(this.config.storage.NORMAL_COMMENT_STATUS, false);
                threshold = GM_getValue(this.config.storage.NORMAL_COMMENT_THRESHOLD, opt.scrollThreshold);
                console.log(`[NS助手] 当前页面类型: ${opt.type}, 自动翻页状态: ${isEnabled ? '开启' : '关闭'}, 触发阈值: ${threshold}px`);
            }
            else { 
                return; 
            }

            if (!isEnabled) {
                console.log('[NS助手] 普通自动翻页功能未启用，跳过初始化');
                return;
            }

            let is_requesting = false;

            this.utils.windowScroll((direction, e) => {
                if (direction === 'down') {
                    let scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop;
                    
                    if (document.documentElement.scrollHeight <= document.documentElement.clientHeight + scrollTop + threshold && !is_requesting) {
                        let nextButton = document.querySelector(opt.nextPagerSelector);
                        if (!nextButton) {
                            console.log('[NS助手] 已到达最后一页');
                            return;
                        }
                        
                        let nextUrl = nextButton.attributes.href.value;
                        console.log(`[NS助手] 普通翻页：跳转到下一页: ${nextUrl}`);
                        window.location.href = nextUrl;
                    }
                }
            });
        },

        autoLoading() {
            let opt = {};
            let isEnabled = false;
            let threshold = 0;

            if (this.config.post.pathPattern.test(location.pathname)) { 
                opt = this.config.post;
                isEnabled = GM_getValue(this.config.storage.POST_STATUS, false);
                threshold = GM_getValue(this.config.storage.POST_THRESHOLD, opt.scrollThreshold);
                console.log(`[NS助手] 当前页面类型: ${opt.type}, 自动翻页状态: ${isEnabled ? '开启' : '关闭'}, 触发阈值: ${threshold}px`);
            }
            else if (this.config.comment.pathPattern.test(location.pathname)) { 
                opt = this.config.comment;
                isEnabled = GM_getValue(this.config.storage.COMMENT_STATUS, false);
                threshold = GM_getValue(this.config.storage.COMMENT_THRESHOLD, opt.scrollThreshold);
                console.log(`[NS助手] 当前页面类型: ${opt.type}, 自动翻页状态: ${isEnabled ? '开启' : '关闭'}, 触发阈值: ${threshold}px`);
            }
            else { 
                console.log('[NS助手] 当前页面不支持自动翻页');
                return; 
            }

            if (!isEnabled) {
                console.log('[NS助手] 自动翻页功能未启用，跳过初始化');
                return;
            }

            let is_requesting = false;
            let _this = this;
            let loadCount = 0;

            this.utils.windowScroll(function (direction, e) {
                if (direction === 'down') {
                    let scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop;
                    
                    if (document.documentElement.scrollHeight <= document.documentElement.clientHeight + scrollTop + threshold && !is_requesting) {
                        let nextButton = document.querySelector(opt.nextPagerSelector);
                        if (!nextButton) {
                            console.log('[NS助手] 已到达最后一页');
                            return;
                        }
                        
                        let nextUrl = nextButton.attributes.href.value;
                        is_requesting = true;
                        console.log(`[NS助手] 开始加载下一页: ${nextUrl}`);

                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: nextUrl,
                            onload: function(response) {
                                if (response.status === 200) {
                                    loadCount++;
                                    console.log(`[NS助手] 第 ${loadCount} 次加载成功`);
                                    let doc = new DOMParser().parseFromString(response.responseText, "text/html");
                                    
                                    if (_this.config.comment.pathPattern.test(location.pathname)){
                                        let el = doc.getElementById('temp-script')
                                        let jsonText = el.textContent;
                                        if (jsonText) {
                                            let conf = JSON.parse(_this.utils.b64DecodeUnicode(jsonText))
                                            unsafeWindow.__config__.postData.comments.push(...conf.postData.comments);
                                            console.log(`[NS助手] 成功合并 ${conf.postData.comments.length} 条评论数据`);
                                        }
                                    }

                                    // 查找新页面中的帖子列表
                                    const newPostList = doc.querySelector(opt.postListSelector);
                                    if (!newPostList) {
                                        console.error('[NS助手] 在新页面中未找到帖子列表元素');
                                        is_requesting = false;
                                        return;
                                    }
                                    
                                    const newComments = Array.from(newPostList.children);
                                    console.log(`[NS助手] 获取到 ${newComments.length} 个新内容`);
                                    
                                    // 查找当前页面中的帖子列表
                                    const currentPostList = document.querySelector(opt.postListSelector);
                                    if (!currentPostList) {
                                        console.error('[NS助手] 在当前页面中未找到帖子列表元素');
                                        is_requesting = false;
                                        return;
                                    }
                                    
                                    currentPostList.append(...newComments);
                                    
                                    if (_this.config.comment.pathPattern.test(location.pathname)) {
                                        _this.utils.processCommentMenus(newComments);
                                    }
                                    
                                    // 更新分页器
                                    const topPager = document.querySelector(opt.topPagerSelector);
                                    const bottomPager = document.querySelector(opt.bottomPagerSelector);
                                    const newTopPager = doc.querySelector(opt.topPagerSelector);
                                    const newBottomPager = doc.querySelector(opt.bottomPagerSelector);
                                    
                                    if (topPager && newTopPager) {
                                        topPager.innerHTML = newTopPager.innerHTML;
                                    } else {
                                        console.warn('[NS助手] 无法更新顶部分页器');
                                    }
                                    
                                    if (bottomPager && newBottomPager) {
                                        bottomPager.innerHTML = newBottomPager.innerHTML;
                                    } else {
                                        console.warn('[NS助手] 无法更新底部分页器');
                                    }
                                    
                                    history.pushState(null, null, nextUrl);
                                    console.log('[NS助手] 页面状态更新完成');
                                    
                                    is_requesting = false;
                                } else {
                                    is_requesting = false;
                                    console.error(`[NS助手] 加载页面失败: ${response.status}`);
                                }
                            },
                            onerror: function(error) {
                                is_requesting = false;
                                console.error('[NS助手] 自动加载下一页失败:', error);
                            }
                        });
                    }
                }
            });
        },

        init() {
            console.log('[NS助手] 初始化自动翻页模块');
            this.autoLoading();
            this.normalAutoLoading();
            console.log('[NS助手] 自动翻页模块初始化完成');
        }
    };

    console.log('[NS助手] 等待模块系统就绪');
    let retryCount = 0;
    const maxRetries = 50;

    const waitForNS = () => {
        retryCount++;
        console.log(`[NS助手] 第 ${retryCount} 次尝试注册 autoPage 模块`);
        
        if (typeof window.NSRegisterModule === 'function') {
            console.log('[NS助手] 模块系统就绪，开始注册 autoPage');
            window.NSRegisterModule(NSAutoPage);
            console.log('[NS助手] autoPage 模块注册请求已发送');
        } else {
            console.log('[NS助手] 模块系统未就绪');
            if (retryCount < maxRetries) {
                setTimeout(waitForNS, 100);
            } else {
                console.error('[NS助手] 模块系统等待超时，autoPage 模块注册失败');
            }
        }
    };

    waitForNS();
    console.log('[NS助手] autoPage 模块加载完成 v0.4.4');
})();
