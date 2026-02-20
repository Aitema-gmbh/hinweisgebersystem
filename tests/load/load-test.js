/**
 * k6 Load Test für aitema|Hinweis
 * 
 * Ausführen:
 *   k6 run tests/load/load-test.js --env BASE_URL=https://hinweis.yourdomain.de
 * 
 * Mit detailliertem Report:
 *   k6 run --out json=results.json tests/load/load-test.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const reportSubmitDuration = new Trend("report_submit_duration");

export const options = {
  stages: [
    { duration: "1m", target: 10 },   // Warmup: 0 → 10 VUs
    { duration: "3m", target: 50 },   // Ramp up: 10 → 50 VUs
    { duration: "5m", target: 50 },   // Sustained load: 50 VUs
    { duration: "2m", target: 100 },  // Peak: 50 → 100 VUs
    { duration: "2m", target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],  // 95% der Requests unter 2s
    http_req_failed: ["rate<0.01"],     // Fehlerrate unter 1%
    errors: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Anonyme Meldung einreichen
export function submitReport() {
  const payload = JSON.stringify({
    category: "Korruption",
    description: "Load-Test-Meldung – bitte ignorieren",
    isAnonymous: true,
  });

  const params = {
    headers: { "Content-Type": "application/json" },
    timeout: "30s",
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/reports`, payload, params);
  reportSubmitDuration.add(Date.now() - startTime);

  const success = check(res, {
    "status ist 201 oder 200": (r) => r.status === 201 || r.status === 200,
    "hat receiptCode": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.receiptCode !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  return success ? JSON.parse(res.body).receiptCode : null;
}

// Startseite laden
export function loadFrontend() {
  const res = http.get(BASE_URL);
  check(res, {
    "Startseite lädt": (r) => r.status === 200,
    "Content-Type HTML": (r) => r.headers["Content-Type"].includes("text/html"),
  });
}

// Meldungsstatus abfragen
export function checkReportStatus(receiptCode) {
  if (!receiptCode) return;
  
  const res = http.get(`${BASE_URL}/api/reports/status/${receiptCode}`);
  check(res, {
    "Status abrufbar": (r) => r.status === 200,
  });
}

export default function () {
  // Szenario-Mischung: 60% Frontend, 30% Meldung einreichen, 10% Status prüfen
  const rand = Math.random();
  
  if (rand < 0.6) {
    loadFrontend();
  } else if (rand < 0.9) {
    const receiptCode = submitReport();
    sleep(1);
    if (receiptCode) {
      checkReportStatus(receiptCode);
    }
  } else {
    checkReportStatus("ABCD-1234"); // Test mit festem Code
  }
  
  sleep(Math.random() * 2 + 1); // 1-3s zwischen Requests
}
