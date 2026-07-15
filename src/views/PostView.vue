<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deletePost, getPost } from '../services/api'

const route = useRoute()
const router = useRouter()
const action = ref('')
const password = ref('')
const error = ref('')
const deleting = ref(false)
const loading = ref(true)
const post = ref({ id: route.params.id, contentTypeId: 12, title: '이번 주말, 한강 피크닉 어디가 좋을까요?', content: '조용하고 노을 보기 좋은 한강공원을 찾고 있어요. 돗자리 펴기 좋고 산책도 함께 할 수 있는 곳이면 좋겠습니다.\n\n여의도는 자주 가봐서 이번에는 다른 동네의 한강공원을 만나보고 싶어요.', createdtime: '2026-07-14 00:00:00' })
const categories = { 12: ['관광지', '#ff7b6b'], 14: ['문화시설', '#8b7cf6'], 15: ['축제·공연', '#f3ab35'], 25: ['여행코스', '#36a88d'], 28: ['레포츠', '#4f8de8'], 32: ['숙박', '#c77be5'], 38: ['쇼핑', '#ef7199'] }
const category = computed(() => categories[post.value.contentTypeId] || ['기타', '#6973c7'])

onMounted(async () => {
  try { post.value = await getPost(route.params.id) }
  catch (apiError) { if (!apiError.unavailable) error.value = apiError.message }
  finally { loading.value = false }
})

function openPassword(actionName) {
  action.value = actionName
  password.value = ''
  error.value = ''
}

function closePassword() {
  action.value = ''
  password.value = ''
  error.value = ''
}

async function confirmPassword() {
  if (action.value === 'edit') {
    sessionStorage.setItem(`localhub-edit-password-${route.params.id}`, password.value)
    router.push({ path: '/write', query: { edit: route.params.id } })
    return
  }
  deleting.value = true
  try {
    await deletePost(route.params.id, password.value)
    router.push('/community')
  } catch (apiError) {
    error.value = apiError.message
    deleting.value = false
  }
}
</script>

<template>
  <div class="subpage narrow page-section">
    <router-link to="/community" class="back-link"><span>←</span> 이야기 광장</router-link>
    <article class="post-detail">
      <span class="post-category" :style="{ '--tag': category[1] }">{{ category[0] }}</span>
      <h1>{{ loading ? '이야기를 불러오는 중이에요' : post.title }}</h1>
      <div class="detail-meta">
        <span>익명의 서울러 · {{ String(post.createdtime || '').slice(0, 10).replaceAll('-', '.') }}</span>
        <div class="post-manage"><button @click="openPassword('edit')">수정</button><button class="delete" @click="openPassword('delete')">삭제</button></div>
      </div>
      <p v-for="(paragraph, index) in String(post.content || '').split(/\n{2,}/)" :key="index">{{ paragraph }}</p>
    </article>

    <div v-if="action" class="password-backdrop" @click.self="closePassword">
      <form class="password-dialog" @submit.prevent="confirmPassword">
        <button type="button" class="dialog-close" @click="closePassword" aria-label="닫기">×</button>
        <span class="dialog-icon">{{ action === 'delete' ? '!' : '✎' }}</span>
        <h2>{{ action === 'delete' ? '게시글을 삭제할까요?' : '게시글을 수정할까요?' }}</h2>
        <p>작성할 때 입력한 비밀번호를 확인합니다.</p>
        <label>비밀번호<input v-model="password" type="password" inputmode="numeric" autofocus placeholder="비밀번호 입력" /></label>
        <small v-if="error" class="password-error">{{ error }}</small>
        <small v-else class="password-hint">작성할 때 사용한 비밀번호를 입력해주세요.</small>
        <div class="dialog-actions"><button type="button" class="secondary-button" @click="closePassword">취소</button><button :class="['primary-button', { danger: action === 'delete' }]">{{ deleting ? '삭제했어요 ✓' : action === 'delete' ? '삭제하기' : '수정하기' }}</button></div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  font-weight: 800;
  box-shadow: 0 5px 14px rgba(45, 55, 50, 0.08);
  transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.back-link span {
  color: var(--primary);
  font-size: 18px;
}

.back-link:hover {
  color: var(--primary);
  border-color: var(--primary);
  transform: translateX(-2px);
  box-shadow: 0 7px 18px rgba(45, 55, 50, 0.12);
}
</style>
