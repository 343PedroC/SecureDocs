# 🔐 Encrypted Versions - Developer Reference

## Quick Start

### Backend - Query Encrypted Versions

```typescript
// In your NestJS controller/service
import { DocumentsService } from './documents.service'

// Get all versions of a document with encryption metadata
const versions = await this.documentsService.getVersions(
  documentId,
  userId // ensures permission check
)

// Response includes:
// [
//   {
//     id: string
//     versionNumber: number
//     originalName: string
//     mimeType: string
//     size: number
//     sha256: string
//     encryptionIv: string          // ← NEW
//     encryptionAuthTag: string     // ← NEW
//     storageKey: string            // ← NEW
//     createdAt: Date
//   }
// ]
```

### Frontend - Display Versions

```tsx
import { VersionHistory } from '@/components/documents/VersionHistory'

export function MyComponent() {
  return (
    <VersionHistory 
      documentId="doc-uuid-here"
      documentName="my-file.pdf"
    />
  )
}
```

### API Calls

```typescript
import { documentVersionAPI } from '@/lib/api'

// Get all versions
const { data: versions } = await documentVersionAPI.getVersions('doc-id')

// Download specific version (automatically decrypted)
const response = await documentVersionAPI.downloadVersion('doc-id', 'version-id')

// Response is already decrypted blob - save it directly
const url = URL.createObjectURL(response.data)
const a = document.createElement('a')
a.href = url
a.download = 'file-name.pdf'
a.click()
```

## Data Structure

### EncryptedVersion Type

```typescript
interface EncryptedVersion {
  id: string                  // Unique version ID
  versionNumber: number       // 1, 2, 3... (sequential)
  originalName: string        // Original filename
  mimeType: string           // e.g., "application/pdf"
  size: number               // Bytes
  sha256: string             // File integrity hash
  encryptionIv: string       // Hex-encoded 12-byte IV
  encryptionAuthTag: string  // Hex-encoded 16-byte auth tag
  storageKey: string         // Location in storage
  createdAt: string          // ISO datetime
}
```

## Encryption Info Reference

```
┌─ AES-256-GCM Encryption ─────────────────────┐
├─ Algorithm: AES-256-GCM                      │
├─ Key Size: 256 bits (32 bytes)               │
├─ IV Size: 12 bytes (96 bits)                 │
├─ Auth Tag: 16 bytes (128 bits)               │
├─ Mode: Authenticated Encryption (AEAD)       │
└────────────────────────────────────────────┘

Each Version:
├─ encryptionIv: Random 12-byte IV (hex)
├─ encryptionAuthTag: 16-byte authentication tag (hex)
├─ sha256: Original file hash (for integrity)
├─ storageKey: Encrypted blob location
└─ mimeType, size, originalName: Metadata
```

## Common Tasks

### Task 1: Display All Versions in a Table

```tsx
import { VersionHistory } from '@/components/documents/VersionHistory'

export function VersionsTable({ docId }: { docId: string }) {
  return <VersionHistory documentId={docId} documentName="Document" />
}
```

### Task 2: Manually Fetch and Display Versions

```tsx
import { useState, useEffect } from 'react'
import { documentVersionAPI, EncryptedVersion } from '@/lib/api'

export function MyVersions({ docId }: { docId: string }) {
  const [versions, setVersions] = useState<EncryptedVersion[]>([])

  useEffect(() => {
    documentVersionAPI.getVersions(docId).then(r => setVersions(r.data))
  }, [docId])

  return (
    <div>
      {versions.map(v => (
        <div key={v.id}>
          <p>Version {v.versionNumber}</p>
          <p>IV: {v.encryptionIv}</p>
          <p>Auth Tag: {v.encryptionAuthTag}</p>
          <p>SHA-256: {v.sha256}</p>
        </div>
      ))}
    </div>
  )
}
```

### Task 3: Download and Decrypt Version

```typescript
async function downloadAndDecryptVersion(docId: string, versionId: string) {
  try {
    // Download returns already-decrypted blob
    const response = await documentVersionAPI.downloadVersion(docId, versionId)
    
    // Save to disk
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = 'file-name.pdf'
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download failed:', error)
  }
}
```

