//导入vue-router
import { createRouter, createWebHistory } from 'vue-router';

// 导入组件
import ExerciseBank from '../views/ExerciseBank.vue';
import StudentAnalysis from '../views/StudentAnalysis.vue';
import ResourceGeneration from '../views/ResourceGeneration.vue';
import TeachingDesign from '../views/TeachingDesign.vue';
import Course from '../views/course.vue';

import Apitest from '../views/apitest.vue';

const routes = [
  {
    path: '/',
    redirect: '/apitest',
  },
  {
    path: '/exercise-bank',
    component: ExerciseBank,
  },
  {
    path: '/student-analysis',
    component: StudentAnalysis,
  },
  {
    path: '/resource-generation',
    component: ResourceGeneration,
  },
  {
    path: '/teaching-design',
    component: TeachingDesign,
  },
  {
    path: '/apitest',
    component: Apitest,
  },
  {
    path: '/course',
    component: Course,
  },
  {
    path: '/course/:id',
    name: 'CourseDetails',
    component: () => import('@/views/CourseDetails.vue'),
    props: true  // 允许将路由参数作为props传递给组件
  },
  {
    path: '/assignment/:id',
    name: 'assignment-detail',
    component: () => import('../views/AssignmentDetail.vue'),
    meta: {
      requiresAuth: true,
      title: '作业详情'
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;