<template>
  <el-container>
    <el-header>学生学情分析</el-header>
    <el-main>
      <el-form :model="form">
        <el-form-item label="学生姓名">
          <el-input v-model="form.studentName"></el-input>
        </el-form-item>
        <el-form-item label="历史成绩">
          <el-input v-model="form.historyScores" type="textarea"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="analyzeStudent">分析学情</el-button>
        </el-form-item>
      </el-form>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref } from 'vue';

const form = ref({
  studentName: '',
  historyScores: ''
});

const analyzeStudent = () => {
  // 调用大模型API分析学生学情
  console.log('分析学情', form.value);
};
</script>

<style scoped>
.el-header {
  background-color: #b3c0d1;
  color: #333;
  line-height: 60px;
  text-align: center;
  font-size: 20px;
}
</style>
