<?php
/**
 * TikSup Platform - Admin Game & Casino Control Module
 * File: admin_controls.php
 *
 * Description:
 * Drop-in Admin UI Card providing complete management for:
 *  1. Dynamic Payout Rate Control (RTP: 10% - 95%)
 *  2. House Risk Mode Engine (Random, Force Win, Force Lose, 75% Loss Bias)
 *
 * Usage:
 *  Simply include this file inside your existing TikSup Admin Dashboard view:
 *  <?php include_once __DIR__ . '/admin_controls.php'; ?>
 */

// Start session if not already active
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/RiskEngine.php';

use TikSup\Engine\RiskEngine;

// Resolve DB connection and fetch active settings
$riskPdo = $GLOBALS['pdo'] ?? $GLOBALS['db'] ?? null;
$engineInstance = new RiskEngine($riskPdo);
$currentSettings = $engineInstance->getSettings('global');

$activePayoutRate = (int)($currentSettings['payout_rate'] ?? 85);
$activeRiskMode   = (string)($currentSettings['risk_mode'] ?? 'random');

// Ensure CSRF token
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrfToken = $_SESSION['csrf_token'];
?>

<!-- ======================================================================= -->
<!-- TikSup Admin Game & Risk Control Widget                                  -->
<!-- ======================================================================= -->
<div id="tiksup-risk-control-card" class="tiksup-card">
    <!-- Header -->
    <div class="tiksup-card-header">
        <div class="tiksup-title-group">
            <div class="tiksup-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
            </div>
            <div>
                <h3 class="tiksup-card-title">Game & Casino Risk Engine</h3>
                <p class="tiksup-card-subtitle">
                    Manage statistical payout percentages (RTP) and house outcome overrides for binary trading and interactive games.
                </p>
            </div>
        </div>

        <div class="tiksup-status-badge-container">
            <span id="active-mode-badge" class="tiksup-badge badge-<?php echo htmlspecialchars($activeRiskMode); ?>">
                Active: <?php echo strtoupper(str_replace('_', ' ', $activeRiskMode)); ?>
            </span>
        </div>
    </div>

    <!-- Alert / Toast Container -->
    <div id="tiksup-alert-box" class="tiksup-alert" style="display: none;"></div>

    <!-- Controls Form -->
    <form id="tiksup-risk-form" method="POST" action="api_game_settings.php">
        <input type="hidden" name="csrf_token" id="tiksup-csrf-token" value="<?php echo htmlspecialchars($csrfToken); ?>">
        <input type="hidden" name="game_key" value="global">

        <!-- MODULE 1: Dynamic Payout Rate Control (RTP: 10% - 95%) -->
        <div class="tiksup-section">
            <div class="tiksup-section-header">
                <div>
                    <h4 class="tiksup-section-title">1. Dynamic Payout Rate Control (RTP)</h4>
                    <span class="tiksup-section-desc">
                        Defines the statistical expected payout/return percentage (Min 10%, Max 95%).
                    </span>
                </div>
                <div class="tiksup-rate-display">
                    <span class="rate-prefix">RTP:</span>
                    <span id="payout-number-badge" class="rate-value"><?php echo $activePayoutRate; ?>%</span>
                </div>
            </div>

            <!-- Slider + Numeric Input Group -->
            <div class="tiksup-slider-container">
                <div class="tiksup-input-row">
                    <input 
                        type="range" 
                        id="payout-rate-slider" 
                        name="payout_rate" 
                        min="10" 
                        max="95" 
                        step="1" 
                        value="<?php echo $activePayoutRate; ?>" 
                        class="tiksup-range-slider"
                    >
                    <div class="tiksup-numeric-box">
                        <input 
                            type="number" 
                            id="payout-rate-input" 
                            min="10" 
                            max="95" 
                            step="1" 
                            value="<?php echo $activePayoutRate; ?>" 
                            class="tiksup-number-input"
                        >
                        <span class="tiksup-percent-symbol">%</span>
                    </div>
                </div>

                <!-- Visual Bar: Player RTP vs House Edge -->
                <div class="tiksup-ratio-bar">
                    <div id="ratio-player-fill" class="ratio-fill-player" style="width: <?php echo $activePayoutRate; ?>%;">
                        <span>Player Return: <strong id="ratio-player-text"><?php echo $activePayoutRate; ?>%</strong></span>
                    </div>
                    <div id="ratio-house-fill" class="ratio-fill-house" style="width: <?php echo (100 - $activePayoutRate); ?>%;">
                        <span>House Edge: <strong id="ratio-house-text"><?php echo (100 - $activePayoutRate); ?>%</strong></span>
                    </div>
                </div>

                <!-- Fast Presets -->
                <div class="tiksup-presets">
                    <span class="preset-label">Quick Presets:</span>
                    <button type="button" class="preset-btn" data-value="25">25% (High Edge)</button>
                    <button type="button" class="preset-btn" data-value="50">50% (Aggressive)</button>
                    <button type="button" class="preset-btn" data-value="75">75% (Moderate)</button>
                    <button type="button" class="preset-btn" data-value="85">85% (TikSup Default)</button>
                    <button type="button" class="preset-btn" data-value="95">95% (Player Favor)</button>
                </div>
            </div>
        </div>

        <!-- MODULE 2: Risk Mode Engine (House Outcome Control) -->
        <div class="tiksup-section">
            <div class="tiksup-section-header">
                <div>
                    <h4 class="tiksup-section-title">2. Risk Mode Engine (House Outcome Override)</h4>
                    <span class="tiksup-section-desc">
                        Select operating mode for all outcome evaluations.
                    </span>
                </div>
            </div>

            <!-- Mode Selector Grid -->
            <div class="tiksup-modes-grid">
                <!-- Mode A: Random -->
                <label class="tiksup-mode-card <?php echo $activeRiskMode === 'random' ? 'selected' : ''; ?>" data-mode="random">
                    <input type="radio" name="risk_mode" value="random" <?php echo $activeRiskMode === 'random' ? 'checked' : ''; ?> class="tiksup-radio-hidden">
                    <div class="mode-card-header">
                        <span class="mode-badge badge-random">Mode A</span>
                        <span class="mode-state-tag">Standard RNG</span>
                    </div>
                    <div class="mode-title">Random (Fair RNG)</div>
                    <p class="mode-desc">
                        Standard mathematical RNG execution constrained by the defined Payout Rate (RTP).
                    </p>
                </label>

                <!-- Mode B: Force Win -->
                <label class="tiksup-mode-card <?php echo $activeRiskMode === 'force_win' ? 'selected' : ''; ?>" data-mode="force_win">
                    <input type="radio" name="risk_mode" value="force_win" <?php echo $activeRiskMode === 'force_win' ? 'checked' : ''; ?> class="tiksup-radio-hidden">
                    <div class="mode-card-header">
                        <span class="mode-badge badge-force_win">Mode B</span>
                        <span class="mode-state-tag text-success">100% Win Override</span>
                    </div>
                    <div class="mode-title">Force Win</div>
                    <p class="mode-desc">
                        Rigged outcome: player always wins the round. Overrides price ticks and normal odds.
                    </p>
                </label>

                <!-- Mode C: Force Lose -->
                <label class="tiksup-mode-card <?php echo $activeRiskMode === 'force_lose' ? 'selected' : ''; ?>" data-mode="force_lose">
                    <input type="radio" name="risk_mode" value="force_lose" <?php echo $activeRiskMode === 'force_lose' ? 'checked' : ''; ?> class="tiksup-radio-hidden">
                    <div class="mode-card-header">
                        <span class="mode-badge badge-force_lose">Mode C</span>
                        <span class="mode-state-tag text-danger">100% Loss Override</span>
                    </div>
                    <div class="mode-title">Force Lose</div>
                    <p class="mode-desc">
                        Rigged outcome: player always loses the round. Full house retention of all bet stakes.
                    </p>
                </label>

                <!-- Mode D: High House Edge (75% Loss Bias) -->
                <label class="tiksup-mode-card <?php echo $activeRiskMode === 'loss_75' ? 'selected' : ''; ?>" data-mode="loss_75">
                    <input type="radio" name="risk_mode" value="loss_75" <?php echo $activeRiskMode === 'loss_75' ? 'checked' : ''; ?> class="tiksup-radio-hidden">
                    <div class="mode-card-header">
                        <span class="mode-badge badge-loss_75">Mode D</span>
                        <span class="mode-state-tag text-warning">75% Loss / 25% Win</span>
                    </div>
                    <div class="mode-title">High House Edge (75% Loss)</div>
                    <p class="mode-desc">
                        Weighted algorithm enforcing a strict ~75% loss rate and 25% win rate for maximum house edge.
                    </p>
                </label>
            </div>

            <!-- Dynamic Warning Banner for Force Modes -->
            <div id="mode-warning-banner" class="tiksup-warning-callout" style="<?php echo ($activeRiskMode === 'force_win' || $activeRiskMode === 'force_lose') ? '' : 'display: none;'; ?>">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span id="mode-warning-text">
                    <?php if ($activeRiskMode === 'force_win'): ?>
                        <strong>ATTENTION:</strong> Mode 'Force Win' is active. All incoming user bets will be guaranteed winners!
                    <?php elseif ($activeRiskMode === 'force_lose'): ?>
                        <strong>ATTENTION:</strong> Mode 'Force Lose' is active. All incoming user bets will be guaranteed losses!
                    <?php endif; ?>
                </span>
            </div>
        </div>

        <!-- Footer Actions -->
        <div class="tiksup-card-footer">
            <span class="tiksup-footer-note">Changes take effect immediately across all live rounds.</span>
            <button type="submit" id="tiksup-save-btn" class="tiksup-btn-primary">
                <span class="btn-spinner" style="display: none;"></span>
                <span class="btn-text">Save Game Settings</span>
            </button>
        </div>
    </form>
