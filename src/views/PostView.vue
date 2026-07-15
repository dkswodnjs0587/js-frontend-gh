<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createComment, deleteComment, deletePost, getComments, getPost, likePost } from '../services/api'
import { formatPostTime } from '../utils/date'

const route = useRoute()
const router = useRouter()
const action = ref('')
const password = ref('')
const error = ref('')
const deleting = ref(false)
const loading = ref(true)
const liking = ref(false)
const likeError = ref('')
const liked = ref(localStorage.getItem(`localhub-liked-post-${route.params.id}`) === '1')
const comments = ref([])
const commentText = ref('')
const commentPassword = ref('')
const commentLoading = ref(true)
const commentSubmitting = ref(false)
const commentError = ref('')
const commentToDelete = ref(null)
const commentDeletePassword = ref('')
const commentDeleting = ref(false)
const commentDeleteError = ref('')
const interactionTutorialActive = ref(false)
const interactionTutorialStep = ref(0)
const likeButtonEl = ref(null)
const commentSectionEl = ref(null)
const interactionTutorialSteps = [
  { eyebrow: 'STEP 4-1 · 좋아요', title: '좋은 이야기에는 마음을 표현해보세요', text: '좋아요 버튼을 누르면 이 글에 공감한 마음을 남길 수 있어요. 다시 누르면 좋아요를 취소할 수도 있어요.' },
  { eyebrow: 'STEP 4-2 · 댓글', title: '댓글로 이야기를 이어가보세요', text: '댓글 입력 칸에 내용을 적고 숫자 4자리 비밀번호를 설정해 등록하세요. 자신이 작성한 댓글은 같은 비밀번호로 삭제할 수 있어요.' },
]
const post = ref({ id: route.params.id, contentTypeId: 12, title: '이번 주말, 한강 피크닉 어디가 좋을까요?', content: '조용하고 노을 보기 좋은 한강공원을 찾고 있어요. 돗자리 펴기 좋고 산책도 함께 할 수 있는 곳이면 좋겠습니다.\n\n여의도는 자주 가봐서 이번에는 다른 동네의 한강공원을 만나보고 싶어요.', createdtime: '2026-07-14 00:00:00' })
const categories = { 12: ['관광지', '#ff7b6b'], 14: ['문화시설', '#8b7cf6'], 15: ['축제·공연', '#f3ab35'], 25: ['여행코스', '#36a88d'], 28: ['레포츠', '#4f8de8'], 32: ['숙박', '#c77be5'], 38: ['쇼핑', '#ef7199'] }
const category = computed(() => categories[post.value.contentTypeId] || ['기타', '#6973c7'])

onMounted(async () => {
  if (route.query.tutorial === 'interaction') {
    interactionTutorialActive.value = true
    await nextTick()
    showInteractionTutorialStep(0)
  }
  try {
    const loaded = await getPost(route.params.id)
    post.value = {
      ...loaded,
      viewCount: Number(loaded.viewCount ?? loaded.views ?? loaded.hit ?? 0),
      likeCount: Number(loaded.likeCount ?? loaded.likes ?? 0),
    }
  }
  catch (apiError) { if (!apiError.unavailable) error.value = apiError.message }
  finally { loading.value = false }
  await loadComments()
})

async function showInteractionTutorialStep(step) {
  interactionTutorialStep.value = step
  await nextTick()
  const target = step === 0 ? likeButtonEl.value : commentSectionEl.value
  if (!target) return
  const rect = target.getBoundingClientRect()
  window.scrollTo({ top: window.scrollY + rect.top - Math.max(90, (window.innerHeight - rect.height) / 2), behavior: 'smooth' })
}

function finishInteractionTutorial() {
  interactionTutorialActive.value = false
  router.push('/community?tutorial=write')
}

function nextInteractionTutorial() {
  interactionTutorialStep.value === interactionTutorialSteps.length - 1 ? finishInteractionTutorial() : showInteractionTutorialStep(interactionTutorialStep.value + 1)
}

function previousInteractionTutorial() {
  if (interactionTutorialStep.value > 0) showInteractionTutorialStep(interactionTutorialStep.value - 1)
  else {
    router.push('/community?tutorial=interaction')
  }
}

function handleInteractionTutorialKeydown(event) {
  if (!interactionTutorialActive.value || event.repeat) return
  if (event.key === 'Escape') { event.preventDefault(); finishInteractionTutorial(); return }
  if (event.code === 'Space') { event.preventDefault(); nextInteractionTutorial(); return }
  if (event.key === 'Backspace') { event.preventDefault(); previousInteractionTutorial() }
}

onMounted(() => window.addEventListener('keydown', handleInteractionTutorialKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleInteractionTutorialKeydown))

