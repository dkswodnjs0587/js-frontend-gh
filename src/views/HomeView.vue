<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getPosts, getTour, getTours } from '../services/api'
import { formatPostTime } from '../utils/date'

const categories = [
  { id: '12', label: '관광지', icon: '⌖', color: '#ff7b6b', file: '서울_관광지.json' },
  { id: '14', label: '문화시설', icon: '▣', color: '#8b7cf6', file: '서울_문화시설.json' },
  { id: '15', label: '축제·공연', icon: '✦', color: '#f3ab35', file: '서울_축제공연행사.json' },
  { id: '25', label: '여행코스', icon: '↝', color: '#36a88d', file: '서울_여행코스.json' },
  { id: '28', label: '레포츠', icon: '●', color: '#4f8de8', file: '서울_레포츠.json' },
  { id: '32', label: '숙박', icon: '⌂', color: '#c77be5', file: '서울_숙박.json' },
  { id: '38', label: '쇼핑', icon: '◇', color: '#ef7199', file: '서울_쇼핑.json' },
]
const districts = ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구']
const places = ref([])
const selected = ref(categories.map(c => c.id))
const selectedDistricts = ref([])
const loading = ref(true)
const mapError = ref('')
const mapEl = ref(null)
const filterOpen = ref(false)
const districtOpen = ref(false)
const districtMode = ref('map')
const districtShapes = ref([])
const pendingSsafy = ref(false)
const easterMode = ref(false)
const searchType = ref('title')
const searchQuery = ref('')
const searchDraft = ref('')
const searchModeOpen = ref(false)
const likedHeroCards = ref([])
const tutorialActive = ref(false)
const tutorialStep = ref(0)
const mapSectionEl = ref(null)
const mapCardEl = ref(null)
const communitySectionEl = ref(null)
const communityCtaEl = ref(null)
const tutorialSteps = [
  { target: 'map', eyebrow: 'STEP 1 · 서울 지도', title: '지도에서 서울을 둘러보세요', text: '숫자 원은 주변 장소가 모여 있다는 뜻이에요. 지도를 확대하거나 숫자 원을 눌러 원하는 장소를 자세히 확인할 수 있어요.' },
  { target: 'controls', eyebrow: 'STEP 2 · 탐색 도구', title: '검색과 필터로 빠르게 찾아보세요', text: '장소명·주소 검색, 카테고리 선택, 지역 선택을 함께 사용할 수 있어요. 마커를 누르면 해당 장소의 상세 정보도 볼 수 있어요.' },
  { target: 'community', eyebrow: 'STEP 3 · 이야기 광장', title: '서울 사람들의 최신 이야기를 만나보세요', text: '지도 아래에는 최근 작성된 게시물이 보여요. 궁금한 이야기를 누르면 전체 내용을 읽고 이야기 광장으로 이동할 수 있어요.' },
  { target: 'write', eyebrow: 'STEP 4 · 이야기 나누기', title: '나만의 서울 이야기도 남겨보세요', text: '추천 장소, 여행 질문, 생생한 후기를 익명으로 편하게 작성할 수 있어요. 이제 LocalHub Seoul을 직접 이용해보세요.' },
  { target: 'chatbot', eyebrow: 'STEP 5 · AI 챗봇', title: '궁금한 건 쓰프에게 물어보세요', text: '어디로 갈지 고민되거나 서울 여행 정보가 필요하면 우측 하단 AI 챗봇을 활용하세요. 장소와 일정에 관한 질문을 편하게 할 수 있어요.' },
]
let map
let clusterer
let markers = []
let activeInfo
let ssafyMarker
let ssafyInfo
const markerImages = new Map()
const markerCache = new Map()
const tourDetailCache = new Map()

const filteredPlaces = computed(() => {
  if (easterMode.value) return []
  const keyword = searchQuery.value.trim().toLocaleLowerCase()
  return places.value.filter(place => {
    const categoryMatch = selected.value.includes(place.type)
    const districtMatch = !selectedDistricts.value.length || selectedDistricts.value.some(district => place.address.includes(district))
    const target = searchType.value === 'title' ? place.title : place.address
    const searchMatch = !keyword || String(target || '').toLocaleLowerCase().includes(keyword)
    return categoryMatch && districtMatch && searchMatch
  })
})
const allCategoriesSelected = computed(() => selected.value.length === categories.length)
const fallbackPosts = [
  { id: 1, category: '관광지', color: '#ff7b6b', title: '이번 주말, 한강 피크닉 어디가 좋을까요?', content: '조용하고 노을 보기 좋은 한강공원을 찾고 있어요. 돗자리 펴기 좋은 곳 추천해주세요!', time: '12분 전', comments: 8 },
  { id: 2, category: '축제·공연', color: '#f3ab35', title: '서울숲 야외 공연 다녀오신 분?', content: '이번 주 공연 분위기랑 근처에서 저녁 먹기 좋은 곳도 궁금해요.', time: '34분 전', comments: 5 },
  { id: 3, category: '문화시설', color: '#8b7cf6', title: '비 오는 날 가기 좋은 전시 추천해요', content: '서촌에서 우연히 발견한 작은 전시인데 공간도 작품도 정말 좋았어요.', time: '1시간 전', comments: 12 },
]
const posts = ref(fallbackPosts)
const categoryById = { 12: '관광지', 14: '문화시설', 15: '축제·공연', 25: '여행코스', 28: '레포츠', 32: '숙박', 38: '쇼핑' }

