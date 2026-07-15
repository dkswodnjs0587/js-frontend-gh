<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createPost, getPost, updatePost } from '../services/api'
const router = useRouter()
const route = useRoute()
const done = ref(false)
const editing = Boolean(route.query.edit)
const submitting = ref(false)
const error = ref('')
const form = reactive({ contentTypeId: '', title: '', content: '', password: '' })
watch(() => form.password, (value) => {
  const digits = String(value).replace(/\D/g, '').slice(0, 4)
  if (digits !== value) form.password = digits
})
const tutorialActive = ref(false)
const tutorialStep = ref(0)
const categoryEl = ref(null)
const storyEl = ref(null)
const passwordEl = ref(null)
const actionsEl = ref(null)
const tutorialSteps = [
  { target: 'category', eyebrow: '글쓰기 · STEP 1', title: '이야기 주제를 선택하세요', text: '작성할 이야기와 가장 가까운 카테고리를 선택하면 다른 사용자가 관심 있는 글을 쉽게 찾을 수 있어요.' },
  { target: 'story', eyebrow: '글쓰기 · STEP 2', title: '제목과 내용을 작성하세요', text: '무엇을 묻거나 나누고 싶은지 제목에 간단히 적고, 서울에서 경험한 순간이나 궁금한 내용을 자유롭게 작성하세요.' },
  { target: 'password', eyebrow: '글쓰기 · STEP 3', title: '수정·삭제 비밀번호를 기억하세요', text: '게시물은 익명으로 작성되므로 작성자를 계정으로 확인할 수 없어요. 이 비밀번호는 나중에 본인만 글을 수정하거나 삭제할 수 있도록 확인하는 용도로 사용됩니다.' },
  { target: 'actions', eyebrow: '글쓰기 · STEP 4', title: '내용을 확인하고 등록하세요', text: '필수 항목을 모두 작성한 뒤 이야기 등록하기를 누르면 게시물이 올라가요. 튜토리얼을 마치면 이야기 광장으로 돌아갑니다.' },
]

