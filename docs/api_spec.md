# API 명세서

## 1. 개요

이 문서는 LocalHub 프로젝트의 실제 구현 기준 API를 정의한다. 백엔드는 FastAPI, 데이터 저장소는 SQLite를 전제로 하며, 커뮤니티 게시판, 챗봇, 서울 장소 조회 기능을 포함한다.

## 2. 공통 규칙

- Base URL: `/api`
- Content-Type: `application/json`
- 날짜 형식: `YYYY-MM-DD HH:MM:SS`
- 모든 응답은 `success`, `message`, `data` 구조를 우선 사용한다.
- 게시글 작성/수정/삭제는 로그인 없이 수정용 비밀번호로만 제어한다.
- 게시글 비밀번호는 평문 저장을 전제로 한다.
- 챗봇은 OpenAI API를 호출하되, 호출 전 백엔드에서 검색/컨텍스트 구성을 먼저 수행한다.
- 챗봇 엔드포인트에는 Rate Limiting을 적용한다.

## 3. 데이터 모델 요약

### 3.1 Post 테이블

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `contentTypeId` INTEGER NOT NULL
- `createdtime` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
- `modifiedtime` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
- `title` TEXT NOT NULL
- `content` TEXT NOT NULL
- `password` TEXT NOT NULL

### 3.2 Tour 테이블

- `id` INTEGER PRIMARY KEY
- `contentTypeId` INTEGER NOT NULL
- `title` TEXT NOT NULL
- `add1` TEXT NOT NULL
- `tel` TEXT NULL
- `mapx` REAL NOT NULL
- `mapy` REAL NOT NULL
- `firstimage2` TEXT NULL

## 4. API 목록

| 식별자 | 메서드 | 경로 | 기능명 | 상세 설명 | 비고 및 제약사항 |
| --- | --- | --- | --- | --- | --- |
| FEAT-COM-01 | GET | `/api/posts` | 게시글 목록 조회 | 서울 권역 카테고리별 게시글을 페이지네이션으로 조회한다. | 로그인 검증 없음 |
| FEAT-COM-01 | GET | `/api/posts/{postId}` | 게시글 상세 조회 | 게시글 1건의 상세 내용을 조회한다. | 조회 시 비밀번호는 내려주지 않는다 |
| FEAT-COM-02 | POST | `/api/posts` | 게시글 작성 | 제목, 내용, 수정용 비밀번호, 콘텐츠 유형 ID를 저장한다. | SQLite 저장, 비밀번호 평문 저장 |
| FEAT-COM-03 | PUT | `/api/posts/{postId}` | 게시글 수정 | 입력된 평문 비밀번호가 일치할 때만 수정한다. | 타 게시글 권한 탈취 주의 |
| FEAT-COM-03 | DELETE | `/api/posts/{postId}` | 게시글 삭제 | 입력된 평문 비밀번호가 일치할 때만 삭제한다. | 타 게시글 권한 탈취 주의 |
| FEAT-MAP-01 | GET | `/api/tours` | 서울 장소/관광 정보 조회 | 서울 권역 `Tour` 테이블을 지도 표시용으로 조회한다. 유형 필터와 검색을 지원한다. | 외부 지도 API와는 분리, 데이터는 SQLite 기준 |
| FEAT-BOT-01 | POST | `/api/chat` | 지역 정보 질의응답 | 사용자 질문을 받아 관련 데이터를 검색한 뒤 OpenAI API로 답변한다. | Rate Limiting 필수 |

## 5. 상세 정의

### 5.1 GET `/api/posts`

게시글 목록을 조회한다.

#### Query Parameters

- `contentTypeId`: 콘텐츠 유형 ID, 예: `12`, `15`, `39`
- `page`: 페이지 번호, 기본값 `1`
- `size`: 페이지 크기, 기본값 `10`
- `keyword`: 제목 또는 본문 검색어, 선택

#### Response

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": 1,
        "contentTypeId": 12,
        "title": "남산타워 전망대 관람 팁 공유",
        "content": "...",
        "createdtime": "2026-07-14 10:30:00",
        "modifiedtime": "2026-07-14 10:30:00"
      }
    ],
    "page": 1,
    "size": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 5.2 GET `/api/posts/{postId}`

게시글 상세 내용을 조회한다.

#### Path Parameters

- `postId`: 게시글 ID

