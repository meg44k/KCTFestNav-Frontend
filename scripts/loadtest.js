// 負荷テスト(k6)。来場者 1 日 5,000 人を見込み、同時 300 人が 10 分見て回る
// 使い方: k6 run -e BASE_URL=https://kctfest.jp scripts/loadtest.js
import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
  scenarios: {
    visitors: {
      executor: "ramping-vus",
      stages: [
        { duration: "2m", target: 300 },
        { duration: "10m", target: 300 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate==0"],
    http_req_duration: ["p(95)<1000"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const PAGES = ["/main", "/class-booth", "/bazaar", "/map", "/stage-event"];

export default function () {
  for (const path of PAGES) {
    const res = http.get(BASE + path);
    check(res, { "200 が返る": (r) => r.status === 200 });
    sleep(1 + Math.random() * 3);
  }
}