function tutorialTarget() { return [categoryEl.value, storyEl.value, passwordEl.value, actionsEl.value][tutorialStep.value] }
async function showTutorialStep(step) { tutorialStep.value = step; await nextTick(); const target = tutorialTarget(); if (!target) return; const rect = target.getBoundingClientRect(); window.scrollTo({ top: window.scrollY + rect.top - Math.max(90, (window.innerHeight - rect.height) / 2), behavior: 'smooth' }) }
function finishWriteTutorial() { tutorialActive.value = false; router.push('/community?tutorial=chatbot') }
function nextWriteTutorial() { tutorialStep.value === tutorialSteps.length - 1 ? finishWriteTutorial() : showTutorialStep(tutorialStep.value + 1) }
function previousWriteTutorial() { if (tutorialStep.value > 0) showTutorialStep(tutorialStep.value - 1) }
function handleTutorialKeydown(event) { if (!tutorialActive.value || event.repeat) return; if (event.key === 'Escape') { event.preventDefault(); tutorialActive.value = false; return } if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select')) return; if (event.code === 'Space') { event.preventDefault(); nextWriteTutorial(); return } if (event.key === 'Backspace' && tutorialStep.value > 0) { event.preventDefault(); previousWriteTutorial() } }
function handleTutorialBackdropClick(event) { if (tutorialActive.value && event.target instanceof HTMLElement && event.target.classList.contains('write-tutorial-backdrop')) nextWriteTutorial() }

onMounted(() => {
  document.querySelector('.write-form')?.setAttribute('novalidate', '')
  const passwordInput = passwordEl.value?.querySelector('input')
  if (passwordInput) {
    passwordInput.inputMode = 'numeric'
    passwordInput.minLength = 4
    passwordInput.maxLength = 4
    passwordInput.pattern = '[0-9]{4}'
    passwordInput.placeholder = '숫자 4자리를 입력해주세요'
  }
  if (route.query.tutorial === '1' && !editing) { tutorialActive.value = true; showTutorialStep(0) }
  window.addEventListener('keydown', handleTutorialKeydown)
  window.addEventListener('click', handleTutorialBackdropClick)
})
onBeforeUnmount(() => { window.removeEventListener('keydown', handleTutorialKeydown); window.removeEventListener('click', handleTutorialBackdropClick) })

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
  error.value = ''
  if (!form.contentTypeId) {
    error.value = '이야기 주제를 선택해주세요.'
    return
  }
  if (!form.title.trim()) {
    error.value = '게시물 제목을 입력해주세요.'
    return
  }
  if (!form.content.trim()) {
    error.value = '게시물 내용을 입력해주세요.'
    return
  }
  if (!/^\d{4}$/.test(form.password)) {
    error.value = '비밀번호는 숫자 4자리로 입력해주세요.'
    return
  }
  submitting.value = true
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
<template><div class="subpage narrow page-section"><div class="subpage-head left"><span class="eyebrow">{{ editing ? 'EDIT A STORY' : 'WRITE A STORY' }}</span><h1>{{ editing ? '서울 이야기 수정하기' : '서울 이야기 남기기' }}</h1><p>개인정보 없이, 편안하게 경험과 질문을 나눠주세요.</p></div><form class="write-form" @submit.prevent="submit"><label ref="categoryEl" :class="{ 'write-tutorial-focus':tutorialActive && tutorialSteps[tutorialStep].target === 'category' }">이야기 주제<select v-model="form.contentTypeId" required :disabled="editing"><option value="">카테고리를 선택해주세요</option><option value="12">관광지</option><option value="14">문화시설</option><option value="15">축제·공연</option><option value="25">여행코스</option><option value="28">레포츠</option><option value="32">숙박</option><option value="38">쇼핑</option></select></label><div ref="storyEl" :class="{ 'write-tutorial-focus':tutorialActive && tutorialSteps[tutorialStep].target === 'story' }"><label>제목<input v-model="form.title" required maxlength="80" placeholder="어떤 이야기를 나누고 싶나요?" /></label><label>내용<textarea v-model="form.content" required rows="10" placeholder="서울에서 경험한 순간이나 궁금한 점을 자유롭게 적어주세요."></textarea></label></div><label ref="passwordEl" :class="{ 'write-tutorial-focus':tutorialActive && tutorialSteps[tutorialStep].target === 'password' }">수정·삭제 비밀번호<input v-model="form.password" required type="password" minlength="4" placeholder="4자리 이상 입력해주세요" /><small>{{ editing ? '작성할 때 사용한 비밀번호를 입력해주세요.' : '작성자만 글을 수정하거나 삭제할 때 사용해요.' }}</small></label><small v-if="error" class="password-error">{{ error }}</small><div ref="actionsEl" :class="['form-actions',{ 'write-tutorial-focus':tutorialActive && tutorialSteps[tutorialStep].target === 'actions' }]"><router-link :to="editing ? `/posts/${route.query.edit}` : '/community'" class="secondary-button">취소</router-link><button class="primary-button" :disabled="submitting">{{ done ? (editing ? '수정했어요 ✓' : '등록했어요 ✓') : submitting ? '처리 중…' : (editing ? '수정 완료' : '이야기 등록하기') }}</button></div></form><div v-if="tutorialActive" class="write-tutorial-backdrop"></div><aside v-if="tutorialActive" class="write-tutorial-guide"><button class="write-tutorial-close" @click="tutorialActive=false"><kbd>Esc</kbd><span>×</span></button><span class="eyebrow">{{ tutorialSteps[tutorialStep].eyebrow }}</span><h3>{{ tutorialSteps[tutorialStep].title }}</h3><p>{{ tutorialSteps[tutorialStep].text }}</p><div class="write-tutorial-dots"><i v-for="(_,index) in tutorialSteps" :key="index" :class="{active:index===tutorialStep}"></i></div><div class="write-tutorial-actions"><button v-if="tutorialStep" class="secondary-button" @click="previousWriteTutorial"><kbd>Backspace</kbd>이전</button><button class="primary-button" @click="nextWriteTutorial"><kbd>Space</kbd>{{ tutorialStep === tutorialSteps.length-1 ? '이야기 광장으로' : '다음' }} →</button></div></aside></div></template>

<style scoped>
.write-tutorial-backdrop{pointer-events:auto;cursor:pointer}
.write-tutorial-backdrop{position:fixed;z-index:60;inset:0;background:rgba(14,20,18,.58);pointer-events:none}.write-tutorial-focus{position:relative;z-index:70;padding:10px;margin:-10px;border-radius:14px;background:var(--surface);outline:3px solid color-mix(in srgb,var(--primary) 72%,white);outline-offset:4px}.write-tutorial-guide{position:fixed;z-index:90;left:50%;bottom:28px;transform:translateX(-50%);width:min(540px,calc(100vw - 32px));padding:25px 27px 22px;border:2px solid var(--ink);border-radius:22px;background:var(--surface);box-shadow:9px 11px 0 var(--ink)}.write-tutorial-guide h3{margin:0 76px 8px 0;font-size:23px}.write-tutorial-guide p{margin:0;color:var(--muted);font-size:14px;line-height:1.7}.write-tutorial-close{position:absolute;top:14px;right:14px;min-width:76px;height:34px;display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:17px;background:var(--surface-2);color:var(--ink)}.write-tutorial-close kbd,.write-tutorial-actions kbd{padding:3px 6px;border:1.5px solid currentColor;border-bottom-width:2px;border-radius:6px;background:color-mix(in srgb,currentColor 10%,transparent);font:900 11px Nunito}.write-tutorial-dots{display:flex;gap:6px;margin-top:18px}.write-tutorial-dots i{width:7px;height:7px;border-radius:10px;background:var(--line)}.write-tutorial-dots i.active{width:24px;background:var(--primary)}.write-tutorial-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:-18px}.write-tutorial-actions button{gap:8px;padding:11px 17px}@media(max-width:560px){.write-tutorial-guide{bottom:16px}.write-tutorial-actions{margin-top:14px}}
</style>
