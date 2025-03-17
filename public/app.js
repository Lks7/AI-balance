const app = Vue.createApp({
    data() {
        return {
            currentModelIndex: 0,
            isLoading: false,
            error: null,
            result: null,
            showRawData: false,
            formattedResult: {},
            useProxy: false,
            proxyUrl: '',
            models: [
                {
                    id: 'openai',
                    name: 'OpenAI',
                    apiKey: '',
                    endpointUrl: 'https://api.openai.com/dashboard/billing/credit_grants',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': ''
                    },
                    extraParams: []
                },
                {
                    id: 'anthropic',
                    name: 'Anthropic',
                    apiKey: '',
                    endpointUrl: 'https://api.anthropic.com/v1/account',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': ''
                    },
                    extraParams: []
                },
                {
                    id: 'azure',
                    name: 'Azure OpenAI',
                    apiKey: '',
                    endpointUrl: 'https://{resourceName}.openai.azure.com/openai/billing/subscription/usage?api-version=2023-07-01-preview',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': ''
                    },
                    extraParams: [
                        {
                            name: '资源名称',
                            key: 'resourceName',
                            value: ''
                        }
                    ]
                },
                {
                    id: 'zhipu',
                    name: '智谱 AI',
                    apiKey: '',
                    endpointUrl: 'https://open.bigmodel.cn/api/paas/v3/account/balance',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': ''
                    },
                    extraParams: []
                },
                {
                    id: 'deepseek',
                    name: 'DeepSeek',
                    apiKey: '',
                    endpointUrl: 'https://api.deepseek.com/user/balance',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': ''
                    },
                    extraParams: []
                }
            ]
        }
    },
    computed: {
        cardClasses() {
            return {
                'proxy-enabled': this.useProxy
            };
        },
        hasFormattedResult() {
            return Object.keys(this.formattedResult).length > 0;
        }
    },
    methods: {
        switchModel(index) {
            this.currentModelIndex = index;
            this.error = null;
            this.result = null;
        },


        async queryBalance() {
            const currentModel = this.models[this.currentModelIndex];

            if (!currentModel.apiKey.trim()) {
                this.error = 'API Key 不能为空';
                return;
            }

            this.isLoading = true;
            this.error = null;
            this.result = null;

            try {
                // 准备请求 headers
                const headers = { ...currentModel.headers };

                // 根据不同模型设置 Authorization 或 api-key
                if (currentModel.id === 'openai') {
                    headers.Authorization = `Bearer ${currentModel.apiKey}`;
                } else if (currentModel.id === 'anthropic') {
                    headers['x-api-key'] = currentModel.apiKey;
                } else if (currentModel.id === 'azure') {
                    headers['api-key'] = currentModel.apiKey;
                } else if (currentModel.id === 'zhipu') {
                    headers.Authorization = currentModel.apiKey;
                } else if (currentModel.id === 'deepseek') {
                    headers.Authorization = `Bearer ${currentModel.apiKey}`;
                }

                // 解析端点URL中的各个部分
                let targetUrl = currentModel.endpointUrl;

                // 处理额外参数
                currentModel.extraParams.forEach(param => {
                    if (param.value) {
                        targetUrl = targetUrl.replace(`{${param.key}}`, param.value);
                    }
                });

                // 关键修改：如果启用API替代地址，保留原始路径
                let baseUrl = '';
                let pathAndQuery = '';

                if (this.useProxy && this.proxyUrl.trim()) {
                    // 解析原始URL和代理URL
                    const originalUrlParts = new URL(targetUrl);

                    // 保留原始URL的路径和查询参数
                    pathAndQuery = originalUrlParts.pathname + originalUrlParts.search;

                    // 使用代理URL作为基础URL
                    baseUrl = this.proxyUrl;

                    // 确保代理URL不以斜杠结尾
                    if (baseUrl.endsWith('/')) {
                        baseUrl = baseUrl.slice(0, -1);
                    }

                    // 确保路径以斜杠开始
                    if (!pathAndQuery.startsWith('/') && pathAndQuery) {
                        pathAndQuery = '/' + pathAndQuery;
                    }

                    // 最终的目标URL
                    targetUrl = baseUrl + pathAndQuery;
                }

                console.log('最终请求URL:', targetUrl); // 调试日志

                // 构建本地API请求
                let apiUrl = '/api/balance?url=' + encodeURIComponent(targetUrl);

                // 添加授权参数
                if (headers.Authorization) {
                    apiUrl += `&authorization=${encodeURIComponent(headers.Authorization)}`;
                }

                // 添加其他Headers
                Object.keys(headers).forEach(key => {
                    if (key !== 'Authorization' && key !== 'Content-Type') {
                        apiUrl += `&header_${key}=${encodeURIComponent(headers[key])}`;
                    }
                });

                const response = await axios.get(apiUrl);
                this.result = response.data;
                this.formatModelResult();
            } catch (error) {
                console.error('查询余额出错:', error);
                this.error = error.response ?
                    `${error.response.status}: ${(error.response.data && error.response.data.message) || error.response.statusText}` :
                    error.message;
            } finally {
                this.isLoading = false;
            }
        },
        // 添加 watch 属性来监听代理状态变化
        watch: {
            useProxy(newVal) {
                // 清除之前可能的错误提示
                if (newVal === false) {
                    this.error = null;
                }

                // 您可以添加代理状态变化时的其他逻辑
            }
        },
        formatModelResult() {
            const currentModel = this.models[this.currentModelIndex];

            if (currentModel.id === 'openai') {
                this.formattedResult = {
                    total: this.result.total_available?.toFixed(2) || '0.00',
                    granted: this.result.total_granted?.toFixed(2) || '0.00',
                    used: this.result.total_used?.toFixed(2) || '0.00',
                    expires: this.formatDate(this.result.expires_at)
                };
            }
            else if (currentModel.id === 'deepseek') {
                if (this.result.balance_infos && this.result.balance_infos.length > 0) {
                    const balanceInfo = this.result.balance_infos[0];
                    const total = parseFloat(balanceInfo.total_balance || 0);
                    const granted = parseFloat(balanceInfo.granted_balance || 0);
                    const toppedUp = parseFloat(balanceInfo.topped_up_balance || 0);

                    this.formattedResult = {
                        total: balanceInfo.total_balance || '0.00',
                        granted: balanceInfo.granted_balance || '0.00',
                        topped_up: balanceInfo.topped_up_balance || '0.00',
                        currency: balanceInfo.currency || 'CNY',
                        topupPercentage: total > 0 ? Math.round((toppedUp / total) * 100) : 0,
                        status: this.result.is_available ? '可用' : '不可用'
                    };
                }
            }
            // 可以继续添加其他模型的格式化逻辑
            else {
                // 默认格式化 - 将所有字段展平为一个对象
                this.formattedResult = this.flattenObject(this.result);
            }
        },

        formatDate(timestamp) {
            if (!timestamp) return 'N/A';
            const date = new Date(timestamp * 1000);
            return date.toLocaleDateString('zh-CN');
        },

        formatLabel(key) {
            // 将驼峰命名或下划线转换为更易读的格式
            return key
                .replace(/_/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase());
        },

        flattenObject(obj, prefix = '') {
            const result = {};

            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const newKey = prefix ? `${prefix}.${key}` : key;

                    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                        Object.assign(result, this.flattenObject(obj[key], newKey));
                    } else {
                        result[key] = obj[key];
                    }
                }
            }

            return result;
        },

        toggleRawData() {
            this.showRawData = !this.showRawData;
        },

        formatResult(result) {
            return JSON.stringify(result, null, 2);
        }
    }
});

app.mount('#app');