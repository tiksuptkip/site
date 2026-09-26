<?php
/**
 * TikSup Platform - Risk Mode Engine & Dynamic Payout Controller
 * File: RiskEngine.php
 *
 * Description:
 * Isolated backend engine responsible for evaluating casino, binary trading,
 * and interactive game outcomes according to Admin-configured parameters:
 *  - Dynamic Payout Rate (RTP: 10% - 95%)
 *  - House Risk Modes:
 *      * 'random'     : Fair RNG execution constrained by target payout rate.
 *      * 'force_win'  : Player 100% win override.
 *      * 'force_lose' : Player 100% loss override.
 *      * 'loss_75'    : Enforces ~75% loss rate, 25% win rate.
 */

declare(strict_types=1);

namespace TikSup\Engine;

use PDO;
use Exception;
use InvalidArgumentException;

class RiskEngine
{
    // House Risk Modes
    public const MODE_RANDOM     = 'random';
    public const MODE_FORCE_WIN  = 'force_win';
    public const MODE_FORCE_LOSE = 'force_lose';
    public const MODE_LOSS_75    = 'loss_75';

    public const VALID_MODES = [
        self::MODE_RANDOM,
        self::MODE_FORCE_WIN,
        self::MODE_FORCE_LOSE,
        self::MODE_LOSS_75,
    ];

    // Payout Rate Constraints (RTP %)
    public const MIN_PAYOUT_RATE     = 10;
    public const MAX_PAYOUT_RATE     = 95;
    public const DEFAULT_PAYOUT_RATE = 85;

    /**
     * @var PDO|null Database connection handle
     */
    protected ?PDO $db = null;

    /**
     * @var array In-memory cache of loaded settings
     */
    protected array $settingsCache = [];

    /**
     * Constructor
     *
     * @param PDO|null $db Optional PDO instance. If null, will attempt to use global $pdo / $db.
     */
    public function __construct(?PDO $db = null)
    {
        if ($db !== null) {
            $this->db = $db;
        } else {
            // Attempt to resolve from existing TikSup global database connection
            if (isset($GLOBALS['pdo']) && $GLOBALS['pdo'] instanceof PDO) {
                $this->db = $GLOBALS['pdo'];
            } elseif (isset($GLOBALS['db']) && $GLOBALS['db'] instanceof PDO) {
                $this->db = $GLOBALS['db'];
            }
        }
    }

    /**
     * Set or replace the PDO connection.
     *
     * @param PDO $db
     * @return self
     */
    public function setConnection(PDO $db): self
    {
        $this->db = $db;
        return $this;
    }

