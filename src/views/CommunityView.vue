<script setup>
import { computed, onMounted, ref } from 'vue'
import { getPosts } from '../services/api'
const query = ref('')
const active = ref('전체')
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
const formatTime = value => value ? String(value).slice(0, 10).replaceAll('-', '.') : ''
const filtered = computed(() => posts.value.filter(p => (active.value === '전체' || p.category === active.value) && (`${p.title} ${p.content}`.includes(query.value))))
const categoryColor = label => categories.find(category => category.label === label)?.color || '#6973c7'

onMounted(async () => {
  try {
    const data = await getPosts({ page: 1, size: 100 })
    posts.value = (data?.items || []).map(post => ({
      ...post,
      category: categoryById[post.contentTypeId] || '관광지',
      time: formatTime(post.createdtime),
    }))
  } catch (error) {
    if (!error.unavailable) console.warn(error.message)
  }
})
</script>
<template>
  <div class="subpage page-section">
    <div class="subpage-head"><span class="eyebrow">LOCAL STORIES</span><h1>서울 이야기 광장</h1><p>이름 대신 이야기로 만나는, 모두의 서울 커뮤니티</p></div>
    <div class="board-tools"><label class="search-box">⌕<input v-model="query" placeholder="궁금한 이야기를 검색해보세요" /></label><router-link to="/write" class="primary-button">＋ 글쓰기</router-link></div>
    <div class="category-tabs"><button v-for="category in categories" :key="category.label" :class="{ active: active === category.label, 'all-category': category.label === '전체' }" :style="{ '--category': category.color }" @click="active = category.label"><i></i>{{ category.label }}</button></div>
    <div class="board-list"><router-link v-for="post in filtered" :key="post.id" :to="`/posts/${post.id}`" class="board-row"><span class="post-category" :style="{ '--tag': categoryColor(post.category) }">{{ post.category }}</span><div><h3>{{ post.title }}</h3><p>{{ post.content }}</p><small>익명의 서울러 · {{ post.time }}</small></div></router-link><div v-if="!filtered.length" class="empty-state">찾는 이야기가 아직 없어요.</div></div>
  </div>
</template>