async function loadRecentPosts() {
  try {
    const data = await getPosts({ page: 1, size: 100 })
    posts.value = (data?.items || [])
      .sort((a, b) => new Date(b.createdtime) - new Date(a.createdtime))
      .slice(0, 3)
      .map(post => {
        const category = categoryById[post.contentTypeId] || '관광지'
        return {
          ...post,
          category,
          color: categories.find(item => item.label === category)?.color || '#6973c7',
          time: formatPostTime(post.createdtime),
        }
      })
  } catch (error) {
    if (!error.unavailable) console.warn(error.message)
  }
}

function toggleCategory(id) {
  selected.value = selected.value.includes(id) ? selected.value.filter(v => v !== id) : [...selected.value, id]
}

function toggleAllCategories() {
  selected.value = allCategoriesSelected.value ? [] : categories.map(category => category.id)
}

function toggleDistrict(district) {
  pendingSsafy.value = false
  selectedDistricts.value = selectedDistricts.value.includes(district)
    ? selectedDistricts.value.filter(value => value !== district)
    : [...selectedDistricts.value, district]
}

function selectAllDistricts() {
  pendingSsafy.value = false
  selectedDistricts.value = []
}

function resetDistrictSelection() {
  pendingSsafy.value = false
  selectedDistricts.value = []
}

function chooseSearchType(type) {
  searchType.value = type
  searchModeOpen.value = false
}

function applySearch() {
  searchQuery.value = searchDraft.value.trim()
}

function clearSearch() {
  searchDraft.value = ''
  searchQuery.value = ''
}

function toggleHeroLike(card) {
  likedHeroCards.value = likedHeroCards.value.includes(card)
    ? likedHeroCards.value.filter(value => value !== card)
    : [...likedHeroCards.value, card]
}

function tutorialTarget() {
  const target = tutorialSteps[tutorialStep.value]?.target
  if (target === 'community') return communitySectionEl.value
  if (target === 'write') return communityCtaEl.value
  if (target === 'chatbot') return document.querySelector('.chat-fab')
  return target === 'map' ? mapCardEl.value : mapSectionEl.value
}

async function showTutorialStep(step) {
  document.querySelector('.tutorial-external-focus')?.classList.remove('tutorial-external-focus')
  tutorialStep.value = step
  await nextTick()
  const target = tutorialTarget()
  if (!target) return
  if (tutorialSteps[step].target === 'chatbot') target.classList.add('tutorial-external-focus')
  const rect = target.getBoundingClientRect()
  const centeredTop = window.scrollY + rect.top - Math.max(20, (window.innerHeight - rect.height) / 2)
  window.scrollTo({ top: centeredTop + (step === 0 ? 55 : 0), behavior: 'smooth' })
}

function startTutorial() {
  tutorialActive.value = true
  showTutorialStep(0)
}

function finishTutorial() {
  tutorialActive.value = false
  document.querySelector('.tutorial-external-focus')?.classList.remove('tutorial-external-focus')
}

function nextTutorialStep() {
  if (tutorialStep.value === tutorialSteps.length - 1) {
    finishTutorial()
    return
  }
  showTutorialStep(tutorialStep.value + 1)
}

function previousTutorialStep() {
  if (tutorialStep.value > 0) showTutorialStep(tutorialStep.value - 1)
}

function handleTutorialKeydown(event) {
  if (!tutorialActive.value || event.repeat) return
  if (event.key === 'Escape') {
    event.preventDefault()
    finishTutorial()
    return
  }
  if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"]')) return
  if (event.code === 'Space') {
    event.preventDefault()
    nextTutorialStep()
    return
  }
  if (event.key === 'Backspace' && tutorialStep.value > 0) {
    event.preventDefault()
    previousTutorialStep()
  }
}

function prepareSsafy() {
  pendingSsafy.value = true
}

function confirmDistrictSelection() {
  if (pendingSsafy.value) {
    revealSsafy()
    return
  }
  easterMode.value = false
  ssafyInfo?.close()
  ssafyMarker?.setMap(null)
  drawMarkers()
  districtOpen.value = false
}

async function loadDistrictShapes() {
  const geo = await fetch('/seoul-districts.geojson').then(response => response.json())
  const allPoints = geo.features.flatMap(feature => feature.geometry.coordinates.flat())
  const xs = allPoints.map(point => point[0])
  const ys = allPoints.map(point => point[1])
  const bounds = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  const width = 570
  const height = 350
  const padding = 12
  const scale = Math.min((width - padding * 2) / (bounds.maxX - bounds.minX), (height - padding * 2) / (bounds.maxY - bounds.minY))
  const project = ([x, y]) => [padding + (x - bounds.minX) * scale, height - padding - (y - bounds.minY) * scale]
  districtShapes.value = geo.features.map(feature => {
    const rings = feature.geometry.coordinates
    const path = rings.map(ring => ring.map((point, index) => `${index ? 'L' : 'M'}${project(point).map(value => value.toFixed(1)).join(',')}`).join(' ') + ' Z').join(' ')
    const projected = rings[0].map(project)
    const label = projected.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]).map(value => value / projected.length)
    return { name: feature.properties.SIG_KOR_NM, path, labelX: label[0], labelY: label[1] }
  })
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
}

