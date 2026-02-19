#!/usr/bin/env bash
# =============================================================================
# aitema|Hinweis - Let's Encrypt Certificate Management
# BSI APP.3.2.A11 / BSI TR-02102-2: TLS certificate provisioning
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DOMAIN="${HINWEIS_DOMAIN:-hinweis.aitema.de}"
EMAIL="${CERTBOT_EMAIL:-admin@aitema.de}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
NGINX_SSL_DIR="/opt/aitema/hinweisgebersystem/aitema-hinweis/docker/nginx/ssl"
WEBROOT="/var/www/certbot"
RENEWAL_HOOK_CMD="docker compose -f /opt/aitema/hinweisgebersystem/aitema-hinweis/docker/docker-compose.yml restart nginx"

LOG_FILE="/var/log/certbot-hinweis.log"

log() {
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "${LOG_FILE}"
}

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
if ! command -v certbot &>/dev/null; then
    log "ERROR: certbot not found. Installing..."
    apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx
fi

mkdir -p "${WEBROOT}" "${NGINX_SSL_DIR}"

# ---------------------------------------------------------------------------
# Initial certificate request
# ---------------------------------------------------------------------------
request_certificate() {
    log "Requesting certificate for ${DOMAIN}..."

    certbot certonly \
        --webroot \
        --webroot-path "${WEBROOT}" \
        --domain "${DOMAIN}" \
        --email "${EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        --force-renewal \
        --rsa-key-size 4096 \
        --must-staple \
        --staple-ocsp \
        2>&1 | tee -a "${LOG_FILE}"

    if [ $? -eq 0 ]; then
        log "Certificate obtained successfully for ${DOMAIN}"
        deploy_certificate
    else
        log "ERROR: Certificate request failed for ${DOMAIN}"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Deploy certificate to Nginx SSL directory
# ---------------------------------------------------------------------------
deploy_certificate() {
    log "Deploying certificate to ${NGINX_SSL_DIR}..."

    if [ -f "${CERT_DIR}/fullchain.pem" ] && [ -f "${CERT_DIR}/privkey.pem" ]; then
        cp -L "${CERT_DIR}/fullchain.pem" "${NGINX_SSL_DIR}/fullchain.pem"
        cp -L "${CERT_DIR}/privkey.pem" "${NGINX_SSL_DIR}/privkey.pem"
        cp -L "${CERT_DIR}/chain.pem" "${NGINX_SSL_DIR}/chain.pem"

        # Strict permissions (BSI SYS.1.1.A6)
        chmod 644 "${NGINX_SSL_DIR}/fullchain.pem"
        chmod 644 "${NGINX_SSL_DIR}/chain.pem"
        chmod 600 "${NGINX_SSL_DIR}/privkey.pem"
        chown root:root "${NGINX_SSL_DIR}"/*.pem

        log "Certificate deployed. Reloading Nginx..."
        ${RENEWAL_HOOK_CMD} || docker exec nginx nginx -s reload 2>/dev/null || true
    else
        log "ERROR: Certificate files not found in ${CERT_DIR}"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Setup auto-renewal via systemd timer
# ---------------------------------------------------------------------------
setup_auto_renewal() {
    log "Setting up auto-renewal..."

    # Certbot renewal deploy hook
    HOOK_DIR="/etc/letsencrypt/renewal-hooks/deploy"
    mkdir -p "${HOOK_DIR}"

    cat > "${HOOK_DIR}/01-deploy-hinweis.sh" << 'DEPLOY_HOOK'
#!/bin/bash
# Auto-deploy renewed certificate to aitema|Hinweis
NGINX_SSL_DIR="/opt/aitema/hinweisgebersystem/aitema-hinweis/docker/nginx/ssl"
DOMAIN="${RENEWED_LINEAGE##*/}"
cp -L "${RENEWED_LINEAGE}/fullchain.pem" "${NGINX_SSL_DIR}/fullchain.pem"
cp -L "${RENEWED_LINEAGE}/privkey.pem" "${NGINX_SSL_DIR}/privkey.pem"
cp -L "${RENEWED_LINEAGE}/chain.pem" "${NGINX_SSL_DIR}/chain.pem"
chmod 600 "${NGINX_SSL_DIR}/privkey.pem"
chmod 644 "${NGINX_SSL_DIR}/fullchain.pem" "${NGINX_SSL_DIR}/chain.pem"
docker exec nginx nginx -s reload 2>/dev/null || true
echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Certificate renewed and deployed for ${DOMAIN}" >> /var/log/certbot-hinweis.log
DEPLOY_HOOK
    chmod +x "${HOOK_DIR}/01-deploy-hinweis.sh"

    # Systemd timer for renewal check (twice daily per Let's Encrypt recommendation)
    cat > /etc/systemd/system/certbot-hinweis.service << 'SERVICE'
[Unit]
Description=aitema Hinweis - Certbot certificate renewal
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --deploy-hook /etc/letsencrypt/renewal-hooks/deploy/01-deploy-hinweis.sh
SERVICE

    cat > /etc/systemd/system/certbot-hinweis.timer << 'TIMER'
[Unit]
Description=aitema Hinweis - Certbot renewal timer (twice daily)

[Timer]
OnCalendar=*-*-* 03:00:00
OnCalendar=*-*-* 15:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
TIMER

    systemctl daemon-reload
    systemctl enable --now certbot-hinweis.timer
    log "Auto-renewal timer activated (03:00 + 15:00 UTC daily)"
}

