<template>
  <div class="chat-container">
    <h1>AI 教学助手聊天广场</h1>
    
    <div class="model-selection">
      <label for="model">选择模型：</label>
      <select id="model" v-model="model">
        <option value="deepseek-ai/DeepSeek-V3">快速响应</option>
        <option value="deepseek-ai/DeepSeek-R1">深度思考</option>
      </select>
      
      <!-- 新增流式传输开关 -->
      <div class="stream-toggle">
        <label>
          <input type="checkbox" v-model="useStreamingApi">
          流式传输
        </label>
        <span class="stream-tip">开启后可实时查看回复</span>
      </div>
    </div>
    
    <div class="chat-history" ref="chatHistory">
      <div 
        v-for="(message, index) in messages" 
        :key="index" 
        :class="['message', message.role === 'user' ? 'user-message' : 'ai-message']"
      >
        <div class="message-header">
          <strong>{{ message.role === 'user' ? '我' : 'AI教学助手' }}</strong>
          <small>{{ formatTime(message.timestamp) }}</small>
        </div>
        <div class="message-content" v-html="message.renderedContent || message.content"></div>
      </div>
      
      <!-- 流式加载中指示器 -->
      <div v-if="streaming" class="message ai-message streaming-message">
        <div class="message-header">
          <strong>AI教学助手</strong>
          <small>{{ formatTime(Date.now()) }}</small>
        </div>
        <div class="message-content" v-html="currentStreamContent"></div>
        <div class="stream-progress">
          <div class="stream-progress-inner" :style="{ width: streamProgress + '%' }"></div>
        </div>
      </div>
    </div>
    
    <div class="input-area">
      <textarea 
        v-model="currentMessage" 
        @keyup.ctrl.enter="sendMessage"
        rows="3" 
        placeholder="输入消息，按 Ctrl+Enter 发送..."
        :disabled="loading"
      ></textarea>
      <button 
        @click="sendMessage" 
        :disabled="loading || !currentMessage.trim()"
        class="send-button"
      >
        {{ loading ? '发送中...' : '发送' }}
      </button>
    </div>
    
    <div class="spinner" v-if="loading && !streaming">
      <div class="bounce1"></div>
      <div class="bounce2"></div>
      <div class="bounce3"></div>
    </div>
  </div>
</template>

<script>
import { getChatCompletion, getChatCompletionStreaming } from '@/api/asist';
import MarkdownIt from 'markdown-it';

