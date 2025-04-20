<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getChatCompletion, getChatCompletionStreaming, useGeminiWithSDK } from '@/api/asist'; // 移除不存在的getGeminiCompletionStreaming
import MarkdownIt from 'markdown-it';
import MarkdownItAbbr from 'markdown-it-abbr';
import MarkdownItAnchor from 'markdown-it-anchor';
import MarkdownItFootnote from 'markdown-it-footnote';
import MarkdownItHighlightjs from 'markdown-it-highlightjs';
import MarkdownItSub from 'markdown-it-sub';
import MarkdownItSup from 'markdown-it-sup';
import MarkdownItTasklists from 'markdown-it-task-lists';
import MarkdownItTOC from 'markdown-it-toc-done-right';
import 'highlight.js/styles/default.css';
// 导入用于生成Word文档的依赖
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import axios from 'axios';

// 课程列表
const courseList = ref([]);
const loading = ref(false);
const courseLoading = ref(true);

// 修改表单内容
const form = ref({
  selectedCourse: null, // 新增：选择的课程对象
  courseId: '', // 新增：选择的课程ID
  activities: '', // 保留：教学活动安排
  model: 'deepseek-ai/DeepSeek-V3',
  useStream: true // 控制是否使用流式API
});

const modelOptions = [
  { label: '快速响应', value: 'deepseek-ai/DeepSeek-V3' },
  { label: '深度思考', value: 'deepseek-ai/DeepSeek-R1' },
  { label: '高级', value: 'gemini-2.0-flash' }, // 添加Gemini模型选项
];

const designResult = ref('');
const generationProgress = ref(0);
const exporting = ref(false);

const markdownRender = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})
  .use(MarkdownItAbbr)
  .use(MarkdownItAnchor)
  .use(MarkdownItFootnote)
  .use(MarkdownItHighlightjs)
  .use(MarkdownItSub)
  .use(MarkdownItSup)
  .use(MarkdownItTasklists)
  .use(MarkdownItTOC);

// 获取用户的所有课程
const fetchCourses = async () => {
  courseLoading.value = true;
  try {
    const response = await axios.get('http://localhost:8080/assistant/courses', {
      params: { teacherId: 123456 } // 使用默认教师ID
    });
    
    if (response.data.success) {
      courseList.value = response.data.data || [];
    } else {
      ElMessage.error(response.data.message || '获取课程列表失败');
    }
  } catch (error) {
    ElMessage.error('获取课程列表失败: ' + (error.response?.data?.message || error.message));
    console.error(error);
  } finally {
    courseLoading.value = false;
  }
};

// 课程选择变更处理
const handleCourseChange = (courseId) => {
  const selectedCourse = courseList.value.find(course => course.courseId === courseId);
  if (selectedCourse) {
    form.value.selectedCourse = selectedCourse;
  }
};

const validateForm = () => {
  if (!form.value.courseId) {
    ElMessage.warning('请选择课程');
    return false;
  }
  if (!form.value.activities.trim()) {
    ElMessage.warning('请输入本节课教学活动安排');
    return false;
  }
  return true;
};

