import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
  ) {}

  async register(email: string, password: string) {
    const db = this.databaseService.getDb();
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    try {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `).run(userId, email, passwordHash, Date.now());

      return { userId, email };
    } catch (error) {
      if ((error as any).message.includes('UNIQUE constraint failed')) {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    const db = this.databaseService.getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateJwtToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async validateGoogleUser(profile: { googleId: string; email: string; picture?: string }) {
    const db = this.databaseService.getDb();

    // Check if user exists by Google ID in user_oauth_providers
    const oauthProvider = db.prepare(`
      SELECT user_id FROM user_oauth_providers
      WHERE provider = 'google' AND provider_user_id = ?
    `).get(profile.googleId) as any;

    if (oauthProvider) {
      // User already linked with Google, return existing user
      const user = db.prepare('SELECT id, email, is_admin FROM users WHERE id = ?').get(oauthProvider.user_id) as any;
      return {
        ...user,
        picture: profile.picture,
      };
    }

    // Check if user exists by email
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email) as any;

    if (user) {
      // User exists with email, link Google account to existing user
      db.prepare(`
        INSERT INTO user_oauth_providers (id, user_id, provider, provider_user_id, email, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), user.id, 'google', profile.googleId, profile.email, Date.now());

      return {
        id: user.id,
        email: user.email,
        picture: profile.picture,
      };
    }

    // Create new user
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(randomUUID(), 10); // Random password for OAuth-only users

    db.prepare(`
      INSERT INTO users (id, email, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, profile.email, passwordHash, Date.now());

    // Link Google account
    db.prepare(`
      INSERT INTO user_oauth_providers (id, user_id, provider, provider_user_id, email, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), userId, 'google', profile.googleId, profile.email, Date.now());

    return {
      id: userId,
      email: profile.email,
      picture: profile.picture,
    };
  }

  generateJwtToken(user: any): string {
    const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'prasaran-jwt-secret-change-in-production';
    return jwt.sign(
      { userId: user.id, email: user.email, picture: user.picture, isAdmin: user.is_admin === 1 },
      jwtSecret,
      { expiresIn: '7d' }
    );
  }

  verifyToken(token: string) {
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'prasaran-jwt-secret-change-in-production';
      return jwt.verify(token, jwtSecret);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  getUserById(userId: string) {
    const db = this.databaseService.getDb();
    const user = db.prepare('SELECT id, email, is_admin FROM users WHERE id = ?').get(userId) as any;
    return user;
  }

  getAllUsers() {
    const db = this.databaseService.getDb();
    const users = db.prepare(`
      SELECT id, email, is_admin, created_at
      FROM users
      ORDER BY created_at DESC
    `).all() as any[];

    return users.map(user => ({
      id: user.id,
      email: user.email,
      isAdmin: user.is_admin === 1,
      createdAt: user.created_at
    }));
  }
}
