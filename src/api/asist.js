import request from '@/utils/request';

/**
 * 流式获取大模型回复
 * @param {string} prompt - 提示词
 * @param {string} model - 模型名称
 * @param {Function} onChunkReceived - 每次接收到数据块时的回调函数
 * @returns {Promise<string>} - 完整的响应文本
 */
export function getChatCompletionStreaming(prompt, model = 'deepseek-ai/DeepSeek-V3', onChunkReceived) {
    const apiKey = 'sk-aegaewejgeslerqgtdkdykibursxeoyiioegicebkagyeuby'; 
    
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            stream: true, // 启用流式处理
            max_tokens: model.includes('DeepSeek-V3') ? 4096 : 8000, // 根据模型设置token限制
            temperature: 0.7,
            top_p: 0.7,
            top_k: 50,
            frequency_penalty: 0.5,
            n: 1,
            response_format: { type: "text" }
        })
    };

    return new Promise((resolve, reject) => {
        fetch('https://api.siliconflow.cn/v1/chat/completions', options)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`HTTP错误! 状态: ${response.status}, 详情: ${text}`);
                    });
                }
                
                if (!response.body) {
                    throw new Error('ReadableStream不可用');
                }
                
                // 创建读取器和解码器
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let fullContent = '';
                let buffer = ''; // 用于存储不完整的JSON字符串
                
                // 处理流的函数
                function processStream() {
                    return reader.read().then(({ done, value }) => {
                        // 如果流已经结束
                        if (done) {
                            resolve(fullContent);
                            return;
                        }
                        
                        // 解码二进制数据
                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;
                        
                        // 按行分割并处理每一行
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // 最后一行可能不完整，保存到buffer
                        
                        for (const line of lines) {
                            if (line.trim() === '') continue;
                            
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.slice(6).trim();
                                
                                // 特殊的结束标记
                                if (jsonStr === '[DONE]') {
                                    continue;
                                }
                                
                                try {
                                    const parsedData = JSON.parse(jsonStr);
                                    
                                    // 从delta中提取内容
                                    if (parsedData.choices && 
                                        parsedData.choices[0] && 
                                        parsedData.choices[0].delta && 
                                        parsedData.choices[0].delta.content) {
                                        
                                        const content = parsedData.choices[0].delta.content;
                                        fullContent += content;
                                        
                                        // 调用回调函数，将接收到的内容块传递出去
                                        if (typeof onChunkReceived === 'function') {
                                            onChunkReceived(content, fullContent);
                                        }
                                    }
                                } catch (e) {
                                    console.error('解析JSON出错:', e, 'Line:', jsonStr);
                                }
                            }
                        }
                        
                        // 继续处理流
                        return processStream();
                    }).catch(error => {
                        reject(error);
                    });
                }
                
                // 开始处理流
                return processStream();
            })
            .catch(error => {
                reject(error);
            });
    });
}

