# 日々（Hibi）

日々是一款面向中文用户的日语学习 Web 应用原型，从可跳过的假名入门和 JLPT N5 开始。当前可以浏览首批文法、单词和例句，播放日语朗读，调整每日计划，并在配置模型后测试连接和提交文法造句评价请求。

项目提供面向电脑和手机浏览器的响应式布局。学习者可以设置目标等级、每日文法与单词数量、学习时长，并填写 OpenAI、Anthropic、Google Gemini 或 OpenAI 兼容模型配置。

## 环境要求

- Node.js 20.9 或更高版本
- npm

## 安装

```bash
cd languageLearning
npm install
```

如果安装依赖时访问 npm 官方源较慢，可以临时使用镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

## 本地开发

```bash
npm run dev
```

打开 <http://localhost:3000>。

## 生产构建

```bash
npm run build
npm start
```

构建完成后，`npm start` 默认在 <http://localhost:3000> 启动优化后的服务。当前版本适合在个人可信设备的 `localhost` 上试用，不应直接作为公共多用户服务暴露到互联网。

如果需要从手机或其他设备访问，即使设备处于可信局域网，也必须通过端到端 HTTPS 提供服务。不要在非 `localhost` 的明文 HTTP 页面中输入 API Key。

## 快速体验

1. 从“今日”页面查看默认学习计划。
2. 进入“假名入门”，点击假名播放日语读音。
3. 从“文法”或“单词”页面浏览首批 N5 示例内容。
4. 在“我的”页面调整每日学习数量、时长和目标等级。
5. 配置模型后，进入文法学习页提交一个日语造句评价请求。

## 模型配置

进入应用的“我的”页面，选择模型服务商并填写模型名称和 API Key。当前已提供以下配置选项和调用适配器：

- OpenAI
- Anthropic
- Google Gemini
- OpenAI 兼容接口

API Key 当前保存在该站点的浏览器 localStorage 中。提交造句或测试连接时，浏览器会将密钥发送到同源的 `/api/ai` 服务端接口，再由该接口调用所选的第三方模型服务。只应在可信设备上使用，并确认访问地址来自你控制的服务。

清除密钥的方法：

1. 在“我的”页面清空 API Key 并保存；或
2. 在浏览器设置中清除该站点的站点数据。

不要将 API Key 写入源码、提交到 Git、输入到他人部署的未知实例，或通过不受信任的网络传输。

## 常用脚本

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动本地开发服务 |
| `npm run build` | 创建生产构建 |
| `npm start` | 启动构建后的服务 |
