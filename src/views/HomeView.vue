<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

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
let map
let clusterer
let markers = []
let activeInfo
const markerImages = new Map()

const filteredPlaces = computed(() => places.value.filter(place => selected.value.includes(place.type) && (!selectedDistricts.value.length || selectedDistricts.value.some(district => place.address.includes(district)))))
const posts = [
  { id: 1, category: '관광지', color: '#ff7b6b', title: '이번 주말, 한강 피크닉 어디가 좋을까요?', content: '조용하고 노을 보기 좋은 한강공원을 찾고 있어요. 돗자리 펴기 좋은 곳 추천해주세요!', time: '12분 전', comments: 8 },
  { id: 2, category: '축제·공연', color: '#f3ab35', title: '서울숲 야외 공연 다녀오신 분?', content: '이번 주 공연 분위기랑 근처에서 저녁 먹기 좋은 곳도 궁금해요.', time: '34분 전', comments: 5 },
  { id: 3, category: '문화시설', color: '#8b7cf6', title: '비 오는 날 가기 좋은 전시 추천해요', content: '서촌에서 우연히 발견한 작은 전시인데 공간도 작품도 정말 좋았어요.', time: '1시간 전', comments: 12 },
]

function toggleCategory(id) {
  selected.value = selected.value.includes(id) ? selected.value.filter(v => v !== id) : [...selected.value, id]
}

function toggleDistrict(district) {
  selectedDistricts.value = selectedDistricts.value.includes(district)
    ? selectedDistricts.value.filter(value => value !== district)
    : [...selectedDistricts.value, district]
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

function zoomIn() { if (map) map.setLevel(Math.max(1, map.getLevel() - 1), { animate: true }) }
function zoomOut() { if (map) map.setLevel(Math.min(14, map.getLevel() + 1), { animate: true }) }

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
  markers = [...addressGroups.values()].flatMap(group => {
    const place = group[0]
    const marker = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(place.lat, place.lng), title: group.length > 1 ? `${place.title} 외 ${group.length - 1}곳` : place.title, image: markerImage(place.color) })
    const thumbnailPlace = group.find(item => item.thumbnail) || place
    const thumbnail = thumbnailPlace.thumbnail ? `<img src="${escapeHtml(thumbnailPlace.thumbnail)}" alt="" onerror="this.parentElement.classList.add('image-missing');this.remove()">` : '<div class="map-info-placeholder">사진 준비 중</div>'
    const placeList = group.map(item => `<div class="map-info-place"><span style="--place-color:${item.color}">${escapeHtml(item.category)}</span><b>${escapeHtml(item.title)}</b></div>`).join('')
    const countLabel = group.length > 1 ? `<small>같은 주소의 장소 ${group.length}곳</small>` : ''
    const info = new window.kakao.maps.InfoWindow({ removable: false, content: `<div class="map-info map-info-group">${thumbnail}<div class="map-info-body">${countLabel}<div class="map-info-list">${placeList}</div><p>${escapeHtml(place.address || '주소 정보 없음')}</p></div></div>` })
    window.kakao.maps.event.addListener(marker, 'click', () => {
      activeInfo?.close()
      activeInfo = info
      info.open(map, marker)
    })
    const countMarkers = Array.from({ length: group.length - 1 }, () => new window.kakao.maps.Marker({ position: marker.getPosition(), image: transparentMarkerImage(), clickable: false, zIndex: -1 }))
    return [marker, ...countMarkers]
  })
  clusterer = new window.kakao.maps.MarkerClusterer({ map, averageCenter: true, minLevel: 3, minClusterSize: 2, gridSize: 110, disableClickZoom: false, calculator: [10, 50, 100], styles: [
    { width:'42px', height:'42px', background:'#ffd7d1', border:'3px solid #fff7f3', borderRadius:'21px', color:'#814b45', textAlign:'center', fontWeight:'900', lineHeight:'36px', boxShadow:'0 6px 16px #70534d33' },
    { width:'48px', height:'48px', background:'#d8d4ff', border:'3px solid #f8f6ff', borderRadius:'24px', color:'#524b93', textAlign:'center', fontWeight:'900', lineHeight:'42px', boxShadow:'0 6px 16px #524b9333' },
    { width:'54px', height:'54px', background:'#c8eadf', border:'3px solid #f2fff9', borderRadius:'27px', color:'#39705f', textAlign:'center', fontWeight:'900', lineHeight:'48px', boxShadow:'0 6px 16px #39705f33' },
    { width:'60px', height:'60px', background:'#ffe49a', border:'3px solid #fff9e8', borderRadius:'30px', color:'#775e1e', textAlign:'center', fontWeight:'900', lineHeight:'54px', boxShadow:'0 6px 16px #775e1e33' }
  ] })
  clusterer.addMarkers(markers, true)
  clusterer.redraw()
}

