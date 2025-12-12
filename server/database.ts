import sqlite3 from 'sqlite3';
import { FoodLogEntry, ChatMessage, UserProfile } from './types';

const db = new sqlite3.Database('./nutrition.db');

export const initDb = () => {
  db.serialize(() => {
    // Users table - identified by phone number
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        profile_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Food Logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS food_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT,
        calories REAL,
        protein REAL,
        carbs REAL,
        fats REAL,
        timestamp DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    // Chat History table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        role TEXT,
        message TEXT,
        timestamp DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
  });
};

export const getUser = (userId: string): Promise<UserProfile | null> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT profile_json FROM users WHERE id = ?', [userId], (err, row: any) => {
      if (err) reject(err);
      resolve(row ? JSON.parse(row.profile_json) : null);
    });
  });
};

export const saveUser = (userId: string, profile: UserProfile): Promise<void> => {
    return new Promise((resolve, reject) => {
        const json = JSON.stringify(profile);
        db.run(
            `INSERT INTO users (id, profile_json) VALUES (?, ?) 
             ON CONFLICT(id) DO UPDATE SET profile_json = ?`,
            [userId, json, json],
            (err) => {
                if (err) reject(err);
                resolve();
            }
        );
    });
};

export const saveFoodLog = (userId: string, log: FoodLogEntry): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO food_logs (id, user_id, name, calories, protein, carbs, fats, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [log.id, userId, log.name, log.calories, log.protein, log.carbs, log.fats, log.timestamp],
            (err) => {
                if (err) reject(err);
                resolve();
            }
        );
    });
};

export const getFoodLogs = (userId: string, limit: number = 50): Promise<FoodLogEntry[]> => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM food_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`,
            [userId, limit],
            (err, rows: any[]) => {
                if (err) reject(err);
                resolve(rows.map(row => ({
                    ...row,
                    timestamp: new Date(row.timestamp) // SQLite stores as string usually, but we'll manage
                })));
            }
        );
    });
};

export const saveChatMessage = (userId: string, msg: ChatMessage): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO chat_history (id, user_id, role, message, timestamp) VALUES (?, ?, ?, ?, ?)`,
            [msg.id, userId, msg.sender, msg.text, msg.timestamp],
            (err) => {
                if(err) reject(err);
                resolve();
            }
        );
    });
};

export const getChatHistory = (userId: string, limit: number = 20): Promise<ChatMessage[]> => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC`, 
            // Note: usually we get desc limit then reverse, but for simple chat context let's just get all or limit
            [userId], 
            (err, rows: any[]) => {
                if(err) reject(err);
                const history = rows.map(r => ({
                    id: r.id,
                    sender: r.role,
                    text: r.message,
                    timestamp: new Date(r.timestamp)
                } as ChatMessage));
                resolve(history.slice(-limit));
            }
        );
    });
};
