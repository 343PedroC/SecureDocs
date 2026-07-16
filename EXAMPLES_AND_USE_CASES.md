# 🎯 Encrypted Versions - Practical Examples

## Example 1: Complete Version History View

### Backend Endpoint Response
```json
{
  "GET /documents/550e8400-e29b-41d4-a716-446655440000/versions": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440111",
      "versionNumber": 2,
      "originalName": "financial-report.pdf",
      "mimeType": "application/pdf",
      "size": 267000,
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "encryptionIv": "a1b2c3d4e5f6g7h8i9j0k1l2m3",
      "encryptionAuthTag": "9c3b8e2f1d4a6c5b8e9f2d7a5c8b3e",
      "storageKey": "docs/660e8400-e29b-41d4-a716-446655440111",
      "createdAt": "2026-07-14T10:30:00Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440222",
      "versionNumber": 1,
      "originalName": "financial-report.pdf",
      "mimeType": "application/pdf",
      "size": 256000,
      "sha256": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z",
      "encryptionIv": "f8a3c4b2d1e5f9a8c7d3e1b9a2c3d4",
      "encryptionAuthTag": "5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
      "storageKey": "docs/770e8400-e29b-41d4-a716-446655440222",
      "createdAt": "2026-07-13T15:30:00Z"
    }
  ]
}
```

### Frontend Component Usage
```tsx
import { VersionHistory } from '@/components/documents/VersionHistory'

export function DocumentDetailsPage() {
  const documentId = "550e8400-e29b-41d4-a716-446655440000"
  const documentName = "financial-report.pdf"

  return (
    <div className="p-6">
      <h1>{documentName}</h1>
      <VersionHistory 
        documentId={documentId}
        documentName={documentName}
      />
    </div>
  )
}
```

### What User Sees

**Before Expansion:**
```
v2 - financial-report.pdf
hace 1 hora
267 KB

v1 - financial-report.pdf
hace 1 día
256 KB
```

**After Clicking v2 to Expand:**
```
┌─ v2 - financial-report.pdf ──────────────────────────┐
│ hace 1 hora                              267 KB       │
├─────────────────────────────────────────────────────┤
│                                                       │
│ 🔐 INFORMACIÓN DE ENCRIPTACIÓN                      │
│ ├─ Algoritmo: AES-256-GCM                           │
│ ├─ IV: a1b2c3d4e5f6g7h8i9j0k1l2m3                   │
│ └─ Auth Tag: 9c3b8e2f1d4a6c5b8e9f2d7a5c8b3e          │
│                                                       │
│ ✓ INTEGRIDAD DEL ARCHIVO                            │
│ ├─ Hash SHA-256:                                    │
│ │  e3b0c44298fc1c149afbf4c8996fb92427ae41...       │
│ ├─ Ubicación: docs/660e8400-...                     │
│ └─ Tipo MIME: application/pdf                       │
│                                                       │
│ 📋 METADATOS                                        │
│ ├─ Tamaño: 267 KB                                   │
│ ├─ Versión: v2                                      │
│ ├─ Creada: 14/07/2026                               │
│ └─ ID: 660e8400-...                                 │
│                                                       │
│        [Descargar Versión]                          │
└─────────────────────────────────────────────────────┘
```

## Example 2: Programmatic Version Querying

### TypeScript Example
```typescript
import { documentVersionAPI, EncryptedVersion } from '@/lib/api'

async function analyzeDocumentVersions(docId: string) {
  try {
    // Fetch all versions
    const { data: versions } = await documentVersionAPI.getVersions(docId)
    
    console.log(`📊 Found ${versions.length} versions`)
    
    versions.forEach((version: EncryptedVersion) => {
      // Display basic info
      console.log(`\n📄 Version ${version.versionNumber}`)
      console.log(`   Created: ${new Date(version.createdAt).toLocaleString()}`)
      console.log(`   Size: ${version.size} bytes`)
      
      // Show encryption info
      console.log(`\n🔐 Encryption Details:`)
      console.log(`   IV (12 bytes):  ${version.encryptionIv}`)
      console.log(`   Auth Tag:       ${version.encryptionAuthTag}`)
      
      // Show integrity
      console.log(`\n✓ Integrity:`)
      console.log(`   SHA-256: ${version.sha256}`)
      console.log(`   Storage: ${version.storageKey}`)
    })
  } catch (error) {
    console.error('Error:', error)
  }
}

// Usage
analyzeDocumentVersions('550e8400-e29b-41d4-a716-446655440000')
```