# ---------------------------------------------------------------------------
# Certificate status check
# ---------------------------------------------------------------------------
check_certificate() {
    log "Checking certificate status..."

    if [ -f "${NGINX_SSL_DIR}/fullchain.pem" ]; then
        EXPIRY=$(openssl x509 -enddate -noout -in "${NGINX_SSL_DIR}/fullchain.pem" 2>/dev/null | cut -d= -f2)
        SUBJECT=$(openssl x509 -subject -noout -in "${NGINX_SSL_DIR}/fullchain.pem" 2>/dev/null)
        log "Certificate: ${SUBJECT}"
        log "Expires: ${EXPIRY}"

        # Check if expiring within 30 days
        if openssl x509 -checkend 2592000 -noout -in "${NGINX_SSL_DIR}/fullchain.pem" 2>/dev/null; then
            log "Certificate is valid for at least 30 more days"
        else
            log "WARNING: Certificate expires within 30 days! Triggering renewal..."
            request_certificate
        fi
    else
        log "No certificate found. Requesting new certificate..."
        request_certificate
    fi
}

# ---------------------------------------------------------------------------
# Generate DH parameters (BSI TR-02102-2)
# ---------------------------------------------------------------------------
generate_dhparams() {
    DH_FILE="${NGINX_SSL_DIR}/dhparam.pem"
    if [ ! -f "${DH_FILE}" ]; then
        log "Generating DH parameters (4096 bit, per BSI TR-02102-2)..."
        openssl dhparam -out "${DH_FILE}" 4096
        chmod 644 "${DH_FILE}"
        log "DH parameters generated"
    else
        log "DH parameters already exist at ${DH_FILE}"
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
case "${1:-setup}" in
    setup)
        log "=== aitema|Hinweis Certificate Setup ==="
        generate_dhparams
        request_certificate
        setup_auto_renewal
        log "=== Setup complete ==="
        ;;
    renew)
        log "=== Manual renewal triggered ==="
        certbot renew --force-renewal
        deploy_certificate
        ;;
    check)
        check_certificate
        ;;
    deploy)
        deploy_certificate
        ;;
    dhparams)
        generate_dhparams
        ;;
    *)
        echo "Usage: $0 {setup|renew|check|deploy|dhparams}"
        echo ""
        echo "  setup    - Initial certificate request + auto-renewal setup"
        echo "  renew    - Force certificate renewal"
        echo "  check    - Check certificate status and renew if needed"
        echo "  deploy   - Deploy existing certificate to Nginx"
        echo "  dhparams - Generate Diffie-Hellman parameters"
        exit 1
        ;;
esac
