# Web_Bookmark — Gist 자동 동기화

기존 5페이지 북마크 UI + LocalStorage + GitHub Gist 클라우드 동기화 기능입니다.

## 구현
- `index.html`: 이름·URL 추가, 삭제, 검색, 드래그 정렬, 5페이지 탭, JSON 백업/복원.
- `cloud-sync.js`: 브라우저를 열면 Gist를 1회 읽고, 북마크 변경 후 650ms에 자동 저장. 상태 메시지 표시.
- `api/bookmarks.js`: Vercel Functions가 GitHub 토큰으로 Gist의 `bookmarks.json`을 읽고 생성·수정.
- LocalStorage는 로컬 사본이며 최초 불러오기에 실패하면 편집을 차단합니다.
- 다른 PC의 업데이트와 충돌하면 저장을 중단하고 새로고침을 안내합니다.
- Gist 자동 불러오기로 별도 클라우드 불러오기 버튼은 없습니다. JSON 파일 백업/복원은 유지합니다.

## 배포
1. GitHub 저장소를 Vercel에 연결하여 배포합니다. **GitHub Pages는 서버 API를 실행할 수 없으므로 이 버전은 Vercel에서 사용해야 합니다.**
2. Vercel Settings → Environment Variables에 `GITHUB_GIST_TOKEN` 추가. GitHub 개인 액세스 토큰에 **Gists: Read and write** 권한이 필요합니다. 토큰은 브라우저나 저장소에 입력하지 않습니다.
3. 선택: `BOOKMARK_GIST_ID`를 추가하여 지정한 Gist를 사용합니다. 미설정 시 설명이 `Web_Bookmark automatic sync`인 Gist를 찾고, 없으면 최초 저장 시 새 secret Gist를 생성합니다.
4. 재배포하고 Vercel 주소에서 최초 불러오기·저장·새로고침 테스트를 진행합니다.

## PC 데이터 최초 이전
기존 PC의 `file://` LocalStorage 데이터는 배포된 사이트와 공유되지 않습니다. 기존 HTML에서 💾 JSON 저장 → Vercel 주소의 📂 JSON 불러오기를 사용하세요. 처음 시작할 때 Gist가 비어 있고 현재 브라우저 LocalStorage가 있으면 자동으로 Gist에 최초 전송합니다.

## 반드시 알아둘 보안 사항
요청대로 앱 로그인/PIN/동기화 키 입력을 두지 않았습니다. 그러나 **공개 Vercel API를 아는 제3자가 인증 없이 읽고 쓰는 것도 가능**합니다. GitHub Token을 Vercel에 숨기는 것과 API 접근 보호는 다릅니다. Gist의 secret은 비공개 인증 수단이 아닙니다. 개인용 북마크라도 이 방식으로 민감한 URL을 저장하는 것은 권장하지 않습니다. 실제 운영 시 별도의 서버측 접근 제한을 추가하는 것이 안전합니다.

## 테스트
- Vercel API `/api/bookmarks`가 GET 200을 반환하는지 확인
- PC 북마크 JSON 복원 후 Gist 생성 확인
- 새 북마크 추가/삭제/순서 변경 후 자동 저장 확인
- 브라우저 새로고침 및 다른 PC에서 자동 불러오기 확인
- 다른 PC가 동시 수정했을 때 충돌 안내 확인

주의: Gist의 revision 비교는 동시 편집을 줄이지만 GitHub API의 원자적 트랜잭션은 아닙니다. 여러 기기에서 동시 편집하지 않는 것이 안전합니다.