function normalizePlace(item, fallback = {}) {
  const type = String(item.contentTypeId ?? item.contenttypeid ?? fallback.type ?? '')
  const category = categories.find(value => value.id === type)
  return {
    ...fallback,
    id: item.id ?? item.contentid ?? fallback.id,
    title: item.title ?? fallback.title,
    address: item.add1 ?? item.addr1 ?? fallback.address ?? '',
    tel: item.tel ?? fallback.tel ?? '',
    thumbnail: item.firstimage2 || item.firstimage || fallback.thumbnail || '',
    lat: Number(item.mapy ?? fallback.lat),
    lng: Number(item.mapx ?? fallback.lng),
    type,
    category: category?.label || fallback.category || '기타',
    color: category?.color || fallback.color || '#6973c7',
  }
}

async function loadTourDetail(place) {
  if (tourDetailCache.has(place.id)) return tourDetailCache.get(place.id)
  try {
    const detail = normalizePlace(await getTour({ id: place.id, title: place.title, contentTypeId: place.type }), place)
    tourDetailCache.set(place.id, detail)
    return detail
  } catch {
    return place
  }
}

function infoWindowContent(group) {
  const place = group[0]
  const thumbnailPlace = group.find(item => item.thumbnail) || place
  const thumbnail = thumbnailPlace.thumbnail ? `<img src="${escapeHtml(thumbnailPlace.thumbnail)}" alt="" onerror="this.parentElement.classList.add('image-missing');this.remove()">` : '<div class="map-info-placeholder">사진 준비 중</div>'
  const placeList = group.map(item => `<div class="map-info-place"><span style="--place-color:${item.color}">${escapeHtml(item.category)}</span><b>${escapeHtml(item.title)}</b>${item.tel ? `<small>${escapeHtml(item.tel)}</small>` : ''}</div>`).join('')
  const countLabel = group.length > 1 ? `<small>같은 주소의 장소 ${group.length}곳</small>` : ''
  return `<div class="map-info map-info-group">${thumbnail}<div class="map-info-body">${countLabel}<div class="map-info-list">${placeList}</div><p>${escapeHtml(place.address || '주소 정보 없음')}</p></div></div>`
}

async function openMarkerInfo(entry) {
  activeInfo?.close()
  if (!entry.info) {
    entry.info = new window.kakao.maps.InfoWindow({ removable: false, content: '<div class="map-info"><div class="map-info-body"><b>장소 정보를 불러오는 중이에요</b></div></div>' })
  }
  const info = entry.info
  activeInfo = info
  info.open(map, entry.marker)
  const details = await Promise.all(entry.group.map(loadTourDetail))
  if (activeInfo === info) info.setContent(infoWindowContent(details))
}

function markerImage(color) {
  if (markerImages.has(color)) return markerImages.get(color)
  const canvas = document.createElement('canvas')
  canvas.width = 38
  canvas.height = 48
  const context = canvas.getContext('2d')
  context.fillStyle = color
  context.beginPath()
  context.arc(19, 18, 13, 0, Math.PI * 2)
  context.moveTo(10, 28)
  context.quadraticCurveTo(19, 47, 28, 28)
  context.fill()
  context.fillStyle = '#fffdf7'
  context.beginPath()
  context.arc(19, 18, 4.5, 0, Math.PI * 2)
  context.fill()
  const image = new window.kakao.maps.MarkerImage(canvas.toDataURL('image/png'), new window.kakao.maps.Size(38, 48), { offset: new window.kakao.maps.Point(19, 44) })
  markerImages.set(color, image)
  return image
}

function transparentMarkerImage() {
  if (markerImages.has('transparent')) return markerImages.get('transparent')
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const image = new window.kakao.maps.MarkerImage(canvas.toDataURL('image/png'), new window.kakao.maps.Size(1, 1))
  markerImages.set('transparent', image)
  return image
}

function zoomIn() { if (map) map.setLevel(Math.max(1, map.getLevel() - 1)) }
function zoomOut() { if (map) map.setLevel(Math.min(14, map.getLevel() + 1)) }

function clusterStyles() {
  const sizes = [42, 48, 54, 60]
  if (selected.value.length === 1) {
    const color = categories.find(category => category.id === selected.value[0])?.color || '#6973c7'
    return sizes.map(size => ({ width:`${size}px`, height:`${size}px`, background:color, border:'3px solid #fff', borderRadius:`${size / 2}px`, color:'#fff', textAlign:'center', fontWeight:'900', lineHeight:`${size - 6}px`, boxShadow:`0 6px 16px ${color}66` }))
  }
  return [
    { width:'42px', height:'42px', background:'#ffd7d1', border:'3px solid #fff7f3', borderRadius:'21px', color:'#814b45', textAlign:'center', fontWeight:'900', lineHeight:'36px', boxShadow:'0 6px 16px #70534d33' },
    { width:'48px', height:'48px', background:'#d8d4ff', border:'3px solid #f8f6ff', borderRadius:'24px', color:'#524b93', textAlign:'center', fontWeight:'900', lineHeight:'42px', boxShadow:'0 6px 16px #524b9333' },
    { width:'54px', height:'54px', background:'#c8eadf', border:'3px solid #f2fff9', borderRadius:'27px', color:'#39705f', textAlign:'center', fontWeight:'900', lineHeight:'48px', boxShadow:'0 6px 16px #39705f33' },
    { width:'60px', height:'60px', background:'#ffe49a', border:'3px solid #fff9e8', borderRadius:'30px', color:'#775e1e', textAlign:'center', fontWeight:'900', lineHeight:'54px', boxShadow:'0 6px 16px #775e1e33' },
  ]
}

