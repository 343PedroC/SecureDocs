import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

const VALID_KEY_B64 = Buffer.alloc(32, 'k').toString('base64');

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'DOCUMENT_ENCRYPTION_KEY' ? VALID_KEY_B64 : undefined,
          },
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    service.onModuleInit();
  });

  it('debe cifrarse y descifrarse correctamente', () => {
    const original = Buffer.from('Documento confidencial de prueba');
    const { encrypted, iv, authTag } = service.encrypt(original);
    const decrypted = service.decrypt(encrypted, iv, authTag);
    expect(decrypted).toEqual(original);
  });

  it('el cifrado no debe ser igual al original', () => {
    const original = Buffer.from('Contenido secreto');
    const { encrypted } = service.encrypt(original);
    expect(encrypted).not.toEqual(original);
  });

  it('el hash SHA-256 debe ser estable', () => {
    const data = Buffer.from('contenido estable');
    expect(service.sha256(data)).toBe(service.sha256(data));
  });

  it('dos cifrados del mismo contenido deben producir IVs distintos', () => {
    const data = Buffer.from('mismo contenido');
    const r1 = service.encrypt(data);
    const r2 = service.encrypt(data);
    expect(r1.iv).not.toBe(r2.iv);
  });

  it('debe fallar al descifrar con authTag incorrecto', () => {
    const original = Buffer.from('contenido con integridad');
    const { encrypted, iv } = service.encrypt(original);
    const badAuthTag = Buffer.alloc(16, 0).toString('hex');
    expect(() => service.decrypt(encrypted, iv, badAuthTag)).toThrow();
  });

  it('debe fallar con clave de longitud incorrecta', () => {
    const badService = new CryptoService({
      get: () => Buffer.alloc(16).toString('base64'),
    } as unknown as ConfigService);
    expect(() => badService.onModuleInit()).toThrow();
  });
});
