<template>
    <div class="course-container">
      <div class="header">
        <h1>我的课程</h1>
        <el-button type="primary" @click="dialogVisible = true">创建新课程</el-button>
      </div>
  
      <div v-if="loading" class="loading-state">
        <el-skeleton :rows="3" animated />
      </div>
  
      <div class="course-list" v-else-if="courses.length > 0">
        <el-card 
          v-for="course in courses" 
          :key="course.courseId" 
          class="course-card"
          @click="viewCourseDetails(course.courseId)"
        >
          <div class="course-info">
            <h3>{{ course.courseName }}</h3>
            <div class="course-meta">
              <span>{{ course.gradeLevel }}</span>
              <span>课程码: {{ course.courseCode }}</span>
            </div>
          </div>
        </el-card>
      </div>
      
      <div v-else class="empty-state">
        <el-empty description="暂无课程，点击上方按钮创建课程"></el-empty>
      </div>
  
      <!-- 创建课程对话框 -->
      <el-dialog
        title="创建新课程"
        v-model="dialogVisible"
        width="500px"
      >
        <el-form :model="newCourse" :rules="rules" ref="courseForm" label-width="100px">
          <el-form-item label="课程名称" prop="courseName">
            <el-input v-model="newCourse.courseName" placeholder="请输入课程名称"></el-input>
          </el-form-item>
          
          <el-form-item label="教科书" prop="textbook">
            <el-input v-model="newCourse.textbook" placeholder="请输入教科书名称"></el-input>
          </el-form-item>
          
          <el-form-item label="年级" prop="gradeLevel">
            <el-select v-model="newCourse.gradeLevel" placeholder="请选择年级">
              <el-option label="小学" value="小学"></el-option>
              <el-option label="初中" value="初中"></el-option>
              <el-option label="高中" value="高中"></el-option>
              <el-option label="大学" value="大学"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="教学目标" prop="teachingObjectives">
            <el-input
              type="textarea"
              v-model="newCourse.teachingObjectives"
              :rows="4"
              placeholder="请输入教学目标"
            ></el-input>
          </el-form-item>
          
          <el-form-item label="课程码" prop="courseCode">
            <el-input v-model="newCourse.courseCode" placeholder="请输入课程码">
              <template #append>
                <el-button @click="generateCourseCode">生成</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="createCourse" :loading="submitting">创建</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script>
  import { ref, reactive, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { ElMessage } from 'element-plus';
  import axios from 'axios';
  
  export default {
    name: 'CourseView',
    setup() {
      const router = useRouter();
      const courseForm = ref(null);
      const dialogVisible = ref(false);
      const courses = ref([]);
      const loading = ref(true);
      const submitting = ref(false);
      
      // 教师ID默认设置为123456
      const teacherId = 123456;
      
      const newCourse = reactive({
        teacherId: teacherId,
        courseName: '',
        textbook: '',
        gradeLevel: '',
        teachingObjectives: '',
        courseCode: ''
      });
      
      const rules = {
        courseName: [
          { required: true, message: '请输入课程名称', trigger: 'blur' },
          { max: 100, message: '课程名称不能超过100个字符', trigger: 'blur' }
        ],
        textbook: [
          { max: 200, message: '教科书名称不能超过200个字符', trigger: 'blur' }
        ],
        gradeLevel: [
          { required: true, message: '请选择年级', trigger: 'change' }
        ],
        courseCode: [
          { required: true, message: '请输入课程码', trigger: 'blur' },
          { max: 20, message: '课程码不能超过20个字符', trigger: 'blur' }
        ]
      };
      
      // 获取教师课程列表
      const fetchCourses = async () => {
        loading.value = true;
        try {
          const response = await axios.get('http://localhost:8080/assistant/courses', {
            params: { teacherId }
          });
          
          if (response.data.success) {
            courses.value = response.data.data || [];
          } else {
            ElMessage.error(response.data.message || '获取课程列表失败');
          }
        } catch (error) {
          ElMessage.error('获取课程列表失败: ' + (error.response?.data?.message || error.message));
          console.error(error);
        } finally {
          loading.value = false;
        }
      };
      
      // 创建新课程
      const createCourse = () => {
        courseForm.value.validate(async (valid) => {
          if (valid) {
            submitting.value = true;
            try {
              const response = await axios.post('http://localhost:8080/assistant/courses', newCourse);
              
              if (response.data.success) {
                // 添加新创建的课程到列表中
                if (response.data.data) {
                  courses.value.push(response.data.data);
                }
                
                // 重置表单
                courseForm.value.resetFields();
                dialogVisible.value = false;
                
                ElMessage.success('课程创建成功');
                
                // 刷新课程列表
                fetchCourses();
              } else {
                ElMessage.error(response.data.message || '创建课程失败');
              }
            } catch (error) {
              ElMessage.error('创建课程失败: ' + (error.response?.data?.message || error.message));
              console.error(error);
            } finally {
              submitting.value = false;
            }
          } else {
            return false;
          }
        });
      };
      
      // 生成随机课程码
      const generateCourseCode = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        newCourse.courseCode = result;
      };
      
      const viewCourseDetails = (courseId) => {
  // 确保 courseId 是有效的
  if (!courseId || isNaN(parseInt(courseId, 10))) {
    ElMessage.error('无效的课程ID');
    return;
  }
  
  router.push({
    name: 'CourseDetails',
    params: { id: courseId.toString() } // 明确转为字符串，因为路由参数总是字符串
  });
};
      
      onMounted(() => {
        fetchCourses();
      });
      
      return {
        courseForm,
        dialogVisible,
        courses,
        newCourse,
        rules,
        loading,
        submitting,
        createCourse,
        generateCourseCode,
        viewCourseDetails
      };
    }
  }
  </script>
  
  <style scoped>
  .course-container {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }
  
  .course-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }
  
  .course-card {
    cursor: pointer;
    transition: transform 0.3s, box-shadow 0.3s;
  }
  
  .course-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  .course-info {
    display: flex;
    flex-direction: column;
  }
  
  .course-meta {
    display: flex;
    justify-content: space-between;
    color: #666;
    font-size: 14px;
    margin-top: 10px;
  }
  
  .empty-state {
    margin-top: 60px;
  }
  
  .loading-state {
    margin-top: 20px;
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
  }
  </style>