function revealSsafy() {
  if (!map || !window.kakao) return
  easterMode.value = true
  pendingSsafy.value = false
  drawMarkers()
  const position = new window.kakao.maps.LatLng(37.5012748, 127.039625)
  if (!ssafyMarker) {
    ssafyMarker = new window.kakao.maps.Marker({ map, position, title: 'SSAFY 서울캠퍼스', image: markerImage('#181818'), zIndex: 9 })
    ssafyInfo = new window.kakao.maps.InfoWindow({ content: '<div class="map-info ssafy-info"><div class="map-info-body"><span style="--place-color:#181818">SSAFY EASTER EGG</span><b>SSAFY 서울캠퍼스</b><p>서울특별시 강남구 테헤란로 212<br>멀티캠퍼스 역삼</p></div></div>' })
    window.kakao.maps.event.addListener(ssafyMarker, 'click', () => {
      activeInfo?.close()
      activeInfo = ssafyInfo
      ssafyInfo.open(map, ssafyMarker)
    })
  }
  ssafyMarker.setMap(map)
  districtOpen.value = false
  // 이스터에그는 선택 즉시 멀티캠퍼스 주변이 한눈에 보이도록 이동한다.
  map.setLevel(3)
  map.setCenter(new window.kakao.maps.LatLng(37.50185, 127.039625))
  activeInfo?.close()
  activeInfo = ssafyInfo
  ssafyInfo.open(map, ssafyMarker)
}