export function getChatCompletion(prompt, model = 'deepseek-ai/DeepSeek-V3') {
    // 使用有效的 API 密钥 - 请替换为您的实际密钥
    const apiKey = 'sk-aegaewejgeslerqgtdkdykibursxeoyiioegicebkagyeuby'; // 可能需要更新
    
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            max_tokens: model.includes('DeepSeek-V3') ? 4096 : 8000, // 根据模型设置token限制
            temperature: 0.7,
            top_p: 0.7,     // 添加官方文档中的参数
            top_k: 50,      // 添加官方文档中的参数
            frequency_penalty: 0.5, // 添加官方文档中的参数
            n: 1,           // 添加生成回复数量
            response_format: { type: "text" } // 添加响应格式
        })
    };

    return fetch('https://api.siliconflow.cn/v1/chat/completions', options)
        .then(response => {
            if (!response.ok) {
                // 更详细的错误处理
                return response.text().then(text => {
                    throw new Error(`HTTP error! status: ${response.status}, details: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("API 响应数据:", data); // 调试用，可以查看完整响应
            // 正确解析返回结果
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                throw new Error("API 响应格式不正确");
            }
        })
        .catch(err => {
            console.error('API 请求失败', err);
            throw err;
        });
}

/**
 * 获取课程详情
 * @param {number} courseId - 课程ID
 * @returns {Promise} - 返回课程详情
 */
export function getCourseDetails(courseId) {
    return request({
      url: `/assistant/courses/${courseId}`,
      method: 'get'
    });
  }
  
  /**
   * 获取课程学生列表
   * @param {number} courseId - 课程ID
   * @returns {Promise} - 返回课程学生列表
   */
  export function getCourseStudents(courseId) {
    return request({
      url: `/assistant/courses/${courseId}/students`,
      method: 'get'
    });
  }
  
  /**
   * 删除课程
   * @param {number} courseId - 课程ID
   * @returns {Promise} - 返回删除结果
   */
  export function deleteCourse(courseId) {
    return request({
      url: `/assistant/courses/${courseId}`,
      method: 'delete'
    });
  }
  

/**
 * 使用GoogleGenAI库直接调用Gemini API
 * @param {string} prompt - 提示词
 * @param {string} model - 模型名称，默认为gemini-2.0-flash
 * @returns {Promise<string>} - 返回AI回复的内容
 */
export async function useGeminiWithSDK(prompt, model = 'gemini-2.0-flash') {
  try {
    // 动态导入GoogleGenAI，避免在服务端渲染时报错
    const { GoogleGenAI } = await import('@google/genai');
    
    const apiKey = 'AIzaSyDjnD6Svk6uXlaN1qIqOH3qw-xbiXG6OnU';
    const genAI = new GoogleGenAI({ apiKey });
    
    // 直接按照官方文档格式调用
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt, // 直接传递prompt作为contents
    });
    
    // 返回结果文本
    return response.text;
  } catch (error) {
    console.error('Gemini SDK 调用失败:', error);
    throw error;
  }
}

/**
 * 使用Gemini模型生成PPT的JSON数据结构
 * @param {string} topic - PPT主题
 * @param {number} slideCount - 幻灯片数量
 * @param {string} model - 使用的模型，默认为gemini-2.0-flash
 * @returns {Promise<Object>} - 返回可用于pptxgenjs的JSON数据
 */
export async function generatePptJsonData(topic, slideCount = 5, model = 'gemini-2.0-flash') {
  try {
    const prompt = `
请创建一个JSON结构，用于使用pptxgen.js生成关于${topic}的PowerPoint演示文稿。演示文稿应包含${slideCount}张幻灯片，包括标题幻灯片、内容幻灯片和结论幻灯片。

JSON应遵循以下格式：
{
  "title": "演示文稿标题",
  "author": "作者姓名",
  "theme": "OFFICE_THEME",
  "slides": [
    {
      "title": "幻灯片标题",
      "subtitle": "幻灯片副标题",
      "content": [
        {
          "type": "text|image|chart|table",  // 元素类型
          "text": "文本内容（用于text类型）",
          "path": "图片URL（用于image类型）",
          "chartType": "bar|pie|line（用于chart类型）",
          "data": {}, // 图表数据结构（用于chart类型）
          "rows": [], // 表格数据（用于table类型）
          "options": {
            "x": 0, // 位置和大小（单位为英寸）
            "y": 0,
            "w": 0,
            "h": 0,
            // 其他格式选项，如fontSize、color等
          }
        }
      ],
      "notes": "此幻灯片的演讲者备注"
    }
  ]
}

请确保内容信息丰富、视觉上吸引人，并且结构良好，适合专业演示。在相关位置包括适当的图表、表格和建议的图片占位符，可以举一些例子来确保ppt讲解更生动形象。

[注意：请确保生成的是有效的JSON格式，只输出纯JSON，不要包含任何其他文本说明]`;

    // 使用已有的Gemini API接口获取JSON数据
    const jsonString = await useGeminiWithSDK(prompt, model);
    
    // 尝试解析JSON字符串
    try {
      // 查找JSON开始的位置（去除可能的前缀文本）
      const jsonStart = jsonString.indexOf('{');
      const jsonEnd = jsonString.lastIndexOf('}') + 1;
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const validJsonString = jsonString.substring(jsonStart, jsonEnd);
        const jsonData = JSON.parse(validJsonString);
        return jsonData;
      } else {
        throw new Error('无法识别有效的JSON结构');
      }
    } catch (parseError) {
      console.error('解析JSON失败:', parseError);
      throw new Error('生成的内容不是有效的JSON格式: ' + parseError.message);
    }
  } catch (error) {
    console.error('生成PPT JSON数据失败:', error);
    throw error;
  }
}

/**
 * 下载图片并转换为base64
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<string>} - 返回base64编码的图片数据
 */
export async function downloadImageAsBase64(imageUrl) {
  try {
    // 如果已经是base64数据，直接返回
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl;
    }
    
    // 否则下载图片并转换为base64
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`图片下载失败: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('下载图片失败:', error);
    // 返回默认占位图片
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNui8sowAAAAWdEVYdENyZWF0aW9uIFRpbWUAMDQvMTMvMTb/l7TpAAADE0lEQVR4nO3UsQ0AIADCMP5/GhdwNE6cEiZK2rGZeQfkrLUH4M8OIBCAQAQCEIhAAAIRCEAgAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQiEAAAgEIRCAAgQgEIBCBAAQiEIBABAIQyAOZ8wS9LRUIkQAAAABJRU5ErkJggg==';
  }
}