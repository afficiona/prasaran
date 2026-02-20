import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Database from 'better-sqlite3';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: Database.Database;

  onModuleInit() {
    const DatabaseConstructor = (Database as any).default || Database;
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../prasaran.db');
    this.db = new DatabaseConstructor(dbPath);
    this.initializeTables();
  }

  getDb(): Database.Database {
    return this.db;
  }

  private initializeTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS platforms (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_platform_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform_id TEXT NOT NULL,
        access_token_encrypted TEXT NOT NULL,
        refresh_token_encrypted TEXT,
        expires_at INTEGER,
        status TEXT DEFAULT 'active',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (platform_id) REFERENCES platforms(id),
        UNIQUE(user_id, platform_id)
      );

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS publish_jobs (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id)
      );

      CREATE TABLE IF NOT EXISTS publish_tasks (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        platform_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        attempt_count INTEGER DEFAULT 0,
        last_error TEXT,
        external_post_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (job_id) REFERENCES publish_jobs(id),
        FOREIGN KEY (platform_id) REFERENCES platforms(id)
      );

      CREATE TABLE IF NOT EXISTS user_oauth_providers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(provider, provider_user_id)
      );
    `);

    // Seed platforms
    this.db.prepare(`
      INSERT OR IGNORE INTO platforms (id, name, created_at)
      VALUES (?, ?, ?)
    `).run('manch-platform', 'Manch', Date.now());

    this.db.prepare(`
      INSERT OR IGNORE INTO platforms (id, name, created_at)
      VALUES (?, ?, ?)
    `).run('adda-platform', 'Adda', Date.now());

    this.db.prepare(`
      INSERT OR IGNORE INTO platforms (id, name, created_at)
      VALUES (?, ?, ?)
    `).run('samooh-platform', 'Samooh', Date.now());
  }
}
