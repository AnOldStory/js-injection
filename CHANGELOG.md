# Changelog (변경 이력)

이 파일의 각 버전 섹션은 태그를 push할 때 그대로
[GitHub Release](https://github.com/AnOldStory/js-injection/releases) 본문으로 올라간다.
새 버전을 낼 때는 `npm version` 전에 여기에 섹션을 먼저 추가할 것.

## v3.3.2

- 한국어 브라우저가 아니면 영어로 시작 — `default_locale`을 `en`으로 바꾸고, 첫 실행 시
  `chrome.i18n.getUILanguage()`로 팝업 언어를 정한다 (사용자가 직접 고른 언어는 유지)
- 버전이 올라갈 때마다 마이그레이션이 규칙 전체를 v1/v2 형태로 덮어써
  `cssCode`/`tags`/`enabled`/`runAt`이 사라지던 문제 수정
- 스토어 스크린샷을 실제 빌드 캡처로 재촬영 (5종)

## v3.3.1

- 확장 자체의 다국어 지원(`chrome.i18n`, `_locales/ko`·`_locales/en`) 추가
- 스토어에 노출되는 한국어 확장 이름 정리

## v3.3.0

- AI Model Context Protocol (MCP) WebSocket Bridge 지원 (`js-injection-mcp`)
- 2열 넓은 옵션 대시보드 UI 및 인터랙티브 MCP 연동 가이드

## v3.2.0

- 전체 마스터 스위치 (Master On/Off) & 개별 규칙 토글 기능
- 0.1초 반응속도 Live CSS Sync 지원
- 우클릭 / 드래그 / 텍스트 복사 금지 해제 기능 추가 (1회성 해제 버튼 제공)
- 한국어 / 영어 완전 다국어 (i18n) 지원

## v3.0.0

- Manifest V2 → V3 마이그레이션 (Service Worker, scripting API)
- React 19 & Vite 6 기반 현대화

## v2.0.1

- 백업 기능 오류 해결
- 오탈자 수정

## v2.0.0

- UI/UX 디자인 개선
- 백업 (Import/Export) 기능 추가
- jQuery 버전 선택 및 주입 기능 추가
- 중복 도메인 허용
- 기타 오류 수정
