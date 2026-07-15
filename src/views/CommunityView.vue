<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getComments, getPosts } from '../services/api'
import { formatPostTime } from '../utils/date'
const query = ref('')
const route = useRoute()
const router = useRouter()
const active = ref('전체')
const tutorialActive = ref(false)
const tutorialStep = ref(0)
const searchEl = ref(null)
const categoriesEl = ref(null)
const listEl = ref(null)
const writeEl = ref(null)
const tutorialSteps = [
  { target: 'search', eyebrow: 'STEP 1 · 이야기 검색', title: '궁금한 이야기를 찾아보세요', text: '제목과 본문을 기준으로 이야기 광장의 게시물을 빠르게 검색할 수 있어요.' },
  { target: 'categories', eyebrow: 'STEP 2 · 카테고리', title: '관심 주제만 골라보세요', text: '관광지, 문화시설, 축제, 여행코스 등 원하는 카테고리를 선택하면 관련 이야기만 볼 수 있어요.' },
  { target: 'list', eyebrow: 'STEP 3 · 최신 이야기', title: '게시글의 핵심 내용을 먼저 살펴보세요', text: '글 목록에서 제목과 간단한 내용, 작성자와 작성일을 확인할 수 있어요. 게시물은 최신순으로 정리되며, 다음 단계에서는 예시 글을 직접 열어 좋아요와 댓글 기능을 살펴봅니다.' },
  { target: 'write', eyebrow: 'STEP 5 · 글쓰기', title: '익명으로 이야기를 남겨보세요', text: '글쓰기 버튼을 눌러 질문, 추천, 여행 후기 등 나만의 서울 이야기를 자유롭게 작성할 수 있어요.' },
  { target: 'chatbot', eyebrow: 'STEP 6 · AI 챗봇', title: '여행 질문은 쓰프에게 물어보세요', text: '장소 추천이나 여행 일정이 궁금하면 우측 하단 AI 챗봇을 활용하세요. 서울에 관한 질문을 편하게 할 수 있어요.' },
]
const categories = [
  { label: '전체', color: '#6973c7' },
  { label: '관광지', color: '#ff7b6b' },
  { label: '문화시설', color: '#8b7cf6' },
  { label: '축제·공연', color: '#f3ab35' },
  { label: '여행코스', color: '#36a88d' },
  { label: '레포츠', color: '#4f8de8' },
  { label: '숙박', color: '#c77be5' },
  { label: '쇼핑', color: '#ef7199' },
]
const fallbackPosts = [
  { id: 1, category: '관광지', title: '이번 주말, 한강 피크닉 어디가 좋을까요?', content: '조용하고 노을 보기 좋은 한강공원을 찾고 있어요. 돗자리 펴기 좋은 곳 추천해주세요!', time: '12분 전', comments: 8 },
  { id: 2, category: '축제·공연', title: '서울숲 야외 공연 다녀오신 분?', content: '이번 주 공연 분위기랑 근처에서 저녁 먹기 좋은 곳도 궁금해요.', time: '34분 전', comments: 5 },
  { id: 3, category: '문화시설', title: '비 오는 날 가기 좋은 전시 추천해요', content: '서촌에서 우연히 발견한 작은 전시인데 공간도 작품도 정말 좋았어요.', time: '1시간 전', comments: 12 },
  { id: 4, category: '쇼핑', title: '망원동 소품샵 산책 코스 공유합니다', content: '망원시장부터 작은 소품샵까지 천천히 걷기 좋은 동선을 정리해봤어요.', time: '2시간 전', comments: 4 },
  { id: 5, category: '여행코스', title: '외국인 친구와 하루 서울 여행', content: '전통과 요즘 서울을 둘 다 보여주고 싶은데 추천 코스가 있을까요?', time: '3시간 전', comments: 15 },
  { id: 6, category: '숙박', title: '서울역 근처 조용한 숙소 후기', content: '교통도 편하고 골목 분위기도 괜찮았던 숙소 주변 정보를 남겨요.', time: '어제', comments: 7 },
]
const posts = ref(fallbackPosts)
const categoryById = { 12: '관광지', 14: '문화시설', 15: '축제·공연', 25: '여행코스', 28: '레포츠', 32: '숙박', 38: '쇼핑' }
const categoryIdByLabel = Object.fromEntries(Object.entries(categoryById).map(([id, label]) => [label, id]))
const filtered = computed(() => posts.value.filter(p => (active.value === '전체' || p.category === active.value) && (`${p.title} ${p.content}`.includes(query.value))))
const categoryColor = label => categories.find(category => category.label === label)?.color || '#6973c7'