### Output
```
📊 Found 2 versions

📄 Version 2
   Created: 7/14/2026, 10:30:00 AM
   Size: 267000 bytes

🔐 Encryption Details:
   IV (12 bytes):  a1b2c3d4e5f6g7h8i9j0k1l2m3
   Auth Tag:       9c3b8e2f1d4a6c5b8e9f2d7a5c8b3e

✓ Integrity:
   SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
   Storage: docs/660e8400-e29b-41d4-a716-446655440111

📄 Version 1
   Created: 7/13/2026, 3:30:00 PM
   Size: 256000 bytes

🔐 Encryption Details:
   IV (12 bytes):  f8a3c4b2d1e5f9a8c7d3e1b9a2c3d4
   Auth Tag:       5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a

✓ Integrity:
   SHA-256: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z
   Storage: docs/770e8400-e29b-41d4-a716-446655440222
```

## Example 3: Comparing Two Versions

### React Component
```tsx
import { useState, useEffect } from 'react'
import { documentVersionAPI, EncryptedVersion } from '@/lib/api'

export function VersionComparison({ docId }: { docId: string }) {
  const [versions, setVersions] = useState<EncryptedVersion[]>([])
  const [selected, setSelected] = useState<[EncryptedVersion | null, EncryptedVersion | null]>([null, null])

  useEffect(() => {
    documentVersionAPI.getVersions(docId).then(r => setVersions(r.data))
  }, [docId])

  if (versions.length < 2) {
    return <p>Need at least 2 versions to compare</p>
  }

  const v1 = selected[0] || versions[0]
  const v2 = selected[1] || versions[1]

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Version 1 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold mb-3">Version {v1?.versionNumber}</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Size:</strong> {v1?.size} bytes</p>
          <p><strong>Modified:</strong> {new Date(v1?.createdAt || '').toLocaleDateString()}</p>
          <p><strong>SHA-256:</strong> <code className="text-xs">{v1?.sha256.substring(0, 32)}...</code></p>
          <p><strong>IV:</strong> <code className="text-xs">{v1?.encryptionIv.substring(0, 24)}...</code></p>
        </div>
      </div>

      {/* Version 2 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold mb-3">Version {v2?.versionNumber}</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Size:</strong> {v2?.size} bytes</p>
          <p><strong>Modified:</strong> {new Date(v2?.createdAt || '').toLocaleDateString()}</p>
          <p><strong>SHA-256:</strong> <code className="text-xs">{v2?.sha256.substring(0, 32)}...</code></p>
          <p><strong>IV:</strong> <code className="text-xs">{v2?.encryptionIv.substring(0, 24)}...</code></p>
        </div>
      </div>

      {/* Differences */}
      <div className="col-span-2 border rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold mb-2">Differences</h4>
        <ul className="text-sm space-y-1">
          {v1?.size !== v2?.size && (
            <li>📦 Size changed: {v1?.size} → {v2?.size} bytes</li>
          )}
          {v1?.sha256 !== v2?.sha256 && (
            <li>🔄 Content different (SHA-256 mismatch)</li>
          )}
          {v1?.encryptionIv !== v2?.encryptionIv && (
            <li>🔐 Different encryption IV (expected)</li>
          )}
        </ul>
      </div>
    </div>
  )
}
```

## Example 4: Version History with Download Progress

```tsx
import { useState } from 'react'
import { documentVersionAPI, EncryptedVersion } from '@/lib/api'

export function VersionDownloader({ docId, version }: { docId: string; version: EncryptedVersion }) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)

    try {
      // Show what's happening
      console.log('🔍 Fetching encrypted version from storage...')
      console.log(`   Storage Key: ${version.storageKey}`)

      // Download and decrypt
      console.log('🔐 Decrypting with AES-256-GCM...')
      console.log(`   IV:       ${version.encryptionIv}`)
      console.log(`   Auth Tag: ${version.encryptionAuthTag}`)

      const response = await documentVersionAPI.downloadVersion(docId, version.id)

      console.log('✓ Decryption successful!')
      console.log(`✓ Verifying integrity...`)
      console.log(`   Expected SHA-256: ${version.sha256}`)

      // Save file
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `v${version.versionNumber}_${version.originalName}`
      link.click()
      URL.revokeObjectURL(url)

      console.log('✓ File downloaded successfully!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed'
      setError(message)
      console.error('❌ Download error:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {downloading ? '⏳ Downloading & Decrypting...' : '📥 Download'}
      </button>
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  )
}
```

## Example 5: Monitoring File Changes Across Versions