async function init() {
  loadDistrictShapes().catch(() => {})
  try {
    const loaded = await Promise.all(categories.map(async category => {
      const json = await fetch(`/${category.file}`).then(r => { if (!r.ok) throw new Error(); return r.json() })
      return json.items.map(item => ({ id: item.contentid, title: item.title, address: item.addr1, tel: item.tel, thumbnail: item.firstimage2 || item.firstimage, lat: Number(item.mapy), lng: Number(item.mapx), type: category.id, category: category.label, color: category.color })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    }))
    places.value = loaded.flat()
  } catch { mapError.value = '서울 장소 데이터를 불러오지 못했습니다.' }
  loading.value = false
  await nextTick()
  try {
    await loadKakao()
    map = new window.kakao.maps.Map(mapEl.value, { center: new window.kakao.maps.LatLng(37.5665, 126.978), level: 8 })
    window.kakao.maps.event.addListener(map, 'click', () => { activeInfo?.close(); activeInfo = null })
    drawMarkers()
  } catch (error) { mapError.value = error.message }
}

watch([selected, selectedDistricts], drawMarkers)
onMounted(init)
</script>

<template>
  <section class="hero">
    <div class="hero-copy"><span class="eyebrow">서울을 더 가까이</span><h1>오늘, 서울 어디로<br><em>가볼까요?</em></h1><p>관광 명소부터 동네 주민의 생생한 이야기까지.<br>서울의 모든 순간을 한곳에서 만나보세요.</p><a href="#map" class="primary-button">서울 탐색 시작하기 <span>↓</span></a></div>
    <div class="hero-art" aria-hidden="true"><div class="sun"></div><div class="tower">⌖</div><div class="person"><span>●</span><b>서울</b></div><div class="art-card art-food">♨<small>숨은 맛집</small></div><div class="art-card art-place">♧<small>산책 명소</small></div><div class="spark s1">✦</div><div class="spark s2">✦</div></div>
  </section>

  <section id="map" class="map-section page-section">
    <div class="section-heading"><div><span class="eyebrow">SEOUL MAP</span><h2>지도로 만나는 서울</h2><p>관심 있는 카테고리를 골라 나만의 서울을 발견해보세요.</p></div><div class="place-count"><b>{{ filteredPlaces.length.toLocaleString() }}</b><span>개의 장소</span></div></div>
    <div class="map-card">
      <div ref="mapEl" class="map-canvas" :class="{ placeholder: mapError }">
        <div v-if="loading" class="map-state"><span class="loader"></span><b>서울을 불러오는 중이에요</b></div>
        <div v-else-if="mapError" class="map-state"><div class="mini-map-art"><i v-for="n in 7" :key="n" :style="`--i:${n}`"></i><strong>서울</strong></div><b>{{ mapError }}</b><small>.env 파일에 VITE_KAKAO_MAP_KEY를 추가해 주세요.</small></div>
      </div>
      <div class="map-zoom" aria-label="지도 확대 축소"><button @click="zoomIn" aria-label="지도 확대">＋</button><button @click="zoomOut" aria-label="지도 축소">−</button></div>
      <button class="district-trigger" @click="districtOpen = true"><span>⌖</span><strong>{{ selectedDistricts.length ? `지역 ${selectedDistricts.length}곳` : '지역 선택' }}</strong><i>›</i></button>
      <aside :class="['map-filter', { open: filterOpen }]">
        <button class="filter-toggle" @click="filterOpen = !filterOpen" :aria-expanded="filterOpen"><span>◉</span> 카테고리 <b>{{ selected.length }}</b><i>{{ filterOpen ? '⌃' : '⌄' }}</i></button>
        <div class="filter-content"><div class="filter-head"><strong>어떤 곳을 찾으세요?</strong><button @click="selected = categories.map(c => c.id)">전체 선택</button></div><button v-for="category in categories" :key="category.id" :class="['filter-chip', { active: selected.includes(category.id) }]" @click="toggleCategory(category.id)"><span class="category-icon" :style="{ background: category.color }">{{ category.icon }}</span>{{ category.label }}<i>{{ selected.includes(category.id) ? '✓' : '' }}</i></button></div>
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
        <div v-else class="district-grid"><button :class="{ active: !selectedDistricts.length }" @click="selectedDistricts = []">서울 전체</button><button v-for="district in districts" :key="district" :class="{ active: selectedDistricts.includes(district) }" @click="toggleDistrict(district)">{{ district }}</button></div>
        <div class="district-actions"><span>{{ selectedDistricts.length ? `${selectedDistricts.length}개 지역 선택됨` : '서울 전체가 선택됨' }}</span><button class="primary-button" @click="districtOpen = false">선택 완료</button></div>
      </section>
      <div class="map-hint">마커를 누르면 장소 정보를 볼 수 있어요</div>
    </div>
  </section>

  <section class="community-preview page-section">
    <div class="section-heading"><div><span class="eyebrow">LOCAL STORIES</span><h2>지금, 서울 사람들의 이야기</h2><p>익명으로 편하게 묻고, 나만의 서울을 나눠보세요.</p></div><router-link to="/community" class="text-link">이야기 전체 보기 →</router-link></div>
    <div class="post-grid"><router-link v-for="post in posts" :key="post.id" :to="`/posts/${post.id}`" class="post-card"><span class="post-category" :style="{ '--tag': post.color }">{{ post.category }}</span><h3>{{ post.title }}</h3><p>{{ post.content }}</p><div class="post-meta"><span>익명의 서울러 · {{ post.time }}</span></div></router-link></div>
    <div class="community-cta"><div class="cta-icon">✎</div><div><strong>당신이 발견한 서울은 어떤 모습인가요?</strong><p>지금 이 순간의 동네 이야기를 들려주세요.</p></div><router-link to="/write" class="primary-button">이야기 남기기</router-link></div>
  </section>
</template>