async function loadComments() {
  commentLoading.value = true
  try {
    const data = await getComments(route.params.id)
    const items = Array.isArray(data) ? data : (data?.items || [])
    comments.value = items.map(comment => ({
      ...comment,
      time: formatPostTime(comment.createdtime ?? comment.createdAt),
    }))
    commentError.value = ''
  } catch (apiError) {
    commentError.value = apiError.status === 404 ? '댓글 기능이 아직 백엔드에 배포되지 않았어요.' : apiError.message
  } finally {
    commentLoading.value = false
  }
}

async function submitComment() {
  const content = commentText.value.trim()
  if (!content || commentSubmitting.value) return
  if (!/^\d{4}$/.test(commentPassword.value)) {
    commentError.value = '댓글 비밀번호는 숫자 4자리로 입력해주세요.'
    return
  }
  commentSubmitting.value = true
  commentError.value = ''
  try {
    await createComment(route.params.id, content, commentPassword.value)
    commentText.value = ''
    commentPassword.value = ''
    await loadComments()
  } catch (apiError) {
    commentError.value = apiError.status === 404 ? '댓글 기능이 아직 백엔드에 배포되지 않았어요.' : apiError.message
  } finally {
    commentSubmitting.value = false
  }
}

function openCommentDelete(comment) {
  commentToDelete.value = comment
  commentDeletePassword.value = ''
  commentDeleteError.value = ''
}

function closeCommentDelete() {
  commentToDelete.value = null
  commentDeletePassword.value = ''
  commentDeleteError.value = ''
}

async function confirmCommentDelete() {
  if (!/^\d{4}$/.test(commentDeletePassword.value)) {
    commentDeleteError.value = '숫자 4자리 비밀번호를 입력해주세요.'
    return
  }
  commentDeleting.value = true
  try {
    await deleteComment(route.params.id, commentToDelete.value.id, commentDeletePassword.value)
    closeCommentDelete()
    await loadComments()
  } catch (apiError) {
    commentDeleteError.value = apiError.message
  } finally {
    commentDeleting.value = false
  }
}

