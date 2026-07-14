# LocalHub Seoul Frontend

서울의 공공데이터와 익명 커뮤니티를 연결하는 Vue 3 기반 SPA입니다.

## 주요 화면

- 홈: 서울 장소 지도, 카테고리 필터, 커뮤니티 미리보기
- 이야기 광장: 게시글 검색 및 카테고리 필터
- 글쓰기: 카테고리, 제목, 내용, 수정·삭제 비밀번호 입력
- 게시글 상세: 본문, 공감, 댓글 UI
- 공통: 반응형 내비게이션, 다크/라이트 모드, 챗봇 패널

## 시작하기

```bash
npm install
npm run dev
```

## 카카오 지도 설정

1. `.env.example`을 복사해 `.env` 파일을 만듭니다.
2. 카카오 개발자 콘솔에서 발급한 JavaScript 키를 입력합니다.

```env
VITE_KAKAO_MAP_KEY=your_javascript_key
```

카카오 개발자 콘솔의 플랫폼 설정에 로컬 및 배포 도메인을 등록해야 합니다. 키가 없는 환경에서는 지도 영역에 설정 안내 화면이 표시되며, 나머지 UI는 정상 동작합니다.

## 데이터

`data/seoul`의 7개 JSON 파일을 빌드 시 정적 파일로 포함합니다. 장소 마커는 외부 장소 API 호출 없이 이 데이터의 `mapx`, `mapy` 좌표를 사용하며, 축소 화면에서는 Kakao Maps MarkerClusterer로 묶어 개수를 표시합니다.

## 빌드

```bash
npm run build
```

산출물은 `dist` 폴더에 생성됩니다.
