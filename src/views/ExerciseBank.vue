<template>
  <div class="exercise-bank-container">
    <div class="form-container">
      <h2 class="page-title">练习题生成系统</h2>
      
      <el-form :model="formData" label-width="80px" class="exercise-form">
        <!-- 增加课程选择 -->
        <el-form-item label="课程">
          <el-select 
            v-model="formData.courseId" 
            placeholder="请选择课程" 
            @change="handleCourseChange"
            :loading="courseLoading"
            style="width: 100%;">
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
        
        <el-form-item label="知识点" required>
          <el-input v-model="formData.knowledgePoint" placeholder="请输入涉及到的知识点，如：光合作用"></el-input>
        </el-form-item>
        
        <el-form-item label="年级">
          <el-select v-model="formData.grade" placeholder="请选择年级">
            <el-option v-for="item in gradeOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="题目数量">
          <el-input-number v-model="formData.questionCount" :min="1" :max="20" placeholder="题目数量"></el-input-number>
        </el-form-item>
        
        <el-form-item label="难度">
          <el-select v-model="formData.difficulty" placeholder="请选择难度">
            <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="题型">
          <el-checkbox-group v-model="formData.questionTypes">
            <el-checkbox v-for="item in questionTypeOptions" :key="item.value" :label="item.value">{{ item.label }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="模型">
          <el-radio-group v-model="formData.model">
            <el-radio v-for="item in modelOptions" :key="item.value" :label="item.value">{{ item.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="generateExercises" :loading="loading">生成练习题</el-button>
          <el-button @click="resetForm">重置</el-button>
          <el-button type="success" @click="saveToWord" :disabled="!questions.length">保存到本地</el-button>
          <el-button type="info" @click="publishExercises" :loading="publishing" :disabled="!questions.length">保存到我的题库</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div v-if="loading" class="loading-container">
      <el-progress :percentage="generationProgress" :indeterminate="generationProgress === 0"></el-progress>
      <p>正在生成练习题，请稍候...</p>
    </div>
    
    <div v-if="questions.length > 0" class="result-container" ref="resultContainer">
      <h3>生成结果 - {{ knowledgePoint }}</h3>
      
      <div class="result-actions">
        <el-tag v-if="publishSuccess" type="success">已保存到题库</el-tag>
      </div>
      
      <div class="questions-list">
        <div v-for="(question, index) in questions" :key="index" class="question-item">
          <div class="question-header">
            <span class="question-id">{{ question.question_id }}</span>
            <span class="question-type">{{ getQuestionTypeLabel(question.question_type) }}</span>
            <span class="question-difficulty">{{ getDifficultyLabel(question.difficulty) }}</span>
            <span class="question-score">{{ question.score }}分</span>
          </div>
          
          <div class="question-content">{{ question.content }}</div>
          
          <div v-if="question.options && question.options.length" class="question-options">
            <div v-for="(option, optIndex) in question.options" :key="optIndex" class="option-item">{{ option }}</div>
          </div>
          
          <div class="question-answer">
            <strong>答案：</strong> {{ question.answer }}
          </div>
          
          <div class="question-explanation">
            <strong>解析：</strong> {{ question.explanation }}
          </div>
        </div>
      </div>
      
      <div class="summary">
        <p>总题数：{{ totalQuestions }}</p>
        <p>总分值：{{ totalScore }}</p>
      </div>
    </div>
    
    <el-dialog v-model="errorDialogVisible" title="错误提示" width="50%">
      <div class="error-content">
        <p>{{ errorMessage }}</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="errorDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="retryGeneration">重试</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 发布确认对话框 -->
    <el-dialog v-model="publishDialogVisible" title="保存到我的题库" width="30%">
      <p>确定要将生成的{{ questions.length }}道题目保存到题库吗？</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="publishDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmPublish" :loading="publishing">确认发布</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { getChatCompletion, useGeminiWithSDK } from '@/api/asist';
import { ElMessage } from 'element-plus';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import axios from 'axios';

// 课程列表
const courseList = ref([]);
const courseLoading = ref(false);
const selectedCourse = ref(null);
const publishing = ref(false);
const publishDialogVisible = ref(false);
const publishSuccess = ref(false);

// 表单数据
const formData = reactive({
  courseId: '',  // 新增：课程ID
  knowledgePoint: '',
  grade: '',
  difficulty: '',
  questionTypes: [],
  model: 'deepseek-ai/DeepSeek-V3',
  questionCount: 4 // 默认生成4道题目
});

// 各种选项
const gradeOptions = [
  { label: '小学', value: 'primary' },
  { label: '初中', value: 'junior' },
  { label: '高中', value: 'senior' },
  { label: '大学', value: 'college' }
];

const difficultyOptions = [
  { label: '简单', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '较难', value: 'hard' }
];

const questionTypeOptions = [
  { label: '选择题', value: 'choice' },
  { label: '填空题', value: 'fill' },
  { label: '简答题', value: 'short' },
  { label: '判断题', value: 'judge' }
];

const modelOptions = [
  { label: '快速响应', value: 'deepseek-ai/DeepSeek-V3' },
  { label: '深度思考', value: 'deepseek-ai/DeepSeek-R1' },
  { label: 'Google Gemini', value: 'gemini-2.0-flash' }
];

// 状态变量
const loading = ref(false);
const generationProgress = ref(0);
const questions = ref([]);
const knowledgePoint = ref('');
const totalQuestions = ref(0);
const totalScore = ref(0);
const errorDialogVisible = ref(false);
const errorMessage = ref('');
const rawJsonData = ref('');
const fixAttempts = ref(0);
const resultContainer = ref(null);

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

// 处理课程选择变更
const handleCourseChange = (courseId) => {
  const course = courseList.value.find(c => c.courseId === courseId);
  if (course) {
    selectedCourse.value = course;
    // 根据课程年级设置表单年级字段
    let grade = '';
    switch(course.gradeLevel) {
      case '小学':
        grade = 'primary';
        break;
      case '初中':
        grade = 'junior';
        break;
      case '高中':
        grade = 'senior';
        break;
      case '大学':
        grade = 'college';
        break;
    }
    formData.grade = grade;
  }
};

// 辅助函数
const getQuestionTypeLabel = (type) => {
  const typesMap = {
    '选择题': '选择题',
    '填空题': '填空题',
    '简答题': '简答题',
    '判断题': '判断题'
  };
  return typesMap[type] || type;
};

const getDifficultyLabel = (difficulty) => {
  const difficultyMap = {
    '简单': '简单',
    '中等': '中等',
    '困难': '较难'
  };
  return difficultyMap[difficulty] || difficulty;
};

// 生成练习题
const generateExercises = async () => {
  if (!formData.knowledgePoint) {
    ElMessage.warning('请输入知识点');
    return;
  }
  
  // 重置发布状态
  publishSuccess.value = false;
  
  loading.value = true;
  generationProgress.value = 10;
  fixAttempts.value = 0;
  questions.value = [];
  
  try {
    // 构建提示词
    const questionTypesText = formData.questionTypes.length > 0 
      ? `特别是${formData.questionTypes.map(type => {
          const option = questionTypeOptions.find(opt => opt.value === type);
          return option ? option.label : type;
        }).join('、')}` 
      : '';
    
    // 使用选定的课程信息
    const gradeText = selectedCourse.value 
      ? `年级/教育阶段：${selectedCourse.value.gradeLevel}` 
      : '';
    
    const courseText = selectedCourse.value 
      ? `课程：${selectedCourse.value.courseName}` 
      : '';
    
    const textbookText = selectedCourse.value && selectedCourse.value.textbook 
      ? `教材：${selectedCourse.value.textbook}` 
      : '';
    
    const difficultyText = formData.difficulty 
      ? `难度：${difficultyOptions.find(d => d.value === formData.difficulty).label}` 
      : '';
    
    const questionCountText = formData.questionCount 
      ? `题目数量：${formData.questionCount}道题` 
      : '';
    
    const prompt = `
# 智能题目生成系统提示词

您是一个专业的教育题目生成助手。根据用户输入的知识点，您需要生成高质量的教育测试题目。

## 输入要求

用户提供的信息：
1. ${courseText}
2. ${textbookText}
3. 知识点或主题：${formData.knowledgePoint}
4. ${gradeText}
5. ${difficultyText}
6. ${questionCountText}
7. 本次生成的题型要求有且只有题型：${questionTypesText}

## 您的任务

根据用户提供的知识点，生成${formData.questionCount}道教育题目，包括：
- 选择题
- 填空题
- 简答题
- 判断题

## 输出格式

您必须以严格的JSON格式输出，结构如下：

\`\`\`json
{
  "knowledge_point": "用户提供的知识点",
  "questions": [
    {
      "question_id": 1,
      "question_type": "选择题|填空题|简答题|判断题",
      "difficulty": "简单|中等|困难",
      "content": "题目内容",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"], // 仅选择题需要
      "answer": "正确答案",
      "explanation": "解题思路与解释",
      "score": 分值
    },
    // 更多题目...
  ],
  "total_questions": 题目总数,
  "total_score": 总分值
}
\`\`\`

## 注意事项

1. 确保生成的是合法的JSON格式，特别注意对象中最后一个属性后不应有逗号
2. 确保JSON数据中所有属性名和字符串值都使用双引号，不要使用单引号
3. 仅返回JSON数据，不要包含Markdown格式的反引号标记(\`\`\`)
4. 确保生成的题目在教育上有价值，能够检验学生对知识点的理解
5. 题目应当符合教育规范，没有政治、歧视等不当内容
`;

    generationProgress.value = 30;
    
    // 根据选择的模型调用不同的API
    let response;
    if (formData.model === 'gemini-2.0-flash') {
      // 使用Gemini API
      response = await useGeminiWithSDK(prompt, formData.model);
    } else {
      // 使用DeepSeek API
      response = await getChatCompletion(prompt, formData.model);
    }
    
    rawJsonData.value = response;
    
    generationProgress.value = 70;
    
    // 处理返回的JSON数据
    await processJsonData(response);
    
    generationProgress.value = 100;
  } catch (error) {
    console.error('生成练习题失败:', error);
    errorMessage.value = `生成练习题失败: ${error.message || error}`;
    errorDialogVisible.value = true;
  } finally {
    loading.value = false;
  }
};

// 处理JSON数据
const processJsonData = async (jsonText) => {
  try {
    // 尝试清理JSON字符串
    const cleanedJson = cleanJsonString(jsonText);
    const data = JSON.parse(cleanedJson);
    
    // 更新状态
    knowledgePoint.value = data.knowledge_point;
    questions.value = data.questions;
    totalQuestions.value = data.total_questions;
    totalScore.value = data.total_score;
    
    // 滚动到结果区域
    setTimeout(() => {
      if (resultContainer.value) {
        resultContainer.value.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  } catch (error) {
    console.error('JSON解析错误:', error);
    
    if (fixAttempts.value < 1) {
      await fixJsonFormat();
    } else {
      // 修复失败后，直接使用新的prompt重新生成内容
      await generatePlainTextContent();
    }
  }
};

// 清理JSON字符串
const cleanJsonString = (jsonText) => {
  // 移除可能的```json和```标记
  let cleaned = jsonText.replace(/```json/g, '').replace(/```/g, '');
  
  // 尝试找到JSON对象的开始和结束
  const startIndex = cleaned.indexOf('{');
  const endIndex = cleaned.lastIndexOf('}') + 1;
  
  if (startIndex !== -1 && endIndex !== -1) {
    cleaned = cleaned.substring(startIndex, endIndex);
  }
  
  return cleaned;
};

// 修复JSON格式
const fixJsonFormat = async () => {
  fixAttempts.value++;
  
  try {
    const prompt = `
之前生成的JSON数据格式有问题，无法被正确解析。请修复以下JSON数据中的错误，确保它是有效的标准JSON格式。
错误可能包括：缺少引号、属性名没有引号、使用了单引号而不是双引号、逗号使用不当或缺失等。请修改以下json数据使格式正确。

修复后只需返回修复好的json数据，无需回复其它内容。
${rawJsonData.value}
`;

    // 根据选择的模型调用不同的API
    let response;
    if (formData.model === 'gemini-2.0-flash') {
      // 使用Gemini API
      response = await useGeminiWithSDK(prompt, formData.model);
    } else {
      // 使用DeepSeek API
      response = await getChatCompletion(prompt, formData.model);
    }
    
    rawJsonData.value = response;
    await processJsonData(response);
  } catch (error) {
    console.error('修复JSON格式失败:', error);
    errorMessage.value = `修复JSON格式失败: ${error.message || error}`;
    errorDialogVisible.value = true;
  }
};

// 生成纯文本内容
const generatePlainTextContent = async () => {
  try {
    // 构建提示词
    const questionTypesText = formData.questionTypes.length > 0 
      ? `特别是${formData.questionTypes.map(type => {
          const option = questionTypeOptions.find(opt => opt.value === type);
          return option ? option.label : type;
        }).join('、')}` 
      : '';
    
    // 使用选定的课程信息
    const gradeText = selectedCourse.value 
      ? `年级/教育阶段：${selectedCourse.value.gradeLevel}` 
      : '';
    
    const courseText = selectedCourse.value 
      ? `课程：${selectedCourse.value.courseName}` 
      : '';
    
    const textbookText = selectedCourse.value && selectedCourse.value.textbook 
      ? `教材：${selectedCourse.value.textbook}` 
      : '';
    
    const difficultyText = formData.difficulty 
      ? `难度：${difficultyOptions.find(d => d.value === formData.difficulty).label}` 
      : '';
    
    const questionCountText = formData.questionCount 
      ? `${formData.questionCount}道题` 
      : '多道题';
    
    const prompt = `
请根据以下信息生成教育测试题目，直接以文本形式展示，不需要JSON格式：

1. ${courseText}
2. ${textbookText}
3. 知识点或主题：${formData.knowledgePoint}
4. ${gradeText}
5. ${difficultyText}
6. 题目数量：${questionCountText}
7. 题型偏好：${questionTypesText}

对于每个题目，请包含：
1. 题号和题型
2. 题目内容
3. 选项（如果是选择题）
4. 答案
5. 解析

请组织好题目之间的分隔，使内容清晰易读。不要使用markdown格式
`;

    // 根据选择的模型调用不同的API
    let response;
    if (formData.model === 'gemini-2.0-flash') {
      // 使用Gemini API
      response = await useGeminiWithSDK(prompt, formData.model);
    } else {
      // 使用DeepSeek API
      response = await getChatCompletion(prompt, formData.model);
    }
    
    // 直接展示生成的文本内容
    knowledgePoint.value = formData.knowledgePoint;
    questions.value = [{
      question_id: 1,
      question_type: '练习题集',
      difficulty: '混合',
      content: response,
      answer: '',
      explanation: '直接展示AI生成的内容',
      score: 0
    }];
    totalQuestions.value = 1;
    totalScore.value = 0;
    
    // 滚动到结果区域
    setTimeout(() => {
      if (resultContainer.value) {
        resultContainer.value.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  } catch (error) {
    console.error('生成内容失败:', error);
    errorMessage.value = `生成内容失败: ${error.message || error}`;
    errorDialogVisible.value = true;
  }
};

// 重试生成
const retryGeneration = () => {
  errorDialogVisible.value = false;
  generateExercises();
};

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    courseId: '',
    knowledgePoint: '',
    grade: '',
    difficulty: '',
    questionTypes: [],
    model: 'deepseek-ai/DeepSeek-V3',
    questionCount: 4
  });
  selectedCourse.value = null;
  questions.value = [];
  knowledgePoint.value = '';
  totalQuestions.value = 0;
  totalScore.value = 0;
  publishSuccess.value = false;
};

// 保存到本地Word文档
const saveToWord = async () => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: `练习题 - ${knowledgePoint.value}`,
            heading: HeadingLevel.HEADING_1,
          }),
          ...questions.value.flatMap(question => {
            const paragraphs = [];
            
            // 题目标题
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${question.question_id}. `,
                    bold: true,
                  }),
                  new TextRun({
                    text: `[${getQuestionTypeLabel(question.question_type)}] [${getDifficultyLabel(question.difficulty)}] [${question.score}分]`,
                  }),
                ],
              })
            );
            
            // 题目内容
            paragraphs.push(
              new Paragraph({
                text: question.content,
              })
            );
            
            // 选项（如果有）
            if (question.options && question.options.length) {
              question.options.forEach(option => {
                paragraphs.push(
                  new Paragraph({
                    text: option,
                    indent: {
                      left: 720, // 720单位约为0.5英寸
                    },
                  })
                );
              });
            }
            
            // 答案
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "答案：",
                    bold: true,
                  }),
                  new TextRun({
                    text: question.answer,
                  }),
                ],
              })
            );
            
            // 解析
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "解析：",
                    bold: true,
                  }),
                  new TextRun({
                    text: question.explanation,
                  }),
                ],
              })
            );
            
            // 添加空行
            paragraphs.push(new Paragraph({}));
            
            return paragraphs;
          }),
          
          // 总结
          new Paragraph({
            text: `总题数: ${totalQuestions.value}`,
          }),
          new Paragraph({
            text: `总分值: ${totalScore.value}`,
          }),
        ],
      }],
    });

    // 生成blob并保存
    const blob = await Packer.toBlob(doc);
    const courseName = selectedCourse.value ? `-${selectedCourse.value.courseName}` : '';
    saveAs(blob, `练习题${courseName}-${knowledgePoint.value}-${new Date().toISOString().slice(0, 10)}.docx`);
    
    ElMessage.success('保存成功!');
  } catch (error) {
    console.error('保存文档失败:', error);
    ElMessage.error(`保存文档失败: ${error.message || error}`);
  }
};

// 显示发布确认对话框
const publishExercises = () => {
  if (!questions.value.length) {
    ElMessage.warning('暂无题目可发布');
    return;
  }
  
  if (publishSuccess.value) {
    ElMessage.info('题目已发布，无需重复操作');
    return;
  }
  
  publishDialogVisible.value = true;
};

// 确认发布题目到数据库
const confirmPublish = async () => {
  publishing.value = true;
  
  try {
    // 计算发布成功的题目数量
    let successCount = 0;
    
    // 遍历题目，逐个发送到服务器
    for (const question of questions.value) {
      // 排除纯文本模式的展示题目
      if (question.question_type === '练习题集') {
        continue;
      }
      
      // 确保题型是正确的值
      let questionType = question.question_type;
      if (!['选择题', '填空题', '简答题', '判断题'].includes(questionType)) {
        // 将英文题型转换为中文
        switch(question.question_type.toLowerCase()) {
          case 'choice':
            questionType = '选择题';
            break;
          case 'fill':
            questionType = '填空题';
            break;
          case 'short':
            questionType = '简答题';
            break;
          case 'judge':
            questionType = '判断题';
            break;
          default:
            questionType = '选择题'; // 默认为选择题
        }
      }
      
      // 确保难度是正确的值
      let difficulty = question.difficulty;
      if (!['简单', '中等', '困难'].includes(difficulty)) {
        // 将英文难度转换为中文
        switch(difficulty.toLowerCase()) {
          case 'easy':
            difficulty = '简单';
            break;
          case 'medium':
            difficulty = '中等';
            break;
          case 'hard':
            difficulty = '困难';
            break;
          default:
            difficulty = '中等'; // 默认为中等难度
        }
      }
      
      // 最关键的部分：确保选项是正确的JSON字符串
      let optionsJson = '[]'; // 默认空数组的JSON字符串
      if (question.options && Array.isArray(question.options)) {
        try {
          optionsJson = JSON.stringify(question.options);
        } catch (e) {
          console.error('选项转换为JSON失败:', e);
        }
      }
      
      // 转换为后端接受的格式
      const questionData = {
        teacherId: 123456, // 固定教师ID
        questionType: questionType,
        difficulty: difficulty,
        content: question.content,
        options: optionsJson, // 这里传递JSON字符串
        answer: question.answer || "暂无答案",
        explanation: question.explanation || "暂无解析",
        score: question.score || 5,
        correctRate: 0, // 初始正确率
        knowledgePoint: knowledgePoint.value
        // 移除createdAt，让后端处理
      };
      
      console.log('发送题目数据:', JSON.stringify(questionData));
      
      try {
        const response = await axios.post('http://localhost:8080/assistant/questions', questionData);
        
        if (response.data && response.data.success) {
          successCount++;
        } else {
          console.error('发布题目失败:', response.data);
        }
      } catch (error) {
        console.error('发布题目失败:', error.response?.data || error.message);
      }
    }
    
    if (successCount > 0) {
      ElMessage.success(`成功发布 ${successCount} 道题目到题库`);
      publishSuccess.value = true;
    } else {
      ElMessage.warning('没有题目被成功发布');
    }
  } catch (error) {
    console.error('发布题目失败:', error);
    ElMessage.error(`发布题目失败: ${error.message || '未知错误'}`);
  } finally {
    publishing.value = false;
    publishDialogVisible.value = false;
  }
};

onMounted(() => {
  // 页面加载时获取课程列表
  fetchCourses();
});
</script>

<style>
.exercise-bank-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  margin-bottom: 20px;
  color: #303133;
}

.form-container {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.exercise-form {
  max-width: 800px;
}

.loading-container {
  margin: 20px 0;
  text-align: center;
}

.result-container {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  margin-top: 20px;
}

.result-container h3 {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 15px;
}

.questions-list {
  margin-bottom: 20px;
}

.question-item {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #ebeef5;
}

.question-header {
  display: flex;
  margin-bottom: 10px;
}

.question-id {
  font-weight: bold;
  margin-right: 10px;
}

.question-type,
.question-difficulty,
.question-score {
  margin-right: 15px;
  background-color: #f0f2f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.question-content {
  margin-bottom: 10px;
  line-height: 1.6;
}

.question-options {
  margin-bottom: 10px;
}

.option-item {
  margin-bottom: 5px;
  padding-left: 20px;
}

.question-answer,
.question-explanation {
  margin-top: 10px;
  line-height: 1.5;
}

.summary {
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

.error-content {
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
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

@media (max-width: 768px) {
  .exercise-form {
    width: 100%;
  }
}
</style>