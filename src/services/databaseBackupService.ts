import { botStorage } from './botEngine';
import { platformStore } from './platformStore';

export interface TableStat {
  name: string;
  label: string;
  rowCount: number;
  description: string;
}

export interface RestoreResult {
  success: boolean;
  queriesExecuted: number;
  tablesAffected: string[];
  rowsImported: number;
  details: { table: string; count: number }[];
  errors: string[];
  timestamp: string;
}

/**
 * Escapes SQL string values to prevent injection and syntax errors
 */
function escapeSql(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  const str = String(value);
  return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

/**
 * Generates standard MySQL / PostgreSQL compatible SQL DDL and DML for all tables in the simulator
 */
export function generateSqlBackup(selectedTables?: string[]): string {
  const timestamp = new Date().toISOString();
  const dateFa = new Date().toLocaleDateString('fa-IR');
  const now = Date.now();

  const lines: string[] = [];

  lines.push(`-- ========================================================`);
  lines.push(`-- SlowMegaBot Database SQL Backup Dump`);
  lines.push(`-- Generated: ${timestamp} (${dateFa})`);
  lines.push(`-- Architecture: Full Modular Telegram Bot Platform`);
  lines.push(`-- Compatibility: MySQL 5.7+ / MySQL 8.0+ / MariaDB / SQLite3`);
  lines.push(`-- ========================================================`);
  lines.push(``);
  lines.push(`SET NAMES utf8mb4;`);
  lines.push(`SET FOREIGN_KEY_CHECKS = 0;`);
  lines.push(``);

  const shouldInclude = (tbl: string) => !selectedTables || selectedTables.includes(tbl);

  // 1. Table: users_wallets
  if (shouldInclude('users_wallets')) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Table structure for: users_wallets`);
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`DROP TABLE IF EXISTS \`users_wallets\`;`);
    lines.push(`CREATE TABLE \`users_wallets\` (`);
    lines.push(`  \`user_id\` BIGINT NOT NULL PRIMARY KEY,`);
    lines.push(`  \`balance\` BIGINT NOT NULL DEFAULT 0,`);
    lines.push(`  \`coins\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`subscription_tier\` VARCHAR(50) NOT NULL DEFAULT 'free',`);
    lines.push(`  \`subscription_expiry\` VARCHAR(100) NOT NULL DEFAULT 'ندارد',`);
    lines.push(`  \`joined_date\` VARCHAR(50) NOT NULL,`);
    lines.push(`  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
    lines.push(``);

    const wallets = Array.from(botStorage.wallets.values());
    // Ensure test user exists in dump
    if (!wallets.some((w) => w.userId === 12345678)) {
      wallets.unshift(botStorage.getWallet(12345678));
    }

    if (wallets.length > 0) {
      lines.push(`-- Dumping data for table: users_wallets`);
      lines.push(`INSERT INTO \`users_wallets\` (\`user_id\`, \`balance\`, \`coins\`, \`subscription_tier\`, \`subscription_expiry\`, \`joined_date\`) VALUES`);
      const rowStrings = wallets.map((w) => {
        return `  (${w.userId}, ${w.balance}, ${w.coins}, ${escapeSql(w.subscriptionTier)}, ${escapeSql(w.subscriptionExpiry)}, ${escapeSql(w.joinedDate)})`;
      });
      lines.push(rowStrings.join(',\n') + ';');
      lines.push(``);
    }
  }

  // 2. Table: clash_villages
  if (shouldInclude('clash_villages')) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Table structure for: clash_villages`);
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`DROP TABLE IF EXISTS \`clash_villages\`;`);
    lines.push(`CREATE TABLE \`clash_villages\` (`);
    lines.push(`  \`user_id\` BIGINT NOT NULL PRIMARY KEY,`);
    lines.push(`  \`name\` VARCHAR(255) NOT NULL,`);
    lines.push(`  \`town_hall\` INT NOT NULL DEFAULT 1,`);
    lines.push(`  \`gold\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`max_gold\` INT NOT NULL DEFAULT 10000,`);
    lines.push(`  \`elixir\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`max_elixir\` INT NOT NULL DEFAULT 10000,`);
    lines.push(`  \`wood\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`cups\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`clan\` VARCHAR(255) NOT NULL DEFAULT 'بی قبیله',`);
    lines.push(`  \`last_collected\` BIGINT NOT NULL,`);
    lines.push(`  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
    lines.push(``);

    const villages = Array.from(botStorage.clashVillages.values());
    if (!villages.some((v) => v.userId === 12345678)) {
      villages.unshift(botStorage.getClashVillage(12345678, 'فرمانده'));
    }

    if (villages.length > 0) {
      lines.push(`-- Dumping data for table: clash_villages`);
      lines.push(`INSERT INTO \`clash_villages\` (\`user_id\`, \`name\`, \`town_hall\`, \`gold\`, \`max_gold\`, \`elixir\`, \`max_elixir\`, \`wood\`, \`cups\`, \`clan\`, \`last_collected\`) VALUES`);
      const rowStrings = villages.map((v) => {
        return `  (${v.userId}, ${escapeSql(v.name)}, ${v.townHall}, ${v.gold}, ${v.maxGold}, ${v.elixir}, ${v.maxElixir}, ${v.wood}, ${v.cups}, ${escapeSql(v.clan)}, ${v.lastCollected || now})`;
      });
      lines.push(rowStrings.join(',\n') + ';');
      lines.push(``);
    }
  }

  // 3. Table: mafia_accounts
  if (shouldInclude('mafia_accounts')) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Table structure for: mafia_accounts`);
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`DROP TABLE IF EXISTS \`mafia_accounts\`;`);
    lines.push(`CREATE TABLE \`mafia_accounts\` (`);
    lines.push(`  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,`);
    lines.push(`  \`username\` VARCHAR(255) NOT NULL,`);
    lines.push(`  \`display_name\` VARCHAR(255) NOT NULL,`);
    lines.push(`  \`email\` VARCHAR(255) DEFAULT NULL,`);
    lines.push(`  \`level\` INT NOT NULL DEFAULT 1,`);
    lines.push(`  \`xp\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`coins\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`diamonds\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`points\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`games_played\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`games_won\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`games_lost\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`win_rate\` DECIMAL(5,2) NOT NULL DEFAULT 0.00,`);
    lines.push(`  \`league\` VARCHAR(50) NOT NULL DEFAULT 'bronze',`);
    lines.push(`  \`is_admin\` TINYINT(1) NOT NULL DEFAULT 0,`);
    lines.push(`  \`created_at\` VARCHAR(100) NOT NULL`);
    lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
    lines.push(``);

    const mafiaUsers = Array.from(platformStore.users.values());
    if (mafiaUsers.length > 0) {
      lines.push(`-- Dumping data for table: mafia_accounts`);
      lines.push(`INSERT INTO \`mafia_accounts\` (\`id\`, \`username\`, \`display_name\`, \`email\`, \`level\`, \`xp\`, \`coins\`, \`diamonds\`, \`points\`, \`games_played\`, \`games_won\`, \`games_lost\`, \`win_rate\`, \`league\`, \`is_admin\`, \`created_at\`) VALUES`);
      const rowStrings = mafiaUsers.map((u) => {
        return `  (${escapeSql(u.id)}, ${escapeSql(u.username)}, ${escapeSql(u.displayName)}, ${escapeSql(u.email)}, ${u.level}, ${u.xp}, ${u.coins}, ${u.diamonds}, ${u.points}, ${u.gamesPlayed}, ${u.gamesWon}, ${u.gamesLost}, ${u.winRate}, ${escapeSql(u.league)}, ${u.isAdmin ? 1 : 0}, ${escapeSql(u.createdAt)})`;
      });
      lines.push(rowStrings.join(',\n') + ';');
      lines.push(``);
    }
  }

  // 4. Table: purchase_orders
  if (shouldInclude('purchase_orders')) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Table structure for: purchase_orders`);
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`DROP TABLE IF EXISTS \`purchase_orders\`;`);
    lines.push(`CREATE TABLE \`purchase_orders\` (`);
    lines.push(`  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,`);
    lines.push(`  \`user_id\` BIGINT NOT NULL,`);
    lines.push(`  \`user_name\` VARCHAR(255) NOT NULL,`);
    lines.push(`  \`item_title\` VARCHAR(255) NOT NULL,`);
    lines.push(`  \`amount\` INT NOT NULL,`);
    lines.push(`  \`status\` VARCHAR(50) NOT NULL DEFAULT 'pending',`);
    lines.push(`  \`order_date\` VARCHAR(100) NOT NULL`);
    lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
    lines.push(``);

    const orders = botStorage.orders;
    if (orders.length > 0) {
      lines.push(`-- Dumping data for table: purchase_orders`);
      lines.push(`INSERT INTO \`purchase_orders\` (\`id\`, \`user_id\`, \`user_name\`, \`item_title\`, \`amount\`, \`status\`, \`order_date\`) VALUES`);
      const rowStrings = orders.map((o) => {
        return `  (${escapeSql(o.id)}, ${o.userId}, ${escapeSql(o.userName)}, ${escapeSql(o.itemTitle)}, ${o.amount}, ${escapeSql(o.status)}, ${escapeSql(o.date)})`;
      });
      lines.push(rowStrings.join(',\n') + ';');
      lines.push(``);
    }
  }

  // 5. Table: seen_orders
  if (shouldInclude('seen_orders')) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Table structure for: seen_orders`);
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`DROP TABLE IF EXISTS \`seen_orders\`;`);
    lines.push(`CREATE TABLE \`seen_orders\` (`);
    lines.push(`  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,`);
    lines.push(`  \`user_id\` BIGINT NOT NULL,`);
    lines.push(`  \`post_link\` TEXT NOT NULL,`);
    lines.push(`  \`views_requested\` INT NOT NULL,`);
    lines.push(`  \`views_delivered\` INT NOT NULL,`);
    lines.push(`  \`cost\` INT NOT NULL,`);
    lines.push(`  \`status\` VARCHAR(50) NOT NULL DEFAULT 'completed',`);
    lines.push(`  \`created_at\` VARCHAR(100) NOT NULL`);
    lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
    lines.push(``);

    const seenOrders = botStorage.seenOrders;
    if (seenOrders.length > 0) {
      lines.push(`-- Dumping data for table: seen_orders`);
      lines.push(`INSERT INTO \`seen_orders\` (\`id\`, \`user_id\`, \`post_link\`, \`views_requested\`, \`views_delivered\`, \`cost\`, \`status\`, \`created_at\`) VALUES`);
      const rowStrings = seenOrders.map((s) => {
        return `  (${escapeSql(s.id)}, ${s.userId}, ${escapeSql(s.postLink)}, ${s.viewsRequested || 1000}, ${s.viewsDelivered || 1000}, ${s.cost || 10000}, ${escapeSql(s.status)}, ${escapeSql(s.createdAt)})`;
      });
      lines.push(rowStrings.join(',\n') + ';');
      lines.push(``);
    }
  }

  // 6. Table: uploaded_files
  if (shouldInclude('uploaded_files')) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Table structure for: uploaded_files`);
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`DROP TABLE IF EXISTS \`uploaded_files\`;`);
    lines.push(`CREATE TABLE \`uploaded_files\` (`);
    lines.push(`  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,`);
    lines.push(`  \`user_id\` BIGINT NOT NULL,`);
    lines.push(`  \`file_name\` VARCHAR(255) NOT NULL,`);
    lines.push(`  \`file_size\` BIGINT NOT NULL,`);
    lines.push(`  \`mime_type\` VARCHAR(100) NOT NULL,`);
    lines.push(`  \`download_url\` TEXT NOT NULL,`);
    lines.push(`  \`downloads_count\` INT NOT NULL DEFAULT 0,`);
    lines.push(`  \`created_at\` VARCHAR(100) NOT NULL`);
    lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
    lines.push(``);

    const uploads = botStorage.uploadedFiles;
    if (uploads.length > 0) {
      lines.push(`-- Dumping data for table: uploaded_files`);
      lines.push(`INSERT INTO \`uploaded_files\` (\`id\`, \`user_id\`, \`file_name\`, \`file_size\`, \`mime_type\`, \`download_url\`, \`downloads_count\`, \`created_at\`) VALUES`);
      const rowStrings = uploads.map((u) => {
        return `  (${escapeSql(u.id)}, ${u.userId || 12345678}, ${escapeSql(u.fileName)}, ${u.fileSize || 1024}, ${escapeSql(u.mimeType || 'application/octet-stream')}, ${escapeSql(u.downloadUrl)}, ${u.downloadsCount || 0}, ${escapeSql(u.createdAt)})`;
      });
      lines.push(rowStrings.join(',\n') + ';');
      lines.push(``);
    }
  }

  // 7. Table: bot_owner_config
  if (shouldInclude('bot_owner_config')) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Table structure for: bot_owner_config`);
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`DROP TABLE IF EXISTS \`bot_owner_config\`;`);
    lines.push(`CREATE TABLE \`bot_owner_config\` (`);
    lines.push(`  \`id\` INT NOT NULL PRIMARY KEY,`);
    lines.push(`  \`card_number\` VARCHAR(50) NOT NULL,`);
    lines.push(`  \`card_holder\` VARCHAR(255) NOT NULL,`);
    lines.push(`  \`bank_name\` VARCHAR(100) NOT NULL,`);
    lines.push(`  \`gateway_name\` VARCHAR(255) NOT NULL,`);
    lines.push(`  \`gateway_active\` TINYINT(1) NOT NULL DEFAULT 1,`);
    lines.push(`  \`gateway_merchant_id\` VARCHAR(255) NOT NULL`);
    lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
    lines.push(``);

    const cfg = botStorage.ownerConfig;
    lines.push(`-- Dumping data for table: bot_owner_config`);
    lines.push(`INSERT INTO \`bot_owner_config\` (\`id\`, \`card_number\`, \`card_holder\`, \`bank_name\`, \`gateway_name\`, \`gateway_active\`, \`gateway_merchant_id\`) VALUES`);
    lines.push(`  (1, ${escapeSql(cfg.cardNumber)}, ${escapeSql(cfg.cardHolder)}, ${escapeSql(cfg.bankName)}, ${escapeSql(cfg.gatewayName)}, ${cfg.gatewayActive ? 1 : 0}, ${escapeSql(cfg.gatewayMerchantId)});`);
    lines.push(``);
  }

  lines.push(`SET FOREIGN_KEY_CHECKS = 1;`);
  lines.push(`-- Dump completed successfully on: ${timestamp}`);

  return lines.join('\n');
}

