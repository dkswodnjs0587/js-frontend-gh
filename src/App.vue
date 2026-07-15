<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { sendChatStream } from './services/api'

const router = useRouter()
const isDark = ref(false)
const menuOpen = ref(false)
const chatOpen = ref(false)
const chatText = ref('')
const isBotTyping = ref(false)
const isBotRevealing = ref(false)
const chatBody = ref(null)
const CHAT_HISTORY_KEY = 'localhub-chat-history'
const initialMessages = () => [{ from: 'bot', text: '안녕하세요! 서울에서 어디로 가볼까요? 장소나 일정에 대해 물어보세요.', actions: 'tutorial-entry' }]
function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY))
    return Array.isArray(saved) && saved.length ? saved : initialMessages()
  } catch {
    return initialMessages()
  }
}
const messages = ref(loadMessages())
const recommendedQuestions = [
  '오늘 가기 좋은 서울 관광지를 추천해줘',
  '이번 주에 열리는 서울 축제를 알려줘',
  '서울에서 하루 여행 코스를 짜줘',
  '서울의 모범 음식점을 추천해줘',
]

function scrollToLatest() {
  nextTick(() => {
    if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight
  })
}

onMounted(() => {
  isDark.value = localStorage.getItem('localhub-theme') === 'dark'
})
watch(isDark, (value) => {
  document.documentElement.dataset.theme = value ? 'dark' : 'light'
  localStorage.setItem('localhub-theme', value ? 'dark' : 'light')
}, { immediate: true })
watch(messages, (value) => {
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(value.slice(-100)))
  if (chatOpen.value) scrollToLatest()
}, { deep: true })
watch(chatOpen, (value) => { if (value) scrollToLatest() })

async function revealBotMessage(text, actions = null) {
  isBotRevealing.value = true
  const message = { from: 'bot', text: '', actions }
  messages.value.push(message)
  const answer = String(text || '')
  const characters = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(answer)].map(segment => segment.segment)
    : Array.from(answer)
  for (const character of characters) {
    message.text += character
    const pause = character === '\n' ? 65 : /[.!?。！？]/.test(character) ? 45 : /[,，]/.test(character) ? 28 : 14
    await new Promise(resolve => setTimeout(resolve, pause))
  }
  isBotRevealing.value = false
}

async function requestBotAnswer(text) {
  isBotTyping.value = true
  const streamMessage = { from: 'bot', text: '' }
  try {
    messages.value.push(streamMessage)
    await sendChatStream(text, {}, {
      async onToken(token) {
        isBotRevealing.value = true
        const characters = typeof Intl.Segmenter === 'function'
          ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(token)].map(segment => segment.segment)
          : Array.from(token)
        for (const character of characters) {
          streamMessage.text += character
          const pause = character === '\n' ? 65 : /[.!?。！？]/.test(character) ? 45 : /[,，]/.test(character) ? 28 : 14
          await new Promise(resolve => setTimeout(resolve, pause))
        }
      },
    })
  } catch (error) {
    if (!streamMessage.text) messages.value = messages.value.filter(message => message !== streamMessage)
    await revealBotMessage(error.unavailable ? '지금은 쓰프와 연결이 어렵습니다. 잠시 후 다시 물어봐 주세요.' : error.message, 'tutorial-entry')
  } finally {
    isBotRevealing.value = false
    isBotTyping.value = false
  }
}

async function sendMessage() {
  const text = chatText.value.trim()
  if (!text || isBotTyping.value) return
  messages.value.forEach(message => { if (message.actions) message.actions = null })
  messages.value.push({ from: 'user', text })
  chatText.value = ''
  await requestBotAnswer(text)
}

function showRecommendedQuestions() {
  messages.value.forEach(message => { if (message.actions) message.actions = null })
  messages.value.push({ from: 'user', text: '자주 묻는 질문' })
  messages.value.push({ from: 'bot', text: '어떤 서울 정보가 궁금하세요? 아래 질문에서 골라보세요.', actions: 'recommended-questions' })
}

function dismissRecommendedQuestions() {
  messages.value.forEach(message => { if (message.actions) message.actions = null })
  messages.value.push({ from: 'user', text: '괜찮아' })
  messages.value.push({ from: 'bot', text: '알겠어요! 궁금한 것이 생기면 언제든 편하게 물어봐 주세요.', actions: 'tutorial-entry' })
}

async function askRecommendedQuestion(question) {
  if (isBotTyping.value) return
  messages.value.forEach(message => { if (message.actions) message.actions = null })
  messages.value.push({ from: 'user', text: question })
  await requestBotAnswer(question)
}

async function openTutorial() {
  if (router.currentRoute.value.path === '/community') {
    window.dispatchEvent(new Event('localhub:start-community-tutorial'))
    return
  }
  await router.push('/')
  setTimeout(() => window.dispatchEvent(new Event('localhub:start-tutorial')), 0)
}

function askTutorial(message) {
  messages.value.forEach(item => { if (item.actions) item.actions = null })
  messages.value.push({ from: 'user', text: '사이트 튜토리얼' })
  messages.value.push({ from: 'bot', text: '어떤 튜토리얼을 원하세요?', actions: 'tutorial-choice' })
}

function dismissTutorialChoice(message) {
  message.actions = null
  messages.value.push({ from: 'user', text: '다음에 할게요' })
  messages.value.push({ from: 'bot', text: '괜찮아요! 필요하실 때 언제든 다시 찾아주세요.', actions: 'tutorial-entry' })
}

