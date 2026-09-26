<?php
/**
 * TikSup Platform - Admin Game Settings API Endpoint
 * File: api_game_settings.php
 *
 * Handles AJAX & REST requests to read and update game settings:
 *  - Dynamic Payout Rate (10% - 95%)
 *  - House Risk Mode ('random', 'force_win', 'force_lose', 'loss_75')
 *
 * Security:
 *  - Admin session / role verification
 *  - Timing-attack-safe CSRF validation
 *  - Strict parameter sanitization and type enforcement
 */

declare(strict_types=1);

// Ensure session is started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set standard JSON API headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

require_once __DIR__ . '/RiskEngine.php';

use TikSup\Engine\RiskEngine;

/**
 * Send JSON response and exit
 */
function sendJsonResponse(bool $success, string $message, array $data = [], int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode([
        'success'   => $success,
        'message'   => $message,
        'data'      => $data,
        'timestamp' => time(),
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Verify Administrator Authentication
 * Compatible with TikSup's admin session mechanisms
 */
function verifyAdminAuthentication(): array
{
    // 1. Session check: verify admin session flags
    $isAdmin = (
        !empty($_SESSION['admin_logged_in']) ||
        !empty($_SESSION['is_admin']) ||
        (isset($_SESSION['role']) && in_array(strtolower((string)$_SESSION['role']), ['admin', 'superadmin'], true)) ||
        (isset($_SESSION['admin_user']) && !empty($_SESSION['admin_user']))
    );

    // 2. Token / Bearer Header check (for headless or mobile admin panels)
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$isAdmin && !empty($authHeader) && preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
        $token = $matches[1];
        if (isset($_SESSION['admin_api_token']) && hash_equals($_SESSION['admin_api_token'], $token)) {
            $isAdmin = true;
        }
    }

    // Fallback for development / mock setup if running in test environment
    if (!$isAdmin && defined('TIKSUP_ENV') && TIKSUP_ENV === 'development') {
        $isAdmin = true;
    }

    if (!$isAdmin) {
        sendJsonResponse(false, 'Unauthorized access. Administrator privileges required.', [], 401);
    }

    $adminName = $_SESSION['admin_username'] ?? $_SESSION['admin_name'] ?? $_SESSION['admin_user'] ?? 'Admin';
    return ['username' => (string)$adminName];
}

/**
 * Generate or retrieve CSRF token
 */
function getOrCreateCsrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Validate CSRF token against session
 */
function validateCsrfToken(?string $submittedToken): bool
{
    if (empty($submittedToken) || empty($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $submittedToken);
}

// -----------------------------------------------------------------------------
// Establish Database Connection
// -----------------------------------------------------------------------------
$pdo = null;

// Check existing globals
if (isset($GLOBALS['pdo']) && $GLOBALS['pdo'] instanceof PDO) {
    $pdo = $GLOBALS['pdo'];
} elseif (isset($GLOBALS['db']) && $GLOBALS['db'] instanceof PDO) {
    $pdo = $GLOBALS['db'];
} else {
    // Attempt standard TikSup database credentials from environment or config
    $dbHost = getenv('DB_HOST') ?: '127.0.0.1';
    $dbPort = getenv('DB_PORT') ?: '3306';
    $dbName = getenv('DB_DATABASE') ?: getenv('DB_NAME') ?: 'tiksup';
    $dbUser = getenv('DB_USERNAME') ?: getenv('DB_USER') ?: 'root';
    $dbPass = getenv('DB_PASSWORD') ?: getenv('DB_PASS') ?: '';

    try {
        $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
        $pdo = new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        // Fallback: engine can still operate with defaults if DB credentials are not yet set
        error_log("[api_game_settings.php] Database connection notice: " . $e->getMessage());
    }
}

$riskEngine = new RiskEngine($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// =============================================================================
// GET Request: Retrieve current settings & fresh CSRF token
// =============================================================================
if ($method === 'GET') {
    $admin = verifyAdminAuthentication();
    $gameKey = filter_input(INPUT_GET, 'game_key', FILTER_DEFAULT) ?: 'global';
    
    $settings = $riskEngine->getSettings((string)$gameKey);
    $csrfToken = getOrCreateCsrfToken();

    sendJsonResponse(true, 'Game settings retrieved successfully.', [
        'settings'       => $settings,
        'valid_modes'    => RiskEngine::VALID_MODES,
        'payout_bounds'  => [
            'min'     => RiskEngine::MIN_PAYOUT_RATE,
            'max'     => RiskEngine::MAX_PAYOUT_RATE,
            'default' => RiskEngine::DEFAULT_PAYOUT_RATE,
        ],
        'csrf_token'     => $csrfToken,
        'admin_username' => $admin['username'],
    ], 200);
}

// =============================================================================
// POST Request: Update payout rate and risk mode
// =============================================================================
if ($method === 'POST') {
    $admin = verifyAdminAuthentication();

    // Parse input (supports JSON payloads or standard form POST)
    $inputData = [];
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $rawBody = file_get_contents('php://input');
        $decoded = json_decode($rawBody, true);
        if (is_array($decoded)) {
            $inputData = $decoded;
        }
    } else {
        $inputData = $_POST;
    }

    // CSRF Validation
    $submittedCsrf = $inputData['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
    if (!validateCsrfToken($submittedCsrf)) {
        sendJsonResponse(false, 'CSRF verification failed. Please refresh the page and try again.', [], 403);
    }

    // Validate Payout Rate (RTP)
    if (!isset($inputData['payout_rate'])) {
        sendJsonResponse(false, 'Missing required field: payout_rate.', [], 422);
    }

    $payoutRate = filter_var($inputData['payout_rate'], FILTER_VALIDATE_INT);
    if ($payoutRate === false || $payoutRate < RiskEngine::MIN_PAYOUT_RATE || $payoutRate > RiskEngine::MAX_PAYOUT_RATE) {
        sendJsonResponse(
            false,
            sprintf('Payout rate must be an integer between %d%% and %d%%.', RiskEngine::MIN_PAYOUT_RATE, RiskEngine::MAX_PAYOUT_RATE),
            [],
            422
        );
    }

    // Validate Risk Mode
    if (empty($inputData['risk_mode'])) {
        sendJsonResponse(false, 'Missing required field: risk_mode.', [], 422);
    }

    $riskMode = trim((string)$inputData['risk_mode']);
    if (!in_array($riskMode, RiskEngine::VALID_MODES, true)) {
        sendJsonResponse(
            false,
            'Invalid risk mode. Allowed values: ' . implode(', ', RiskEngine::VALID_MODES),
            [],
            422
        );
    }

    $gameKey = !empty($inputData['game_key']) ? trim((string)$inputData['game_key']) : 'global';
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

    try {
        $updated = $riskEngine->updateSettings(
            (int)$payoutRate,
            $riskMode,
            $admin['username'],
            $gameKey,
            $clientIp
        );

        if ($updated) {
            sendJsonResponse(true, 'TikSup Game & Risk settings updated successfully.', [
                'game_key'    => $gameKey,
                'payout_rate' => $payoutRate,
                'risk_mode'   => $riskMode,
                'updated_by'  => $admin['username'],
                'updated_at'  => date('c'),
            ], 200);
        } else {
            sendJsonResponse(false, 'Failed to update settings in database.', [], 500);
        }
    } catch (Exception $e) {
        sendJsonResponse(false, 'Error updating settings: ' . $e->getMessage(), [], 500);
    }
}

// Method not allowed
sendJsonResponse(false, 'Method Not Allowed.', [], 405);
