<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createPost, getPost, updatePost } from '../services/api'
const router = useRouter()
const route = useRoute()
const done = ref(false)
const editing = Boolean(route.query.edit)
const submitting = ref(false)
const error = ref('')
const form = reactive({ contentTypeId: '', title: '', content: '', password: '' })

onMounted(async () => {
  if (!editing) return
  form.password = sessionStorage.getItem(`localhub-edit-password-${route.query.edit}`) || ''
  sessionStorage.removeItem(`localhub-edit-password-${route.query.edit}`)
  try {
    const post = await getPost(route.query.edit)
    Object.assign(form, { contentTypeId: String(post.contentTypeId), title: post.title, content: post.content })
  } catch (apiError) {
    if (apiError.unavailable) Object.assign(form, { contentTypeId: '12', title: '이번 주말, 한강 피크닉 어디가 좋을까요?', content: '조용하고 노을 보기 좋은 한강공원을 찾고 있어요.' })
    else error.value = apiError.message
  }
})

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    if (editing) await updatePost(route.query.edit, { title: form.title, content: form.content, password: form.password })
    else await createPost({ contentTypeId: Number(form.contentTypeId), title: form.title, content: form.content, password: form.password })
    done.value = true
    setTimeout(() => router.push(editing ? `/posts/${route.query.edit}` : '/community'), 700)
  } catch (apiError) {
    error.value = apiError.message
  } finally { submitting.value = false }
}
</script>
<template><div class="subpage narrow page-section"><div class="subpage-head left"><span class="eyebrow">{{ editing ? 'EDIT A STORY' : 'WRITE A STORY' }}</span><h1>{{ editing ? '서울 이야기 수정하기' : '서울 이야기 남기기' }}</h1><p>개인정보 없이, 편안하게 경험과 질문을 나눠주세요.</p></div><form class="write-form" @submit.prevent="submit"><label>이야기 주제<select v-model="form.contentTypeId" required :disabled="editing"><option value="">카테고리를 선택해주세요</option><option value="12">관광지</option><option value="14">문화시설</option><option value="15">축제·공연</option><option value="25">여행코스</option><option value="28">레포츠</option><option value="32">숙박</option><option value="38">쇼핑</option></select></label><label>제목<input v-model="form.title" required maxlength="80" placeholder="어떤 이야기를 나누고 싶나요?" /></label><label>내용<textarea v-model="form.content" required rows="10" placeholder="서울에서 경험한 순간이나 궁금한 점을 자유롭게 적어주세요."></textarea></label><label>수정·삭제 비밀번호<input v-model="form.password" required type="password" minlength="4" placeholder="4자리 이상 입력해주세요" /><small>{{ editing ? '작성할 때 사용한 비밀번호를 입력해주세요.' : '작성자만 글을 수정하거나 삭제할 때 사용해요.' }}</small></label><small v-if="error" class="password-error">{{ error }}</small><div class="form-actions"><router-link :to="editing ? `/posts/${route.query.edit}` : '/community'" class="secondary-button">취소</router-link><button class="primary-button" :disabled="submitting">{{ done ? (editing ? '수정했어요 ✓' : '등록했어요 ✓') : submitting ? '처리 중…' : (editing ? '수정 완료' : '이야기 등록하기') }}</button></div></form></div></template>
