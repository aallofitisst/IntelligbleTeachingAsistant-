<template>
  <el-container class="resource-container">
    <el-header>教学资源生成</el-header>
    <el-main>
      <el-form :model="form" label-position="top" class="resource-form">
        <el-form-item label="资源类型">
          <el-select v-model="form.resourceType" placeholder="请选择资源类型" style="width: 100%;">
            <el-option label="PPT演示文稿" value="ppt"></el-option>
            <el-option label="图片" value="image" disabled></el-option>
            <el-option label="视频" value="video" disabled></el-option>
          </el-select>
        </el-form-item>
        
        <!-- 课程选择 -->
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
        
        <!-- PPT特有字段 -->
        <template v-if="form.resourceType === 'ppt'">
          <el-form-item label="知识点/主题">
            <el-input 
              v-model="form.pptTopic" 
              placeholder="请输入本节课的知识点或主题"
              type="textarea"
              :rows="2">
            </el-input>
          </el-form-item>
          
          <!-- 添加幻灯片数量选择 -->
          <el-form-item label="幻灯片数量">
            <el-input-number 
              v-model="form.slideCount" 
              :min="3" 
              :max="12" 
              :step="1"
              style="width: 100%">
            </el-input-number>
          </el-form-item>
          
          <!-- 添加PPT模板选择 -->
          <el-form-item label="演示文稿风格">
            <el-select 
              v-model="form.templateStyle" 
              placeholder="请选择PPT模板风格"
              style="width: 100%;">
              <el-option label="随机风格" value="random"></el-option>
              <el-option label="简约商务" value="business"></el-option>
              <el-option label="教育教学" value="education"></el-option>
              <el-option label="科技风格" value="tech"></el-option>
              <el-option label="自然环保" value="nature"></el-option>
              <el-option label="创意设计" value="creative"></el-option>
              <el-option label="医疗健康" value="medical"></el-option>
              <el-option label="简约黑白" value="minimal"></el-option>
              <el-option label="多彩活泼" value="colorful"></el-option>
            </el-select>
          </el-form-item>
        </template>
        
        <el-form-item>
          <el-button 
            type="primary" 
            @click="generateResource"
            :loading="loading"
            :disabled="!canGenerate"
            class="generate-btn">
            {{ loading ? '正在生成PPT...' : '生成PPT' }}
          </el-button>
        </el-form-item>
        
        <!-- 生成进度 -->
        <el-form-item v-if="loading">
          <el-progress 
            :percentage="generationStatus.progress" 
            :format="p => `${p}%`"
            :stroke-width="15"
            :status="generationStatus.progress >= 100 ? 'success' : ''">
          </el-progress>
          <div class="progress-text">{{ generationStatus.message }}</div>
        </el-form-item>
      </el-form>
    </el-main>
    <!-- 添加一个隐藏的下载按钮作为备用 -->
    <div style="display: none;" id="download-container"></div>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { generatePptJsonData } from '@/api/asist';
import axios from 'axios';
import pptxgen from 'pptxgenjs';

// 表单数据
const form = ref({
  resourceType: 'ppt',
  courseId: '',
  selectedCourse: null,
  pptTopic: '',
  templateStyle: 'random',
  slideCount: 6 // 默认幻灯片数量
});

// 课程列表
const courseList = ref([]);
const courseLoading = ref(true);

// 生成状态
const loading = ref(false);
const generationStatus = ref({
  progress: 0,
  message: '正在准备生成...',
  finished: false
});

// 生成结果
const pptJsonData = ref(null);

// 模板文件夹和图片集合
const templateFolders = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];
const templateImages = reactive({});

// 模板风格映射 - 将风格名称映射到文件夹名称
const styleToFolder = {
  business: 'm1',
  education: 'm2',
  tech: 'm3',
  nature: 'm4',
  creative: 'm5',
  medical: 'm6',
  minimal: 'm7',
  colorful: 'm8',
  random: '' // 随机选择，会在运行时确定
};