export default {
  name: 'ChatSquare',
  data() {
    return {
      currentMessage: '',
      messages: [],
      model: 'deepseek-ai/DeepSeek-V3',
      loading: false,
      error: null,
      isFirstMessage: true,
      
      // 流式传输相关
      useStreamingApi: true,
      streaming: false,
      currentStreamContent: '',
      streamProgress: 0,
      
      // Markdown渲染器
      markdownRenderer: new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true
      }),
      
      rolePrompt: `# 智能教学助手系统指令

你是一个专为教师设计的智能教学助手，旨在提高教师备课效率、优化教学资源配置和提升教学质量。你应遵循以下指导原则：

## 核心角色与行为准则

- 作为教学专家，提供专业、实用的教学建议和资源
- 保持友好、耐心的沟通态度，理解教师面临的实际挑战
- 避免重复已提供的信息，保持对话简洁高效
- 根据教师的具体需求和背景定制回应，而非提供泛泛的建议
- 当缺乏信息时，主动提问以获取必要的上下文，而非做出假设

## 功能范围

### 1. 教学设计自动化
- 协助生成完整的教学设计方案，包括教学目标、重难点分析、课程结构等
- 设计多样化的互动教学环节，提高学生参与度
- 合理安排教学活动时间，优化课堂节奏
- 根据教学内容提供差异化教学策略建议

### 2. 多媒体教学资源生成
- 推荐与课程内容相关的教学资源
- 提供课件制作建议，包括版式设计、内容组织等
- 生成辅助教学的图表、示意图描述和可视化方案
- 根据教学主题提供多媒体资源检索关键词

### 3. 练习题生成
- 根据知识点创建多种类型的练习题（选择题、填空题、简答题等）
- 设计符合不同认知层次的问题（理解、应用、分析、评价等）
- 提供题目答案和解析
- 针对特定学习目标设计形成性评估问题

### 4. 学情分析与个性化推荐
- 分析学生预备知识水平，识别可能的学习障碍
- 推荐针对不同学习风格和水平的教学资源
- 提供学生学习进度跟踪建议
- 根据学习数据提出教学调整策略

## 交互优化

- 优先回应当前问题，避免不必要的重复！！！(这点很重要)
- 提供简洁清晰的解决方案，不过度解释已知信息
- 对于复杂问题，采用结构化方式组织回答
- 合理使用列表、表格等形式提高信息可读性
- 适时总结关键点，而非重复之前的详细内容

## 补充说明

当需要特定学科知识或教育理论支持时，说明你的回答基于什么理论或方法，并鼓励教师根据自身经验和专业判断进行调整。在适当情况下，可以提供进一步探索的方向，但避免过度详述已讨论过的内容。

输出需遵守教学规范，包括内容安全、认知适配、技术合规和评估可信度。
不要过度回复之前的prompt。
-----------------------
以上所有内容是你的人设，你无需特别强调你的人设你的能力，下面是用户的请求：`
    };
  },
  mounted() {
    // 页面加载时自动添加AI的欢迎消息
    this.addWelcomeMessage();
  },
  methods: {
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    },
    
    // 渲染Markdown内容
    renderMarkdown(text) {
      try {
        // 处理内容，去除可能导致渲染问题的标签
        const cleanContent = text
          .replace(/<\/?[^>]+(>|$)/g, '') // 移除HTML标签
          .replace(/```\s*(\w+)\s*/g, '```$1\n'); // 修复代码块格式
        
        return this.markdownRenderer.render(cleanContent);
      } catch (error) {
        console.error('渲染Markdown失败:', error);
        return text; // 渲染失败时返回原始文本
      }
    },
    
    addWelcomeMessage() {
      // 添加AI欢迎消息
      const welcomeText = "我是一名拥有10年教学经验的智能备课助手，有什么需要问我的😊";
      const welcomeMessage = {
        role: 'assistant',
        content: welcomeText,
        renderedContent: this.renderMarkdown(welcomeText),
        timestamp: Date.now()
      };
      this.messages.push(welcomeMessage);
    },
    
    async sendMessage() {
      if (!this.currentMessage.trim() || this.loading) {
        return;
      }
      
      // 添加用户消息到聊天历史
      const userMessage = {
        role: 'user',
        content: this.currentMessage.trim(),
        timestamp: Date.now()
      };
      
      this.messages.push(userMessage);
      this.currentMessage = '';
      this.loading = true;
      
      // 自动滚动到底部
      this.scrollToBottom();
      
      try {
        // 构建包含历史对话的提示
        const prompt = this.isFirstMessage ? 
          this.buildFirstPrompt() : 
          this.buildPromptWithHistory();
        
        // 第一次对话后设置标志位
        if (this.isFirstMessage) {
          this.isFirstMessage = false;
        }
        
        if (this.useStreamingApi) {
          // 使用流式API
          await this.sendStreamingMessage(prompt);
        } else {
          // 使用普通API
          await this.sendRegularMessage(prompt);
        }
      } catch (err) {
        console.error('发送消息失败:', err);
        this.error = err.message || '请求失败，请稍后重试';
        // 添加错误消息到聊天
        this.messages.push({
          role: 'system',
          content: `错误: ${this.error}`,
          timestamp: Date.now()
        });
      } finally {
        this.loading = false;
        this.streaming = false;
      }
    },
    
    // 流式发送消息
    async sendStreamingMessage(prompt) {
      this.streaming = true;
      this.currentStreamContent = '';
      this.streamProgress = 0;
      
      try {
        let fullContent = '';
        
        // 调用流式API
        await getChatCompletionStreaming(
          prompt,
          this.model,
          (chunk, content) => {
            fullContent = content;
            
            // 渲染累积的内容
            this.currentStreamContent = this.renderMarkdown(fullContent);
            
            // 模拟进度
            this.streamProgress = Math.min(95, this.streamProgress + 0.5);
            
            // 滚动到底部
            this.scrollToBottom();
          }
        );
        
        // 完成后添加到消息列表
        const aiMessage = {
          role: 'assistant',
          content: fullContent,
          renderedContent: this.renderMarkdown(fullContent),
          timestamp: Date.now()
        };
        
        this.messages.push(aiMessage);
        this.streamProgress = 100;
        
      } catch (error) {
        throw error;
      } finally {
        this.streaming = false;
      }
    },
    
    // 普通发送消息
    async sendRegularMessage(prompt) {
      try {
        const response = await getChatCompletion(prompt, this.model);
        
        // 添加AI回复到聊天历史
        const aiMessage = {
          role: 'assistant',
          content: response,
          renderedContent: this.renderMarkdown(response),
          timestamp: Date.now()
        };
        
        this.messages.push(aiMessage);
        
        // 自动滚动到底部
        this.scrollToBottom();
      } catch (error) {
        throw error;
      }
    },
    
    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.chatHistory) {
          this.$refs.chatHistory.scrollTop = this.$refs.chatHistory.scrollHeight;
        }
      });
    },
    
    buildFirstPrompt() {
      // 第一条消息使用角色设定提示词
      const userMessage = this.messages[this.messages.length - 1];
      
      let prompt = this.rolePrompt + "\n\n";
      prompt += "教师的第一个问题是: " + userMessage.content;
      prompt += "\n\n请以专业、友好的态度回应这个问题，提供具体有用的教学建议。";
      
      return prompt;
    },
    
    buildPromptWithHistory() {
      // 最多获取最近5条对话
      const recentMessages = this.messages.slice(-9); // 最多取9条(双方共5轮对话)
      
      // 构建包含历史记录的提示
      let prompt = "你是一名拥有10年教学经验的智能备课助手。以下是之前的对话记录，请根据对话历史回答最新的问题。\n\n";
      
      // 添加历史对话
      recentMessages.forEach((msg, index) => {
        const isLastMessage = index === recentMessages.length - 1;
        if (msg.role === 'user') {
          prompt += isLastMessage ? 
            "【最新问题】教师: " + msg.content + "\n\n" : 
            "【历史对话】教师: " + msg.content + "\n\n";
        } else if (msg.role === 'assistant') {
          prompt += "【历史对话】AI教学助手: " + msg.content + "\n\n";
        }
      });
      
      // 添加指示
      prompt += "请直接回答最新问题，始终保持专业教育顾问的身份，提供具体且实用的教学建议。回答需包含教学策略建议、具体实施方案、资源推荐和评估建议。可以使用Markdown格式增强回复的可读性。";
      
      return prompt;
    }
  }
};
</script>

