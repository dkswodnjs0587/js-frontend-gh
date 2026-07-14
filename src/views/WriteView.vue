<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const router = useRouter()
const route = useRoute()
const done = ref(false)
const editing = Boolean(route.query.edit)
function submit() { done.value = true; setTimeout(() => router.push('/community'), 900) }
</script>
<template><div class="subpage narrow page-section"><div class="subpage-head left"><span class="eyebrow">{{ editing ? 'EDIT A STORY' : 'WRITE A STORY' }}</span><h1>{{ editing ? '서울 이야기 수정하기' : '서울 이야기 남기기' }}</h1><p>개인정보 없이, 편안하게 경험과 질문을 나눠주세요.</p></div><form class="write-form" @submit.prevent="submit"><label>이야기 주제<select required><option value="">카테고리를 선택해주세요</option><option :selected="editing">관광지</option><option>문화시설</option><option>축제·공연</option><option>여행코스</option><option>레포츠</option><option>숙박</option><option>쇼핑</option></select></label><label>제목<input required maxlength="80" :value="editing ? '이번 주말, 한강 피크닉 어디가 좋을까요?' : ''" placeholder="어떤 이야기를 나누고 싶나요?" /></label><label>내용<textarea required rows="10" :value="editing ? '조용하고 노을 보기 좋은 한강공원을 찾고 있어요. 돗자리 펴기 좋고 산책도 함께 할 수 있는 곳이면 좋겠습니다.' : ''" placeholder="서울에서 경험한 순간이나 궁금한 점을 자유롭게 적어주세요."></textarea></label><label v-if="!editing">수정·삭제 비밀번호<input required type="password" minlength="4" placeholder="4자리 이상 입력해주세요" /><small>작성자만 글을 수정하거나 삭제할 때 사용해요.</small></label><div class="form-actions"><router-link :to="editing ? `/posts/${route.query.edit}` : '/community'" class="secondary-button">취소</router-link><button class="primary-button">{{ done ? (editing ? '수정했어요 ✓' : '등록했어요 ✓') : (editing ? '수정 완료' : '이야기 등록하기') }}</button></div></form></div></template>