async function chooseTutorial(path, eventName, label) {
  messages.value.forEach(message => { if (message.actions === 'tutorial-choice') message.actions = null })
  messages.value.push({ from: 'user', text: `${label} 튜토리얼` })
  messages.value.push({ from: 'bot', text: '튜토리얼을 둘러본 뒤 저와 다시 이야기해 보세요.', actions: 'chat-start' })
  await new Promise(resolve => setTimeout(resolve, 220))
  chatOpen.value = false
  await router.push(path)
  setTimeout(() => window.dispatchEvent(new Event(eventName)), 0)
}

function startFreshChat() {
  messages.value.forEach(message => { if (message.actions === 'chat-start') message.actions = null })
  messages.value.push(...initialMessages())
  chatText.value = ''
  isBotTyping.value = false
}

function clearChatHistory() {
  messages.value = initialMessages()
  chatText.value = ''
  isBotTyping.value = false
}

function toggleChat() {
  if (!chatOpen.value) {
    const lastMessage = messages.value.at(-1)
    if (lastMessage?.from === 'user' && lastMessage.text?.endsWith('튜토리얼')) {
      messages.value.push({ from: 'bot', text: '튜토리얼을 둘러본 뒤 저와 다시 이야기해 보세요.', actions: 'chat-start' })
    }
  }
  chatOpen.value = !chatOpen.value
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <router-link to="/" class="brand" aria-label="LocalHub 홈">
        <span class="brand-mark">L</span>
        <span>LocalHub <b>Seoul</b></span>
      </router-link>
      <button :class="['icon-button', 'mobile-menu', { open: menuOpen }]" @click="menuOpen = !menuOpen" :aria-label="menuOpen ? '메뉴 닫기' : '메뉴 열기'" :aria-expanded="menuOpen"><span></span><span></span><span></span></button>
      <nav :class="{ open: menuOpen }" @click="menuOpen = false">
        <router-link to="/">동네 탐색</router-link>
        <router-link to="/community">이야기 광장</router-link>
      </nav>
      <button :class="['theme-toggle', { active: isDark }]" @click="isDark = !isDark" :aria-label="isDark ? '라이트 모드로 전환' : '다크 모드로 전환'" role="switch" :aria-checked="isDark">
        <span class="theme-thumb">{{ isDark ? '☾' : '☀' }}</span>
      </button>
    </header>
    <transition name="menu-fade"><button v-if="menuOpen" class="mobile-menu-backdrop" aria-label="메뉴 닫기" @click="menuOpen = false"></button></transition>

    <main><router-view /></main>

    <footer>
      <div class="footer-brand"><span class="brand-mark">L</span><div><strong>LocalHub Seoul</strong><p>서울의 장소와 이야기를 잇는 열린 동네 광장</p></div></div>
      <div class="footer-links"><router-link to="/community">커뮤니티</router-link><button class="footer-tutorial" @click="openTutorial">이용안내</button><a href="#">개인정보처리방침</a></div>
      <p class="copyright">© 2026 LocalHub. 공공데이터를 바탕으로 만들었습니다.</p>
    </footer>

    <button :class="['chat-fab', { open: chatOpen }]" @click="toggleChat" :aria-label="chatOpen ? '챗봇 닫기' : 'AI 챗봇 열기'">
      <span v-if="chatOpen" class="chat-close">×</span>
      <span v-else class="ai-bot-icon"><i class="bot-antenna"></i><i class="bot-eye left"></i><i class="bot-eye right"></i><i class="bot-smile"></i><b>AI</b></span>
    </button>
    <section v-if="chatOpen" class="chat-panel" aria-label="쓰프 챗봇">
      <div class="chat-head"><div class="bot-face"><span class="mini-bot">AI</span></div><div><strong>쓰프</strong><small>AI 서울 로컬 가이드 · 온라인</small></div><button class="chat-clear" @click="clearChatHistory">대화 내용 삭제</button><button class="chat-head-close" @click="chatOpen=false" aria-label="챗봇 닫기">×</button></div>
      <div ref="chatBody" class="chat-body" aria-live="polite">
        <div v-for="(message, index) in messages" :key="index" :class="['bubble', message.from, { 'has-actions': message.actions }]">
          <span class="chat-message-text">{{ message.text }}</span>
          <div v-if="message.actions === 'tutorial-entry'" class="chat-quick-actions"><button @click="askTutorial(message)">사이트 튜토리얼</button><button @click="showRecommendedQuestions">자주 묻는 질문</button></div>
          <div v-else-if="message.actions === 'recommended-questions'" class="chat-recommended-questions"><button v-for="question in recommendedQuestions" :key="question" @click="askRecommendedQuestion(question)">{{ question }}</button><button class="chat-recommend-dismiss" @click="dismissRecommendedQuestions">괜찮아</button></div>
          <div v-else-if="message.actions === 'tutorial-choice'" class="chat-tutorial-choices"><button @click="chooseTutorial('/', 'localhub:start-tutorial', '메인 페이지')">⌖ 메인 페이지</button><button @click="chooseTutorial('/community', 'localhub:start-community-tutorial', '이야기 광장')">▦ 이야기 광장</button><button class="chat-choice-close" @click="dismissTutorialChoice(message)" aria-label="튜토리얼 선택 닫기">×</button></div>
          <div v-else-if="message.actions === 'chat-start'" class="chat-quick-actions chat-start-action"><button @click="startFreshChat">대화 시작하기 <span>→</span></button></div>
        </div>
        <div v-if="isBotTyping && !isBotRevealing" class="bubble bot typing-bubble" aria-label="쓰프가 답변을 작성 중입니다"><i></i><i></i><i></i></div>
      </div>
      <form class="chat-input" @submit.prevent="sendMessage"><input v-model="chatText" :disabled="isBotTyping" placeholder="서울에 대해 물어보세요" aria-label="챗봇 메시지"/><button :disabled="isBotTyping">↑</button></form>
    </section>
  </div>
</template>
