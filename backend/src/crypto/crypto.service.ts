import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface EncryptResult {
  encrypted: Buffer;
  iv: string;
  authTag: string;
}

@Injectable()
export class CryptoService implements OnModuleInit {
  private key: Buffer;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const b64 = this.config.get<string>('DOCUMENT_ENCRYPTION_KEY');
    if (!b64) {
      throw new Error('DOCUMENT_ENCRYPTION_KEY no está configurada');
    }
    this.key = Buffer.from(b64, 'base64');
    if (this.key.length !== 32) {
      throw new Error(
        `DOCUMENT_ENCRYPTION_KEY debe ser de 32 bytes. Actual: ${this.key.length} bytes`,
      );
    }
  }

  sha256(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  encrypt(data: Buffer): EncryptResult {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  decrypt(data: Buffer, iv: string, authTag: string): Buffer {
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, ivBuffer, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTagBuffer);

    return Buffer.concat([decipher.update(data), decipher.final()]);
  }
}
