<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const action = ref('')
const password = ref('')
const error = ref('')
const deleting = ref(false)

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

function confirmPassword() {
  if (password.value !== '1234') {
    error.value = '비밀번호가 일치하지 않습니다.'
    return
  }
  if (action.value === 'edit') {
    router.push({ path: '/write', query: { edit: route.params.id } })
    return
  }
  deleting.value = true
  setTimeout(() => router.push('/community'), 700)
}
</script>

<template>
  <div class="subpage narrow page-section">
    <router-link to="/community" class="back-link">← 이야기 목록</router-link>
    <article class="post-detail">
      <span class="post-category" style="--tag:#ff7b6b">관광지</span>
      <h1>{{ route.params.id === '1' ? '이번 주말, 한강 피크닉 어디가 좋을까요?' : '서울에서 발견한 오늘의 이야기' }}</h1>
      <div class="detail-meta">
        <span>익명의 서울러 · 2026.07.14</span>
        <div class="post-manage"><button @click="openPassword('edit')">수정</button><button class="delete" @click="openPassword('delete')">삭제</button></div>
      </div>
      <p>조용하고 노을 보기 좋은 한강공원을 찾고 있어요. 돗자리 펴기 좋고 산책도 함께 할 수 있는 곳이면 좋겠습니다.</p>
      <p>여의도는 자주 가봐서 이번에는 다른 동네의 한강공원을 만나보고 싶어요. 직접 다녀오신 분들의 소소한 팁도 기다릴게요!</p>
    </article>

    <div v-if="action" class="password-backdrop" @click.self="closePassword">
      <form class="password-dialog" @submit.prevent="confirmPassword">
        <button type="button" class="dialog-close" @click="closePassword" aria-label="닫기">×</button>
        <span class="dialog-icon">{{ action === 'delete' ? '!' : '✎' }}</span>
        <h2>{{ action === 'delete' ? '게시글을 삭제할까요?' : '게시글을 수정할까요?' }}</h2>
        <p>작성할 때 입력한 비밀번호를 확인합니다.</p>
        <label>비밀번호<input v-model="password" type="password" inputmode="numeric" autofocus placeholder="비밀번호 입력" /></label>
        <small v-if="error" class="password-error">{{ error }}</small>
        <small v-else class="password-hint">예시 게시글의 비밀번호는 1234입니다.</small>
        <div class="dialog-actions"><button type="button" class="secondary-button" @click="closePassword">취소</button><button :class="['primary-button', { danger: action === 'delete' }]">{{ deleting ? '삭제했어요 ✓' : action === 'delete' ? '삭제하기' : '수정하기' }}</button></div>
      </form>
    </div>
  </div>
</template>
