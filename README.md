<div align="center">

<img width="140" height="140" src="https://raw.githubusercontent.com/AnOldStory/Js-Injection/master/STOREIMG/%EC%9B%90%EB%B3%B8.png?raw=true" alt="Js-Injection Logo">

# Js-Injection

**Chromium 기반 브라우저를 위한 JavaScript 인젝션 확장 프로그램**

[![Version](https://img.shields.io/badge/version-v3.0.0-6C63FF?style=for-the-badge)](https://github.com/AnOldStory/Js-Injection/releases)
[![Manifest](https://img.shields.io/badge/Manifest-V3-4CAF50?style=for-the-badge&logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](LICENSE)

<br/>

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-설치-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore/detail/js-injection/mijnijeicfcodlijkmafknapfcilffni)
[![Whale Store](https://img.shields.io/badge/Whale%20Store-설치-03C75A?style=flat-square&logo=naver&logoColor=white)](https://store.whale.naver.com/detail/aibngojigjlagjankjgbcapehgmolkfa)

</div>

---

## ✨ 소개

**Js-Injection**은 원하는 웹사이트에 JavaScript 코드를 자동으로 삽입하는 Chrome / Naver Whale 확장 프로그램입니다.

URL 패턴과 코드를 등록해두면, 해당 사이트 방문 시 자동으로 스크립트가 실행됩니다.

- 반복적인 JS 작업 자동화
- 사이트 UI 커스터마이징
- 디버깅 및 개발 편의 기능 주입

---

## 🚀 주요 기능

| 기능 | 설명 |
|------|------|
| 📝 **규칙 추가/수정/삭제** | URL 패턴별 JS 코드 관리 |
| 🔄 **자동 실행** | 등록된 URL 방문 시 즉시 실행 |
| ☁️ **클라우드 동기화** | `chrome.storage.sync`로 기기 간 자동 동기화 |
| 📦 **백업/복원** | JSON 파일로 규칙 내보내기/가져오기 |
| ⚡ **jQuery 자동 주입** | 옵션 활성화 시 jQuery 자동 삽입 |
| 🌐 **Glob 패턴** | `https://*.example.com/*` 형태의 와일드카드 지원 |

---

## 📥 설치

<table>
  <tr>
    <td align="center">
      <a href="https://chrome.google.com/webstore/detail/js-injection/mijnijeicfcodlijkmafknapfcilffni">
        <img src="https://img.shields.io/badge/-Chrome%20Web%20Store-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white"/>
      </a>
    </td>
    <td align="center">
      <a href="https://store.whale.naver.com/detail/aibngojigjlagjankjgbcapehgmolkfa">
        <img src="https://img.shields.io/badge/-Whale%20Store-03C75A?style=for-the-badge&logo=naver&logoColor=white"/>
      </a>
    </td>
  </tr>
</table>

---

## 🛠 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/AnOldStory/Js-Injection.git
cd Js-Injection

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 린트
npm run lint
```

### Chrome에서 로드 (개발 모드)

1. `chrome://extensions/` 이동
2. 우측 상단 **개발자 모드** ON
3. **압축해제된 확장 프로그램 로드** → `dist/` 폴더 선택

---

## 🏗 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | React 19, Redux Toolkit |
| **Build** | Vite 6, Sass |
| **Extension** | Manifest V3, Chrome Scripting API |
| **Code Editor** | react-ace, ace-builds |
| **CI/CD** | GitHub Actions |

---

## 📦 릴리즈

태그를 push하면 GitHub Actions가 자동으로:
1. 프로덕션 빌드
2. GitHub Release 생성 + zip 첨부
3. Chrome Web Store 자동 업로드

```bash
git tag -a v3.0.1 -m "Fix: ..."
git push origin v3.0.1
```

---

## 🔒 Privacy Policy

This extension **does not collect, store, transmit, or share any personal data**.

- All user-defined scripts and URL rules are stored locally via `chrome.storage.sync` and synced only through the user's own Google account.
- No data is ever sent to any external server, third party, or developer.
- No analytics, tracking, or telemetry of any kind.

### Permissions

| Permission | Reason |
|------------|--------|
| `scripting` | Injects user-defined JavaScript into web pages matching user-configured URL patterns. Scripts run only on pages the user has explicitly specified. |
| `storage` | Saves and syncs user-created injection rules across devices via Chrome's built-in `chrome.storage.sync` API. |
| `host_permissions: <all_urls>` | Users can define rules for any website. The extension only acts on URLs explicitly configured by the user. |

---

## 📋 TODO

- [x] 메인 화면 디자인
- [x] 팝업 페이지
- [x] 옵션 페이지 디자인
- [x] 파일 저장 (백업/복원)
- [x] 핵심 기능 구현
- [x] Manifest V3 마이그레이션
- [x] React 19 업그레이드
- [x] Chrome Web Store 자동 배포 CI/CD
- [ ] 규칙 On/Off 토글

---

## 🤝 기여

Issue 및 Pull Request 환영합니다!

👉 [GitHub Issues](https://github.com/AnOldStory/Js-Injection/issues)

---

<div align="center">

Made with ❤️ by [AnOldStory](https://github.com/AnOldStory)

</div>