### Task 4: View Encryption Metadata

```typescript
async function showEncryptionDetails(docId: string) {
  const { data: versions } = await documentVersionAPI.getVersions(docId)
  
  versions.forEach(v => {
    console.log(`Version ${v.versionNumber}`)
    console.log(`├─ Encryption IV: ${v.encryptionIv}`)
    console.log(`├─ Auth Tag: ${v.encryptionAuthTag}`)
    console.log(`├─ SHA-256: ${v.sha256}`)
    console.log(`└─ Stored at: ${v.storageKey}`)
  })
}
```

## Component Props

### VersionHistory Component

```tsx
interface VersionHistoryProps {
  documentId: string    // Required: The document UUID
  documentName: string  // Required: Display name for the document
}

// Handles internally:
// - Loading versions
// - Displaying expandable cards
// - Showing encryption metadata
// - Handling downloads
// - Error states
```

## Error Handling

```typescript
try {
  const { data } = await documentVersionAPI.getVersions(docId)
  console.log('Versions:', data)
} catch (error: any) {
  if (error.response?.status === 403) {
    console.error('No permission to view versions')
  } else if (error.response?.status === 404) {
    console.error('Document not found')
  } else {
    console.error('Error loading versions:', error)
  }
}
```

## Backend Implementation Details

### documents.service.ts - getVersions() method

```typescript
async getVersions(documentId: string, userId: string) {
  // Check permissions
  const permission = await this.prisma.documentPermission.findFirst({
    where: { documentId, userId, permission: { in: ['owner', 'read'] } },
  })
  if (!permission) throw new ForbiddenException('Sin acceso')

  // Return versions WITH encryption metadata
  return this.prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { versionNumber: 'desc' },
    select: {
      id: true,
      versionNumber: true,
      originalName: true,
      mimeType: true,
      size: true,
      sha256: true,
      encryptionIv: true,        // ← Included now
      encryptionAuthTag: true,   // ← Included now
      storageKey: true,          // ← Included now
      createdAt: true,
    },
  })
}
```

## REST API Endpoints

### Get Versions (with encryption metadata)
```
GET /documents/{documentId}/versions
Authorization: Bearer {token}

Response 200:
[
  {
    "id": "uuid",
    "versionNumber": 1,
    "originalName": "file.pdf",
    "mimeType": "application/pdf",
    "size": 1024,
    "sha256": "abc123...",
    "encryptionIv": "hexstring",
    "encryptionAuthTag": "hexstring",
    "storageKey": "docs/uuid",
    "createdAt": "2026-07-14T10:00:00Z"
  }
]
```

### Download Version (returns decrypted)
```
GET /documents/{documentId}/versions/{versionId}/download
Authorization: Bearer {token}

Response 200: (binary blob - decrypted file)
```

## Testing

### Test Fetching Versions
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/documents/DOC_ID/versions
```

### Test Downloading Version
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/documents/DOC_ID/versions/VERSION_ID/download \
  -o downloaded_file.pdf
```

## Security Checklist

✅ Versions are individually encrypted (each has own IV)
✅ Permission checks before accessing any version
✅ IV is random per encryption (never reused)
✅ Auth tag ensures data integrity (tamper detection)
✅ SHA-256 provides additional integrity verification
✅ All access is logged for audit compliance
✅ Decryption happens only on authorized download

## Performance Tips

1. **Lazy Load Versions**: Only fetch when user clicks History button
2. **Cache Versions**: Store in local state while modal is open
3. **Batch Requests**: Get all versions in one request (already done)
4. **Limit Display**: VersionHistory component already handles pagination
5. **Async Download**: Use ResponseType 'blob' for large files

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No permission" error | Ensure user has 'owner' or 'read' permission |
| Versions not showing | Check if document has any versions created |
| Download fails | Browser may block - check console for CORS |
| IV/Auth Tag empty | Ensure backend is returning new fields |
| Component not rendering | Verify documentId is valid UUID |

---

**Last Updated:** 2026-07-14  
**Version:** 1.0  
**Status:** ✅ Production Ready
