/**
 * 국제화 유틸리티
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Messages = Record<string, unknown>;

class I18n {
  private messages: Messages = {};
  private locale = 'ko'; // MVP: 한국어 고정

  constructor() {
    this.loadMessages();
  }

  private loadMessages() {
    try {
      const localesPath = path.join(__dirname, '../locales', `${this.locale}.json`);
      const data = fs.readFileSync(localesPath, 'utf-8');
      this.messages = JSON.parse(data);
    } catch (error) {
      console.error(`Failed to load locale ${this.locale}:`, error);
      this.messages = {};
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: unknown = this.messages;

    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // fallback to key
      }
    }

    let message = typeof value === 'string' ? value : key;

    // 템플릿 치환
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        message = message.replace(`{{${paramKey}}}`, String(paramValue));
      });
    }

    return message;
  }
}

export const i18n = new I18n();
