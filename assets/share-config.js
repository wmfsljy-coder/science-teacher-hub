/* 우리 반 공유 뒷단(Google Apps Script 웹앱) 주소. 비워 두면 공유 없이 내 성과만 보인다.
   배포 방법은 science-teacher-hub 저장소의 share-backend/README.md 참고. */
window.STH_SHARE_URL = "https://script.google.com/macros/s/AKfycbxIFfvQS-gIVKYCan11Bpr0I35KWyRZUD7gOvUGl2fJCC08nXpLGYQ5OKZfJcbSXMjF/exec";
/* 이 주소에서 열렸을 때만 위 공유 주소를 쓴다. 학교를 옮겨 복사했다면 내 Pages 주소로 바꾸고, 위 STH_SHARE_URL 도 내 웹 앱 주소로 바꾼다. */
window.STH_SHARE_HOSTS = ["wmfsljy-coder.github.io", "localhost", "127.0.0.1"];

/* 현장 보기(위성 사진)를 쪽 안에 띄우는 Google Maps Embed API 키. 비워 두면 구글 지도를 새 창으로 연다.
   이 키는 누구나 볼 수 있으므로, Google Cloud 에서 'Maps Embed API' 하나만 허용하고 HTTP 리퍼러를 위 Pages 주소(예: https://wmfsljy-coder.github.io/*)로 제한한다. */
window.STH_MAPS_KEY = "";
