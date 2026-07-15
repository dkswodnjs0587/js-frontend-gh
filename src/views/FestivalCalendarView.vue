<script setup>
import { computed, onMounted, ref } from 'vue'

const festivals = ref([])
const loading = ref(true)
const error = ref('')
const selectedMonth = ref('')
const selectedFestival = ref(null)
const selectedDate = ref(null)
const detailReturnDate = ref(null)
const districtOpen = ref(false)
const selectedDistricts = ref([])
const DAY_MS = 86400000
const MAX_VISIBLE_EVENTS = 4
const districts = ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구']

function parseDate(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length !== 8) return null
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6)) - 1
  const day = Number(digits.slice(6, 8))
  const date = new Date(year, month, day, 12)
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null
}

function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12) }
function addDays(date, amount) { const result = new Date(date); result.setDate(result.getDate() + amount); return result }
function dayDiff(from, to) { return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS) }
function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` }
function formatDate(date) { return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}` }
function dateKey(date) { return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` }

function chooseInitialMonth(items) {
  const now = startOfDay(new Date())
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 12)
  const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12)
  if (items.some(item => item.start <= currentEnd && item.end >= currentStart)) return monthKey(now)
  const next = items.find(item => item.end >= now)
  return monthKey(next?.start || items.at(-1)?.start || now)
}

onMounted(async () => {
  try {
    const response = await fetch('/서울_축제공연행사.json')
    if (!response.ok) throw new Error('축제 데이터를 불러오지 못했습니다.')
    const data = await response.json()
    const rawItems = Array.isArray(data) ? data : (data.items || data.response?.body?.items?.item || [])
    festivals.value = rawItems.map((item, index) => ({
      ...item,
      id: item.contentid || `festival-${index}`,
      start: parseDate(item.eventstartdate),
      end: parseDate(item.eventenddate),
      colorIndex: index % 6,
    })).filter(item => item.start && item.end && item.end >= item.start)
      .sort((a, b) => a.start - b.start || b.end - a.end || a.title.localeCompare(b.title, 'ko'))
    selectedMonth.value = chooseInitialMonth(festivals.value)
  } catch (e) {
    error.value = e.message || '축제 데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})

const monthDate = computed(() => {
  const [year, month] = (selectedMonth.value || monthKey(new Date())).split('-').map(Number)
  return new Date(year, month - 1, 1, 12)
})
const monthEnd = computed(() => new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() + 1, 0, 12))
const filteredFestivals = computed(() => festivals.value.filter(item => !selectedDistricts.value.length || selectedDistricts.value.some(district => `${item.addr1 || ''} ${item.eventplace || ''}`.includes(district))))
const visibleFestivals = computed(() => filteredFestivals.value.filter(item => item.start <= monthEnd.value && item.end >= monthDate.value))
const monthLabel = computed(() => `${monthDate.value.getFullYear()}년 ${monthDate.value.getMonth() + 1}월`)
const dailyFestivals = computed(() => selectedDate.value ? filteredFestivals.value.filter(item => item.start <= selectedDate.value && item.end >= selectedDate.value).sort((a, b) => b.start - a.start || a.end - b.end) : [])

const calendarWeeks = computed(() => {
  const gridStart = addDays(monthDate.value, -monthDate.value.getDay())
  const gridEnd = addDays(monthEnd.value, 6 - monthEnd.value.getDay())
  const weeks = []
  const today = dateKey(new Date())

  for (let weekStart = gridStart; weekStart <= gridEnd; weekStart = addDays(weekStart, 7)) {
    const weekEnd = addDays(weekStart, 6)
    const weekItems = filteredFestivals.value.filter(item => item.start <= weekEnd && item.end >= weekStart)
      .sort((a, b) => b.start - a.start || a.end - b.end || a.title.localeCompare(b.title, 'ko'))
    const lanes = []
    const segments = weekItems.map(item => {
      const segmentStart = item.start < weekStart ? weekStart : item.start
      const segmentEnd = item.end > weekEnd ? weekEnd : item.end
      const startColumn = dayDiff(weekStart, segmentStart) + 1
      const endColumn = dayDiff(weekStart, segmentEnd) + 2
      let lane = lanes.findIndex(intervals => intervals.every(interval => endColumn - 1 < interval.start || startColumn > interval.end))
      if (lane < 0) { lane = lanes.length; lanes.push([]) }
      lanes[lane].push({ start: startColumn, end: endColumn - 1 })
      return { item, startColumn, endColumn, lane, continuesBefore: item.start < weekStart, continuesAfter: item.end > weekEnd }
    })
    const height = 43 + MAX_VISIBLE_EVENTS * 25 + 31
    const moreCounts = Array.from({ length: 7 }, (_, dayIndex) => segments.filter(segment => segment.lane >= MAX_VISIBLE_EVENTS && segment.startColumn <= dayIndex + 1 && segment.endColumn > dayIndex + 1).length)
    weeks.push({
      key: dateKey(weekStart),
      height,
      days: Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index)
        return { date, number: date.getDate(), outside: date.getMonth() !== monthDate.value.getMonth(), today: dateKey(date) === today, weekday: index }
      }),
      segments: segments.filter(segment => segment.lane < MAX_VISIBLE_EVENTS),
      moreCounts,
    })
  }
  return weeks
})

function moveMonth(amount) {
  selectedMonth.value = monthKey(new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() + amount, 1, 12))
  selectedFestival.value = null
}
function goToday() { selectedMonth.value = monthKey(new Date()); selectedFestival.value = null }
function toggleDistrict(district) { selectedDistricts.value = selectedDistricts.value.includes(district) ? selectedDistricts.value.filter(value => value !== district) : [...selectedDistricts.value, district] }
function openDay(date) { selectedDate.value = startOfDay(date) }
function showFestival(item) { detailReturnDate.value = null; selectedFestival.value = item }
function openFestival(item) { detailReturnDate.value = selectedDate.value; selectedDate.value = null; selectedFestival.value = item }
function closeFestivalDetail() {
  selectedFestival.value = null
  if (detailReturnDate.value) selectedDate.value = detailReturnDate.value
  detailReturnDate.value = null
}
function segmentStyle(segment) {
  const daySpan = segment.endColumn - segment.startColumn
  return {
    left: `calc(${(segment.startColumn - 1) * 100 / 7}% + ${segment.continuesBefore ? 0 : 3}px)`,
    width: `calc(${daySpan * 100 / 7}% - ${segment.continuesBefore || segment.continuesAfter ? 3 : 6}px)`,
    top: `${43 + segment.lane * 25}px`,
    '--festival-color': `var(--festival-${segment.item.colorIndex})`,
  }
}
</script>

<template>
  <div class="festival-page page-section">
    <header class="festival-heading">
      <div><span class="eyebrow">SEOUL FESTIVAL CALENDAR</span><h1>서울 축제 캘린더</h1><p>축제와 공연의 시작일부터 마지막 날까지 달력에서 확인해보세요.</p></div>
      <div class="festival-summary"><b>{{ visibleFestivals.length }}</b><span>이번 달 행사</span></div>
    </header>

    <section class="calendar-card" aria-label="서울 축제 일정">
      <div class="calendar-toolbar">
        <div class="month-nav"><button @click="moveMonth(-1)" aria-label="이전 달">‹</button><strong>{{ monthLabel }}</strong><button @click="moveMonth(1)" aria-label="다음 달">›</button></div>
        <div class="calendar-actions"><button class="district-calendar-trigger" @click="districtOpen = true">⌖ {{ selectedDistricts.length ? `지역 ${selectedDistricts.length}곳` : '지역 선택' }}</button><button @click="goToday">오늘</button><label><span>월 선택</span><input v-model="selectedMonth" type="month" /></label></div>
      </div>

      <div v-if="loading" class="calendar-state"><span class="loader"></span><p>서울의 축제 일정을 정리하고 있어요.</p></div>
      <div v-else-if="error" class="calendar-state error"><b>!</b><p>{{ error }}</p></div>
      <template v-else>
        <div class="calendar-scroll">
          <div class="month-calendar">
            <div class="weekday-row"><span v-for="day in ['일','월','화','수','목','금','토']" :key="day">{{ day }}</span></div>
            <div v-for="week in calendarWeeks" :key="week.key" class="calendar-week" :style="{ height: `${week.height}px` }">
              <button v-for="(day, dayIndex) in week.days" :key="dateKey(day.date)" :class="['date-cell', { outside: day.outside, today: day.today, sunday: day.weekday === 0, saturday: day.weekday === 6 }]" :aria-label="`${formatDate(day.date)} 축제 목록 보기`" @click="openDay(day.date)">
                <span>{{ day.number }}</span>
                <small v-if="week.moreCounts[dayIndex]" class="more-events" @click.stop="openDay(day.date)">+ 추가 {{ week.moreCounts[dayIndex] }}개</small>
              </button>
              <button v-for="segment in week.segments" :key="`${segment.item.id}-${week.key}`" :class="['festival-event', { before: segment.continuesBefore, after: segment.continuesAfter, selected: selectedFestival?.id === segment.item.id }]" :style="segmentStyle(segment)" :title="`${segment.item.title} · ${formatDate(segment.item.start)} ~ ${formatDate(segment.item.end)}`" @click="showFestival(segment.item)">
                <span>{{ segment.item.title }}</span>
              </button>
            </div>
          </div>
        </div>
        <div v-if="!visibleFestivals.length" class="no-events">이 달에 시작하거나 진행 중인 행사가 없습니다.</div>
      </template>
    </section>

    <Teleport to="body">
      <transition name="detail-rise">
        <div v-if="districtOpen" class="festival-modal-backdrop" @click.self="districtOpen = false">
          <section class="district-select-modal" role="dialog" aria-modal="true" aria-label="서울 지역 선택">
            <header><div><span class="eyebrow">SEOUL DISTRICT</span><h2>어느 지역의 축제를 볼까요?</h2><p>여러 지역을 함께 선택할 수 있어요.</p></div><button @click="districtOpen = false" aria-label="지역 선택 닫기">×</button></header>
            <div class="calendar-district-grid"><button :class="{ active: !selectedDistricts.length }" @click="selectedDistricts = []">서울 전체</button><button v-for="district in districts" :key="district" :class="{ active: selectedDistricts.includes(district) }" @click="toggleDistrict(district)">{{ district }}</button></div>
            <footer><span>{{ selectedDistricts.length ? `${selectedDistricts.length}개 지역 선택됨` : '서울 전체가 선택됨' }}</span><button class="primary-button" @click="districtOpen = false">선택 완료</button></footer>
          </section>
        </div>
      </transition>
    </Teleport>

    <Teleport to="body">
      <transition name="detail-rise">
        <div v-if="selectedDate" class="festival-modal-backdrop" @click.self="selectedDate = null">
          <section class="daily-list-modal" role="dialog" aria-modal="true" aria-label="선택 날짜의 축제 목록">
            <header><div><span class="eyebrow">FESTIVALS ON THIS DAY</span><h2>{{ formatDate(selectedDate) }} 즐길 수 있는 축제</h2><p>최근에 시작한 축제부터 보여드려요.</p></div><button @click="selectedDate = null" aria-label="목록 닫기">×</button></header>
            <div v-if="dailyFestivals.length" class="daily-festival-list"><button v-for="item in dailyFestivals" :key="item.id" @click="openFestival(item)"><span :style="{ background: `var(--festival-${item.colorIndex})` }"></span><div><strong>{{ item.title }}</strong><small>{{ formatDate(item.start) }} — {{ formatDate(item.end) }}</small><p>{{ item.eventplace || item.addr1 || '서울' }}</p></div><i>›</i></button></div>
            <div v-else class="daily-empty">이날 진행되는 축제가 없습니다.</div>
          </section>
        </div>
      </transition>
    </Teleport>

    <Teleport to="body">
      <transition name="detail-rise">
        <div v-if="selectedFestival" class="festival-detail-backdrop" @click.self="closeFestivalDetail">
          <article class="festival-detail" role="dialog" aria-modal="true" aria-label="축제 상세 정보">
            <img v-if="selectedFestival.firstimage" :src="selectedFestival.firstimage" :alt="selectedFestival.title" />
            <div><span class="eyebrow">FESTIVAL INFORMATION</span><h2>{{ selectedFestival.title }}</h2><p class="detail-period">{{ formatDate(selectedFestival.start) }} — {{ formatDate(selectedFestival.end) }}</p><p>{{ selectedFestival.eventplace || selectedFestival.addr1 || '서울' }}</p><small v-if="selectedFestival.playtime">운영 시간 · {{ selectedFestival.playtime }}</small><small v-if="selectedFestival.usetimefestival">이용 요금 · {{ selectedFestival.usetimefestival }}</small></div>
            <button @click="closeFestivalDetail" aria-label="상세 정보 닫기">×</button>
          </article>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.festival-page{padding:72px 0 110px;--festival-0:#f06f62;--festival-1:#756ddd;--festival-2:#319978;--festival-3:#c97d1c;--festival-4:#397fb3;--festival-5:#bb6290}.festival-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:34px}.festival-heading h1{margin:0 0 10px;font-size:42px;letter-spacing:-2px}.festival-heading p{margin:0;color:var(--muted)}.festival-summary{display:flex;align-items:baseline;gap:8px}.festival-summary b{font:900 34px Nunito;color:var(--primary)}.festival-summary span{color:var(--muted);font-size:13px}.calendar-card{overflow:hidden;border:1px solid var(--line);border-radius:24px;background:var(--surface);box-shadow:var(--shadow)}.calendar-toolbar{min-height:76px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.month-nav{display:flex;align-items:center;gap:12px}.month-nav strong{min-width:130px;text-align:center;font-size:20px}.month-nav button,.calendar-actions button{border:1px solid var(--line);background:var(--surface-2);color:var(--ink);border-radius:10px}.month-nav button{width:38px;height:38px;font-size:25px}.calendar-actions{display:flex;align-items:center;gap:9px}.calendar-actions>button{height:38px;padding:0 14px;font-weight:800}.calendar-actions label{height:38px;display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:12px}.calendar-actions input{border:0;background:transparent;color:var(--ink);outline:0}.calendar-scroll{overflow-x:auto}.month-calendar{min-width:760px}.weekday-row{display:grid;grid-template-columns:repeat(7,1fr);height:42px;background:var(--surface-2);border-bottom:1px solid var(--line)}.weekday-row span{display:grid;place-items:center;border-right:1px solid var(--line);color:var(--muted);font-size:12px;font-weight:800}.weekday-row span:first-child{color:#e46464}.weekday-row span:last-child{color:#4c7fc2}.calendar-week{position:relative;display:grid;grid-template-columns:repeat(7,1fr);transition:height .15s ease}.date-cell{position:relative;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--surface)}.date-cell>span{position:absolute;top:10px;right:11px;display:grid;place-items:center;width:25px;height:25px;border-radius:50%;font:800 12px Nunito}.date-cell.outside{background:color-mix(in srgb,var(--surface-2) 54%,var(--surface));color:color-mix(in srgb,var(--muted) 55%,transparent)}.date-cell.sunday:not(.outside){color:#e46464}.date-cell.saturday:not(.outside){color:#4c7fc2}.date-cell.today>span{background:var(--primary);color:#fff}.festival-event{position:absolute;z-index:2;height:21px;margin:0 3px;padding:0 8px;border:0;border-radius:5px;background:var(--festival-color);color:#fff;text-align:left;box-shadow:0 2px 5px color-mix(in srgb,var(--festival-color) 24%,transparent);overflow:hidden;transition:filter .15s ease,transform .15s ease,box-shadow .15s ease}.festival-event span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;font-weight:800;line-height:21px}.festival-event.before{margin-left:0;border-radius:0 5px 5px 0}.festival-event.after{margin-right:0;border-radius:5px 0 0 5px}.festival-event.before.after{border-radius:0}.festival-event:hover,.festival-event.selected{z-index:3;filter:brightness(.92);box-shadow:0 4px 10px color-mix(in srgb,var(--festival-color) 36%,transparent);transform:translateY(-1px)}.no-events{padding:13px 20px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;text-align:center}.calendar-state{min-height:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--muted)}.calendar-state.error b{width:40px;height:40px;display:grid;place-items:center;border-radius:50%;background:#e26868;color:#fff}.festival-detail{position:relative;margin-top:18px;padding:18px;display:grid;grid-template-columns:160px 1fr auto;gap:22px;align-items:center;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--shadow)}.festival-detail img{width:160px;height:110px;border-radius:14px;object-fit:cover}.festival-detail h2{margin:0 0 8px}.festival-detail p{margin:4px 0;color:var(--muted)}.festival-detail .detail-period{color:var(--primary);font-weight:800}.festival-detail small{display:block;margin-top:7px;color:var(--muted)}.festival-detail>button{align-self:start;width:34px;height:34px;border:0;border-radius:50%;background:var(--surface-2);color:var(--muted);font-size:20px}.detail-rise-enter-active,.detail-rise-leave-active{transition:.22s ease}.detail-rise-enter-from,.detail-rise-leave-to{opacity:0;transform:translateY(8px)}
@media(max-width:720px){.festival-page{padding-top:48px}.festival-heading{display:block}.festival-heading h1{font-size:34px}.festival-summary{margin-top:18px}.calendar-toolbar{align-items:flex-start;gap:12px;flex-direction:column}.calendar-actions{width:100%;justify-content:space-between}.calendar-actions label span{display:none}.festival-detail{grid-template-columns:90px 1fr auto;gap:12px}.festival-detail img{width:90px;height:90px}.festival-detail h2{font-size:18px}.festival-detail .eyebrow{display:none}}
@media(max-width:460px){.calendar-actions label{padding:0 7px}.festival-detail{grid-template-columns:1fr auto}.festival-detail img{display:none}}
.festival-detail-backdrop{position:fixed;z-index:90;inset:0;padding:24px;display:grid;place-items:center;background:rgba(20,24,31,.52);backdrop-filter:blur(4px)}
.festival-detail-backdrop .festival-detail{width:min(680px,100%);max-height:calc(100dvh - 48px);overflow:auto;margin:0;box-shadow:0 24px 70px rgba(0,0,0,.28)}
.calendar-week .festival-event{margin-left:0;margin-right:0}
.more-events{position:absolute;z-index:4;left:7px;right:7px;bottom:7px;padding:3px 5px;border-radius:5px;background:color-mix(in srgb,var(--primary) 10%,var(--surface));color:var(--primary);font-size:10px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.calendar-week .date-cell{padding:0;border-top:0;border-left:0;color:var(--ink);text-align:inherit;cursor:pointer}.calendar-week .date-cell:hover{background:color-mix(in srgb,var(--primary) 5%,var(--surface))}.calendar-week .date-cell.outside{color:color-mix(in srgb,var(--muted) 55%,transparent)}.calendar-week .date-cell.sunday:not(.outside){color:#e46464}.calendar-week .date-cell.saturday:not(.outside){color:#4c7fc2}.calendar-week .more-events{background:#252a28;color:#fff;box-shadow:0 2px 5px rgba(0,0,0,.2)}
.calendar-week .date-cell .more-events{left:3px;right:3px;bottom:7px;height:21px;padding:0 8px;display:flex;align-items:center;border-radius:5px;background:#252a28;color:#fff;box-shadow:0 2px 5px rgba(0,0,0,.2);font-size:11px;line-height:21px;text-align:left}
.festival-modal-backdrop{--festival-0:#f06f62;--festival-1:#756ddd;--festival-2:#319978;--festival-3:#c97d1c;--festival-4:#397fb3;--festival-5:#bb6290;position:fixed;z-index:91;inset:0;padding:24px;display:grid;place-items:center;background:rgba(20,24,31,.52);backdrop-filter:blur(4px)}.district-select-modal,.daily-list-modal{width:min(620px,100%);max-height:calc(100dvh - 48px);overflow:auto;padding:26px;border:1px solid var(--line);border-radius:22px;background:var(--surface);color:var(--ink);box-shadow:0 24px 70px rgba(0,0,0,.28)}.district-select-modal>header,.daily-list-modal>header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px}.district-select-modal h2,.daily-list-modal h2{margin:0 0 5px;font-size:24px}.district-select-modal header p,.daily-list-modal header p{margin:0;color:var(--muted);font-size:13px}.district-select-modal header>button,.daily-list-modal header>button{flex:0 0 36px;width:36px;height:36px;border:0;border-radius:50%;background:var(--surface-2);color:var(--ink);font-size:22px}.calendar-district-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.calendar-district-grid button{min-height:40px;padding:7px;border:1px solid var(--line);border-radius:99px;background:var(--surface);color:var(--muted);font-size:13px}.calendar-district-grid button:hover{border-color:var(--primary);color:var(--primary)}.calendar-district-grid button.active{border-color:var(--primary);background:var(--primary);color:#fff}.district-select-modal>footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px;padding:17px 0 0;border-top:1px solid var(--line);background:transparent;color:var(--muted)}.district-select-modal>footer span{font-size:13px}.district-select-modal>footer .primary-button{padding:10px 18px}.daily-festival-list{display:grid;gap:8px}.daily-festival-list>button{width:100%;display:grid;grid-template-columns:5px 1fr auto;gap:13px;align-items:stretch;padding:13px;border:1px solid var(--line);border-radius:13px;background:var(--surface);color:var(--ink);text-align:left}.daily-festival-list>button:hover{border-color:color-mix(in srgb,var(--primary) 55%,var(--line));background:color-mix(in srgb,var(--primary) 5%,var(--surface));transform:translateX(2px)}.daily-festival-list>button>span{width:5px;border-radius:99px}.daily-festival-list strong,.daily-festival-list small{display:block}.daily-festival-list small{margin-top:4px;color:var(--primary);font:700 11px Nunito}.daily-festival-list p{margin:4px 0 0;color:var(--muted);font-size:12px}.daily-festival-list i{align-self:center;color:var(--muted);font-size:22px;font-style:normal}.daily-empty{padding:65px 20px;text-align:center;color:var(--muted)}
@media(max-width:560px){.calendar-district-grid{grid-template-columns:repeat(3,1fr)}.district-select-modal,.daily-list-modal{padding:20px}.district-select-modal>footer{align-items:stretch;flex-direction:column}.district-select-modal>footer .primary-button{width:100%}.calendar-actions{flex-wrap:wrap}.district-calendar-trigger{margin-right:auto}}
</style>