</div>

<!-- ======================================================================= -->
<!-- Embedded CSS (Clean Dark Theme Matching TikSup Binance Aesthetic)        -->
<!-- ======================================================================= -->
<style>
.tiksup-card {
    background-color: #181a20;
    border: 1px solid #2b313a;
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 24px;
    color: #eaecef;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.tiksup-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #2b313a;
    padding-bottom: 16px;
    margin-bottom: 20px;
    gap: 16px;
    flex-wrap: wrap;
}

.tiksup-title-group {
    display: flex;
    align-items: center;
    gap: 12px;
}

.tiksup-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(240, 185, 11, 0.12);
    border: 1px solid rgba(240, 185, 11, 0.3);
    color: #F0B90B;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.tiksup-card-title {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.2px;
}

.tiksup-card-subtitle {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #848e9c;
}

.tiksup-badge {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}
.badge-random { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
.badge-force_win { background: rgba(14, 203, 129, 0.15); color: #0ECB81; border: 1px solid rgba(14, 203, 129, 0.3); }
.badge-force_lose { background: rgba(246, 70, 93, 0.15); color: #F6465D; border: 1px solid rgba(246, 70, 93, 0.3); }
.badge-loss_75 { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }

.tiksup-alert {
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 20px;
    animation: fadeIn 0.25s ease-in-out;
}
.tiksup-alert-success { background: rgba(14, 203, 129, 0.15); color: #0ECB81; border: 1px solid rgba(14, 203, 129, 0.4); }
.tiksup-alert-error { background: rgba(246, 70, 93, 0.15); color: #F6465D; border: 1px solid rgba(246, 70, 93, 0.4); }

.tiksup-section {
    background: #121418;
    border: 1px solid #2b313a;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
}

.tiksup-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 10px;
}

.tiksup-section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
}

.tiksup-section-desc {
    display: block;
    font-size: 11px;
    color: #848e9c;
    margin-top: 3px;
}

.tiksup-rate-display {
    background: rgba(240, 185, 11, 0.12);
    border: 1px solid rgba(240, 185, 11, 0.3);
    padding: 6px 14px;
    border-radius: 12px;
    display: flex;
    align-items: baseline;
    gap: 6px;
}
.rate-prefix { font-size: 11px; color: #848e9c; font-weight: 600; }
.rate-value { font-size: 18px; font-weight: 900; color: #F0B90B; font-family: monospace; }

.tiksup-input-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 14px;
}

.tiksup-range-slider {
    flex: 1;
    height: 8px;
    border-radius: 5px;
    background: #2b313a;
    outline: none;
    -webkit-appearance: none;
    cursor: pointer;
}
.tiksup-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #F0B90B;
    cursor: pointer;
    box-shadow: 0 0 10px rgba(240, 185, 11, 0.6);
    border: 2px solid #ffffff;
}

.tiksup-numeric-box {
    position: relative;
    width: 90px;
}
.tiksup-number-input {
    width: 100%;
    box-sizing: border-box;
    background: #181a20;
    border: 1px solid #2b313a;
    border-radius: 10px;
    padding: 8px 24px 8px 12px;
    color: #ffffff;
    font-size: 15px;
    font-weight: 800;
    font-family: monospace;
    outline: none;
    transition: border-color 0.2s;
}
.tiksup-number-input:focus { border-color: #F0B90B; }
.tiksup-percent-symbol {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #848e9c;
    font-size: 12px;
    font-weight: 700;
    pointer-events: none;
}

.tiksup-ratio-bar {
    display: flex;
    height: 26px;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 14px;
    font-size: 10px;
    font-weight: 700;
    border: 1px solid #2b313a;
}
.ratio-fill-player {
    background: #0ECB81;
    color: #0b0e11;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: width 0.15s ease;
    overflow: hidden;
    white-space: nowrap;
    padding: 0 6px;
}
.ratio-fill-house {
    background: #F6465D;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: width 0.15s ease;
    overflow: hidden;
    white-space: nowrap;
    padding: 0 6px;
}

.tiksup-presets {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}
.preset-label { font-size: 11px; color: #848e9c; font-weight: 600; }
.preset-btn {
    background: #181a20;
    border: 1px solid #2b313a;
    color: #eaecef;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
}
.preset-btn:hover {
    border-color: #F0B90B;
    color: #F0B90B;
}

.tiksup-modes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
}

.tiksup-mode-card {
    background: #181a20;
    border: 1.5px solid #2b313a;
    border-radius: 14px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    display: flex;
    flex-direction: column;
}
.tiksup-mode-card:hover {
    border-color: #474f5d;
    transform: translateY(-2px);
}
.tiksup-mode-card.selected {
    border-color: #F0B90B;
    background: rgba(240, 185, 11, 0.05);
    box-shadow: 0 0 15px rgba(240, 185, 11, 0.15);
}
.tiksup-radio-hidden {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.mode-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}
.mode-badge {
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
}
.mode-state-tag {
    font-size: 10px;
    font-weight: 700;
    color: #848e9c;
}
.text-success { color: #0ECB81 !important; }
.text-danger { color: #F6465D !important; }
.text-warning { color: #F0B90B !important; }

.mode-title {
    font-size: 13px;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 6px;
}
.mode-desc {
    font-size: 11px;
    color: #848e9c;
    margin: 0;
    line-height: 1.4;
}

.tiksup-warning-callout {
    margin-top: 14px;
    padding: 12px 16px;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.35);
    border-radius: 12px;
    color: #fbbf24;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.tiksup-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    flex-wrap: wrap;
    gap: 12px;
}
.tiksup-footer-note {
    font-size: 11px;
    color: #848e9c;
}

.tiksup-btn-primary {
    background: #F0B90B;
    color: #000000;
    border: none;
    border-radius: 12px;
    padding: 12px 28px;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 14px rgba(240, 185, 11, 0.3);
}
.tiksup-btn-primary:hover {
    background: #dfaa07;
    transform: translateY(-1px);
}
.tiksup-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #000;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>

<!-- ======================================================================= -->
<!-- Embedded JavaScript (AJAX Persistence & Interactive Synchronization)   -->
<!-- ======================================================================= -->
<script>
(function() {
    const slider = document.getElementById('payout-rate-slider');
    const numberInput = document.getElementById('payout-rate-input');
    const numberBadge = document.getElementById('payout-number-badge');
    const playerFill = document.getElementById('ratio-player-fill');
    const houseFill = document.getElementById('ratio-house-fill');
    const playerText = document.getElementById('ratio-player-text');
    const houseText = document.getElementById('ratio-house-text');
    const form = document.getElementById('tiksup-risk-form');
    const alertBox = document.getElementById('tiksup-alert-box');
    const saveBtn = document.getElementById('tiksup-save-btn');
    const btnSpinner = saveBtn.querySelector('.btn-spinner');
    const btnText = saveBtn.querySelector('.btn-text');
    const modeCards = document.querySelectorAll('.tiksup-mode-card');
    const modeBadge = document.getElementById('active-mode-badge');
    const warningBanner = document.getElementById('mode-warning-banner');
    const warningText = document.getElementById('mode-warning-text');

    // Sync Payout Slider and Number
    function updatePayoutRate(val) {
        val = parseInt(val, 10);
        if (isNaN(val)) val = 85;
        if (val < 10) val = 10;
        if (val > 95) val = 95;

        slider.value = val;
        numberInput.value = val;
        numberBadge.textContent = val + '%';

        const houseVal = 100 - val;
        playerFill.style.width = val + '%';
        houseFill.style.width = houseVal + '%';
        playerText.textContent = val + '%';
        houseText.textContent = houseVal + '%';
    }

    slider.addEventListener('input', (e) => updatePayoutRate(e.target.value));
    numberInput.addEventListener('input', (e) => updatePayoutRate(e.target.value));

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            updatePayoutRate(btn.getAttribute('data-value'));
        });
    });

    // Risk Mode Card Selection
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            modeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;

            const mode = card.getAttribute('data-mode');
            handleModeChange(mode);
        });
    });

    function handleModeChange(mode) {
        // Update header badge
        modeBadge.className = 'tiksup-badge badge-' + mode;
        modeBadge.textContent = 'Active: ' + mode.replace('_', ' ').toUpperCase();

        // Update warning banner
        if (mode === 'force_win') {
            warningBanner.style.display = 'flex';
            warningText.innerHTML = '<strong>ATTENTION:</strong> Mode <strong>Force Win</strong> is active. All incoming user bets will be guaranteed winners!';
        } else if (mode === 'force_lose') {
            warningBanner.style.display = 'flex';
            warningText.innerHTML = '<strong>ATTENTION:</strong> Mode <strong>Force Lose</strong> is active. All incoming user bets will be guaranteed losses!';
        } else {
            warningBanner.style.display = 'none';
        }
    }

    // Display Alert Notification
    function showAlert(type, message) {
        alertBox.className = 'tiksup-alert ' + (type === 'success' ? 'tiksup-alert-success' : 'tiksup-alert-error');
        alertBox.textContent = message;
        alertBox.style.display = 'block';

        setTimeout(() => {
            alertBox.style.display = 'none';
        }, 5000);
    }

    // AJAX Submission to api_game_settings.php
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const selectedRadio = form.querySelector('input[name="risk_mode"]:checked');
        const riskMode = selectedRadio ? selectedRadio.value : 'random';
        const payoutRate = parseInt(slider.value, 10);
        const csrfToken = document.getElementById('tiksup-csrf-token').value;

        // UI Loading state
        saveBtn.disabled = true;
        btnSpinner.style.display = 'inline-block';
        btnText.textContent = 'Saving Settings...';

        const payload = {
            csrf_token: csrfToken,
            game_key: 'global',
            payout_rate: payoutRate,
            risk_mode: riskMode
        };

        fetch('api_game_settings.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            saveBtn.disabled = false;
            btnSpinner.style.display = 'none';
            btnText.textContent = 'Save Game Settings';

            if (data.success) {
                showAlert('success', '✓ ' + (data.message || 'Game settings saved successfully.'));
                handleModeChange(riskMode);
            } else {
                showAlert('error', '✕ ' + (data.message || 'Failed to save settings.'));
            }
        })
        .catch(err => {
            saveBtn.disabled = false;
            btnSpinner.style.display = 'none';
            btnText.textContent = 'Save Game Settings';
            showAlert('error', '✕ Network error: ' + err.message);
        });
    });
})();
</script>
