#!/usr/bin/env bash
# =============================================================================
# aitema|Hinweis - Server Hardening Script
# BSI SYS.1.1 (Allgemeiner Server), SYS.1.3 (Server unter Linux),
# APP.4.4 (Docker), OPS.1.1.4 (Schutz vor Schadprogrammen)
# =============================================================================
set -euo pipefail

LOG_FILE="/var/log/aitema-hardening.log"
log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "${LOG_FILE}"; }

log "=== aitema|Hinweis Server Hardening ==="

# ---------------------------------------------------------------------------
# 1. Kernel / Sysctl Hardening (BSI SYS.1.3.A4)
# ---------------------------------------------------------------------------
log "Applying sysctl hardening parameters..."

cat > /etc/sysctl.d/99-aitema-hardening.conf << 'SYSCTL'
# aitema|Hinweis - Kernel Hardening (BSI SYS.1.3.A4)

# Network: Disable IP forwarding (not a router)
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# Network: SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2

# Network: Prevent IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Network: Disable source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Network: Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Network: Log martian packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Network: Ignore ICMP broadcasts
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Memory: Restrict core dumps
fs.suid_dumpable = 0

# Memory: Address space layout randomization
kernel.randomize_va_space = 2

# Kernel: Restrict dmesg access
kernel.dmesg_restrict = 1

# Kernel: Restrict kernel pointer exposure
kernel.kptr_restrict = 2

# Kernel: Restrict ptrace scope
kernel.yama.ptrace_scope = 2

# Kernel: Restrict unprivileged BPF
kernel.unprivileged_bpf_disabled = 1
SYSCTL

sysctl --system > /dev/null 2>&1
log "Sysctl parameters applied"

# ---------------------------------------------------------------------------
# 2. UFW Firewall Rules (BSI NET.3.2)
# ---------------------------------------------------------------------------
log "Configuring UFW firewall..."

if ! command -v ufw &>/dev/null; then
    apt-get update -qq && apt-get install -y -qq ufw
fi

# Reset and set defaults
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing

# SSH (rate limited)
ufw limit 22/tcp comment "SSH rate-limited"

# HTTP/HTTPS for web application
ufw allow 80/tcp comment "HTTP (redirect to HTTPS)"
ufw allow 443/tcp comment "HTTPS"

# GlobaLeaks backend (internal only via Docker)
# Port 8080/8443 should NOT be exposed externally
# ufw allow from 172.16.0.0/12 to any port 8080 comment "GlobaLeaks backend (Docker internal)"

# Enable firewall
ufw --force enable
log "UFW firewall configured and enabled"

# ---------------------------------------------------------------------------
# 3. Docker Security (BSI APP.4.4)
# ---------------------------------------------------------------------------
log "Applying Docker security configuration..."

mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'DOCKERCONF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "5"
    },
    "storage-driver": "overlay2",
    "live-restore": true,
    "userns-remap": "default",
    "no-new-privileges": true,
    "icc": false,
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 65536,
            "Soft": 32768
        },
        "nproc": {
            "Name": "nproc",
            "Hard": 4096,
            "Soft": 2048
        }
    }
}
DOCKERCONF

log "Docker daemon configuration written"
log "NOTE: Docker security labels for containers should be set in docker-compose.yml:"
log "  - security_opt: [no-new-privileges:true]"
log "  - read_only: true (where possible)"
log "  - cap_drop: [ALL]"
log "  - cap_add: (only required capabilities)"
log "  - tmpfs: /tmp (for read-only rootfs)"

# ---------------------------------------------------------------------------
# 4. Fail2ban Configuration (BSI OPS.1.1.4)
# ---------------------------------------------------------------------------
log "Configuring Fail2ban..."

if ! command -v fail2ban-client &>/dev/null; then
    apt-get update -qq && apt-get install -y -qq fail2ban
fi

cat > /etc/fail2ban/jail.d/aitema-hinweis.conf << 'FAIL2BAN'
# aitema|Hinweis Fail2ban Configuration
# BSI OPS.1.1.4: Protection against brute-force attacks

[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
banaction = ufw

# SSH protection
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

# Nginx HTTP auth failures
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600

# GlobaLeaks login failures
[globaleaks-auth]
enabled = true
filter = globaleaks-auth
logpath = /var/globaleaks/log/access.log
maxretry = 5
findtime = 300
bantime = 1800

# Nginx request limit (429 responses)
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 60
bantime = 600
FAIL2BAN

# GlobaLeaks auth filter
mkdir -p /etc/fail2ban/filter.d
cat > /etc/fail2ban/filter.d/globaleaks-auth.conf << 'FILTER'
# Fail2ban filter for GlobaLeaks authentication failures
[Definition]
failregex = ^.*AUTH_FAILURE.*"ip_address":\s*"<HOST>".*$
ignoreregex =
FILTER

systemctl enable fail2ban
systemctl restart fail2ban || log "WARNING: Fail2ban restart failed (may need log files to exist first)"
log "Fail2ban configured"

# ---------------------------------------------------------------------------
# 5. Log Rotation (BSI OPS.1.1.5)
# ---------------------------------------------------------------------------
log "Configuring log rotation..."

cat > /etc/logrotate.d/aitema-hinweis << 'LOGROTATE'
# aitema|Hinweis Log Rotation
# BSI OPS.1.1.5: Log management and retention

# GlobaLeaks application logs
/var/globaleaks/log/*.log {
    daily
    missingok
    rotate 365
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker kill --signal=USR1 globaleaks 2>/dev/null || true
    endscript
}

# Audit logs (3 years retention per HinSchG Sec. 11)
/var/globaleaks/log/audit/*.log {
    daily
    missingok
    rotate 1095
    compress
    delaycompress
    notifempty
    create 0640 root root
}

# Nginx logs
/var/log/nginx/*.log {
    daily
    missingok
    rotate 90
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker exec nginx nginx -s reopen 2>/dev/null || true
    endscript
}
LOGROTATE

log "Log rotation configured"

# ---------------------------------------------------------------------------
# 6. Additional Hardening
# ---------------------------------------------------------------------------
log "Applying additional hardening..."

# Restrict cron access
if [ -f /etc/cron.allow ]; then
    echo "root" > /etc/cron.allow
fi
chmod 600 /etc/crontab 2>/dev/null || true

# Disable unnecessary services
for svc in avahi-daemon cups bluetooth; do
    systemctl disable "${svc}" 2>/dev/null || true
    systemctl stop "${svc}" 2>/dev/null || true
done

# Secure shared memory
if ! grep -q "tmpfs /run/shm" /etc/fstab 2>/dev/null; then
    echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid,nodev 0 0" >> /etc/fstab
    log "Shared memory hardened in fstab"
fi

# Create audit log directory
mkdir -p /var/globaleaks/log/audit
chmod 750 /var/globaleaks/log/audit

log "=== Server hardening complete ==="
log "IMPORTANT: Review Docker daemon changes and restart Docker:"
log "  systemctl restart docker"
log "NOTE: userns-remap may require container volume permission adjustments"
log "Test thoroughly before applying in production!"
