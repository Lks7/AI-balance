const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 提供静态文件
app.use(express.static(path.join(__dirname, 'public')));

// API代理路由 - 简化版本，直接使用axios转发请求
app.get('/api/balance', async (req, res) => {
    try {
        // 从查询参数获取必要信息np
        const { url, authorization, contentType } = req.query;

        if (!url) {
            return res.status(400).json({ error: '缺少API地址参数' });
        }

        // 构建请求头
        const headers = {};
        if (authorization) {
            headers['Authorization'] = authorization;
        }
        if (contentType) {
            headers['Content-Type'] = contentType;
        }

        // 还可以接收其他自定义头
        Object.keys(req.query).forEach(key => {
            if (key.startsWith('header_')) {
                const headerName = key.replace('header_', '');
                headers[headerName] = req.query[key];
            }
        });

        // 发送请求
        const response = await axios.get(url, { headers });
        res.json(response.data);
    } catch (error) {
        console.error('API请求错误:', error.message);
        const errorMsg = error.response
            ? { status: error.response.status, message: error.response.data || error.message }
            : { message: error.message };
        res.status(error.response?.status || 500).json(errorMsg);
    }
});

// 处理SPA路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
==================================================
  大模型余额查询服务已启动!
  
  请在浏览器中访问: http://localhost:${PORT}
==================================================
  `);
});