<style scoped>
.chat-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 85vh;
  font-family: Arial, sans-serif;
}

h1 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.model-selection {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.model-selection label {
  margin-right: 10px;
  font-weight: bold;
}

.model-selection select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  min-width: 200px;
}

.stream-toggle {
  display: flex;
  align-items: center;
  margin-left: 20px;
}

.stream-toggle label {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-right: 10px;
}

.stream-toggle input[type="checkbox"] {
  margin-right: 5px;
}

.stream-tip {
  font-size: 12px;
  color: #888;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.message {
  margin-bottom: 15px;
  padding: 10px 15px;
  border-radius: 8px;
  max-width: 80%;
  word-wrap: break-word;
  position: relative;
}

.user-message {
  background-color: #dcf8c6;
  margin-left: auto;
}

.ai-message {
  background-color: #ffffff;
  margin-right: auto;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.streaming-message {
  border: 1px dashed #4096ff;
  position: relative;
}

.stream-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: #f0f0f0;
  overflow: hidden;
}

.stream-progress-inner {
  height: 100%;
  background-color: #4096ff;
  transition: width 0.3s ease;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
  color: #666;
}

.message-content {
  white-space: pre-wrap;
}

/* Markdown样式 */
.message-content :deep(h1),
.message-content :deep(h2),
.message-content :deep(h3),
.message-content :deep(h4),
.message-content :deep(h5),
.message-content :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
  color: #2c3e50;
}

.message-content :deep(h1) {
  font-size: 1.5em;
}

.message-content :deep(h2) {
  font-size: 1.3em;
}

.message-content :deep(pre) {
  background-color: #f6f8fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
}

.message-content :deep(code) {
  background-color: #f6f8fa;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.message-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.message-content :deep(th),
.message-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.message-content :deep(th) {
  background-color: #f2f2f2;
}

.input-area {
  display: flex;
  gap: 10px;
}

textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  resize: vertical;
  min-height: 60px;
}

.send-button {
  background-color: #409EFF;
  color: white;
  border: none;
  padding: 0 20px;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover {
  background-color: #337ecc;
}

.send-button:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

/* 加载动画 */
.spinner {
  margin: 15px auto;
  width: 70px;
  text-align: center;
}

.spinner > div {
  width: 12px;
  height: 12px;
  background-color: #409EFF;
  border-radius: 100%;
  display: inline-block;
  animation: sk-bouncedelay 1.4s infinite ease-in-out both;
  margin: 0 3px;
}

.spinner .bounce1 {
  animation-delay: -0.32s;
}

.spinner .bounce2 {
  animation-delay: -0.16s;
}

@keyframes sk-bouncedelay {
  0%, 80%, 100% { 
    transform: scale(0);
  } 40% { 
    transform: scale(1.0);
  }
}
</style>