async function addLike() {
  if (liking.value) return
  liking.value = true
  likeError.value = ''
  try {
    const nextLiked = !liked.value
    const result = await likePost(route.params.id, nextLiked)
    post.value.likeCount = Number(result?.likeCount ?? result?.likes ?? result?.count ?? Math.max(0, Number(post.value.likeCount || 0) + (nextLiked ? 1 : -1)))
    liked.value = result?.liked ?? nextLiked
    if (liked.value) localStorage.setItem(`localhub-liked-post-${route.params.id}`, '1')
    else localStorage.removeItem(`localhub-liked-post-${route.params.id}`)
  } catch (apiError) {
    likeError.value = apiError.status === 404 ? '좋아요 기능이 아직 백엔드에 배포되지 않았어요.' : apiError.message
  } finally {
    liking.value = false
  }
}

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
  if (!/^\d{4}$/.test(password.value)) {
    error.value = '비밀번호는 숫자 4자리로 입력해주세요.'
    return
  }
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
        <span class="detail-views">◉ 조회 {{ post.viewCount ?? 0 }}</span>
        <div class="post-manage"><button @click="openPassword('edit')">수정</button><button class="delete" @click="openPassword('delete')">삭제</button></div>
      </div>
      <p v-for="(paragraph, index) in String(post.content || '').split(/\n{2,}/)" :key="index">{{ paragraph }}</p>
      <div class="post-like-area"><button ref="likeButtonEl" :class="['post-like-button', { liked, 'interaction-tutorial-focus': interactionTutorialActive && interactionTutorialStep === 0 }]" :disabled="liking" @click="addLike"><span>{{ liked ? '♥' : '♡' }}</span>{{ liking ? '반영 중…' : liked ? '좋아요 취소' : '좋아요' }} <b>{{ post.likeCount ?? 0 }}</b></button><small v-if="likeError" class="like-error">{{ likeError }}</small></div>
    </article>

    <section ref="commentSectionEl" :class="['comment-section', { 'interaction-tutorial-focus': interactionTutorialActive && interactionTutorialStep === 1 }]" aria-labelledby="comment-title">
      <div class="comment-heading"><div><span class="eyebrow">COMMENTS</span><h2 id="comment-title">댓글 <em>{{ comments.length }}</em></h2></div><small>서로를 배려하는 이야기를 남겨주세요.</small></div>
      <form class="comment-form" @submit.prevent="submitComment"><textarea v-model="commentText" rows="3" maxlength="500" placeholder="이야기에 댓글을 남겨보세요" aria-label="댓글 내용"></textarea><div class="comment-form-footer"><small>{{ commentText.length }}/500</small><label>비밀번호<input v-model="commentPassword" type="password" inputmode="numeric" maxlength="4" placeholder="숫자 4자리" @input="commentPassword = $event.target.value.replace(/\D/g, '').slice(0, 4)" /></label><button class="primary-button" :disabled="commentSubmitting || !commentText.trim()">{{ commentSubmitting ? '등록 중…' : '댓글 등록' }}</button></div></form>
      <p v-if="commentError" class="comment-notice">{{ commentError }}</p>
      <div v-if="commentLoading" class="comment-empty">댓글을 불러오는 중이에요.</div>
      <div v-else-if="comments.length" class="comment-list"><article v-for="comment in comments" :key="comment.id" class="comment-item"><div><strong>익명의 서울러</strong><time>{{ comment.time }}</time><button class="comment-delete-button" @click="openCommentDelete(comment)">삭제</button></div><p>{{ comment.content }}</p><form v-if="commentToDelete?.id === comment.id" class="comment-delete-form" @submit.prevent="confirmCommentDelete"><input v-model="commentDeletePassword" type="password" inputmode="numeric" maxlength="4" placeholder="댓글 비밀번호 숫자 4자리" @input="commentDeletePassword = $event.target.value.replace(/\D/g, '').slice(0, 4)" autofocus /><button type="button" @click="closeCommentDelete">취소</button><button class="delete-confirm" :disabled="commentDeleting">{{ commentDeleting ? '삭제 중…' : '삭제' }}</button><small v-if="commentDeleteError">{{ commentDeleteError }}</small></form></article></div>
      <div v-else-if="!commentError" class="comment-empty">아직 댓글이 없어요. 첫 댓글을 남겨보세요!</div>
    </section>

    <div v-if="interactionTutorialActive" class="interaction-tutorial-backdrop" aria-hidden="true" @click="nextInteractionTutorial"></div>
    <aside v-if="interactionTutorialActive" class="interaction-tutorial-guide" role="dialog" aria-live="polite" aria-label="게시글 반응 기능 안내"><button class="interaction-tutorial-close" @click="finishInteractionTutorial"><kbd>Esc</kbd><span>×</span></button><span class="eyebrow">{{ interactionTutorialSteps[interactionTutorialStep].eyebrow }}</span><h3>{{ interactionTutorialSteps[interactionTutorialStep].title }}</h3><p>{{ interactionTutorialSteps[interactionTutorialStep].text }}</p><div class="interaction-tutorial-dots"><i v-for="(_, index) in interactionTutorialSteps" :key="index" :class="{ active: index === interactionTutorialStep }"></i></div><div class="interaction-tutorial-actions"><button class="secondary-button" @click="previousInteractionTutorial"><kbd>Backspace</kbd>이전</button><button class="primary-button" @click="nextInteractionTutorial"><kbd>Space</kbd>{{ interactionTutorialStep === interactionTutorialSteps.length - 1 ? '글쓰기 안내로' : '다음' }} <span>→</span></button></div></aside>

    <div v-if="action" class="password-backdrop" @click.self="closePassword">
      <form class="password-dialog" @submit.prevent="confirmPassword">
        <button type="button" class="dialog-close" @click="closePassword" aria-label="닫기">×</button>
        <span class="dialog-icon">{{ action === 'delete' ? '!' : '✎' }}</span>
        <h2>{{ action === 'delete' ? '게시글을 삭제할까요?' : '게시글을 수정할까요?' }}</h2>
        <p>작성할 때 입력한 비밀번호를 확인합니다.</p>
        <label>비밀번호<input v-model="password" required type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autofocus placeholder="숫자 4자리 입력" @input="password = $event.target.value.replace(/\D/g, '').slice(0, 4)" /></label>
        <small v-if="error" class="password-error">{{ error }}</small>
        <small v-else class="password-hint">작성할 때 사용한 숫자 4자리 비밀번호를 입력해주세요.</small>
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
.detail-meta{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.detail-views{color:var(--muted);font-size:12px}.post-manage{margin-left:auto}.post-like-area{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:38px;padding-top:25px;border-top:1px solid var(--line)}.post-like-button{display:inline-flex;align-items:center;gap:8px;padding:11px 17px;border:1px solid color-mix(in srgb,var(--primary) 42%,var(--line));border-radius:99px;background:color-mix(in srgb,var(--primary) 8%,var(--surface));color:var(--primary);font-weight:800}.post-like-button span{font-size:20px;line-height:1}.post-like-button b{font:900 13px Nunito}.post-like-button:hover:not(:disabled){transform:translateY(-2px);background:color-mix(in srgb,var(--primary) 15%,var(--surface))}.post-like-button.liked{background:var(--primary);color:#fff}.post-like-button:disabled{cursor:default}.like-error{color:#d75b5b;text-align:center}
.comment-section{margin-top:22px;padding:28px 30px;border:1px solid var(--line);border-radius:20px;background:var(--surface)}.comment-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}.comment-heading .eyebrow{margin-bottom:3px}.comment-heading h2{margin:0;font-size:23px}.comment-heading h2 em{color:var(--primary);font-style:normal}.comment-heading>small{color:var(--muted)}.comment-form{padding:15px;border:1px solid var(--line);border-radius:15px;background:var(--bg)}.comment-form textarea{display:block;width:100%;padding:0;border:0;outline:0;resize:vertical;background:transparent;color:var(--ink);line-height:1.7}.comment-form>div{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:10px}.comment-form small{color:var(--muted)}.comment-form .primary-button{padding:10px 16px}.comment-form button:disabled{opacity:.5;cursor:default}.comment-list{margin-top:20px}.comment-item{padding:18px 4px;border-top:1px solid var(--line)}.comment-item>div{display:flex;align-items:center;gap:10px}.comment-item strong{font-size:14px}.comment-item time{color:var(--muted);font-size:11px}.comment-item p{margin:9px 0 0;white-space:pre-wrap;line-height:1.7;font-size:14px}.comment-empty,.comment-notice{margin:18px 0 0;padding:22px;border-radius:13px;background:var(--surface-2);color:var(--muted);text-align:center}.comment-notice{color:#c85858;background:color-mix(in srgb,#e66 8%,var(--surface))}@media(max-width:560px){.comment-section{padding:21px 18px}.comment-heading{display:block}.comment-heading>small{display:block;margin-top:5px}.comment-form>div{justify-content:space-between}}
.comment-form-footer label{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:12px}.comment-form-footer input,.comment-delete-form input{width:118px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);outline:0}.comment-delete-button{margin-left:auto;border:0;background:transparent;color:var(--muted);font-size:11px}.comment-delete-button:hover{color:#d45b5b}.comment-delete-form{display:grid;grid-template-columns:1fr auto auto;gap:7px;margin-top:12px;padding:10px;border-radius:11px;background:var(--surface-2)}.comment-delete-form input{width:100%}.comment-delete-form button{padding:7px 10px;border:0;border-radius:8px;background:var(--surface);color:var(--ink)}.comment-delete-form .delete-confirm{background:#d95d5d;color:#fff}.comment-delete-form small{grid-column:1/-1;color:#d45b5b}@media(max-width:560px){.comment-form-footer{flex-wrap:wrap}.comment-form-footer>small{margin-right:auto}.comment-delete-form{grid-template-columns:1fr auto}.comment-delete-form input{grid-column:1/-1}}
.interaction-tutorial-backdrop{position:fixed;z-index:60;inset:0;background:rgba(14,20,18,.58);cursor:pointer}.interaction-tutorial-focus{position:relative;z-index:70;outline:3px solid color-mix(in srgb,var(--primary) 72%,white);outline-offset:6px;border-radius:16px;background:var(--surface)}.interaction-tutorial-guide{position:fixed;z-index:90;left:50%;bottom:28px;transform:translateX(-50%);width:min(520px,calc(100vw - 32px));padding:25px 27px 22px;border:2px solid var(--ink);border-radius:22px;background:var(--surface);color:var(--ink);box-shadow:9px 11px 0 var(--ink),0 25px 80px rgba(0,0,0,.32)}.interaction-tutorial-guide h3{margin:0 76px 8px 0;font-size:23px}.interaction-tutorial-guide p{margin:0;color:var(--muted);font-size:14px;line-height:1.7}.interaction-tutorial-close{position:absolute;top:14px;right:14px;min-width:76px;height:34px;padding:0 10px;display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:17px;background:var(--surface-2);color:var(--ink)}.interaction-tutorial-close span{font-size:21px}.interaction-tutorial-close kbd,.interaction-tutorial-actions kbd{padding:3px 6px;border:1.5px solid currentColor;border-bottom-width:2px;border-radius:6px;background:color-mix(in srgb,currentColor 10%,transparent);font:900 11px Nunito;line-height:1}.interaction-tutorial-dots{display:flex;gap:6px;margin-top:18px}.interaction-tutorial-dots i{width:7px;height:7px;border-radius:10px;background:var(--line)}.interaction-tutorial-dots i.active{width:24px;background:var(--primary)}.interaction-tutorial-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:-18px}.interaction-tutorial-actions button{gap:8px;padding:11px 17px}.interaction-tutorial-actions .secondary-button{border:1px solid var(--line)}@media(max-width:560px){.interaction-tutorial-guide{bottom:16px;padding:21px 20px 18px}.interaction-tutorial-guide h3{font-size:20px}.interaction-tutorial-actions{margin-top:14px}.interaction-tutorial-dots{margin-top:14px}.interaction-tutorial-close kbd,.interaction-tutorial-actions kbd{display:none}}
.post-like-button.interaction-tutorial-focus{border-radius:99px;background:color-mix(in srgb,var(--primary) 8%,var(--surface))}.post-like-button.liked.interaction-tutorial-focus{background:var(--primary)}
</style>