#### Response

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "id": 1,
    "contentTypeId": 12,
    "title": "남산타워 전망대 관람 팁 공유",
    "content": "...",
    "createdtime": "2026-07-14 10:30:00",
    "modifiedtime": "2026-07-14 10:30:00"
  }
}
```

### 5.3 POST `/api/posts`

게시글을 생성한다.

#### Request Body

```json
{
  "contentTypeId": 12,
  "title": "게시글 제목",
  "content": "게시글 본문",
  "password": "1234"
}
```

#### Response

```json
{
  "success": true,
  "message": "created",
  "data": {
    "id": 1
  }
}
```

### 5.4 PUT `/api/posts/{postId}`

게시글을 수정한다. 요청 비밀번호가 저장된 평문 비밀번호와 같을 때만 반영된다.

#### Request Body

```json
{
  "title": "수정된 제목",
  "content": "수정된 본문",
  "password": "1234"
}
```

#### Response

```json
{
  "success": true,
  "message": "updated",
  "data": {
    "id": 1
  }
}
```

### 5.5 DELETE `/api/posts/{postId}`

게시글을 삭제한다. 요청 비밀번호가 저장된 평문 비밀번호와 같을 때만 삭제된다.

#### Request Body

```json
{
  "password": "1234"
}
```

#### Response

```json
{
  "success": true,
  "message": "deleted"
}
```

### 5.6 GET `/api/tours`

서울 권역 장소/관광 정보를 조회한다. 지도 핀 표시와 필터링에 사용한다.

#### Query Parameters

- `contentTypeId`: 유형 필터, 예: `12`, `14`, `15`, `25`, `28`, `32`, `38`
- `keyword`: 장소명, 주소, 전화번호 검색어
- `page`: 페이지 번호, 기본값 `1`
- `size`: 페이지 크기, 기본값 `50`
- `mapxMin`: 경도 최소값, 선택
- `mapxMax`: 경도 최대값, 선택
- `mapyMin`: 위도 최소값, 선택
- `mapyMax`: 위도 최대값, 선택

#### Response

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": 1059877,
        "contentTypeId": 12,
        "title": "양화한강공원",
        "add1": "서울특별시 영등포구 노들로 221 (당산동)",
        "tel": "",
        "mapx": 126.902365881,
        "mapy": 37.5382819489,
        "firstimage2": "https://..."
      }
    ],
    "page": 1,
    "size": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

### 5.7 POST `/api/chat`

사용자 질문을 받아 지역 정보 기반 답변을 생성한다.

#### Request Body

```json
{
  "message": "이번 주말 서울 축제 일정 알려줘",
  "context": {
    "contentTypeId": 15
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "answer": "이번 주말 서울에서는 ...",
    "sources": [
      {
        "id": 1,
        "title": "서울 페스타",
        "contentTypeId": 15
      }
    ]
  }
}
```

## 6. 구현 원칙

### 6.1 게시글 처리

- 게시글은 `Post` 테이블에 저장한다.
- 수정/삭제 시 `password` 값을 비교하여 일치 여부를 판단한다.
- 수정 시 `modifiedtime`을 갱신한다.
- 목록 조회는 페이지네이션과 키워드 검색을 함께 지원한다.

### 6.2 서울 장소 조회

- 지도 화면은 `Tour` 테이블을 사용한다.
- `contentTypeId` 필터와 검색어를 조합해 조회한다.
- 프론트에서는 조회 결과를 핀, 목록, 필터 카운트에 사용한다.

### 6.3 챗봇 처리

- 사용자의 질문을 바로 OpenAI API에 보내지 않는다.
- 먼저 키워드 추출, 유형 분류, 관련 데이터 검색을 수행한다.
- 검색 결과 상위 항목만 OpenAI API에 전달한다.
- 동일 질문에 대한 응답은 캐시를 둘 수 있다.

## 7. 오류 응답 예시

```json
{
  "success": false,
  "message": "password mismatch",
  "data": null
}
```

```json
{
  "success": false,
  "message": "not found",
  "data": null
}
```

## 8. 비고

- 본 명세는 현재 프로젝트의 실제 구현 기준으로 작성되었다.
- 챗봇은 `POST /api/chat` 하나로 처리하되, 검색과 생성은 백엔드에서 분리한다.
- 지도 기능은 외부 API 연동 여부와 무관하게 SQLite의 `Tour` 데이터 조회를 우선 기준으로 한다.