// 流式方式生成设计
const generateDesignWithStream = async (prompt) => {
  designResult.value = '<div class="streaming-result">正在生成中...</div>'; // 初始内容
  generationProgress.value = 0;
  
  try {
    let contentSoFar = '';
    
    // 判断使用哪个API - 已经不使用Gemini流式API了
    if (form.value.model === 'gemini-2.0-flash') {
      // 使用Gemini SDK方法，只是在UI上模拟流式效果
      await generateDesignWithGeminiSDK(prompt);
      return; // 直接返回，避免后续代码执行
    } else {
      // 使用DeepSeek API
      await getChatCompletionStreaming(
        prompt, 
        form.value.model, 
        (chunk, fullContent) => {
          contentSoFar = fullContent;
          
          try {
            // 尝试渲染累积的内容为HTML
            const cleanContent = contentSoFar
              .replace(/<\/?[^>]+(>|$)/g, '') // 移除HTML标签
              .replace(/```\s*(\w+)\s*/g, '```$1\n'); // 修复代码块格式
              
            const renderedHtml = markdownRender.render(cleanContent);
            designResult.value = renderedHtml;
            
            // 更新进度指示器
            generationProgress.value = Math.min(95, generationProgress.value + 1);
          } catch (renderError) {
            console.error('渲染Markdown失败', renderError);
            // 渲染失败时回退到纯文本显示
            designResult.value = `<pre>${contentSoFar}</pre>`;
          }
        }
      );
    }
    
    // 完成生成
    generationProgress.value = 100;
    ElMessage.success('教学设计生成成功');
  } catch (error) {
    console.error('生成教学设计失败', error);
    ElMessage.error('生成失败，请重试');
  }
};

// 使用SDK方式调用Gemini
const generateDesignWithGeminiSDK = async (prompt) => {
  try {
    designResult.value = '<div class="streaming-result">正在生成中...</div>'; // 初始状态
    generationProgress.value = 30; // 初始进度
    
    // 使用SDK调用Gemini
    const content = await useGeminiWithSDK(prompt, form.value.model);
    
    // 更新进度
    generationProgress.value = 90;
    
    // 处理返回内容
    try {
      const cleanContent = content;

      
      const renderedHtml = markdownRender.render(cleanContent);
      designResult.value = renderedHtml;
      
      // 完成进度
      generationProgress.value = 100;
      ElMessage.success('教学设计生成成功');
    } catch (renderError) {
      console.error('渲染Markdown失败', renderError);
      // 渲染失败时回退到纯文本显示
      designResult.value = `<pre>${content}</pre>`;
      ElMessage.warning('内容已生成，但格式化显示失败');
    }
  } catch (error) {
    console.error('生成教学设计失败', error);
    ElMessage.error('生成失败，请重试');
  }
};

// 非流式方式生成设计
const generateDesignWithoutStream = async (prompt) => {
  try {
    // 使用getChatCompletion替代原来的函数
    const content = await getChatCompletion(prompt, form.value.model);
    
    // 延迟处理，避免UI阻塞
    setTimeout(() => {
      try {
        // 处理返回内容 - 清理可能导致渲染问题的内容
        let formattedContent = content
          .replace(/<\/?[^>]+(>|$)/g, '') // 移除HTML标签
          .replace(/```\s*(\w+)\s*/g, '```$1\n') // 修复代码块格式
          .trim();
        
        // 使用markdown-it进行渲染
        const renderedHtml = markdownRender.render(formattedContent);
        designResult.value = renderedHtml;
        
        ElMessage.success('教学设计生成成功');
      } catch (renderError) {
        console.error('渲染Markdown失败', renderError);
        // 渲染失败时回退到纯文本显示
        designResult.value = `<pre>${content}</pre>`;
        ElMessage.warning('内容已生成，但格式化显示失败');
      }
    }, 100);
  } catch (error) {
    console.error('生成教学设计失败', error);
    ElMessage.error('生成失败，请重试');
  }
};

// 主要生成函数
const generateDesign = async () => {
  if (!validateForm()) return;
  
  loading.value = true;
  designResult.value = '';
  
  const selectedCourse = form.value.selectedCourse;
  
  const systemContent = `
你是一款专为辅助教师备课而设计的AI系统，请根据以下需求生成完整的教学设计、教学资源、练习题及个性化教学推荐方案，以帮助教师快速、高效地完成备课：


生成一份完整的教学设计，包括教学目标、教学内容、教学步骤等要素。
提供至少3个具体且可操作的互动环节，提升学生参与度和学习效果。
`;

  const userContent = `
你是一名资深教学设计师，请根据以下输入生成结构化教案：
【学科】${selectedCourse.courseName}
【教学目标】${selectedCourse.teachingObjectives || '提高学生对该主题的理解和掌握能力'}
【课程年级】${selectedCourse.gradeLevel}
【教科书】${selectedCourse.textbook || '标准教材'}
【课时主题】${form.value.activities}


输出要求：
1. 包含教学目标（三维目标）
2. 设计3个互动环节（需标注活动形式：小组讨论/实验探究/角色扮演等）
3. 时间分配精确到分钟
4. 标注重点难点突破策略
5. 使用标准Markdown格式呈现，特别注意表格、列表和代码块的正确格式
6. 不要使用HTML标签，使用纯Markdown语法
7. 不要在编程无关的教学内容提供代码
`;

  // 拼接提示词
  const prompt = systemContent + userContent;

  try {
    // 根据模型选择调用方式
    if (form.value.model === 'gemini-2.0-flash') {
      // 对于Gemini模型，使用SDK方法
      await generateDesignWithGeminiSDK(prompt);
    } else {
      // 对于DeepSeek模型，根据流式设置选择方法
      if (form.value.useStream) {
        await generateDesignWithStream(prompt);
      } else {
        await generateDesignWithoutStream(prompt);
      }
    }
  } finally {
    loading.value = false;
  }
};

// 修改为使用docx库的导出方法
const exportToWord = async () => {
  try {
    exporting.value = true;
    
    // 获取渲染后的内容
    const content = document.querySelector('.md-content').textContent || '';
    const selectedCourse = form.value.selectedCourse;
    
    // 创建文档
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: `${selectedCourse ? selectedCourse.courseName : '课程'}教学设计`,
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: `课时主题：${form.value.activities}`,
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: content,
            }),
          ],
        },
      ],
    });
    
    // 生成文件
    const buffer = await Packer.toBlob(doc);
    
    // 生成文件名
    const fileName = `${selectedCourse ? selectedCourse.courseName : '课程'}_教学设计_${new Date().toLocaleDateString().replace(/\//g, '-')}.docx`;
    
    // 保存文件
    saveAs(buffer, fileName);
    
    ElMessage.success('导出Word文档成功');
  } catch (error) {
    console.error('导出Word文档失败', error);
    ElMessage.error('导出Word文档失败，请重试');
  } finally {
    exporting.value = false;
  }
};

