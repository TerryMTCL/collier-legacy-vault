import { getRequestContext } from '@cloudflare/next-on-pages'

export interface R2HTTPMetadata {
  contentType?: string
  contentLanguage?: string
  contentDisposition?: string
  contentEncoding?: string
  cacheControl?: string
  cacheExpiry?: Date
}

export interface R2Object {
  key: string
  version: string
  size: number
  etag: string
  httpEtag: string
  checksums: { md5?: string }
  uploaded: Date
  httpMetadata?: R2HTTPMetadata
  customMetadata?: Record<string, string>
  range?: { offset: number; length: number }
}

export interface R2ObjectBody extends R2Object {
  readonly body: ReadableStream
  readonly bodyUsed: boolean
  arrayBuffer(): Promise<ArrayBuffer>
  text(): Promise<string>
  json<T>(): Promise<T>
  blob(): Promise<Blob>
  writeHttpMetadata(headers: Headers): void
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata | Headers
  customMetadata?: Record<string, string>
}

export interface R2GetOptions {
  range?: { offset?: number; length?: number; suffix?: number }
}

export interface R2Bucket {
  get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null>
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob | File,
    options?: R2PutOptions
  ): Promise<R2Object>
  delete(key: string | string[]): Promise<void>
  head(key: string): Promise<R2Object | null>
  list(options?: {
    prefix?: string
    limit?: number
    cursor?: string
    delimiter?: string
    startAfter?: string
  }): Promise<{
    objects: R2Object[]
    truncated: boolean
    cursor?: string
    delimitedPrefixes: string[]
  }>
}

export function getR2(): R2Bucket {
  const { env } = getRequestContext()
  return (env as unknown as { VAULT_FILES: R2Bucket }).VAULT_FILES
}