// 预加载所有模板图片
// 注意：在Vite中，import.meta.glob必须使用静态字符串，不能使用变量
const m1Images = import.meta.glob('@/assets/m1/*.*');
const m2Images = import.meta.glob('@/assets/m2/*.*');
const m3Images = import.meta.glob('@/assets/m3/*.*');
const m4Images = import.meta.glob('@/assets/m4/*.*');
const m5Images = import.meta.glob('@/assets/m5/*.*');
const m6Images = import.meta.glob('@/assets/m6/*.*');
const m7Images = import.meta.glob('@/assets/m7/*.*');
const m8Images = import.meta.glob('@/assets/m8/*.*');

// 计算是否可以生成资源
const canGenerate = computed(() => {
  if (form.value.resourceType === 'ppt') {
    return !!form.value.courseId && !!form.value.pptTopic.trim();
  }
  return false;
});

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

// 获取指定模板文件夹中的所有图片
const loadTemplateImages = async () => {
  try {
    // 将每个文件夹的图片整理到对应的数组中
    templateImages.m1 = sortImageImports(m1Images);
    templateImages.m2 = sortImageImports(m2Images);
    templateImages.m3 = sortImageImports(m3Images);
    templateImages.m4 = sortImageImports(m4Images);
    templateImages.m5 = sortImageImports(m5Images);
    templateImages.m6 = sortImageImports(m6Images);
    templateImages.m7 = sortImageImports(m7Images);
    templateImages.m8 = sortImageImports(m8Images);
    
    // 记录加载了多少图片
    for (const folder of templateFolders) {
      console.log(`已加载 ${folder} 文件夹，找到 ${templateImages[folder].length} 张图片`);
    }
    
    if (Object.keys(templateImages).every(key => templateImages[key].length === 0)) {
      console.warn('未能加载任何模板图片，将使用默认背景');
    }
  } catch (error) {
    console.error('加载模板图片失败:', error);
  }
};

// 整理图片导入对象为数组
const sortImageImports = (importObj) => {
  const result = [];
  for (const path in importObj) {
    result.push({
      path: path,
      importFunc: importObj[path]
    });
  }
  return result;
};

// 随机获取一个模板文件夹
const getRandomTemplateFolder = () => {
  const index = Math.floor(Math.random() * templateFolders.length);
  return templateFolders[index];
};

// 获取指定风格的所有图片
const getTemplateImages = async (style) => {
  try {
    // 确定使用的文件夹
    let folder = styleToFolder[style];
    if (style === 'random' || !folder) {
      folder = getRandomTemplateFolder();
    }
    
    // 检查是否有该文件夹的图片
    if (!templateImages[folder] || templateImages[folder].length === 0) {
      console.warn(`未在 ${folder} 文件夹中找到图片，使用默认背景`);
      return [];
    }
    
    // 加载所有图片模块并获取URL
    const loadedImages = [];
    for (const imgData of templateImages[folder]) {
      try {
        const module = await imgData.importFunc();
        // 不直接使用module.default，而是创建Image对象确保完全加载
        const imagePromise = new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(module.default);
          img.onerror = () => reject(new Error(`无法加载图片: ${imgData.path}`));
          img.src = module.default;
        });
        
        const imageUrl = await imagePromise;
        loadedImages.push(imageUrl);
      } catch (err) {
        console.error(`加载图片 ${imgData.path} 失败:`, err);
      }
    }
    
    console.log(`成功加载 ${loadedImages.length} 张背景图片从 ${folder} 文件夹`);
    return loadedImages;
  } catch (error) {
    console.error('获取模板图片失败:', error);
    return [];
  }
};

// 生成资源的主函数
const generateResource = async () => {
  if (!canGenerate.value) {
    ElMessage.warning('请选择课程并输入知识点');
    return;
  }
  
  loading.value = true;
  generationStatus.value = {
    progress: 0,
    message: '正在准备生成...',
    finished: false
  };
  
  try {
    await generatePpt();
  } catch (error) {
    console.error('生成资源失败', error);
    ElMessage.error(`生成失败: ${error.message}`);
    generationStatus.value.message = '生成失败，请重试';
  } finally {
    loading.value = false;
  }
};