// 页面加载时获取课程列表
onMounted(() => {
  fetchCourses();
});
</script>

<template>
  <el-container class="design-container">
    <el-header>教学设计</el-header>
    <el-main>
      <el-form :model="form" label-position="top" class="design-form">
        <el-form-item label="选择课程">
          <el-select 
            v-model="form.courseId" 
            placeholder="请选择课程"
            :loading="courseLoading"
            :disabled="loading"
            style="width: 100%;"
            @change="handleCourseChange">
            <el-option
              v-for="course in courseList"
              :key="course.courseId"
              :label="course.courseName"
              :value="course.courseId">
              <div class="course-option">
                <span>{{ course.courseName }}</span>
                <span class="course-grade">{{ course.gradeLevel }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="本节课教学活动安排">
          <el-input 
            v-model="form.activities" 
            type="textarea"
            :rows="4"
            :disabled="loading"
            placeholder="请输入本节课的主题和教学活动安排">
          </el-input>
        </el-form-item>
        
        <el-form-item label="选择模型">
          <el-select 
            v-model="form.model" 
            placeholder="请选择AI模型"
            :disabled="loading"
            style="width: 100%;">
            <el-option
              v-for="item in modelOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        
        <!-- 流式生成开关 - 对Gemini模型禁用选择 -->
        <el-form-item label="流式生成">
          <el-switch 
            v-model="form.useStream" 
            :disabled="loading || form.model === 'gemini-2.0-flash'"
            active-text="开启"
            inactive-text="关闭">
          </el-switch>
          <div class="stream-tip">
            {{ form.model === 'gemini-2.0-flash' ? 
              '高级模型仅支持流式生成' : 
              '开启后可实时查看生成结果，推荐开启' }}
          </div>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            @click="generateDesign"
            :loading="loading"
            class="generate-btn">
            {{ loading ? '正在生成教学设计...' : '生成教学设计' }}
          </el-button>
        </el-form-item>
        
        <!-- 流式生成进度条 -->
        <el-form-item v-if="form.useStream && loading">
          <el-progress 
            :percentage="generationProgress" 
            :format="p => `${p}%`"
            :stroke-width="15"
            status="success">
          </el-progress>
        </el-form-item>
      </el-form>
      
      <transition name="fade">
        <div 
          v-if="designResult" 
          class="md-result"
          :class="{ 'blur-content': loading && !form.useStream }">
          <!-- 添加导出按钮区域 -->
          <div class="result-actions">
            <el-button 
              type="primary" 
              icon="Download"
              :loading="exporting"
              @click="exportToWord"
              size="default">
              {{ exporting ? '正在导出...' : '导出为Word' }}
            </el-button>
          </div>
          <div v-html="designResult" class="md-content"></div>
        </div>
      </transition>
    </el-main>
  </el-container>
</template>

<style scoped>
.design-container {
  max-width: 1200px;
  margin: 0 auto;
}

.el-header {
  font-size: 24px;
  font-weight: bold;
  padding: 20px 0;
  text-align: center;
}

.design-form {
  max-width: 800px;
  margin: 0 auto;
}

.generate-btn {
  width: 100%;
}

.md-result {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: #fff;
}

.blur-content {
  filter: blur(3px);
  opacity: 0.7;
}

.md-content {
  line-height: 1.6;
}

.md-content pre {
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow-x: auto;
}

.streaming-result {
  padding: 10px;
  background-color: #f9f9f9;
  border-left: 3px solid #4096ff;
}

.stream-tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 添加导出按钮区域样式 */
.result-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 15px;
}

/* 课程选择器样式 */
.course-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.course-grade {
  color: #909399;
  font-size: 12px;
}
</style>