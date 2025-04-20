<template>
  <div class="assignment-detail">
    <div class="header">
      <el-page-header @back="goBack" :content="assignmentData?.assignment?.title || '作业详情'"></el-page-header>
    </div>
    
    <div v-if="loading" class="loading">
      <el-skeleton :rows="6" animated />
    </div>
    
    <div v-else-if="assignmentData" class="assignment-content">
      <!-- 作业基本信息卡片 -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <h2>作业信息</h2>
            <div>
              <!-- 暂时移除导出按钮 -->
              <el-button type="danger" size="small" @click="confirmDelete">删除作业</el-button>
            </div>
          </div>
        </template>
        
        <el-descriptions :column="1" border>
          <el-descriptions-item label="作业标题">{{ assignmentData.assignment.title }}</el-descriptions-item>
          <el-descriptions-item label="作业描述">{{ assignmentData.assignment.description || '无描述' }}</el-descriptions-item>
          <el-descriptions-item label="截止日期">{{ formatDate(assignmentData.assignment.deadline) }}</el-descriptions-item>
          <el-descriptions-item label="总分">{{ assignmentData.assignment.totalScore }}</el-descriptions-item>
          <el-descriptions-item label="发布日期">{{ formatDate(assignmentData.assignment.publishDate) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>
      
      <!-- 题目列表 -->
      <el-card class="questions-card">
        <template #header>
          <div class="card-header">
            <h2>题目列表</h2>
            <span class="question-count">共 {{ assignmentData.questions.length }} 题，总分 {{ assignmentData.assignment.totalScore }} 分</span>
          </div>
        </template>
        
        <div class="questions-list">
          <div v-for="(question, index) in assignmentData.questions" 
               :key="question.questionId" 
               class="question-item">
            <div class="question-header">
              <span class="question-index">第 {{ index + 1 }} 题</span>
              <el-tag size="small" :type="getQuestionTypeTag(question.questionType)">
                {{ question.questionType }}
              </el-tag>
              <el-tag size="small" :type="getDifficultyTag(question.difficulty)">
                {{ question.difficulty }}
              </el-tag>
              <span class="question-score">{{ question.score }} 分</span>
            </div>
            
            <div class="question-content" v-html="question.content"></div>
            
            <!-- 选项（如果是选择题） -->
            <div v-if="question.options && hasOptions(question.options)" class="question-options">
              <div v-for="(option, optIndex) in parseOptions(question.options)" 
                   :key="optIndex" 
                   class="option-item">
                {{ option }}
              </div>
            </div>
          </div>
        </div>
      </el-card>
      
      <!-- 学生提交情况（未来扩展） -->
      <el-card class="submissions-card">
        <template #header>
          <div class="card-header">
            <h2>提交情况</h2>
          </div>
        </template>
        
        <el-empty description="暂无学生提交"></el-empty>
      </el-card>
    </div>
    
    <div v-else class="error-state">
      <el-empty description="未找到作业信息"></el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox, ElMessage } from 'element-plus';
import axios from 'axios';
// 移除PDF相关导入
// import jsPDF from 'jspdf';
// import 'jspdf-autotable';

const route = useRoute();
const router = useRouter();
const assignmentId = parseInt(route.params.id, 10);
const loading = ref(true);
const assignmentData = ref(null);

// 获取作业详情
const fetchAssignmentDetails = async () => {
  loading.value = true;
  try {
    const response = await axios.get(`http://localhost:8080/assistant/assignments/${assignmentId}`);
    
    if (response.data && response.data.success) {
      assignmentData.value = response.data.data;
    } else {
      ElMessage.error(response.data?.message || '获取作业详情失败');
    }
  } catch (error) {
    ElMessage.error('获取作业详情失败: ' + (error.response?.data?.message || error.message));
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 根据题目类型获取标签类型
const getQuestionTypeTag = (type) => {
  const typesMap = {
    '选择题': 'primary',
    '填空题': 'success',
    '简答题': 'warning',
    '判断题': 'info'
  };
  return typesMap[type] || 'default';
};

// 根据难度获取标签类型
const getDifficultyTag = (difficulty) => {
  const difficultyMap = {
    '简单': 'success',
    '中等': 'warning',
    '困难': 'danger'
  };
  return difficultyMap[difficulty] || 'info';
};

// 检查选项是否有效
const hasOptions = (options) => {
  if (!options) return false;
  
  let parsedOptions;
  try {
    if (typeof options === 'string') {
      parsedOptions = JSON.parse(options);
    } else {
      parsedOptions = options;
    }
    
    return Array.isArray(parsedOptions) && parsedOptions.length > 0;
  } catch (error) {
    console.error('解析选项错误:', error);
    return false;
  }
};

// 解析选项
const parseOptions = (options) => {
  if (!options) return [];
  
  try {
    if (typeof options === 'string') {
      return JSON.parse(options);
    } else if (Array.isArray(options)) {
      return options;
    }
    return [];
  } catch (error) {
    console.error('解析选项错误:', error);
    return [];
  }
};

// 移除PDF导出功能
// const exportToPdf = () => { ... }

// 确认删除作业
const confirmDelete = () => {
  ElMessageBox.confirm('确定要删除这个作业吗？此操作不可恢复。', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    deleteAssignment();
  }).catch(() => {});
};

// 删除作业
const deleteAssignment = async () => {
  try {
    const response = await axios.delete(`http://localhost:8080/assistant/assignments/${assignmentId}`);
    
    if (response.data && response.data.success) {
      ElMessage.success('作业已成功删除');
      
      // 返回课程详情页
      const courseId = assignmentData.value.assignment.courseId;
      router.push(`/course/${courseId}`);
    } else {
      ElMessage.error(response.data?.message || '删除作业失败');
    }
  } catch (error) {
    ElMessage.error('删除作业失败: ' + (error.response?.data?.message || error.message));
    console.error(error);
  }
};

// 返回
const goBack = () => {
  // 返回课程详情页
  if (assignmentData.value && assignmentData.value.assignment) {
    router.push(`/course/${assignmentData.value.assignment.courseId}`);
  } else {
    router.go(-1);
  }
};

onMounted(() => {
  // 尝试从路由状态获取作业数据
  if (route.state && route.state.assignmentData) {
    assignmentData.value = route.state.assignmentData;
    loading.value = false;
  } else {
    // 没有状态数据时从API获取
    fetchAssignmentDetails();
  }
});
</script>

<style scoped>
.assignment-detail {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  margin-bottom: 20px;
}

.assignment-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card, .questions-card, .submissions-card {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.question-count {
  color: #606266;
  font-size: 14px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-item {
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.question-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

.question-index {
  font-weight: bold;
}

.question-score {
  margin-left: auto;
  color: #409eff;
  font-weight: bold;
}

.question-content {
  margin-bottom: 10px;
  line-height: 1.6;
}

.question-options {
  padding-left: 20px;
}

.option-item {
  margin-bottom: 5px;
}

.loading, .error-state {
  margin-top: 20px;
}
</style>