    /**
     * Fetch active game settings for a given game key or fallback to defaults.
     *
     * @param string $gameKey Game identifier, defaults to 'global'
     * @return array Array containing 'payout_rate' and 'risk_mode'
     */
    public function getSettings(string $gameKey = 'global'): array
    {
        if (isset($this->settingsCache[$gameKey])) {
            return $this->settingsCache[$gameKey];
        }

        $default = [
            'game_key'    => $gameKey,
            'payout_rate' => self::DEFAULT_PAYOUT_RATE,
            'risk_mode'   => self::MODE_RANDOM,
            'min_bet'     => 1.00,
            'max_bet'     => 1000.00,
        ];

        if ($this->db === null) {
            return $default;
        }

        try {
            $stmt = $this->db->prepare("
                SELECT `game_key`, `payout_rate`, `risk_mode`, `min_bet`, `max_bet`
                FROM `game_settings`
                WHERE `game_key` = :key AND `is_active` = 1
                LIMIT 1
            ");
            $stmt->execute([':key' => $gameKey]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                $payoutRate = (int)$row['payout_rate'];
                if ($payoutRate < self::MIN_PAYOUT_RATE || $payoutRate > self::MAX_PAYOUT_RATE) {
                    $payoutRate = self::DEFAULT_PAYOUT_RATE;
                }

                $riskMode = (string)$row['risk_mode'];
                if (!in_array($riskMode, self::VALID_MODES, true)) {
                    $riskMode = self::MODE_RANDOM;
                }

                $settings = [
                    'game_key'    => $row['game_key'],
                    'payout_rate' => $payoutRate,
                    'risk_mode'   => $riskMode,
                    'min_bet'     => (float)($row['min_bet'] ?? 1.00),
                    'max_bet'     => (float)($row['max_bet'] ?? 1000.00),
                ];
                $this->settingsCache[$gameKey] = $settings;
                return $settings;
            }
        } catch (Exception $e) {
            error_log("[RiskEngine::getSettings] Error: " . $e->getMessage());
        }

        return $default;
    }

    /**
     * Core Algorithm: Determine Game Outcome
     *
     * Evaluates whether a round is a WIN or a LOSS and calculates payouts based on:
     * 1. Mode 'force_win'  -> Player always wins.
     * 2. Mode 'force_lose' -> Player always loses.
     * 3. Mode 'loss_75'    -> Weighted probability: 75% loss, 25% win.
     * 4. Mode 'random'     -> RNG weighted by Payout Rate (RTP 10% - 95%) and odds.
     *
     * @param float $betAmount Bet / Stake amount placed by player.
     * @param float $odds Total payout multiplier (e.g. 1.85 for an 85% profit binary trade).
     * @param int|null $userId Optional ID of player placing the bet.
     * @param string $gameKey Identifier for specific game/module settings.
     * @return array Structured outcome data payload.
     * @throws InvalidArgumentException
     */
    public function determineGameOutcome(
        float $betAmount,
        float $odds = 1.85,
        ?int $userId = null,
        string $gameKey = 'global'
    ): array {
        if ($betAmount <= 0) {
            throw new InvalidArgumentException("Bet amount must be greater than zero.");
        }

        if ($odds < 1.0) {
            $odds = 1.0;
        }

        // Retrieve current settings
        $settings = $this->getSettings($gameKey);
        $payoutRate = (int)$settings['payout_rate'];
        $riskMode = (string)$settings['risk_mode'];

        $isWin = false;
        $reason = '';
        $seedRoll = 0.0;
        $calculatedWinProb = 0.0;

        switch ($riskMode) {
            case self::MODE_FORCE_WIN:
                // Mode B: Rigged outcome: player always wins
                $isWin = true;
                $reason = 'House Override: Force Win (100% Win Rate)';
                $calculatedWinProb = 100.0;
                $seedRoll = 100.0;
                break;

            case self::MODE_FORCE_LOSE:
                // Mode C: Rigged outcome: player always loses
                $isWin = false;
                $reason = 'House Override: Force Lose (100% Loss Rate)';
                $calculatedWinProb = 0.0;
                $seedRoll = 0.0;
                break;

            case self::MODE_LOSS_75:
                // Mode D: High House Edge (75% Loss / 25% Win)
                // Cryptographically secure integer roll between 1 and 100
                $roll = random_int(1, 100);
                $seedRoll = (float)$roll;
                $calculatedWinProb = 25.0; // Fixed 25% win chance

                if ($roll <= 25) {
                    $isWin = true;
                    $reason = 'High House Edge Mode: Win roll (25% boundary)';
                } else {
                    $isWin = false;
                    $reason = 'High House Edge Mode: Loss roll (75% boundary)';
                }
                break;

            case self::MODE_RANDOM:
            default:
                // Mode A: Random execution constrained by defined Payout Rate (10% - 95%)
                // Expected Value: EV = P(win) * odds
                // To achieve target RTP (Payout Rate): P(win) = (RTP / 100) / odds
                $targetRtp = $payoutRate / 100.0;
                $theoreticalWinProb = ($targetRtp / $odds);

                // Clamp probability to valid statistical bounds [0.01, 0.95]
                $clampedWinProb = max(0.01, min(0.95, $theoreticalWinProb));
                $calculatedWinProb = round($clampedWinProb * 100, 2);

                // High-precision roll from 1 to 10000 (0.01% resolution)
                $precisionRoll = random_int(1, 10000) / 100.0;
                $seedRoll = $precisionRoll;

                if ($precisionRoll <= $calculatedWinProb) {
                    $isWin = true;
                    $reason = "Dynamic RTP ({$payoutRate}%): Successful roll ({$precisionRoll}% <= {$calculatedWinProb}%)";
                } else {
                    $isWin = false;
                    $reason = "Dynamic RTP ({$payoutRate}%): House edge won ({$precisionRoll}% > {$calculatedWinProb}%)";
                }
                break;
        }

        // Calculate monetary results
        if ($isWin) {
            $outcome = 'win';
            $payoutAmount = round($betAmount * $odds, 2);
            $profitAmount = round($payoutAmount - $betAmount, 2);
        } else {
            $outcome = 'loss';
            $payoutAmount = 0.00;
            $profitAmount = -round($betAmount, 2);
        }

        $resultPayload = [
            'outcome'             => $outcome,
            'is_win'              => $isWin,
            'bet_amount'          => round($betAmount, 2),
            'odds'                => round($odds, 4),
            'payout_amount'       => $payoutAmount,
            'profit_amount'       => $profitAmount,
            'risk_mode'           => $riskMode,
            'payout_rate'         => $payoutRate,
            'win_probability_pct' => $calculatedWinProb,
            'seed_roll'           => $seedRoll,
            'reason'              => $reason,
            'user_id'             => $userId,
            'game_key'            => $gameKey,
            'timestamp'           => time(),
        ];

        return $resultPayload;
    }

    /**
     * Binary Trading Specialized Outcome Resolver
     *
     * In binary trading (TikSup UP/DOWN contracts), the outcome is traditionally
     * judged by comparing exit price against entry price:
     *  - UP: exitPrice > entryPrice => WIN
     *  - DOWN: exitPrice < entryPrice => WIN
     *
     * This method applies the House Risk Mode to the contract and calculates
     * a synthetic adjusted exit price if house override is triggered, ensuring
     * frontend candlestick charts, settlement logs, and user receipts are 100% consistent.
     *
     * @param string $direction 'UP' or 'DOWN'
     * @param float $entryPrice The strike price at entry
     * @param float $marketExitPrice The real-time market price at contract expiration
     * @param float $betAmount Bet stake
     * @param float $profitPercent Profit percentage (e.g. 85 for +85%)
     * @param int|null $userId
     * @param string $gameKey
     * @return array
     */
    public function determineBinaryOutcome(
        string $direction,
        float $entryPrice,
        float $marketExitPrice,
        float $betAmount,
        float $profitPercent = 85.0,
        ?int $userId = null,
        string $gameKey = 'global'
    ): array {
        $direction = strtoupper(trim($direction));
        $odds = 1.0 + ($profitPercent / 100.0);

        // First evaluate the outcome through the risk engine
        $gameOutcome = $this->determineGameOutcome($betAmount, $odds, $userId, $gameKey);
        $desiredWin = $gameOutcome['is_win'];

        // Determine adjusted exit price so user sees realistic chart behavior
        $adjustedExitPrice = $marketExitPrice;
        $priceDelta = max(0.0001, $entryPrice * 0.0005); // Tiny realistic tick offset

        if ($direction === 'UP') {
            if ($desiredWin && $marketExitPrice <= $entryPrice) {
                // House dictates WIN, but market was <= entry: nudge price UP
                $adjustedExitPrice = $entryPrice + $priceDelta;
            } elseif (!$desiredWin && $marketExitPrice >= $entryPrice) {
                // House dictates LOSS, but market was >= entry: nudge price DOWN
                $adjustedExitPrice = $entryPrice - $priceDelta;
            }
        } else { // DOWN
            if ($desiredWin && $marketExitPrice >= $entryPrice) {
                // House dictates WIN, nudge price DOWN
                $adjustedExitPrice = $entryPrice - $priceDelta;
            } elseif (!$desiredWin && $marketExitPrice <= $entryPrice) {
                // House dictates LOSS, nudge price UP
                $adjustedExitPrice = $entryPrice + $priceDelta;
            }
        }

        $gameOutcome['direction']           = $direction;
        $gameOutcome['entry_price']         = $entryPrice;
        $gameOutcome['raw_market_price']    = $marketExitPrice;
        $gameOutcome['exit_price']          = round($adjustedExitPrice, 4);
        $gameOutcome['profit_percent']      = $profitPercent;

        return $gameOutcome;
    }

    /**
     * Persist updated game settings from Admin Panel.
     *
     * @param int $payoutRate Target RTP (10 - 95)
     * @param string $riskMode One of 'random', 'force_win', 'force_lose', 'loss_75'
     * @param string $adminUsername Name of authenticated administrator
     * @param string $gameKey Game module identifier (default 'global')
     * @param string|null $ipAddress Client IP address
     * @return bool
     * @throws InvalidArgumentException
     * @throws Exception
     */
    public function updateSettings(
        int $payoutRate,
        string $riskMode,
        string $adminUsername = 'Admin',
        string $gameKey = 'global',
        ?string $ipAddress = null
    ): bool {
        if ($payoutRate < self::MIN_PAYOUT_RATE || $payoutRate > self::MAX_PAYOUT_RATE) {
            throw new InvalidArgumentException(
                sprintf("Payout rate must be between %d%% and %d%%.", self::MIN_PAYOUT_RATE, self::MAX_PAYOUT_RATE)
            );
        }

        if (!in_array($riskMode, self::VALID_MODES, true)) {
            throw new InvalidArgumentException("Invalid risk mode selected: {$riskMode}");
        }

        if ($this->db === null) {
            throw new Exception("Database connection not configured.");
        }

        $ipAddress = $ipAddress ?? ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

        $this->db->beginTransaction();

        try {
            // Fetch old settings for audit log
            $oldStmt = $this->db->prepare("
                SELECT `payout_rate`, `risk_mode` FROM `game_settings` WHERE `game_key` = :key LIMIT 1
            ");
            $oldStmt->execute([':key' => $gameKey]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);

            $oldPayout = $oldRow ? (int)$oldRow['payout_rate'] : null;
            $oldRisk   = $oldRow ? (string)$oldRow['risk_mode'] : null;

            // Upsert new settings
            $upsertStmt = $this->db->prepare("
                INSERT INTO `game_settings` (`game_key`, `game_name`, `payout_rate`, `risk_mode`, `updated_by`)
                VALUES (:key, :name, :payout, :risk, :admin)
                ON DUPLICATE KEY UPDATE
                    `payout_rate` = VALUES(`payout_rate`),
                    `risk_mode`   = VALUES(`risk_mode`),
                    `updated_by`  = VALUES(`updated_by`),
                    `updated_at`  = CURRENT_TIMESTAMP
            ");

            $gameName = $gameKey === 'global' ? 'Global Platform Risk & Binary Engine' : ucfirst($gameKey);
            $upsertStmt->execute([
                ':key'    => $gameKey,
                ':name'   => $gameName,
                ':payout' => $payoutRate,
                ':risk'   => $riskMode,
                ':admin'  => $adminUsername,
            ]);

            // Insert audit log
            $auditStmt = $this->db->prepare("
                INSERT INTO `game_settings_audit_log` 
                    (`game_key`, `old_payout_rate`, `new_payout_rate`, `old_risk_mode`, `new_risk_mode`, `admin_username`, `ip_address`)
                VALUES 
                    (:key, :old_payout, :new_payout, :old_risk, :new_risk, :admin, :ip)
            ");
            $auditStmt->execute([
                ':key'        => $gameKey,
                ':old_payout' => $oldPayout,
                ':new_payout' => $payoutRate,
                ':old_risk'   => $oldRisk,
                ':new_risk'   => $riskMode,
                ':admin'      => $adminUsername,
                ':ip'         => $ipAddress,
            ]);

            $this->db->commit();

            // Clear cache
            unset($this->settingsCache[$gameKey]);

            return true;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log("[RiskEngine::updateSettings] Failed: " . $e->getMessage());
            throw $e;
        }
    }
}
