# 📦 Encrypted Document Versions Viewer

## Overview

The SecureDocs system now provides a comprehensive way to view and download encrypted document versions with full encryption metadata visibility.

## Features

### 1. **View Encrypted Version Details**
When you click the "History" button on any document, you can now see:

- **🔐 Encryption Information**
  - Algorithm: `AES-256-GCM` (256-bit Advanced Encryption Standard with Galois/Counter Mode)
  - IV (Initialization Vector): Unique random 12-byte value per encryption
  - Auth Tag: 16-byte authentication tag for integrity verification

- **✓ File Integrity**
  - SHA-256 Hash: Fingerprint of the original file
  - Storage Location: Where the encrypted file is stored
  - MIME Type: File format

- **📋 Metadata**
  - File Size: In bytes/KB/MB
  - Version Number: Sequential version count
  - Created Date: When the version was saved
  - Document ID: Unique identifier

### 2. **Encryption Flow**

```
Document Upload
    ↓
Generate Random IV (12 bytes)
    ↓
AES-256-GCM Encrypt with IV
    ↓
Generate Auth Tag (16 bytes)
    ↓
Store in encrypted object storage
    ↓
Save: { storageKey, IV, AuthTag, SHA256 }
```

### 3. **Backend Endpoints**

#### Get All Versions (with encryption metadata)
```bash
GET /documents/{documentId}/versions
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "versionNumber": 2,
    "originalName": "report.pdf",
    "mimeType": "application/pdf",
    "size": 102400,
    "sha256": "abc123...",
    "encryptionIv": "hexstring",
    "encryptionAuthTag": "hexstring",
    "storageKey": "docs/uuid",
    "createdAt": "2026-07-14T10:30:00Z"
  }
]
```

#### Download Specific Version (returns decrypted content)
```bash
GET /documents/{documentId}/versions/{versionId}/download
Authorization: Bearer {token}
```

### 4. **Frontend Components**

#### VersionHistory Component
Location: `frontend/src/components/documents/VersionHistory.tsx`

**Props:**
```typescript
interface VersionHistoryProps {
  documentId: string
  documentName: string
}
```

**Usage:**
```tsx
import { VersionHistory } from '@/components/documents/VersionHistory'

<VersionHistory 
  documentId="doc-uuid" 
  documentName="report.pdf" 
/>
```

#### API Functions
Location: `frontend/src/lib/api.ts`

```typescript
// Get versions with encryption metadata
const response = await documentVersionAPI.getVersions(documentId)

// Download specific version
const response = await documentVersionAPI.downloadVersion(documentId, versionId)

// Get version metadata
const response = await documentVersionAPI.getVersionMetadata(documentId)
```

### 5. **How It Works**

#### Uploading a New Version
1. File is uploaded
2. Current active document → saved as DocumentVersion with encryption data
3. New file → encrypted and becomes the new active document
4. Both versions maintain their own:
   - Storage location
   - Encryption IV
   - Authentication tag
   - Integrity hash (SHA-256)

#### Downloading an Old Version
1. Request sent with `documentId` and `versionId`
2. System retrieves encrypted blob from storage
3. Retrieves stored IV and Auth Tag
4. Decrypts using AES-256-GCM with the stored parameters
5. Returns original decrypted file to user

### 6. **Security Features**

✅ **Individual Encryption**: Each version encrypted separately with unique IV
✅ **Integrity Verification**: Auth tag ensures data hasn't been tampered
✅ **Unique IVs**: No two encryptions use the same IV with same key
✅ **Permission Checks**: Only authorized users can access versions
✅ **Audit Logging**: Version access is logged for compliance

### 7. **Database Schema**

```sql
model DocumentVersion {
  id                String   @id @default(uuid())
  documentId        String   -- Links to main document
  versionNumber     Int      -- Sequential: 1, 2, 3...
  originalName      String   -- File name
  mimeType          String   -- File type
  size              Int      -- File size in bytes
  sha256            String   -- Integrity hash
  storageKey        String   @unique -- Storage location
  encryptionIv      String   -- 12-byte IV (hex)
  encryptionAuthTag String   -- 16-byte tag (hex)
  createdAt         DateTime @default(now())
}
```

### 8. **Technical Details**

**Encryption Algorithm:** AES-256-GCM
- **Key Size:** 256 bits (32 bytes)
- **IV Size:** 12 bytes (96 bits) - random per encryption
- **Auth Tag:** 16 bytes (128 bits) - for authenticated encryption
- **Mode:** GCM (Galois/Counter Mode) - provides both confidentiality and authenticity

**Why GCM?**
- Provides authenticated encryption (AEAD)
- Detects any tampering with the encrypted data
- Industry standard for secure storage
- High performance

### 9. **Example: Viewing Version History**

1. **Navigate to Documents page**
2. **Click "History" button on any document**
3. **Modal opens showing all versions**
4. **Click on any version to expand it**
5. **View:**
   - Encryption details (IV, Auth Tag)
   - File integrity (SHA-256)
   - Metadata (size, date, type)
6. **Click "Descargar Versión" to download and decrypt**

### 10. **API Response Example**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "versionNumber": 1,
    "originalName": "contract.pdf",
    "mimeType": "application/pdf",
    "size": 256000,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "encryptionIv": "f8a3c4b2d1e5f9a8c7d3e1b9",
    "encryptionAuthTag": "9c3b8e2f1d4a6c5b8e9f2d7a",
    "storageKey": "docs/550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2026-07-13T15:30:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "versionNumber": 2,
    "originalName": "contract.pdf",
    "mimeType": "application/pdf",
    "size": 267000,
    "sha256": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z",
    "encryptionIv": "a9b8c7d6e5f4g3h2i1j0k9l8",
    "encryptionAuthTag": "8f7e6d5c4b3a2f1e9d8c7b6a",
    "storageKey": "docs/660e8400-e29b-41d4-a716-446655440111",
    "createdAt": "2026-07-14T10:30:00Z"
  }
]
```

## Files Modified

1. **Backend**
   - `backend/src/documents/documents.service.ts` - Added encryption metadata to `getVersions()`

2. **Frontend**
   - `frontend/src/lib/api.ts` - Added `EncryptedVersion` type and `documentVersionAPI` functions
   - `frontend/src/components/documents/VersionHistory.tsx` - New component for displaying encrypted versions
   - `frontend/src/pages/Documents.tsx` - Integrated VersionHistory component

## Usage Flow

```
User clicks "History" button on a document
    ↓
VersionHistory component loads
    ↓
API calls GET /documents/{id}/versions
    ↓
Backend returns all versions with encryption data
    ↓
Component displays expandable cards for each version
    ↓
User can:
  - View encryption details (IV, Auth Tag)
  - See file integrity hash (SHA-256)
  - View metadata (size, date, type)
  - Download and auto-decrypt version
```

---

**Last Updated:** 2026-07-14  
**Encryption Standard:** AES-256-GCM  
**Status:** ✅ Production Ready
