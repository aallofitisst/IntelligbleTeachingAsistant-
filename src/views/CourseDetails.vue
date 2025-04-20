<template>
  <div class="course-details">
    <div class="header">
        <el-page-header @back="goBack" :content="courseData?.courseName || '课程详情'"></el-page-header>
    </div>
    
    <div v-if="loading" class="loading">
      <el-skeleton :rows="6" animated />
    </div>
    
    <div v-else-if="courseData" class="course-content">
      <el-card class="course-info-card">
        <template #header>
          <div class="card-header">
            <h2>课程信息</h2>
            <div class="header-actions">
              <el-button type="primary" size="small" @click="editCourse">编辑课程</el-button>
              <el-button type="danger" size="small" @click="confirmDelete">删除课程</el-button>
            </div>
          </div>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="课程名称">{{ courseData.courseName }}</el-descriptions-item>
          <el-descriptions-item label="教科书">{{ courseData.textbook || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="年级">{{ courseData.gradeLevel }}</el-descriptions-item>
          <el-descriptions-item label="课程码">{{ courseData.courseCode }}</el-descriptions-item>
          <el-descriptions-item label="教学目标">{{ courseData.teachingObjectives || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(courseData.createdAt) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>
      
      <!-- 作业管理部分 -->
      <el-card class="assignments-card">
        <template #header>
          <div class="card-header">
            <h2>作业管理</h2>
            <el-button type="primary" size="small" @click="createAssignment">创建作业</el-button>
          </div>
        </template>
        
        <div v-if="assignmentsLoading" class="loading-assignments">
          <el-skeleton :rows="3" animated />
        </div>
        <el-empty v-else-if="!assignments.length" description="暂无作业"></el-empty>
        <el-table
          v-else
          :data="assignments"
          border
          style="width: 100%">
          <el-table-column prop="title" label="作业标题" min-width="150"></el-table-column>
          <el-table-column prop="description" label="作业描述" min-width="200"></el-table-column>
          <el-table-column label="发布时间" width="120">
            <template #default="scope">
              {{ formatDate(scope.row.publishDate) }}
            </template>
          </el-table-column>
          <el-table-column label="截止日期" width="120">
            <template #default="scope">
              {{ formatDate(scope.row.deadline) }}
            </template>
          </el-table-column>
          <el-table-column prop="totalScore" label="总分" width="80"></el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="scope">
              <el-button
                size="small"
                @click="viewAssignmentDetail(scope.row.assignmentId)"
              >查看</el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteAssignment(scope.row.assignmentId)"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      
      <!-- 学生列表部分 -->
      <el-card class="students-card">
        <template #header>
          <div class="card-header">
            <h2>学生列表</h2>
            <el-button type="primary" size="small" @click="importStudents">导入学生</el-button>
          </div>
        </template>
        
        <div v-if="studentsLoading" class="loading-students">
          <el-skeleton :rows="3" animated />
        </div>
        <el-empty v-else-if="!students.length" description="暂无学生加入此课程"></el-empty>
        <el-table
          v-else
          :data="students"
          border
          style="width: 100%"
          row-key="studentId"
          :expand-row-keys="expandedRows"
          @expand-change="handleExpandChange"
        >
          <el-table-column type="expand">
            <template #default="props">
              <div class="learning-analysis">
                <h3>学情分析</h3>
                <div class="analysis-content">
                  <div class="analysis-item">
                    <h4>学习进度</h4>
                    <el-progress :percentage="getRandomProgress()" :format="format" />
                  </div>
                  <div class="analysis-item">
                    <h4>课堂参与度</h4>
                    <el-rate v-model="props.row.participation" disabled show-score text-color="#ff9900" />
                  </div>
                  <div class="analysis-item">
                    <h4>知识掌握情况</h4>
                    <el-progress :percentage="getRandomProgress()" :color="customColorMethod" :format="format" />
                  </div>
                </div>
                <div class="analysis-summary">
                  <p>总体评价：该学生近期学习{{['积极', '一般', '需要关注'][Math.floor(Math.random() * 3)]}}，
                    建议{{['多进行课堂互动', '适当增加课后练习', '注重基础知识巩固', '加强知识点串联理解'][Math.floor(Math.random() * 4)]}}。</p>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="studentId" label="学生ID" width="120"></el-table-column>
          <el-table-column prop="studentName" label="姓名" width="120">
            <template #default="scope">
              {{ scope.row.studentName || `学生${scope.row.studentId}` }}
            </template>
          </el-table-column>
          <el-table-column prop="joinDate" label="加入日期">
            <template #default="scope">
              {{ formatDate(scope.row.joinDate) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="scope">
              <el-button
                size="small"
                @click="viewStudentDetail(scope.row.studentId)"
              >查看</el-button>
              <el-button
                size="small"
                type="danger"
                @click="removeStudent(scope.row.studentId)"
              >移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
    
    <div v-else class="error-state">
      <el-empty description="未找到课程信息"></el-empty>
    </div>
    
    <!-- 创建作业对话框 -->
    <el-dialog 
      v-model="assignmentDialogVisible" 
      title="创建作业" 
      width="800px">
      <el-form :model="assignmentForm" label-width="100px" ref="assignmentFormRef">
        <el-form-item label="作业标题" prop="title" :rules="[{required: true, message: '请输入作业标题', trigger: 'blur'}]">
          <el-input v-model="assignmentForm.title" placeholder="请输入作业标题"></el-input>
        </el-form-item>
        <el-form-item label="作业描述" prop="description">
          <el-input v-model="assignmentForm.description" type="textarea" :rows="3" placeholder="请输入作业描述"></el-input>
        </el-form-item>
        <el-form-item label="截止日期" prop="deadline" :rules="[{required: true, message: '请选择截止日期', trigger: 'change'}]">
          <el-date-picker v-model="assignmentForm.deadline" type="datetime" placeholder="选择截止日期和时间"></el-date-picker>
        </el-form-item>
        
        <!-- 选择题目部分 -->
        <el-divider content-position="center">选择题目</el-divider>
        
        <div class="question-filters">
          <el-select v-model="questionFilters.questionType" placeholder="题目类型" clearable>
            <el-option label="选择题" value="选择题"></el-option>
            <el-option label="填空题" value="填空题"></el-option>
            <el-option label="简答题" value="简答题"></el-option>
            <el-option label="判断题" value="判断题"></el-option>
          </el-select>
          <el-select v-model="questionFilters.difficulty" placeholder="难度" clearable>
            <el-option label="简单" value="简单"></el-option>
            <el-option label="中等" value="中等"></el-option>
            <el-option label="困难" value="困难"></el-option>
          </el-select>
          <el-input
            v-model="questionFilters.knowledgePoint"
            placeholder="知识点"
            clearable
            style="width: 180px;"
          ></el-input>
          <el-button type="primary" @click="searchQuestions">搜索</el-button>
        </div>
        
        <div v-if="questionsLoading" class="loading-questions">
          <el-skeleton :rows="3" animated />
        </div>
        <el-table
          v-else
          :data="questions"
          border
          style="width: 100%; margin-bottom: 20px;"
          @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="questionType" label="题型" width="100"></el-table-column>
          <el-table-column prop="content" label="题目内容">
            <template #default="scope">
              <div v-html="scope.row.content"></div>
            </template>
          </el-table-column>
          <el-table-column prop="difficulty" label="难度" width="80"></el-table-column>
          <el-table-column prop="knowledgePoint" label="知识点" width="120"></el-table-column>
          <el-table-column label="分值" width="100">
            <template #default="scope">
              <el-input-number 
                v-model="scope.row.assignmentScore" 
                :min="1" 
                :max="100" 
                :precision="0" 
                size="small">
              </el-input-number>
            </template>
          </el-table-column>
        </el-table>
        
        <el-divider content-position="center">已选题目 ({{ selectedQuestions.length }})</el-divider>
        
        <el-table
          v-if="selectedQuestions.length > 0"
          :data="selectedQuestions"
          border
          style="width: 100%; margin-bottom: 20px;">
          <el-table-column prop="questionType" label="题型" width="100"></el-table-column>
          <el-table-column prop="content" label="题目内容">
            <template #default="scope">
              <div v-html="scope.row.content"></div>
            </template>
          </el-table-column>
          <el-table-column prop="assignmentScore" label="分值" width="80"></el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="scope">
              <el-button
                size="small"
                type="danger"
                @click="removeSelectedQuestion(scope.$index)"
              >移除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="未选择题目"></el-empty>
        
        <div class="total-score">
          总分: {{ calculateTotalScore() }}
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="assignmentDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAssignment" :disabled="selectedQuestions.length === 0">
            发布作业
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox, ElMessage } from 'element-plus';
import axios from 'axios';

export default {
  name: 'CourseDetails',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const courseId = parseInt(route.params.id, 10);
    const loading = ref(true);
    const studentsLoading = ref(true);
    const assignmentsLoading = ref(true);
    const questionsLoading = ref(false);
    const courseData = ref(null);
    const students = ref([]);
    const assignments = ref([]);
    const questions = ref([]);
    const expandedRows = ref([]);
    const assignmentDialogVisible = ref(false);
    const assignmentFormRef = ref(null);
    const selectedQuestions = ref([]);
    
    const assignmentForm = ref({
      title: '',
      description: '',
      deadline: '',
      courseId: courseId
    });
    
    const questionFilters = ref({
      questionType: '',
      difficulty: '',
      knowledgePoint: ''
    });
    
    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    };
    
    // 获取课程详情
    const fetchCourseDetails = async () => {
      loading.value = true;
      try {
        const response = await axios.get(`http://localhost:8080/assistant/courses/${courseId}/course`);
        
        if (response.data && response.data.success) {
          courseData.value = response.data.data;
        } else {
          ElMessage.error(response.data?.message || '获取课程详情失败');
        }
      } catch (error) {
        ElMessage.error('获取课程详情失败: ' + (error.response?.data?.message || error.message));
        console.error(error);
      } finally {
        loading.value = false;
      }
    };
    
    // 获取课程学生列表
    const fetchStudents = async () => {
      studentsLoading.value = true;
      try {
        const response = await axios.get(`http://localhost:8080/assistant/courses/${courseId}/students`);
        
        if (response.data && response.data.success) {
          students.value = (response.data.data || []).map(student => ({
            ...student,
            participation: 3 + Math.floor(Math.random() * 3)
          }));
        } else {
          ElMessage.error(response.data?.message || '获取学生列表失败');
        }
      } catch (error) {
        ElMessage.error('获取学生列表失败: ' + (error.response?.data?.message || error.message));
        console.error(error);
      } finally {
        studentsLoading.value = false;
      }
    };
    
    // 获取课程作业列表
    const fetchAssignments = async () => {
      assignmentsLoading.value = true;
      try {
        const response = await axios.get(`http://localhost:8080/assistant/courses/${courseId}/assignments`);
        
        if (response.data && response.data.success) {
          assignments.value = response.data.data || [];
        } else {
          ElMessage.error(response.data?.message || '获取作业列表失败');
        }
      } catch (error) {
        ElMessage.error('获取作业列表失败: ' + (error.response?.data?.message || error.message));
        console.error(error);
      } finally {
        assignmentsLoading.value = false;
      }
    };
    
    // 搜索题目
    const searchQuestions = async () => {
      questionsLoading.value = true;
      try {
        const params = {
          teacherId: 123456,
        };
        
        if (questionFilters.value.questionType) {
          params.questionType = questionFilters.value.questionType;
        }
        
        if (questionFilters.value.difficulty) {
          params.difficulty = questionFilters.value.difficulty;
        }
        
        if (questionFilters.value.knowledgePoint) {
          params.knowledgePoint = questionFilters.value.knowledgePoint;
        }
        
        console.log('搜索题目参数:', params);
        
        const response = await axios.get('http://localhost:8080/assistant/questions', { params });
        
        if (response.data && response.data.success) {
          questions.value = (response.data.data || []).map(q => ({
            ...q,
            assignmentScore: q.score || 5
          }));
          console.log('题目数据:', questions.value);
        } else {
          ElMessage.error(response.data?.message || '获取题目列表失败');
        }
      } catch (error) {
        console.error('搜索题目错误:', error);
        ElMessage.error('获取题目列表失败: ' + (error.response?.data?.message || error.message));
      } finally {
        questionsLoading.value = false;
      }
    };
    
    // 处理题目选择变化
    const handleSelectionChange = (selectedItems) => {
      const newSelected = selectedItems.filter(item => 
        !selectedQuestions.value.some(q => q.questionId === item.questionId)
      );
      
      if (newSelected.length > 0) {
        selectedQuestions.value = [...selectedQuestions.value, ...newSelected];
      }
    };
    
    // 移除已选题目
    const removeSelectedQuestion = (index) => {
      selectedQuestions.value.splice(index, 1);
    };
    
    // 计算总分
    const calculateTotalScore = () => {
      return selectedQuestions.value.reduce((sum, q) => sum + (q.assignmentScore || 0), 0);
    };
    
    // 创建作业
    const createAssignment = () => {
      assignmentForm.value = {
        title: '',
        description: '',
        deadline: '',
        courseId: courseId
      };
      selectedQuestions.value = [];
      questions.value = [];
      questionFilters.value = {
        questionType: '',
        difficulty: '',
        knowledgePoint: ''
      };
      
      assignmentDialogVisible.value = true;
      
      searchQuestions();
    };
    
    // 提交作业
    const submitAssignment = async () => {
      if (!assignmentForm.value.title || !assignmentForm.value.deadline) {
        ElMessage.warning('请填写完整的作业信息');
        return;
      }
      
      if (selectedQuestions.value.length === 0) {
        ElMessage.warning('请至少选择一道题目');
        return;
      }
      
      try {
        // 确保日期是ISO格式字符串，避免发送Date对象
        const deadline = assignmentForm.value.deadline instanceof Date 
          ? assignmentForm.value.deadline.toISOString() 
          : assignmentForm.value.deadline;
        
        const assignmentData = {
          title: assignmentForm.value.title,
          description: assignmentForm.value.description || '',
          deadline: deadline,
          courseId: Number(courseId),
          totalScore: calculateTotalScore()
        };
        
        console.log('提交作业数据:', JSON.stringify(assignmentData));
        
        const response = await axios.post('http://localhost:8080/assistant/assignments', assignmentData);
        
        if (response.data && response.data.success) {
          const assignmentId = response.data.data.assignmentId;
          
          if (!assignmentId) {
            ElMessage.error('创建作业失败: 未获取到有效的作业ID');
            return;
          }
          
          const questionList = selectedQuestions.value.map(q => ({
            questionId: Number(q.questionId),
            score: Number(q.assignmentScore)
          }));
          
          console.log('添加题目到作业:', assignmentId, JSON.stringify(questionList));
          
          try {
            const addQuestionsResponse = await axios.post(
              `http://localhost:8080/assistant/assignments/${assignmentId}/questions`, 
              questionList
            );
            
            if (addQuestionsResponse.data && addQuestionsResponse.data.success) {
              ElMessage.success('作业创建成功');
              assignmentDialogVisible.value = false;
              fetchAssignments();
              
              // 改为只提示创建成功，不跳转到详情页
              // viewAssignmentDetail(assignmentId);
            } else {
              await axios.delete(`http://localhost:8080/assistant/assignments/${assignmentId}`);
              ElMessage.error(addQuestionsResponse.data?.message || '添加题目失败');
            }
          } catch (error) {
            console.error('添加题目错误:', error);
            ElMessage.warning('题目添加失败，但作业已创建');
            assignmentDialogVisible.value = false;
            fetchAssignments();
          }
        } else {
          ElMessage.error(response.data?.message || '创建作业失败');
        }
      } catch (error) {
        console.error('创建作业错误:', error);
        // 增强错误信息显示
        if (error.response && error.response.data) {
          console.error('服务器返回的错误信息:', error.response.data);
          ElMessage.error('创建作业失败: ' + (error.response.data.message || error.message));
        } else {
          ElMessage.error('创建作业失败: ' + error.message);
        }
      }
    };
    
    // 查看作业详情
    const viewAssignmentDetail = async (assignmentId) => {
      try {
        const response = await axios.get(`http://localhost:8080/assistant/assignments/${assignmentId}`);
        
        if (response.data && response.data.success) {
          const assignmentDetails = response.data.data;
          router.push({
            name: 'assignment-detail',
            params: { id: assignmentId },
            state: { assignmentData: assignmentDetails }
          });
        } else {
          ElMessage.warning(response.data?.message || '获取作业详情失败');
        }
      } catch (error) {
        console.error('获取作业详情错误:', error);
        ElMessage.error('获取作业详情失败: ' + (error.response?.data?.message || error.message));
      }
    };
    
    // 移除学生
    const removeStudent = async (studentId) => {
      ElMessageBox.confirm('确定要将该学生从课程中移除吗？', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          const response = await axios.delete(`http://localhost:8080/assistant/courses/${courseId}/students/${studentId}`);
          
          if (response.data && response.data.success) {
            ElMessage.success(`已将学生 ${studentId} 移出课程`);
            // 更新学生列表
            students.value = students.value.filter(s => s.studentId !== studentId);
          } else {
            ElMessage.error(response.data?.message || '移除学生失败');
          }
        } catch (error) {
          ElMessage.error('移除学生失败: ' + (error.response?.data?.message || error.message));
          console.error(error);
        }
      }).catch(() => {});
    };
    
    // 查看学生详情
    const viewStudentDetail = (studentId) => {
      // 这里添加查看学生详情的逻辑
      ElMessage.info(`查看学生${studentId}的详细信息功能正在开发中`);
      // 未来可以跳转到学生详情页
      // router.push({
      //   name: 'student-detail',
      //   params: { id: studentId, courseId: courseId }
      // });
    };
    
    // 返回课程列表
    const goBack = () => {
      router.push('/course');
    };
    
    // 编辑课程
    const editCourse = () => {
      ElMessage.info('编辑课程功能正在开发中');
    };
    
    // 删除课程确认
    const confirmDelete = () => {
      ElMessageBox.confirm('确定要删除这个课程吗？此操作不可恢复。', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteCurrentCourse();
      }).catch(() => {
      });
    };
    
    // 删除课程
    const deleteCurrentCourse = async () => {
      try {
        const response = await axios.delete(`http://localhost:8080/assistant/courses/${courseId}`);
        
        if (response.data && response.data.success) {
          ElMessage.success('课程已成功删除');
          router.push('/course');
        } else {
          ElMessage.error(response.data?.message || '删除课程失败');
        }
      } catch (error) {
        ElMessage.error('删除课程失败: ' + (error.response?.data?.message || error.message));
        console.error(error);
      }
    };
    
    // 删除作业
    const deleteAssignment = (assignmentId) => {
      ElMessageBox.confirm('确定要删除这个作业吗？此操作不可恢复。', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          const response = await axios.delete(`http://localhost:8080/assistant/assignments/${assignmentId}`);
          
          if (response.data && response.data.success) {
            ElMessage.success('作业已成功删除');
            fetchAssignments();
          } else {
            ElMessage.error(response.data?.message || '删除作业失败');
          }
        } catch (error) {
          ElMessage.error('删除作业失败: ' + (error.response?.data?.message || error.message));
          console.error(error);
        }
      }).catch(() => {
      });
    };
    
    // 导入学生
    const importStudents = () => {
      ElMessage.info('导入学生功能正在开发中');
    };
    
    // 展开/收起行
    const handleExpandChange = (row, expandedRows) => {
      if (expandedRows.length > 0) {
        expandedRows.value = [row.studentId];
      } else {
        expandedRows.value = [];
      }
    };
    
    // 随机进度数据（用于演示）
    const getRandomProgress = () => {
      return Math.floor(Math.random() * 60) + 40;
    };
    
    // 进度条显示格式
    const format = (percentage) => {
      return percentage + '%';
    };
    
    // 进度条颜色变化方法
    const customColorMethod = (percentage) => {
      if (percentage < 60) {
        return '#f56c6c';
      } else if (percentage < 80) {
        return '#e6a23c';
      } else {
        return '#67c23a';
      }
    };
    
    onMounted(() => {
      fetchCourseDetails();
      fetchStudents();
      fetchAssignments();
    });
    
    return {
      loading,
      studentsLoading,
      assignmentsLoading,
      questionsLoading,
      courseData,
      students,
      assignments,
      questions,
      expandedRows,
      assignmentDialogVisible,
      assignmentForm,
      assignmentFormRef,
      selectedQuestions,
      questionFilters,
      goBack,
      editCourse,
      confirmDelete,
      formatDate, // 添加这一行来导出formatDate函数
      removeStudent,
      viewStudentDetail,
      importStudents,
      handleExpandChange,
      getRandomProgress,
      format,
      customColorMethod,
      createAssignment,
      searchQuestions,
      handleSelectionChange,
      removeSelectedQuestion,
      calculateTotalScore,
      submitAssignment,
      viewAssignmentDetail,
      deleteAssignment
    };
  }
}
</script>

<style scoped>
.course-details {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  margin-bottom: 20px;
}

.course-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.course-info-card, .students-card, .assignments-card {
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

.header-actions {
  display: flex;
  gap: 10px;
}

.loading, .error-state, .loading-students, .loading-assignments, .loading-questions {
  margin-top: 20px;
}

.question-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.total-score {
  text-align: right;
  margin-top: 10px;
  font-weight: bold;
  font-size: 16px;
}

.learning-analysis {
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.learning-analysis h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.analysis-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 20px;
}

.analysis-item h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: normal;
  color: #606266;
}

.analysis-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.analysis-summary p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}
</style>