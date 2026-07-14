#### 1. Post (커뮤니티 게시글) 테이블

커뮤니티 사용자가 작성한 게시글을 저장하는 테이블입니다.

| 컬럼명 | SQLite 데이터 타입 | 제약 조건 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | **PK**, AUTOINCREMENT | 게시글 고유 식별자 | SQLite의 `INTEGER PRIMARY KEY` |
| `contentTypeId` | `INTEGER` | NOT NULL | 관광/장소 유형 ID | 예: 12(관광지), 15(축제), 39(맛집) |
| `createdtime` | `TEXT` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 최초 생성 일시 | `YYYY-MM-DD HH:MM:SS` 형식 |
| `modifiedtime` | `TEXT` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 최종 수정 일시 | `YYYY-MM-DD HH:MM:SS` 형식 |
| `title` | `TEXT` | NOT NULL | 게시글 제목 | 가변 길이 문자열 |
| `content` | `TEXT` | NOT NULL | 게시글 본문 내용 | 장문 데이터 |
| `password` | `TEXT` | NOT NULL | 수정/삭제 권한용 비밀번호 | 평문(Plain text) 저장 |

#### 2. Tour (지역 장소/관광 정보) 테이블

공공데이터 JSON에서 파싱하여 저장하는 서울 권역의 장소, 관광지, 맛집, 축제 등의 정보 테이블입니다.

| 컬럼명 | SQLite 데이터 타입 | 제약 조건 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | **PK** | 장소 고유 식별자 | 공공 API 제공 ID 활용 |
| `contentTypeId` | `INTEGER` | NOT NULL | 관광/장소 유형 ID | 예: 12(관광지), 15(축제), 39(맛집) |
| `title` | `TEXT` | NOT NULL | 장소명 / 축제명 |  |
| `add1` | `TEXT` | NOT NULL | 기본 주소 |  |
| `tel` | `TEXT` | NULLABLE | 전화번호 |  |
| `mapx` | `REAL` | NOT NULL | 경도 (WGS84) | 부동소수점 타입 (`REAL`) |
| `mapy` | `REAL` | NOT NULL | 위도 (WGS84) | 부동소수점 타입 (`REAL`) |
| `firstimage2` | `TEXT` | NULLABLE | 썸네일 URL |  |