// 生成PPT
const generatePpt = async () => {
  try {
    // 更新状态
    generationStatus.value.progress = 10;
    generationStatus.value.message = '正在生成PPT内容...';
    
    const selectedCourse = form.value.selectedCourse;
    
    // 构建基于课程信息的提示词
    const prompt = `
请为以下教学内容创建一个精美的PPT演示文稿：
【学科】${selectedCourse.courseName}
【教学目标】${selectedCourse.teachingObjectives || '提高学生对该主题的理解和掌握能力'}
【课程年级】${selectedCourse.gradeLevel}
【教科书】${selectedCourse.textbook || '标准教材'}
【知识点】${form.value.pptTopic}

要求：
1. 请不要包含实际的图片URL，演示文稿应该专注于文字内容和内容结构
2. 幻灯片数量控制在${form.value.slideCount}张之间，包括封面和结束页
3. 确保内容结构清晰，逻辑连贯
4. 根据课程年级调整内容难度和表达方式
`;
    
    // 使用Gemini API生成PPT JSON数据
    generationStatus.value.message = '正在调用AI生成PPT内容...';
    pptJsonData.value = await generatePptJsonData(prompt, form.value.slideCount);
    
    generationStatus.value.progress = 50;
    generationStatus.value.message = '正在组装PPT...';
    
    // 直接下载PPT，不生成预览
    await downloadPpt();
    
    generationStatus.value.progress = 100;
    generationStatus.value.message = '生成完成';
    generationStatus.value.finished = true;
    
    ElMessage.success('PPT生成并下载成功');
  } catch (error) {
    throw error;
  }
};