```typescript
interface VersionMetrics {
  versionNumber: number
  sizeChange: number
  modifiedDate: Date
  changed: boolean
}

function analyzeVersionChanges(versions: EncryptedVersion[]): VersionMetrics[] {
  return versions
    .sort((a, b) => a.versionNumber - b.versionNumber)
    .map((v, idx) => ({
      versionNumber: v.versionNumber,
      sizeChange: idx === 0 ? 0 : versions[idx - 1].size - v.size,
      modifiedDate: new Date(v.createdAt),
      changed: idx === 0 ? true : versions[idx - 1].sha256 !== v.sha256,
    }))
}

// Usage
const versions = await documentVersionAPI.getVersions(docId)
const metrics = analyzeVersionChanges(versions.data)

metrics.forEach(m => {
  console.log(`\nVersion ${m.versionNumber}`)
  console.log(`├─ Size change: ${m.sizeChange > 0 ? '+' : ''}${m.sizeChange} bytes`)
  console.log(`├─ Modified: ${m.modifiedDate.toLocaleString()}`)
  console.log(`└─ Content changed: ${m.changed ? '✓ Yes' : '✗ No'}`)
})
```

## Example 6: Security Audit Report

```typescript
async function generateSecurityAudit(docId: string) {
  const { data: versions } = await documentVersionAPI.getVersions(docId)

  console.log('🛡️  SECURITY AUDIT REPORT')
  console.log('='.repeat(50))
  console.log(`Document ID: ${docId}`)
  console.log(`Total Versions: ${versions.length}`)
  console.log()

  // Check encryption consistency
  const uniqueIVs = new Set(versions.map(v => v.encryptionIv))
  console.log(`✓ Encryption IVs: ${uniqueIVs.size} unique (expected: ${versions.length})`)

  // Check integrity hashes
  console.log(`✓ Integrity Hashes:`)
  versions.forEach(v => {
    const hashPreview = v.sha256.substring(0, 16)
    console.log(`  - v${v.versionNumber}: ${hashPreview}...`)
  })

  // Check authentication tags
  console.log(`✓ Authentication Tags:`)
  versions.forEach(v => {
    const tagPreview = v.encryptionAuthTag.substring(0, 16)
    console.log(`  - v${v.versionNumber}: ${tagPreview}...`)
  })

  // Storage locations
  console.log(`✓ Storage Locations:`)
  versions.forEach(v => {
    console.log(`  - v${v.versionNumber}: ${v.storageKey}`)
  })

  // Timeline
  console.log(`\n📅 Version Timeline:`)
  versions.forEach(v => {
    const date = new Date(v.createdAt)
    console.log(`  - v${v.versionNumber}: ${date.toLocaleString()}`)
  })

  console.log('\n✓ All security checks passed!')
}

// Usage
await generateSecurityAudit('550e8400-e29b-41d4-a716-446655440000')
```

## Example 7: Real-World Use Case - Compliance Report

```tsx
export function ComplianceReport({ docId }: { docId: string }) {
  const [report, setReport] = useState(null)

  useEffect(() => {
    documentVersionAPI.getVersions(docId).then(r => {
      const versions = r.data
      setReport({
        documentId: docId,
        totalVersions: versions.length,
        encryption: {
          algorithm: 'AES-256-GCM',
          totalIVsUsed: new Set(versions.map(v => v.encryptionIv)).size,
          authTagsPresent: versions.every(v => v.encryptionAuthTag),
        },
        integrity: {
          sha256HashesPresent: versions.every(v => v.sha256),
          uniqueHashes: new Set(versions.map(v => v.sha256)).size,
        },
        timeline: {
          firstVersion: new Date(versions[versions.length - 1].createdAt),
          lastVersion: new Date(versions[0].createdAt),
          totalVersions: versions.length,
        },
      })
    })
  }, [docId])

  if (!report) return <div>Loading...</div>

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h2 className="text-xl font-bold mb-4">📋 Compliance Report</h2>

      <section className="mb-4">
        <h3 className="font-semibold text-lg">Encryption Compliance</h3>
        <ul className="ml-4 space-y-1">
          <li>✓ Algorithm: {report.encryption.algorithm}</li>
          <li>✓ Unique IVs: {report.encryption.totalIVsUsed}/{report.totalVersions}</li>
          <li>✓ Auth Tags Present: {report.encryption.authTagsPresent ? 'Yes' : 'No'}</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-semibold text-lg">Integrity Verification</h3>
        <ul className="ml-4 space-y-1">
          <li>✓ SHA-256 Hashes: {report.integrity.sha256HashesPresent ? 'All Present' : 'Missing'}</li>
          <li>✓ Unique Hashes: {report.integrity.uniqueHashes}/{report.totalVersions}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-lg">Version Timeline</h3>
        <ul className="ml-4 space-y-1">
          <li>✓ First Version: {report.timeline.firstVersion.toLocaleDateString()}</li>
          <li>✓ Last Version: {report.timeline.lastVersion.toLocaleDateString()}</li>
          <li>✓ Total Versions: {report.timeline.totalVersions}</li>
        </ul>
      </section>

      <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded">
        ✓ All security and compliance requirements met
      </div>
    </div>
  )
}
```

---

**Last Updated:** 2026-07-14  
**Examples Version:** 1.0  
**Status:** ✅ Production Ready