function loadKakao() {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) return window.kakao.maps.load(resolve)
    const key = import.meta.env.VITE_KAKAO_MAP_KEY
    if (!key) return reject(new Error('카카오 지도 키를 설정하면 실제 지도가 표시됩니다.'))
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=clusterer`
    script.onload = () => window.kakao.maps.load(resolve)
    script.onerror = () => reject(new Error('지도를 불러오지 못했습니다.'))
    document.head.appendChild(script)
  })
}

function drawMarkers() {
  if (!map || !window.kakao) return
  clusterer?.clear()
  activeInfo?.close()
  activeInfo = null
  markers.forEach(m => m.setMap(null))
  const addressGroups = new Map()
  filteredPlaces.value.forEach(place => {
    const normalizedAddress = (place.address || '').replace(/\s+/g, ' ').trim()
    const key = normalizedAddress ? normalizedAddress : `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`
    if (!addressGroups.has(key)) addressGroups.set(key, [])
    addressGroups.get(key).push(place)
  })
  markers = [...addressGroups.entries()].flatMap(([key, group]) => {
    const place = group[0]
    const position = new window.kakao.maps.LatLng(place.lat, place.lng)
    const title = group.length > 1 ? `${place.title} 외 ${group.length - 1}곳` : place.title
    let entry = markerCache.get(key)
    if (!entry) {
      const marker = new window.kakao.maps.Marker({ position, title, image: markerImage(place.color) })
      entry = { marker, group, info: null, countMarkers: [] }
      markerCache.set(key, entry)
      window.kakao.maps.event.addListener(marker, 'click', () => openMarkerInfo(entry))
    } else {
      entry.group = group
      entry.info = null
      entry.marker.setPosition(position)
      entry.marker.setTitle(title)
      entry.marker.setImage(markerImage(place.color))
    }
    const extraCount = group.length - 1
    while (entry.countMarkers.length < extraCount) {
      entry.countMarkers.push(new window.kakao.maps.Marker({ position, image: transparentMarkerImage(), clickable: false, zIndex: -1 }))
    }
    entry.countMarkers.forEach(marker => marker.setPosition(position))
    return [entry.marker, ...entry.countMarkers.slice(0, extraCount)]
  })
  if (!clusterer) clusterer = new window.kakao.maps.MarkerClusterer({ map, averageCenter: false, minLevel: 1, minClusterSize: 2, gridSize: 180, disableClickZoom: false, calculator: [10, 50, 100], styles: clusterStyles() })
  else clusterer.setStyles(clusterStyles())
  clusterer.addMarkers(markers, true)
  clusterer.redraw()
}

async function init() {
  loadDistrictShapes().catch(() => {})
  loadRecentPosts()
  const kakaoPromise = loadKakao()
  try {
    const loaded = await Promise.all(categories.map(async category => {
      const size = 100
      const firstPage = await getTours({ contentTypeId: category.id, page: 1, size })
      const items = [...(firstPage?.items || [])]
      const totalPages = Number(firstPage?.totalPages || 1)
      const batchSize = 5
      for (let start = 2; start <= totalPages; start += batchSize) {
        const pages = Array.from({ length: Math.min(batchSize, totalPages - start + 1) }, (_, index) => start + index)
        const results = await Promise.all(pages.map(page => getTours({ contentTypeId: category.id, page, size })))
        results.forEach(data => items.push(...(data?.items || [])))
      }
      return items
    }))
    places.value = loaded.flat().map(item => normalizePlace(item)).filter(place => categories.some(category => category.id === place.type) && Number.isFinite(place.lat) && Number.isFinite(place.lng))
    if (!places.value.length) throw new Error('empty tours')
  } catch {
    try {
      const loaded = await Promise.all(categories.map(async category => {
        const json = await fetch(`/${category.file}`).then(response => { if (!response.ok) throw new Error(); return response.json() })
        return json.items
      }))
      places.value = loaded.flat().map(item => normalizePlace(item)).filter(place => categories.some(category => category.id === place.type) && Number.isFinite(place.lat) && Number.isFinite(place.lng))
    } catch { mapError.value = '서울 장소 데이터를 불러오지 못했습니다.' }
  }
  loading.value = false
  await nextTick()
  try {
    await kakaoPromise
    map = new window.kakao.maps.Map(mapEl.value, { center: new window.kakao.maps.LatLng(37.5665, 126.978), level: 8 })
    window.kakao.maps.event.addListener(map, 'click', () => { activeInfo?.close(); activeInfo = null })
    drawMarkers()
  } catch (error) { mapError.value = error.message }
}

let mapUpdateTimer
function scheduleMapUpdate(delay = 60) {
  clearTimeout(mapUpdateTimer)
  mapUpdateTimer = setTimeout(drawMarkers, delay)
}
watch([selected, selectedDistricts], () => scheduleMapUpdate())
watch(searchQuery, () => scheduleMapUpdate(180))
onMounted(init)
onMounted(() => {
  window.addEventListener('localhub:start-tutorial', startTutorial)
  window.addEventListener('keydown', handleTutorialKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('localhub:start-tutorial', startTutorial)
  window.removeEventListener('keydown', handleTutorialKeydown)
  document.querySelector('.tutorial-external-focus')?.classList.remove('tutorial-external-focus')
})
</script>

<template>
  <section class="hero">
    <div class="hero-copy"><span class="eyebrow">서울을 더 가까이</span><h1>오늘, 서울 어디로<br> <em>가볼까요?</em></h1><p>관광 명소부터 동네 주민의 생생한 이야기까지.<br>서울의 모든 순간을 한곳에서 만나보세요.</p><a href="#map" class="primary-button" @click.prevent="startTutorial">서울 탐색 시작하기 <span>↓</span></a></div>
    <div class="hero-art seoul-social-art">
      <article v-for="card in [{ id:'tower', label:'남산타워' }, { id:'gate', label:'광화문' }, { id:'food', label:'비빔밥' }, { id:'hanbok', label:'한복 여행' }]" :key="card.id" :class="['social-card', `social-${card.id}`]">
        <div :class="['social-photo', `photo-${card.id}`]" role="img" :aria-label="card.label"></div>
        <div class="social-actions"><button type="button" :class="['like-button', { liked: likedHeroCards.includes(card.id) }]" @click="toggleHeroLike(card.id)" :aria-label="`${card.label} 좋아요`"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z"/></svg></button><button type="button" class="comment-button" aria-label="댓글 장식" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.3 9.3 0 0 1-3.8-.9L3 21l1.9-5a8.4 8.4 0 1 1 16.1-4.5Z"/></svg></button><b>{{ card.label }}</b></div>
      </article>
      <span class="hero-bubble bubble-camera" aria-hidden="true"><i class="camera-icon"></i></span><span class="hero-bubble bubble-food" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M8 3v8M12 3v8M16 3v8M12 3v26M8 11c0 3 8 3 8 0M24 3c-4 3-4 10 0 12v14M24 3v12"/></svg></span><span class="hero-bubble bubble-route" aria-hidden="true">✦</span>
    </div>
  </section>

  <section id="map" ref="mapSectionEl" class="map-section page-section">
    <div class="section-heading"><div><span class="eyebrow">SEOUL MAP</span><h2>지도로 만나는 서울</h2><p>관심 있는 카테고리를 골라 나만의 서울을 발견해보세요.</p></div><div class="place-count"><b>{{ filteredPlaces.length.toLocaleString() }}</b><span>개의 장소</span></div></div>
    <div ref="mapCardEl" :class="['map-card main-map-card', { 'tutorial-focus': tutorialActive && tutorialSteps[tutorialStep].target === 'map', 'tutorial-controls-group': tutorialActive && tutorialSteps[tutorialStep].target === 'controls' }]">
      <div ref="mapEl" class="map-canvas" :class="{ placeholder: mapError }">
        <div v-if="loading" class="map-state"><span class="loader"></span><b>서울을 불러오는 중이에요</b></div>
        <div v-else-if="mapError" class="map-state"><div class="mini-map-art"><i v-for="n in 7" :key="n" :style="`--i:${n}`"></i><strong>서울</strong></div><b>{{ mapError }}</b><small>.env 파일에 VITE_KAKAO_MAP_KEY를 추가해 주세요.</small></div>
      </div>
      <div class="map-zoom" aria-label="지도 확대 축소"><button @click="zoomIn" aria-label="지도 확대">＋</button><button @click="zoomOut" aria-label="지도 축소">−</button></div>
      <button :class="['district-trigger', { 'tutorial-control-member': tutorialActive && tutorialSteps[tutorialStep].target === 'controls' }]" @click="districtOpen = true"><span>⌖</span><strong>{{ selectedDistricts.length ? `지역 ${selectedDistricts.length}곳` : '지역 선택' }}</strong><i>›</i></button>
      <form :class="['map-search', { 'tutorial-control-member': tutorialActive && tutorialSteps[tutorialStep].target === 'controls' }]" @submit.prevent="applySearch">
        <span class="search-mode-wrap"><button type="button" class="search-mode" @click="searchModeOpen = !searchModeOpen" :aria-expanded="searchModeOpen"><strong>{{ searchType === 'title' ? '장소명' : '주소' }}</strong><i>{{ searchModeOpen ? '⌃' : '⌄' }}</i></button><span v-if="searchModeOpen" class="search-mode-menu"><button type="button" :class="{ active: searchType === 'title' }" @click="chooseSearchType('title')">장소명</button><button type="button" :class="{ active: searchType === 'address' }" @click="chooseSearchType('address')">주소</button></span></span>
        <input v-model="searchDraft" :placeholder="searchType === 'title' ? '장소명을 검색해보세요' : '주소를 검색해보세요'" />
        <button v-if="searchDraft || searchQuery" type="button" class="search-clear" @click="clearSearch" aria-label="검색어 지우기">×</button>
        <button type="submit" class="search-submit">검색</button>
      </form>
      <aside :class="['map-filter', { open: filterOpen, 'tutorial-control-member': tutorialActive && tutorialSteps[tutorialStep].target === 'controls' }]">
        <button class="filter-toggle" @click="filterOpen = !filterOpen" :aria-expanded="filterOpen"><span>◉</span> 카테고리 <b>{{ selected.length }}</b><i>{{ filterOpen ? '⌃' : '⌄' }}</i></button>
        <div class="filter-content"><div class="filter-head"><strong>어떤 곳을 찾으세요?</strong><button @click="toggleAllCategories">{{ allCategoriesSelected ? '전체 취소' : '전체 선택' }}</button></div><button v-for="category in categories" :key="category.id" :class="['filter-chip', { active: selected.includes(category.id) }]" @click="toggleCategory(category.id)"><span class="category-icon" :style="{ background: category.color }">{{ category.icon }}</span>{{ category.label }}<i>{{ selected.includes(category.id) ? '✓' : '' }}</i></button></div>
      </aside>
      <section v-if="districtOpen" class="district-panel" aria-label="서울 지역 선택">
        <div class="district-head"><div><span class="eyebrow">SEOUL DISTRICT</span><h3>어느 지역을 볼까요?</h3><p>지도에서 원하는 자치구를 여러 곳 선택할 수 있어요.</p></div><button class="district-close" @click="districtOpen = false" aria-label="지역 선택 닫기">×</button></div>
        <div class="district-view-toggle"><button :class="{ active: districtMode === 'map' }" @click="districtMode = 'map'">⌖ 지도로 보기</button><button :class="{ active: districtMode === 'list' }" @click="districtMode = 'list'">▦ 리스트로 보기</button></div>
        <div v-if="districtMode === 'map'" class="district-shape-picker">
          <svg viewBox="0 0 570 350" role="group" aria-label="서울 25개 자치구 선택 지도">
            <g v-for="shape in districtShapes" :key="shape.name" :class="{ active: selectedDistricts.includes(shape.name) }" role="button" tabindex="0" :aria-label="`${shape.name} ${selectedDistricts.includes(shape.name) ? '선택 해제' : '선택'}`" @click="toggleDistrict(shape.name)" @keydown.enter.prevent="toggleDistrict(shape.name)" @keydown.space.prevent="toggleDistrict(shape.name)">
              <path :d="shape.path" />
            </g>
            <g class="district-label-layer" aria-hidden="true"><text v-for="shape in districtShapes" :key="shape.name" :class="{ active: selectedDistricts.includes(shape.name) }" :x="shape.labelX" :y="shape.labelY">{{ shape.name }}</text></g>
          </svg>
        </div>
        <div v-else class="district-grid"><button :class="{ active: !selectedDistricts.length && !pendingSsafy }" @click="selectAllDistricts">서울 전체</button><button v-for="district in districts" :key="district" :class="{ active: selectedDistricts.includes(district) && !pendingSsafy }" @click="toggleDistrict(district)">{{ district }}</button><button class="ssafy-easter-egg" aria-label="숨겨진 SSAFY 위치" @click="prepareSsafy"></button></div>
        <div class="district-actions"><span>{{ pendingSsafy ? '???' : selectedDistricts.length ? `${selectedDistricts.length}개 지역 선택됨` : '서울 전체가 선택됨' }}</span><div><button class="district-reset" @click="resetDistrictSelection">초기화</button><button class="primary-button" @click="confirmDistrictSelection">선택 완료</button></div></div>
      </section>
      <div class="map-hint">마커를 누르면 장소 정보를 볼 수 있어요</div>
    </div>
  </section>

  <section ref="communitySectionEl" :class="['community-preview page-section', { 'tutorial-focus': tutorialActive && tutorialSteps[tutorialStep].target === 'community' }]">
    <div class="section-heading"><div><span class="eyebrow">LOCAL STORIES</span><h2>지금, 서울 사람들의 이야기</h2><p>익명으로 편하게 묻고, 나만의 서울을 나눠보세요.</p></div><router-link to="/community" class="text-link">이야기 전체 보기 →</router-link></div>
    <div class="post-grid"><router-link v-for="post in posts" :key="post.id" :to="`/posts/${post.id}`" class="post-card"><span class="post-category" :style="{ '--tag': post.color }">{{ post.category }}</span><h3>{{ post.title }}</h3><p>{{ post.content }}</p><div class="post-meta"><span>익명의 서울러 · {{ post.time }}</span></div></router-link></div>
    <div ref="communityCtaEl" :class="['community-cta', { 'tutorial-focus': tutorialActive && tutorialSteps[tutorialStep].target === 'write' }]"><div class="cta-icon">✎</div><div><strong>당신이 발견한 서울은 어떤 모습인가요?</strong><p>지금 이 순간의 동네 이야기를 들려주세요.</p></div><router-link to="/write" class="primary-button">이야기 남기기</router-link></div>
  </section>

  <div v-if="tutorialActive" class="tutorial-backdrop" aria-hidden="true" @click="nextTutorialStep"></div>
  <aside v-if="tutorialActive" :class="['tutorial-guide', { 'chatbot-step': tutorialSteps[tutorialStep].target === 'chatbot' }]" role="dialog" aria-live="polite" aria-label="사이트 이용 튜토리얼">
    <button class="tutorial-close" @click="finishTutorial" aria-label="튜토리얼 닫기"><kbd>Esc</kbd><span>×</span></button>
    <span class="eyebrow">{{ tutorialSteps[tutorialStep].eyebrow }}</span>
    <h3>{{ tutorialSteps[tutorialStep].title }}</h3>
    <p>{{ tutorialSteps[tutorialStep].text }}</p>
    <div class="tutorial-dots"><i v-for="(_, index) in tutorialSteps" :key="index" :class="{ active: index === tutorialStep }"></i></div>
    <div class="tutorial-actions"><button v-if="tutorialStep" class="secondary-button" @click="previousTutorialStep"><kbd>Backspace</kbd>이전</button><button class="primary-button" @click="nextTutorialStep"><kbd>Space</kbd>{{ tutorialStep === tutorialSteps.length - 1 ? '사이트 이용하기' : '다음' }} <span>→</span></button></div>
  </aside>
</template>

<style scoped>
.seoul-social-art{height:500px;isolation:isolate}.seoul-social-art:before{content:'';position:absolute;width:390px;height:390px;border-radius:50%;background:var(--yellow);left:52%;top:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 24px color-mix(in srgb,var(--yellow) 18%,transparent);z-index:-1}.social-card{position:absolute;overflow:hidden;padding:7px 7px 0;border:3px solid var(--ink);border-radius:10px;background:var(--surface);box-shadow:7px 8px 0 var(--ink);transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s ease}.social-card:hover{z-index:5;transform:translateY(-9px) rotate(0deg) scale(1.035);box-shadow:10px 13px 0 var(--ink)}.social-photo{width:100%;height:calc(100% - 34px);border-radius:5px;background-image:url('/seoul-hero-day.png');background-size:200% 200%;background-repeat:no-repeat;transition:background-image .35s ease,filter .35s ease}:global(:root[data-theme=dark]) .social-photo{background-image:url('/seoul-hero-night.png')}.photo-tower{background-position:0 0}.photo-gate{background-position:100% 0}.photo-food{background-position:0 100%}.photo-hanbok{background-position:100% 100%}.social-actions{height:34px;display:flex;align-items:center;gap:7px;padding:0 3px;font-size:12px}.social-actions button{width:24px;padding:0;border:0;background:transparent;color:var(--muted);font-size:21px;line-height:1;transition:transform .2s ease,color .2s ease}.social-actions button:hover{transform:scale(1.2)}.social-actions button.liked{color:#f05f64;animation:hero-heart .35s ease}.social-actions .comment-button{display:grid;place-items:center;height:24px;cursor:default}.comment-button i{position:relative;display:block;width:17px;height:13px;border:2px solid currentColor;border-radius:7px}.comment-button i:after{content:'';position:absolute;left:2px;bottom:-5px;width:5px;height:5px;border-left:2px solid currentColor;transform:skewY(-35deg)}.comment-button:hover i{animation:comment-wiggle .4s ease}.social-actions b{margin-left:auto;font-size:11px}.social-tower{width:205px;height:230px;left:5%;top:13%;transform:rotate(-5deg)}.social-gate{width:225px;height:180px;right:1%;top:3%;transform:rotate(4deg)}.social-food{width:185px;height:170px;left:18%;bottom:1%;transform:rotate(3deg)}.social-hanbok{width:190px;height:220px;right:6%;bottom:0;transform:rotate(-4deg)}.hero-bubble{position:absolute;z-index:7;display:grid;place-items:center;width:58px;height:58px;border:3px solid var(--ink);border-radius:50% 50% 50% 12px;background:var(--purple);color:#fff;box-shadow:5px 6px 0 var(--ink);font-size:26px;animation:hero-float 3.2s ease-in-out infinite}.bubble-camera{left:43%;top:0}.bubble-food{right:0;top:42%;width:52px;height:52px;background:var(--green);font-size:22px;animation-delay:-1s}.bubble-route{left:2%;bottom:13%;width:45px;height:45px;background:var(--yellow);color:#765c18;font-size:19px;animation-delay:-2s}@keyframes hero-heart{50%{transform:scale(1.45) rotate(-8deg)}}@keyframes comment-wiggle{25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}@keyframes hero-float{50%{transform:translateY(-8px) rotate(4deg)}}
@media(max-width:850px){.seoul-social-art{max-width:570px;width:100%;margin:25px auto 0}.social-tower{left:8%}.social-gate{right:4%}.social-food{left:22%}.social-hanbok{right:9%}}
@media(max-width:560px){.seoul-social-art{height:390px;transform:scale(.88);transform-origin:top center;margin-bottom:-40px}.seoul-social-art:before{width:310px;height:310px}.social-tower{width:160px;height:190px;left:3%}.social-gate{width:175px;height:145px;right:0}.social-food{width:150px;height:140px;left:16%}.social-hanbok{width:155px;height:180px;right:3%}.hero-bubble{transform:scale(.82)}}

@media(min-width:851px){.hero{grid-template-columns:minmax(0,590px) minmax(0,540px);justify-content:center;column-gap:clamp(35px,4vw,75px);padding-inline:max(32px,5vw)}.seoul-social-art{width:100%;max-width:540px;margin-inline:auto}}

.social-actions .like-button,.social-actions .comment-button{display:grid;place-items:center;width:25px;height:25px;color:var(--ink)}.social-actions .comment-button{cursor:default}.like-button svg,.comment-button svg{display:block;width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.like-button.liked svg{fill:#f05f64;stroke:#f05f64}.comment-button svg{transform:scaleX(-1)}.comment-button:hover svg{animation:comment-wiggle-flipped .4s ease}.bubble-camera{background:#d8d4ff;color:#3f3b69}.bubble-food{background:#d5f3e8;color:#245e4b}.bubble-food svg{width:31px;height:31px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.camera-icon{position:relative;width:27px;height:19px;border:3px solid currentColor;border-radius:5px}.camera-icon:before{content:'';position:absolute;left:50%;top:50%;width:7px;height:7px;border:3px solid currentColor;border-radius:50%;transform:translate(-50%,-50%)}.camera-icon:after{content:'';position:absolute;left:3px;top:-7px;width:10px;height:6px;border:3px solid currentColor;border-bottom:0;border-radius:4px 4px 0 0}@keyframes comment-wiggle-flipped{25%{transform:scaleX(-1) rotate(-8deg)}75%{transform:scaleX(-1) rotate(8deg)}100%{transform:scaleX(-1)}}

.tutorial-backdrop{position:fixed;z-index:60;inset:0;background:rgba(14,20,18,.58);pointer-events:none}.tutorial-focus{position:relative;z-index:70;scroll-margin-top:90px}.tutorial-guide{position:fixed;z-index:90;left:50%;bottom:28px;transform:translateX(-50%);width:min(520px,calc(100vw - 32px));padding:25px 27px 22px;border:2px solid var(--ink);border-radius:22px;background:var(--surface);color:var(--ink);box-shadow:9px 11px 0 var(--ink),0 25px 80px rgba(0,0,0,.32);animation:tutorial-in .2s ease-out}.tutorial-guide .eyebrow{margin-bottom:6px}.tutorial-guide h3{margin:0 34px 8px 0;font-size:23px;letter-spacing:-.7px}.tutorial-guide p{margin:0;color:var(--muted);font-size:14px;line-height:1.7}.tutorial-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border:0;border-radius:50%;background:var(--surface-2);color:var(--ink);font-size:22px}.tutorial-dots{display:flex;gap:6px;margin-top:18px}.tutorial-dots i{width:7px;height:7px;border-radius:99px;background:var(--line);transition:width .2s ease,background .2s ease}.tutorial-dots i.active{width:24px;background:var(--primary)}.tutorial-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:-18px}.tutorial-actions .primary-button,.tutorial-actions .secondary-button{padding:11px 17px}.tutorial-actions .secondary-button{border:1px solid var(--line)}@keyframes tutorial-in{from{opacity:0;transform:translate(-50%,8px) scale(.98)}to{opacity:1;transform:translateX(-50%)}}
@media(max-width:560px){.tutorial-guide{bottom:16px;padding:21px 20px 18px}.tutorial-guide h3{font-size:20px}.tutorial-guide p{font-size:13px}.tutorial-actions{margin-top:15px}.tutorial-dots{margin-top:14px}.tutorial-actions .primary-button,.tutorial-actions .secondary-button{padding:10px 14px}}

.tutorial-control-member{z-index:75!important}.tutorial-controls-group:after{content:'';position:absolute;z-index:74;left:23px;right:23px;top:23px;height:60px;border:3px solid color-mix(in srgb,var(--primary) 72%,white);border-radius:17px;background:color-mix(in srgb,var(--surface) 10%,transparent);box-shadow:0 0 0 4px color-mix(in srgb,var(--primary) 20%,transparent),0 10px 28px rgba(0,0,0,.24);pointer-events:none}
@media(max-width:850px){.tutorial-controls-group:after{left:10px;right:10px;top:10px;height:116px}}
.tutorial-controls-group:after{height:54px}
@media(max-width:850px){.tutorial-controls-group:after{height:114px}}

.tutorial-close{width:auto;min-width:76px;padding:0 10px;gap:7px;display:flex;align-items:center;justify-content:center}.tutorial-close kbd,.tutorial-actions kbd{padding:3px 6px;border:1.5px solid currentColor;border-bottom-width:2px;border-radius:6px;background:color-mix(in srgb,currentColor 10%,transparent);font:900 11px Nunito;line-height:1;opacity:.92}.tutorial-close span{font-size:21px;line-height:1}.tutorial-actions .primary-button,.tutorial-actions .secondary-button{gap:8px}.tutorial-actions .primary-button kbd{color:inherit}.hero h1 em:after{background:currentColor}
.tutorial-guide h3{margin-right:76px}
.tutorial-backdrop{pointer-events:auto;cursor:pointer}

.main-map-card {
  height: 650px;
}

@media (max-width: 560px) {
  .main-map-card {
    height: 620px;
  }
}
</style>
