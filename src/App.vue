<script setup>
import { onMounted, ref, watch } from 'vue'
import { sendChat } from './services/api'

const isDark = ref(false)
const menuOpen = ref(false)
const chatOpen = ref(false)
const chatText = ref('')
const isBotTyping = ref(false)
const messages = ref([{ from: 'bot', text: '안녕하세요! 서울에서 어디로 가볼까요? 장소나 일정에 대해 물어보세요.' }])

onMounted(() => {
  isDark.value = localStorage.getItem('localhub-theme') === 'dark'
})
watch(isDark, (value) => {
  document.documentElement.dataset.theme = value ? 'dark' : 'light'
  localStorage.setItem('localhub-theme', value ? 'dark' : 'light')
}, { immediate: true })

async function sendMessage() {
  const text = chatText.value.trim()
  if (!text || isBotTyping.value) return
  messages.value.push({ from: 'user', text })
  chatText.value = ''
  isBotTyping.value = true
  try {
    const data = await sendChat(text, {})
    messages.value.push({ from: 'bot', text: data.answer })
  } catch (error) {
    messages.value.push({ from: 'bot', text: error.unavailable ? '지금은 쓰프와 연결이 어렵습니다. 잠시 후 다시 물어봐 주세요.' : error.message })
  } finally {
    isBotTyping.value = false
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <router-link to="/" class="brand" aria-label="LocalHub 홈">
        <span class="brand-mark">L</span>
        <span>LocalHub <b>Seoul</b></span>
      </router-link>
      <button class="icon-button mobile-menu" @click="menuOpen = !menuOpen" aria-label="메뉴 열기">☰</button>
      <nav :class="{ open: menuOpen }" @click="menuOpen = false">
        <router-link to="/">동네 탐색</router-link>
        <router-link to="/community">이야기 광장</router-link>
      </nav>
      <button :class="['theme-toggle', { active: isDark }]" @click="isDark = !isDark" :aria-label="isDark ? '라이트 모드로 전환' : '다크 모드로 전환'" role="switch" :aria-checked="isDark">
        <span class="theme-thumb">{{ isDark ? '☾' : '☀' }}</span>
      </button>
    </header>

    <main><router-view /></main>

    <footer>
      <div class="footer-brand"><span class="brand-mark">L</span><div><strong>LocalHub Seoul</strong><p>서울의 장소와 이야기를 잇는 열린 동네 광장</p></div></div>
      <div class="footer-links"><router-link to="/community">커뮤니티</router-link><a href="#">이용안내</a><a href="#">개인정보처리방침</a></div>
      <p class="copyright">© 2026 LocalHub. 공공데이터를 바탕으로 만들었습니다.</p>
    </footer>

    <button class="chat-fab" @click="chatOpen = !chatOpen" aria-label="쓰프 챗봇 열기">{{ chatOpen ? '×' : '✦' }}</button>
    <section v-if="chatOpen" class="chat-panel" aria-label="쓰프 챗봇">
      <div class="chat-head"><div class="bot-face">✦</div><div><strong>쓰프</strong><small>서울 로컬 가이드 · 온라인</small></div><button @click="chatOpen=false">×</button></div>
      <div class="chat-body">
        <div v-for="(message, index) in messages" :key="index" :class="['bubble', message.from]">{{ message.text }}</div>
        <div v-if="isBotTyping" class="bubble bot typing-bubble" aria-label="쓰프가 답변을 작성 중입니다"><i></i><i></i><i></i></div>
      </div>
      <form class="chat-input" @submit.prevent="sendMessage"><input v-model="chatText" :disabled="isBotTyping" placeholder="서울에 대해 물어보세요" aria-label="챗봇 메시지"/><button :disabled="isBotTyping">↑</button></form>
    </section>
  </div>
</template>