// 下载PPT
const downloadPpt = async () => {
  if (!pptJsonData.value) {
    throw new Error('PPT数据生成失败');
  }
  
  try {
    // 创建新的PPT实例
    const pptx = new pptxgen();
    
    // 设置演示文稿属性
    const selectedCourse = form.value.selectedCourse;
    pptx.author = '教师助手';
    pptx.subject = selectedCourse.courseName;
    pptx.title = pptJsonData.value.title || `${selectedCourse.courseName} - ${form.value.pptTopic}`;
    
    // 获取模板图片
    const templateStyle = form.value.templateStyle;
    const bgImages = await getTemplateImages(templateStyle);
    
    // 应用主题（如果指定）
    if (pptJsonData.value.theme && pptJsonData.value.theme !== 'OFFICE_THEME') {
      try {
        pptx.theme = pptJsonData.value.theme;
      } catch (e) {
        console.warn('主题设置失败，使用默认主题', e);
      }
    }
    
    // 逐个处理幻灯片
    for (let i = 0; i < pptJsonData.value.slides.length; i++) {
      generationStatus.value.message = `正在处理第 ${i + 1}/${pptJsonData.value.slides.length} 张幻灯片...`;
      const slideData = pptJsonData.value.slides[i];
      const slide = pptx.addSlide();
      
      // 添加背景图片（从模板中循环使用）
      if (bgImages.length > 0) {
        const bgIndex = i % bgImages.length;
        try {
          // 不直接使用data属性，而是使用path属性并添加更多错误处理
          // 在Vue中正确引用静态资源需要特殊处理
          if (typeof bgImages[bgIndex] === 'string') {
            if (bgImages[bgIndex].startsWith('data:image/')) {
              // 如果是base64数据，直接使用
              slide.background = { data: bgImages[bgIndex] };
            } else {
              // 如果是URL路径，使用path属性
              slide.background = { path: bgImages[bgIndex] };
            }
          } else {
            console.warn('无效的背景图片格式', bgImages[bgIndex]);
            // 使用简单的纯色背景作为后备
            slide.background = { color: "F5F5F5" };
          }
        } catch (e) {
          console.warn('应用背景失败', e);
          // 添加纯色背景作为后备
          slide.background = { color: "F5F5F5" };
        }
      } else {
        // 没有背景图片时使用默认背景色
        slide.background = { color: "F5F5F5" };
      }
      
      // 设置幻灯片标题和副标题
      if (slideData.title) {
        slide.addText(slideData.title, { 
          x: 0.5, 
          y: 0.5, 
          w: '90%', 
          h: 1, 
          fontSize: 32,
          bold: true,
          color: '363636',
          fontFace: 'Arial',
          // 添加阴影效果让文字在背景上更易读
          shadow: { type: 'outer', color: 'cccccc', blur: 10, offset: 2, angle: 45 }
        });
      }
      
      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 0.5, 
          y: 1.7, 
          w: '90%', 
          h: 0.8, 
          fontSize: 20,
          color: '666666',
          fontFace: 'Arial',
          shadow: { type: 'outer', color: 'cccccc', blur: 5, offset: 1, angle: 45 }
        });
      }
      
      // 处理幻灯片内容
      if (slideData.content && Array.isArray(slideData.content)) {
        for (const item of slideData.content) {
          switch (item.type) {
            case 'text':
              if (item.text) {
                slide.addText(item.text, {
                  ...item.options,
                  w: item.options?.w || '80%',
                  fontSize: item.options?.fontSize || 18,
                  fontFace: 'Arial',
                  // 使用半透明背景让文字在图片上更易读
                  fill: { type: 'solid', color: 'ffffff', transparency: 40 },
                  // 添加内边距和圆角
                  padding: 8,
                  radius: 4,
                  // 添加边框
                  line: { color: 'cccccc', width: 1 }
                });
              }
              break;
              
            case 'chart':
              if (item.chartType && item.data) {
                // 添加白色半透明背景
                slide.addShape(pptx.shapes.RECTANGLE, {
                  x: item.options?.x || 1,
                  y: item.options?.y || 2.5,
                  w: item.options?.w || 8,
                  h: item.options?.h || 4,
                  fill: { type: 'solid', color: 'ffffff', transparency: 40 },
                  line: { color: 'cccccc', width: 1 },
                  radius: 4
                });
                
                // 添加图表
                slide.addChart(
                  pptx[item.chartType.toUpperCase()], 
                  item.data, 
                  {
                    ...item.options,
                    w: item.options?.w || 8,
                    h: item.options?.h || 4
                  }
                );
              }
              break;
              
            case 'table':
              if (item.rows && Array.isArray(item.rows)) {
                slide.addTable(item.rows, {
                  ...item.options,
                  // 设置表格背景
                  fill: { type: 'solid', color: 'ffffff', transparency: 30 },
                  // 设置表格边框
                  border: { type: 'solid', color: '666666', pt: 1 }
                });
              }
              break;
          }
        }
      }
      
      // 设置备注
      if (slideData.notes) {
        slide.addNotes(slideData.notes);
      }
      
      // 更新进度
      generationStatus.value.progress = 50 + (i + 1) / pptJsonData.value.slides.length * 40;
    }
    
    // 导出并下载PPT
    generationStatus.value.message = '正在导出PPT文件...';
    const fileName = `${selectedCourse.courseName}_${form.value.pptTopic}_${new Date().toISOString().slice(0, 10)}.pptx`;
    
    // 使用更简单的导出方法，避免复杂的错误处理
    try {
      // 直接使用write方法生成arraybuffer并手动创建下载链接
      const pptArrayBuffer = await pptx.write('arraybuffer');
      const blob = new Blob([pptArrayBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // 清理DOM
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      ElMessage.success('PPT生成并下载成功');
    } catch (downloadError) {
      console.error('下载文件时出错:', downloadError);
      throw new Error('下载PPT文件失败: ' + downloadError.message);
    }
  } catch (error) {
    console.error('下载PPT失败', error);
    throw new Error('下载PPT失败: ' + error.message);
  }
};

// 页面加载时初始化
onMounted(() => {
  fetchCourses();
  loadTemplateImages(); // 加载模板图片
});
</script>

<style scoped>
.resource-container {
  max-width: 1200px;
  margin: 0 auto;
}

.el-header {
  font-size: 24px;
  font-weight: bold;
  padding: 20px 0;
  text-align: center;
}

.resource-form {
  max-width: 800px;
  margin: 0 auto;
}

.generate-btn {
  width: 100%;
}

.progress-section {
  margin-top: 20px;
}

.progress-text {
  margin-top: 10px;
  text-align: center;
  color: #606266;
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