/**
 * Triggers a direct browser download of the SQL backup file
 */
export function downloadSqlBackup(content: string, filename?: string) {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const finalName = filename || `slowmegabot_db_backup_${dateStr}.sql`;
  const blob = new Blob([content], { type: 'application/sql;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses SQL statements and restores the data directly into the active bot simulator state
 */
export function restoreSqlToSimulator(sqlScript: string, options: { mode: 'replace' | 'merge' } = { mode: 'replace' }): RestoreResult {
  const timestamp = new Date().toISOString();
  const errors: string[] = [];
  let queriesExecuted = 0;
  let rowsImported = 0;
  const tableCounts: Record<string, number> = {};

  if (!sqlScript || !sqlScript.trim()) {
    return {
      success: false,
      queriesExecuted: 0,
      tablesAffected: [],
      rowsImported: 0,
      details: [],
      errors: ['فایل SQL ارسال‌شده خالی است یا حاوی دستورات معتبر نمی‌باشد.'],
      timestamp,
    };
  }

  // If mode is replace, reset targeted tables before inserting
  if (options.mode === 'replace') {
    // Clear only if DROP / CREATE / TRUNCATE or full replace requested
    if (sqlScript.includes('users_wallets')) botStorage.wallets.clear();
    if (sqlScript.includes('clash_villages')) botStorage.clashVillages.clear();
    if (sqlScript.includes('purchase_orders')) botStorage.orders = [];
    if (sqlScript.includes('seen_orders')) botStorage.seenOrders = [];
    if (sqlScript.includes('uploaded_files')) botStorage.uploadedFiles = [];
  }

  // Remove single line SQL comments: -- ...
  const cleanSql = sqlScript
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Split into statements by semicolon (careful with strings)
  const statements = cleanSql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    queriesExecuted++;
    try {
      // 1. Check for INSERT INTO `users_wallets`
      if (/INSERT\s+INTO\s+[`"]?users_wallets[`"]?/i.test(statement)) {
        const rows = parseInsertValues(statement);
        for (const row of rows) {
          const userId = Number(row[0]);
          const balance = Number(row[1]) || 0;
          const coins = Number(row[2]) || 0;
          const subscriptionTier = (row[3] || 'free') as any;
          const subscriptionExpiry = row[4] || 'ندارد';
          const joinedDate = row[5] || new Date().toLocaleDateString('fa-IR');

          if (!isNaN(userId) && userId > 0) {
            botStorage.wallets.set(userId, {
              userId,
              balance,
              coins,
              subscriptionTier,
              subscriptionExpiry,
              joinedDate,
            });
            rowsImported++;
            tableCounts['users_wallets'] = (tableCounts['users_wallets'] || 0) + 1;
          }
        }
      }

      // 2. Check for INSERT INTO `clash_villages`
      else if (/INSERT\s+INTO\s+[`"]?clash_villages[`"]?/i.test(statement)) {
        const rows = parseInsertValues(statement);
        for (const row of rows) {
          const userId = Number(row[0]);
          const name = row[1] || 'فرمانده';
          const townHall = Number(row[2]) || 1;
          const gold = Number(row[3]) || 0;
          const maxGold = Number(row[4]) || 10000;
          const elixir = Number(row[5]) || 0;
          const maxElixir = Number(row[6]) || 10000;
          const wood = Number(row[7]) || 0;
          const cups = Number(row[8]) || 0;
          const clan = row[9] || 'بی قبیله';
          const lastCollected = Number(row[10]) || Date.now();

          if (!isNaN(userId) && userId > 0) {
            botStorage.clashVillages.set(userId, {
              userId,
              name,
              townHall,
              gold,
              maxGold,
              elixir,
              maxElixir,
              wood,
              cups,
              clan,
              troops: { barbarian: townHall * 5, archer: townHall * 4, giant: Math.floor(townHall / 2) },
              lastCollected,
            });
            rowsImported++;
            tableCounts['clash_villages'] = (tableCounts['clash_villages'] || 0) + 1;
          }
        }
      }

      // 3. Check for INSERT INTO `mafia_accounts`
      else if (/INSERT\s+INTO\s+[`"]?mafia_accounts[`"]?/i.test(statement)) {
        const rows = parseInsertValues(statement);
        for (const row of rows) {
          const id = String(row[0] || 'usr_' + Date.now());
          const username = String(row[1] || 'player');
          const displayName = String(row[2] || username);
          const email = row[3] ? String(row[3]) : '';
          const level = Number(row[4]) || 1;
          const xp = Number(row[5]) || 0;
          const coins = Number(row[6]) || 0;
          const diamonds = Number(row[7]) || 0;
          const points = Number(row[8]) || 0;
          const gamesPlayed = Number(row[9]) || 0;
          const gamesWon = Number(row[10]) || 0;
          const gamesLost = Number(row[11]) || 0;
          const winRate = Number(row[12]) || (gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0);
          const league = (row[13] || 'bronze') as any;
          const isAdmin = row[14] === '1' || row[14] === 1 || row[14] === true;
          const createdAt = String(row[15] || new Date().toISOString());

          platformStore.users.set(id, {
            id,
            username,
            displayName,
            avatarUrl: '',
            avatarEmoji: '🎭',
            email,
            level,
            xp,
            coins,
            diamonds,
            points,
            gamesPlayed,
            gamesWon,
            gamesLost,
            winRate,
            league,
            ownedRoleIds: ['citizen', 'godfather', 'doctor', 'detective'],
            friends: [],
            blockedUsers: [],
            isAdmin,
            createdAt,
          });
          rowsImported++;
          tableCounts['mafia_accounts'] = (tableCounts['mafia_accounts'] || 0) + 1;
        }
      }

      // 4. Check for INSERT INTO `purchase_orders`
      else if (/INSERT\s+INTO\s+[`"]?purchase_orders[`"]?/i.test(statement)) {
        const rows = parseInsertValues(statement);
        for (const row of rows) {
          const id = String(row[0] || 'ord_' + Math.random().toString(36).substr(2, 6));
          const userId = Number(row[1]);
          const userName = String(row[2] || 'کاربر');
          const itemTitle = String(row[3] || 'سفارش');
          const amount = Number(row[4]) || 0;
          const status = (row[5] || 'pending') as any;
          const date = String(row[6] || new Date().toLocaleString('fa-IR'));

          botStorage.orders.push({
            id,
            userId,
            userName,
            itemTitle,
            amount,
            status,
            date,
          });
          rowsImported++;
          tableCounts['purchase_orders'] = (tableCounts['purchase_orders'] || 0) + 1;
        }
      }

      // 5. Check for INSERT INTO `seen_orders`
      else if (/INSERT\s+INTO\s+[`"]?seen_orders[`"]?/i.test(statement)) {
        const rows = parseInsertValues(statement);
        for (const row of rows) {
          const id = String(row[0] || 'seen_' + Date.now());
          const userId = Number(row[1]) || 12345678;
          const postLink = String(row[2] || 'https://t.me/channel/1');
          const viewsRequested = Number(row[3]) || 1000;
          const viewsDelivered = Number(row[4]) || viewsRequested || 1000;
          const cost = Number(row[5]) || 10000;
          const status = (row[6] || 'completed') as any;
          const createdAt = String(row[7] || new Date().toLocaleString('fa-IR'));

          botStorage.seenOrders.push({
            id,
            userId,
            postLink,
            viewsRequested,
            viewsDelivered,
            cost,
            status,
            createdAt,
          });
          rowsImported++;
          tableCounts['seen_orders'] = (tableCounts['seen_orders'] || 0) + 1;
        }
      }

      // 6. Check for INSERT INTO `uploaded_files`
      else if (/INSERT\s+INTO\s+[`"]?uploaded_files[`"]?/i.test(statement)) {
        const rows = parseInsertValues(statement);
        for (const row of rows) {
          const id = String(row[0] || 'file_' + Math.random().toString(36).substr(2, 6));
          const userId = Number(row[1]) || 12345678;
          const fileName = String(row[2] || 'file.bin');
          const fileSize = Number(row[3]) || 1024;
          const mimeType = String(row[4] || 'application/octet-stream');
          const downloadUrl = String(row[5] || '');
          const downloadsCount = Number(row[6]) || 0;
          const createdAt = String(row[7] || new Date().toLocaleDateString('fa-IR'));

          botStorage.uploadedFiles.push({
            id,
            userId,
            fileName,
            fileSize,
            mimeType,
            downloadUrl,
            downloadsCount,
            createdAt,
          });
          rowsImported++;
          tableCounts['uploaded_files'] = (tableCounts['uploaded_files'] || 0) + 1;
        }
      }

      // 7. Check for INSERT INTO `bot_owner_config`
      else if (/INSERT\s+INTO\s+[`"]?bot_owner_config[`"]?/i.test(statement)) {
        const rows = parseInsertValues(statement);
        if (rows.length > 0) {
          const row = rows[0];
          botStorage.ownerConfig = {
            cardNumber: String(row[1] || botStorage.ownerConfig.cardNumber),
            cardHolder: String(row[2] || botStorage.ownerConfig.cardHolder),
            bankName: String(row[3] || botStorage.ownerConfig.bankName),
            gatewayName: String(row[4] || botStorage.ownerConfig.gatewayName),
            gatewayActive: row[5] === '1' || row[5] === 1 || row[5] === true,
            gatewayMerchantId: String(row[6] || botStorage.ownerConfig.gatewayMerchantId),
          };
          rowsImported++;
          tableCounts['bot_owner_config'] = 1;
        }
      }
    } catch (err: any) {
      errors.push(`خطا در اجرای کوئری: ${err?.message || err}`);
    }
  }

  // Ensure test user exists with valid state
  botStorage.getWallet(12345678);

  const details = Object.entries(tableCounts).map(([table, count]) => ({ table, count }));
  const tablesAffected = Object.keys(tableCounts);

  return {
    success: errors.length === 0 || rowsImported > 0,
    queriesExecuted,
    tablesAffected,
    rowsImported,
    details,
    errors,
    timestamp,
  };
}

/**
 * Parses MySQL style VALUES (...), (...) tuples into arrays of string/number values
 */
function parseInsertValues(insertStatement: string): any[][] {
  const valuesMatch = insertStatement.match(/VALUES\s*([\s\S]+)$/i);
  if (!valuesMatch) return [];

  const valuesBody = valuesMatch[1].trim();
  const rows: any[][] = [];

  let inParen = false;
  let inString = false;
  let stringChar = '';
  let escapeNext = false;
  let currentTuple = '';

  for (let i = 0; i < valuesBody.length; i++) {
    const ch = valuesBody[i];

    if (inString) {
      currentTuple += ch;
      if (escapeNext) {
        escapeNext = false;
      } else if (ch === '\\') {
        escapeNext = true;
      } else if (ch === stringChar) {
        // Check for double quote escape: ''
        if (i + 1 < valuesBody.length && valuesBody[i + 1] === stringChar) {
          currentTuple += valuesBody[i + 1];
          i++; // skip next quote
        } else {
          inString = false;
        }
      }
    } else {
      if (ch === "'" || ch === '"') {
        inString = true;
        stringChar = ch;
        currentTuple += ch;
      } else if (ch === '(') {
        inParen = true;
        currentTuple = '';
      } else if (ch === ')') {
        inParen = false;
        rows.push(parseTupleValues(currentTuple));
        currentTuple = '';
      } else if (inParen) {
        currentTuple += ch;
      }
    }
  }

  return rows;
}

/**
 * Splits comma-separated values inside parentheses into parsed Javascript items
 */
function parseTupleValues(tupleStr: string): any[] {
  const result: any[] = [];
  let currentVal = '';
  let inString = false;
  let stringChar = '';
  let escapeNext = false;

  for (let i = 0; i < tupleStr.length; i++) {
    const ch = tupleStr[i];

    if (inString) {
      if (escapeNext) {
        currentVal += ch;
        escapeNext = false;
      } else if (ch === '\\') {
        escapeNext = true;
      } else if (ch === stringChar) {
        if (i + 1 < tupleStr.length && tupleStr[i + 1] === stringChar) {
          currentVal += stringChar;
          i++;
        } else {
          inString = false;
        }
      } else {
        currentVal += ch;
      }
    } else {
      if (ch === "'" || ch === '"') {
        inString = true;
        stringChar = ch;
      } else if (ch === ',') {
        result.push(cleanParsedValue(currentVal));
        currentVal = '';
      } else {
        currentVal += ch;
      }
    }
  }

  if (currentVal.trim().length > 0) {
    result.push(cleanParsedValue(currentVal));
  }

  return result;
}

function cleanParsedValue(val: string): any {
  const trimmed = val.trim();
  if (trimmed.toUpperCase() === 'NULL') return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

/**
 * Predefined database backup presets
 */
export const SQL_PRESETS = [
  {
    id: 'starter',
    name: 'بک‌آپ پیش‌فرض سیستم (داده‌های اولیه و استاندارد)',
    description: 'شامل کیف‌پول پایه کاربر تست (۵۰,۰۰۰ تومان)، دهکده کلش لول ۳، اکانت‌های مافیا و تنظیمات درگاه بانکی.',
    generateSql: () => {
      return `-- Preset: Starter Standard Database
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS \`users_wallets\`;
CREATE TABLE \`users_wallets\` (
  \`user_id\` BIGINT NOT NULL PRIMARY KEY,
  \`balance\` BIGINT NOT NULL DEFAULT 50000,
  \`coins\` INT NOT NULL DEFAULT 1000,
  \`subscription_tier\` VARCHAR(50) NOT NULL DEFAULT 'free',
  \`subscription_expiry\` VARCHAR(100) NOT NULL DEFAULT 'ندارد',
  \`joined_date\` VARCHAR(50) NOT NULL
);
INSERT INTO \`users_wallets\` VALUES (12345678, 50000, 1000, 'free', 'ندارد', '۱۴۰۳/۰۷/۲۱');

DROP TABLE IF EXISTS \`clash_villages\`;
CREATE TABLE \`clash_villages\` (
  \`user_id\` BIGINT NOT NULL PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`town_hall\` INT NOT NULL DEFAULT 3,
  \`gold\` INT NOT NULL DEFAULT 8500,
  \`max_gold\` INT NOT NULL DEFAULT 15000,
  \`elixir\` INT NOT NULL DEFAULT 6200,
  \`max_elixir\` INT NOT NULL DEFAULT 12000,
  \`wood\` INT NOT NULL DEFAULT 4500,
  \`cups\` INT NOT NULL DEFAULT 450,
  \`clan\` VARCHAR(255) NOT NULL DEFAULT 'ایران تایتان',
  \`last_collected\` BIGINT NOT NULL
);
INSERT INTO \`clash_villages\` VALUES (12345678, 'فرمانده آریایی', 3, 8500, 15000, 6200, 12000, 4500, 450, 'ایران تایتان', ${Date.now()});

DROP TABLE IF EXISTS \`purchase_orders\`;
CREATE TABLE \`purchase_orders\` (
  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
  \`user_id\` BIGINT NOT NULL,
  \`user_name\` VARCHAR(255) NOT NULL,
  \`item_title\` VARCHAR(255) NOT NULL,
  \`amount\` INT NOT NULL,
  \`status\` VARCHAR(50) NOT NULL,
  \`order_date\` VARCHAR(100) NOT NULL
);
INSERT INTO \`purchase_orders\` VALUES 
('ord_welcome', 12345678, 'کاربر تستی', 'هدیه ثبت‌نام اولیه ۵۰,۰۰۰ تومان', 50000, 'approved', '۱۴۰۳/۰۷/۲۱');

SET FOREIGN_KEY_CHECKS = 1;
`;
    },
  },
  {
    id: 'vip_pro',
    name: 'بک‌آپ ویژه VIP و دارایی‌های نامحدود (تست پرمیوم)',
    description: 'شامل کاربر VIP با ۵,۰۰۰,۰۰۰ تومان شارژ کیف‌پول، ۵۰,۰۰۰ سکه، تاون‌هال ۹ کلش و اکانت لول ۱۰ مافیا با تمام نقش‌ها.',
    generateSql: () => {
      return `-- Preset: VIP High Balance & Max Clan
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS \`users_wallets\`;
CREATE TABLE \`users_wallets\` (
  \`user_id\` BIGINT NOT NULL PRIMARY KEY,
  \`balance\` BIGINT NOT NULL DEFAULT 0,
  \`coins\` INT NOT NULL DEFAULT 0,
  \`subscription_tier\` VARCHAR(50) NOT NULL,
  \`subscription_expiry\` VARCHAR(100) NOT NULL,
  \`joined_date\` VARCHAR(50) NOT NULL
);
INSERT INTO \`users_wallets\` VALUES (12345678, 5000000, 50000, 'diamond', '۱۴۰۴/۰۷/۲۱ (اشتراک یکساله VIP)', '۱۴۰۳/۰۱/۰۱');

DROP TABLE IF EXISTS \`clash_villages\`;
CREATE TABLE \`clash_villages\` (
  \`user_id\` BIGINT NOT NULL PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`town_hall\` INT NOT NULL,
  \`gold\` INT NOT NULL,
  \`max_gold\` INT NOT NULL,
  \`elixir\` INT NOT NULL,
  \`max_elixir\` INT NOT NULL,
  \`wood\` INT NOT NULL,
  \`cups\` INT NOT NULL,
  \`clan\` VARCHAR(255) NOT NULL,
  \`last_collected\` BIGINT NOT NULL
);
INSERT INTO \`clash_villages\` VALUES (12345678, 'فرمانده لیدر کینگ', 9, 750000, 1000000, 680000, 1000000, 500000, 3200, 'شوالیه‌های تندر', ${Date.now()});

DROP TABLE IF EXISTS \`purchase_orders\`;
CREATE TABLE \`purchase_orders\` (
  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
  \`user_id\` BIGINT NOT NULL,
  \`user_name\` VARCHAR(255) NOT NULL,
  \`item_title\` VARCHAR(255) NOT NULL,
  \`amount\` INT NOT NULL,
  \`status\` VARCHAR(50) NOT NULL,
  \`order_date\` VARCHAR(100) NOT NULL
);
INSERT INTO \`purchase_orders\` VALUES 
('ord_sub_diamond', 12345678, 'شما (VIP)', 'اشتراک الماس یک‌ساله ربات', 890000, 'approved', '۱۴۰۳/۰۷/۲۱'),
('ord_seen_100k', 12345678, 'شما (VIP)', 'سفارش ۱۰۰,۰۰۰ سین کانال تلگرام', 450000, 'approved', '۱۴۰۳/۰۷/۲۱');

SET FOREIGN_KEY_CHECKS = 1;
`;
    },
  },
  {
    id: 'commerce_heavy',
    name: 'بک‌آپ فروشگاهی با سوابق پرداخت و سفارشات سین (Seen)',
    description: 'شامل ده‌ها سفارش سین و بازدید پست‌های تلگرام، فایل‌های آپلود شده، رسیدهای خرید و تنظیمات درگاه فعال زرین‌پال.',
    generateSql: () => {
      return `-- Preset: E-Commerce & Media Orders
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS \`seen_orders\`;
CREATE TABLE \`seen_orders\` (
  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
  \`user_id\` BIGINT NOT NULL,
  \`post_link\` TEXT NOT NULL,
  \`views_requested\` INT NOT NULL,
  \`views_delivered\` INT NOT NULL,
  \`cost\` INT NOT NULL,
  \`status\` VARCHAR(50) NOT NULL,
  \`created_at\` VARCHAR(100) NOT NULL
);
INSERT INTO \`seen_orders\` VALUES 
('sn_9011', 12345678, 'https://t.me/slowmegabot_channel/42', 5000, 5000, 35000, 'completed', '۱۴۰۳/۰۷/۲۰'),
('sn_9012', 12345678, 'https://t.me/slowmegabot_channel/43', 10000, 7500, 65000, 'processing', '۱۴۰۳/۰۷/۲۱'),
('sn_9013', 12345678, 'https://t.me/news_ir/112', 25000, 25000, 150000, 'completed', '۱۴۰۳/۰۷/۲۱');

DROP TABLE IF EXISTS \`uploaded_files\`;
CREATE TABLE \`uploaded_files\` (
  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
  \`user_id\` BIGINT NOT NULL,
  \`file_name\` VARCHAR(255) NOT NULL,
  \`file_size\` BIGINT NOT NULL,
  \`mime_type\` VARCHAR(100) NOT NULL,
  \`download_url\` TEXT NOT NULL,
  \`downloads_count\` INT NOT NULL,
  \`created_at\` VARCHAR(100) NOT NULL
);
INSERT INTO \`uploaded_files\` VALUES 
('aplo_file_1', 12345678, 'SlowMegaBot_Source_Full.zip', 13002342, 'application/zip', 'https://t.me/slow_megabot?start=dl_aplo_file_1', 14, '۱۴۰۳/۰۷/۲۱'),
('aplo_file_2', 12345678, 'Mafia_Soundtrack_Remix.mp3', 8598320, 'audio/mpeg', 'https://t.me/slow_megabot?start=dl_aplo_file_2', 8, '۱۴۰۳/۰۷/۲۱');

DROP TABLE IF EXISTS \`bot_owner_config\`;
CREATE TABLE \`bot_owner_config\` (
  \`id\` INT NOT NULL PRIMARY KEY,
  \`card_number\` VARCHAR(50) NOT NULL,
  \`card_holder\` VARCHAR(255) NOT NULL,
  \`bank_name\` VARCHAR(100) NOT NULL,
  \`gateway_name\` VARCHAR(255) NOT NULL,
  \`gateway_active\` TINYINT(1) NOT NULL,
  \`gateway_merchant_id\` VARCHAR(255) NOT NULL
);
INSERT INTO \`bot_owner_config\` VALUES 
(1, '6037991823456789', 'علی محمدی (مدیر و مالک ربات)', 'بانک ملی ایران', 'درگاه آنلاین زرین‌پال / کارت‌به‌کارت مستقیم', 1, 'zarinpal_merchant_live_9988');

SET FOREIGN_KEY_CHECKS = 1;
`;
    },
  },
];
