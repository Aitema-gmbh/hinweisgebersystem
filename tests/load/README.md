# Load Tests mit k6

## Installation

```bash
# macOS
brew install k6

# Linux
sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Ausführen

```bash
# Einfacher Test gegen Staging
k6 run tests/load/load-test.js --env BASE_URL=https://staging.yourdomain.de

# Mit detailliertem Bericht
k6 run --out json=results.json tests/load/load-test.js

# Smoke Test (nur 1 VU, 1 Minute)
k6 run --vus 1 --duration 1m tests/load/load-test.js
```

## Erwartete Ergebnisse (Benchmark)

| Metrik | Ziel |
|--------|------|
| p95 Response Time | < 2000ms |
| Error Rate | < 1% |
| Requests/s | > 50 |