function tutorialTarget() {
  const target = tutorialSteps[tutorialStep.value].target
  if (target === 'search') return searchEl.value
  if (target === 'categories') return categoriesEl.value
  if (target === 'list') return listEl.value?.querySelector('.board-row-content') || listEl.value
  if (target === 'write') return writeEl.value?.$el || writeEl.value
  return document.querySelector('.chat-fab')
}

async function showTutorialStep(step) {
  document.querySelector('.tutorial-external-focus')?.classList.remove('tutorial-external-focus')
  tutorialStep.value = step
  await nextTick()
  const target = tutorialTarget()
  if (!target) return
  if (tutorialSteps[step].target === 'chatbot') target.classList.add('tutorial-external-focus')
  const rect = target.getBoundingClientRect()
  const offset = tutorialSteps[step].target === 'list' ? 180 : Math.max(80, (window.innerHeight - rect.height) / 2)
  window.scrollTo({ top: window.scrollY + rect.top - offset, behavior: 'smooth' })
}

function startTutorial() { tutorialActive.value = true; showTutorialStep(0) }
function finishTutorial() { tutorialActive.value = false; document.querySelector('.tutorial-external-focus')?.classList.remove('tutorial-external-focus') }
function nextTutorialStep() {
  const currentStep = tutorialSteps[tutorialStep.value]
  const writeStepIndex = tutorialSteps.findIndex(step => step.target === 'write')
  if (currentStep.target === 'list' && tutorialStep.value === writeStepIndex - 1) {
    const examplePost = filtered.value[0]
    if (examplePost) {
      finishTutorial()
      router.push(`/posts/${examplePost.id}?tutorial=interaction`)
      return
    }
  }
  if (currentStep.target === 'write') {
    finishTutorial()
    router.push('/write?tutorial=1')
    return
  }
  tutorialStep.value === tutorialSteps.length - 1 ? finishTutorial() : showTutorialStep(tutorialStep.value + 1)
}
function previousTutorialStep() { if (tutorialStep.value > 0) showTutorialStep(tutorialStep.value - 1) }
function handleTutorialKeydown(event) {
  if (!tutorialActive.value || event.repeat) return
  if (event.key === 'Escape') { event.preventDefault(); finishTutorial(); return }
  if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"]')) return
  if (event.code === 'Space') { event.preventDefault(); nextTutorialStep(); return }
  if (event.key === 'Backspace' && tutorialStep.value > 0) { event.preventDefault(); previousTutorialStep() }
}

let postRequestId = 0
let postSearchTimer
async function hydrateCommentCounts(items, requestId) {
  const pending = items.filter(post => post.commentCount === null)
  let cursor = 0
  async function worker() {
    while (cursor < pending.length) {
      const post = pending[cursor++]
      try {
        const data = await getComments(post.id)
        if (requestId === postRequestId) post.commentCount = Number(data?.total ?? data?.items?.length ?? 0)
      } catch { if (requestId === postRequestId) post.commentCount = 0 }
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, pending.length) }, worker))
}

