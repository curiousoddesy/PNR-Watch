import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { AuthResult, LoginCredentials, UserRegistration } from '../types';
import DatabaseConnection from '../config/database';

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export class AuthService {
  private static instance: AuthService;
  private db: DatabaseConnection;
  
  private readonly JWT_ACCESS_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

  private constructor() {
    this.db = DatabaseConnection.getInstance();
    
    this.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.warn('Warning: JWT secrets not set in environment variables. Using default values.');
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user
   */
  async registerUser(userData: UserRegistration): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = await User.create(userData);
    
    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    // Store refresh token in database
    await this.storeRefreshToken(user.id!, refreshToken);
    
    // Update last login
    await user.updateLastLogin();

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken
    };
  }

  /**
   * Authenticate user login
   */
  async authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
    // Find user by email
    const user = await User.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(credentials.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    // Store refresh token in database
    await this.storeRefreshToken(user.id!, refreshToken);
    
    // Update last login
    await user.updateLastLogin();

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken
    };
  }

  /**
   * Generate access token
   */
  generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id!,
      email: user.email,
      type: 'access'
    };

    return jwt.sign(payload, this.JWT_ACCESS_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'pnr-tracker',
      audience: 'pnr-tracker-users'
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id!,
      email: user.email,
      type: 'refresh'
    };

    return jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'pnr-tracker',
      audience: 'pnr-tracker-users'
    });
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<User> {
    try {
      const payload = jwt.verify(token, this.JWT_ACCESS_SECRET, {
        issuer: 'pnr-tracker',
        audience: 'pnr-tracker-users'
      }) as JWTPayload;

      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      const user = await User.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token and generate new access token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const payload = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET, {
        issuer: 'pnr-tracker',
        audience: 'pnr-tracker-users'
      }) as JWTPayload;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in database
      const isValidRefreshToken = await this.isValidRefreshToken(payload.userId, refreshToken);
      if (!isValidRefreshToken) {
        throw new Error('Invalid refresh token');
      }

      const user = await User.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      return this.generateAccessToken(user);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const query = `
      INSERT INTO user_refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
    `;
    
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.db.query(query, [userId, token, expiresAt]);
  }

  /**
   * Check if refresh token is valid
   */
  private async isValidRefreshToken(userId: string, token: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM user_refresh_tokens 
      WHERE user_id = $1 AND token = $2 AND expires_at > NOW()
    `;
    
    const result = await this.db.query(query, [userId, token]);
    return result.rows.length > 0;
  }

  /**
   * Revoke refresh token (logout)
   */
  async revokeRefreshToken(userId: string): Promise<void> {
    const query = `DELETE FROM user_refresh_tokens WHERE user_id = $1`;
    await this.db.query(query, [userId]);
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_EXPIRY);

    // Store token in database
    const query = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    
    await this.db.query(query, [user.id, token, expiresAt]);
    
    return token;
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token: string): Promise<User> {
    const query = `
      SELECT prt.user_id, prt.expires_at, prt.used
      FROM password_reset_tokens prt
      WHERE prt.token = $1
    `;
    
    const result = await this.db.query(query, [token]);
    
    if (result.rows.length === 0) {
      throw new Error('Invalid reset token');
    }

    const tokenData = result.rows[0];
    
    if (tokenData.used) {
      throw new Error('Reset token has already been used');
    }
    
    if (new Date() > tokenData.expires_at) {
      throw new Error('Reset token has expired');
    }

    const user = await User.findById(tokenData.user_id);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.verifyPasswordResetToken(token);
    
    // Update password
    await user.updatePassword(newPassword);
    
    // Mark token as used
    const query = `
      UPDATE password_reset_tokens 
      SET used = true, used_at = NOW()
      WHERE token = $1
    `;
    
    await this.db.query(query, [token]);
    
    // Revoke all refresh tokens for security
    await this.revokeRefreshToken(user.id!);
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    const queries = [
      'DELETE FROM user_refresh_tokens WHERE expires_at < NOW()',
      'DELETE FROM password_reset_tokens WHERE expires_at < NOW()'
    ];

    for (const query of queries) {
      await this.db.query(query);
    }
  }
}