<template>
  <el-container class="app-container">
    <el-aside :width="isCollapse ? '64px' : '240px'" class="aside-menu">
      <div class="logo-container">
        <h2 v-if="!isCollapse">教师辅助备课系统</h2>
        <h2 v-else>系统</h2>
      </div>
      <el-menu default-active="1" 
        class="el-menu-vertical" 
        :collapse="isCollapse" 
        background-color="#a0cfff" 
        text-color="#333333" 
        active-text-color="#ffffff"
      >
        <el-menu-item index="1" @click="navigateTo('/course')">
          <el-icon><Reading /></el-icon>
          <span>我的课程</span>
        </el-menu-item>
        <el-menu-item index="2" @click="navigateTo('/apitest')">
          <el-icon><ChatDotRound /></el-icon>
          <span>聊天广场</span>
        </el-menu-item>
        <el-menu-item index="3" @click="navigateTo('/teaching-design')">
          <el-icon><Document /></el-icon>
          <span>教学设计</span>
        </el-menu-item>
        <el-menu-item index="4" @click="navigateTo('/resource-generation')">
          <el-icon><FolderOpened /></el-icon>
          <span>教学资源生成</span>
        </el-menu-item>
        <el-menu-item index="5" @click="navigateTo('/exercise-bank')">
          <el-icon><Collection /></el-icon>
          <span>练习题库</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <div class="collapse-btn" @click="toggleCollapse">
            <el-icon v-if="!isCollapse"><Fold /></el-icon>
            <el-icon v-else><Expand /></el-icon>
          </div>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-dropdown">
              管理员
              <el-icon><CaretBottom /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人信息</el-dropdown-item>
                <el-dropdown-item>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Document, FolderOpened, Collection, DataAnalysis, Fold, Expand, CaretBottom, ChatDotRound, Reading } from '@element-plus/icons-vue';

const router = useRouter();
const isCollapse = ref(false);

const navigateTo = (path) => {
  router.push(path);
};

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
  console.log('Menu collapsed:', isCollapse.value);
};
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.aside-menu {
  background-color: #a0cfff;
  transition: width 0.3s;
  overflow-x: hidden;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #7ab8ff;
  overflow: hidden;
  white-space: nowrap;
}

.logo-container h2 {
  color: #fff;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.el-menu-vertical {
  border-right: none;
}

.el-menu-vertical:not(.el-menu--collapse) {
  width: 240px;
}

.app-header {
  background-color: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
}

.header-left .collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #7ab8ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-right .user-dropdown {
  cursor: pointer;
  color: #7ab8ff;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.app-main {
  background-color: #f8f9fd;
  padding: 20px;
}

.el-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.el-menu-item.is-active {
  background-color: #7ab8ff !important;
}

.el-menu-item:hover {
  background-color: #89c0ff !important;
}

.el-icon {
  margin-right: 4px;
}

.collapse-btn {
  cursor: pointer;
}
</style>