async function loadPosts() {
  const requestId = ++postRequestId
  try {
    const data = await getPosts({
      contentTypeId: categoryIdByLabel[active.value],
      keyword: query.value.trim(),
      page: 1,
      size: 100,
    })
    if (requestId !== postRequestId) return
    posts.value = (data?.items || []).sort((a, b) => new Date(b.createdtime) - new Date(a.createdtime)).map(post => ({
      ...post,
      category: categoryById[post.contentTypeId] || '관광지',
      time: formatPostTime(post.createdtime),
      viewCount: Number(post.viewCount ?? post.views ?? post.hit ?? 0),
      likeCount: Number(post.likeCount ?? post.likes ?? 0),
      commentCount: post.commentCount != null ? Number(post.commentCount) : post.commentsCount != null ? Number(post.commentsCount) : Array.isArray(post.comments) ? post.comments.length : null,
    }))
    hydrateCommentCounts(posts.value, requestId)
  } catch (error) {
    if (!error.unavailable) console.warn(error.message)
  }
}
watch([query, active], () => {
  clearTimeout(postSearchTimer)
  postSearchTimer = setTimeout(loadPosts, 220)
})
onMounted(() => { window.addEventListener('keydown', handleTutorialKeydown); window.addEventListener('localhub:start-community-tutorial', startTutorial) })
onMounted(async () => {
  loadPosts()
  if (route.query.tutorial === 'chatbot') {
    tutorialActive.value = true
    showTutorialStep(tutorialSteps.findIndex(step => step.target === 'chatbot'))
    router.replace('/community')
  } else if (route.query.tutorial === 'write') {
    tutorialActive.value = true
    showTutorialStep(tutorialSteps.findIndex(step => step.target === 'write'))
    router.replace('/community')
  } else if (route.query.tutorial === 'interaction') {
    const writeStepIndex = tutorialSteps.findIndex(step => step.target === 'write')
    tutorialStep.value = writeStepIndex - 1
    tutorialActive.value = true
    await router.replace('/community')
    await nextTick()
    await showTutorialStep(writeStepIndex - 1)
  }
})
onBeforeUnmount(() => { clearTimeout(postSearchTimer); window.removeEventListener('keydown', handleTutorialKeydown); window.removeEventListener('localhub:start-community-tutorial', startTutorial); finishTutorial() })
</script>
<template>
  <div class="subpage page-section">
    <div class="subpage-head"><span class="eyebrow">LOCAL STORIES</span><h1>서울 이야기 광장</h1><p>이름 대신 이야기로 만나는, 모두의 서울 커뮤니티</p></div>
    <div class="board-tools"><label ref="searchEl" :class="['search-box', { 'community-tutorial-focus': tutorialActive && tutorialSteps[tutorialStep].target === 'search' }]">⌕<input v-model="query" placeholder="궁금한 이야기를 검색해보세요" /></label><router-link ref="writeEl" to="/write" :class="['primary-button', { 'community-tutorial-focus': tutorialActive && tutorialSteps[tutorialStep].target === 'write' }]">＋ 글쓰기</router-link><button class="community-help" @click="startTutorial" aria-label="이야기 광장 이용 안내">?</button></div>
    <div ref="categoriesEl" :class="['category-tabs', { 'community-tutorial-focus': tutorialActive && tutorialSteps[tutorialStep].target === 'categories' }]"><button v-for="category in categories" :key="category.label" :class="{ active: active === category.label, 'all-category': category.label === '전체' }" :style="{ '--category': category.color }" @click="active = category.label"><i></i>{{ category.label }}</button></div>
    <div ref="listEl" class="board-list"><router-link v-for="(post, index) in filtered" :key="post.id" :to="`/posts/${post.id}`" class="board-row"><span :class="['post-category', { 'tutorial-category-focus': tutorialActive && tutorialSteps[tutorialStep].target === 'list' && index === 0 }]" :style="{ '--tag': categoryColor(post.category) }">{{ post.category }}</span><div :class="['board-row-content', { 'community-tutorial-focus tutorial-post-content': tutorialActive && tutorialSteps[tutorialStep].target === 'list' && index === 0 }]"><h3>{{ post.title }}</h3><p>{{ post.content }}</p><div class="board-row-footer"><small>익명의 서울러 · {{ post.time }}</small><div class="post-stats" aria-label="게시글 반응"><span title="조회수">👁 {{ post.viewCount ?? 0 }}</span><span title="댓글 수">💬 {{ post.commentCount ?? post.comments ?? 0 }}</span><span title="좋아요">♡ {{ post.likeCount ?? 0 }}</span></div></div></div></router-link><div v-if="!filtered.length" class="empty-state">찾는 이야기가 아직 없어요.</div></div>
    <div v-if="tutorialActive" class="community-tutorial-backdrop" aria-hidden="true" @click="nextTutorialStep"></div>
    <aside v-if="tutorialActive" :class="['community-tutorial-guide', { 'chatbot-step': tutorialSteps[tutorialStep].target === 'chatbot' }]" role="dialog" aria-live="polite" aria-label="이야기 광장 튜토리얼"><button class="community-tutorial-close" @click="finishTutorial"><kbd>Esc</kbd><span>×</span></button><span class="eyebrow">{{ tutorialSteps[tutorialStep].eyebrow }}</span><h3>{{ tutorialSteps[tutorialStep].title }}</h3><p>{{ tutorialSteps[tutorialStep].text }}</p><div class="community-tutorial-dots"><i v-for="(_, index) in tutorialSteps" :key="index" :class="{ active:index === tutorialStep }"></i></div><div class="community-tutorial-actions"><button v-if="tutorialStep" class="secondary-button" @click="previousTutorialStep"><kbd>Backspace</kbd>이전</button><button class="primary-button" @click="nextTutorialStep"><kbd>Space</kbd>{{ tutorialStep === tutorialSteps.length - 1 ? '사이트 이용하기' : '다음' }} <span>→</span></button></div></aside>
  </div>
</template>

<style scoped>
.community-help{flex:0 0 50px;width:50px;height:50px;border:2px solid var(--ink);border-radius:15px;background:var(--yellow);color:#55471f;font:900 20px Nunito;box-shadow:4px 5px 0 var(--ink);transition:transform .2s ease,box-shadow .2s ease}.community-help:hover{transform:translateY(-2px) rotate(4deg);box-shadow:6px 7px 0 var(--ink)}.community-tutorial-backdrop{position:fixed;z-index:60;inset:0;background:rgba(14,20,18,.58);pointer-events:none}.community-tutorial-focus{position:relative;z-index:70;outline:3px solid color-mix(in srgb,var(--primary) 72%,white);outline-offset:5px;border-radius:15px}.community-tutorial-guide{position:fixed;z-index:90;left:50%;bottom:28px;transform:translateX(-50%);width:min(520px,calc(100vw - 32px));padding:25px 27px 22px;border:2px solid var(--ink);border-radius:22px;background:var(--surface);color:var(--ink);box-shadow:9px 11px 0 var(--ink),0 25px 80px rgba(0,0,0,.32)}.community-tutorial-guide h3{margin:0 76px 8px 0;font-size:23px}.community-tutorial-guide p{margin:0;color:var(--muted);font-size:14px;line-height:1.7}.community-tutorial-close{position:absolute;top:14px;right:14px;min-width:76px;height:34px;padding:0 10px;display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:17px;background:var(--surface-2);color:var(--ink)}.community-tutorial-close span{font-size:21px}.community-tutorial-close kbd,.community-tutorial-actions kbd{padding:3px 6px;border:1.5px solid currentColor;border-bottom-width:2px;border-radius:6px;background:color-mix(in srgb,currentColor 10%,transparent);font:900 11px Nunito;line-height:1}.community-tutorial-dots{display:flex;gap:6px;margin-top:18px}.community-tutorial-dots i{width:7px;height:7px;border-radius:10px;background:var(--line)}.community-tutorial-dots i.active{width:24px;background:var(--primary)}.community-tutorial-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:-18px}.community-tutorial-actions button{gap:8px;padding:11px 17px}.community-tutorial-actions .secondary-button{border:1px solid var(--line)}
@media(max-width:850px){.board-tools{display:grid;grid-template-columns:1fr 50px}.board-tools .search-box{grid-column:1/-1}.board-tools .primary-button{justify-self:end}.community-help{grid-column:2}.community-tutorial-guide{bottom:16px}.community-tutorial-actions{margin-top:14px}.community-tutorial-dots{margin-top:14px}}
@media(max-width:560px){.subpage{padding-top:50px}.subpage-head{margin-bottom:30px}.board-tools{gap:10px;margin-bottom:18px}.category-tabs{gap:7px;margin-bottom:8px}.board-list{display:grid;gap:11px;border-top:0}.board-row{display:block;padding:17px 16px;border:1px solid var(--line);border-radius:15px;background:var(--surface);box-shadow:0 4px 14px rgba(35,40,55,.05);transition:transform .18s ease,border-color .18s ease}.board-row:active{transform:scale(.985);border-color:color-mix(in srgb,var(--primary) 45%,var(--line))}.board-row>.post-category{display:inline-flex;width:auto;margin:0 0 10px;padding:4px 9px;font-size:11px}.board-row h3{margin:0 0 9px;font-size:16px;line-height:1.45;letter-spacing:-.3px;overflow-wrap:anywhere}.board-row p{display:-webkit-box;height:auto;margin:0 0 11px;font-size:13px;line-height:1.55;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.board-row small{display:block;padding-top:10px;border-top:1px solid var(--line);font-size:11px;line-height:1.3}.empty-state{padding:60px 16px;border:1px solid var(--line);border-radius:15px;background:var(--surface)}}
.community-help{border-color:color-mix(in srgb,var(--primary) 65%,var(--ink));background:color-mix(in srgb,var(--primary) 18%,var(--surface));color:var(--primary);box-shadow:4px 5px 0 color-mix(in srgb,var(--primary) 38%,var(--ink))}.community-help:hover{background:color-mix(in srgb,var(--primary) 25%,var(--surface));box-shadow:6px 7px 0 color-mix(in srgb,var(--primary) 42%,var(--ink))}
.community-help,.community-help:hover{box-shadow:none}
.community-tutorial-backdrop{pointer-events:auto;cursor:pointer}
.tutorial-post-content{background:#fff;color:#26352f;padding:12px;margin:-12px;border-radius:14px}.tutorial-post-content p,.tutorial-post-content small,.tutorial-post-content .post-stats{color:#69736e}.tutorial-category-focus{position:relative;z-index:70;background:#fff!important;color:var(--tag)!important;outline:3px solid color-mix(in srgb,var(--tag) 72%,white);outline-offset:3px;border:1px solid var(--tag)!important}
.board-row-content{min-width:0}.board-row-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;width:100%}.post-stats{display:flex;align-items:center;justify-content:flex-end;gap:13px;margin-left:auto;color:var(--muted);font:800 12px Nunito;line-height:1.3;white-space:nowrap}.post-stats span:last-child{color:var(--primary)}
@media(max-width:560px){.post-stats{justify-content:flex-end;margin-top:10px;padding-top:9px;border-top:1px solid var(--line)}.board-row small{border-top:0!important;padding-top:0!important}}
@media(max-width:560px){.board-row{display:grid;grid-template-columns:1fr;align-items:end}.board-row>.post-category{grid-column:1}.board-row>.board-row-content{grid-column:1;width:100%}.board-row-footer{align-items:flex-end}.board-row-footer .post-stats{min-width:0;margin:0 0 0 auto;padding:0;border:0}}
</style>
