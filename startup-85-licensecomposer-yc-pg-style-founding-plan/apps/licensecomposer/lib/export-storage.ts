/**
 * lib/export-storage.ts
 * Handles uploading rendered exports to Supabase Storage (exports bucket)
 * and writing a record to the exports table with a signed URL.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type ExportFormat = 'pdf' | 'html' | 'md' | 'txt' | 'jsonld';

export interface ExportRecord {
  id:            string;
  contractId:    string;
  userId:        string | null;
  format:        ExportFormat;
  storagePath:   string;
  storageBucket: string;
  signedUrl:     string;
  signedUrlExpiresAt: string;
  fileSizeBytes: number;
  createdAt:     string;
}

const BUCKET = 'exports';
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24; // 24 hours

const MIME: Record<ExportFormat, string> = {
  pdf:    'application/pdf',
  html:   'text/html',
  md:     'text/markdown',
  txt:    'text/plain',
  jsonld: 'application/ld+json',
};

const EXT: Record<ExportFormat, string> = {
  pdf: 'pdf', html: 'html', md: 'md', txt: 'txt', jsonld: 'json',
};

/**
 * Upload an export file to Supabase Storage and record it in the exports table.
 * Returns a signed URL valid for 24 hours.
 */
export async function storeExport(
  svc: SupabaseClient,
  params: {
    contractId:  string;
    userId:      string | null;
    format:      ExportFormat;
    content:     Uint8Array | string;
    templateSlug: string;
  }
): Promise<{ storagePath: string; signedUrl: string; exportId: string } | null> {
  const { contractId, userId, format, content, templateSlug } = params;

  // Build storage path: exports/<userId|anon>/<contractId>/<templateSlug>.<ext>
  const userSegment = userId ? userId.slice(0, 8) : 'anon';
  const filename    = `${templateSlug}-${contractId.slice(-8)}.${EXT[format]}`;
  const storagePath = `${userSegment}/${contractId}/${filename}`;

  // Convert string content to Uint8Array for upload
  const buffer = typeof content === 'string'
    ? new TextEncoder().encode(content)
    : content;

  // Upload to storage
  const { error: uploadError } = await svc.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType:  MIME[format],
      upsert:       true,  // overwrite if re-exported
    });

  if (uploadError) {
    console.error('[export-storage] Upload error:', uploadError.message);
    return null;
  }

  // Generate signed URL
  const { data: signedData, error: signErr } = await svc.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (signErr || !signedData?.signedUrl) {
    console.error('[export-storage] Signed URL error:', signErr?.message);
    return null;
  }

  const signedUrl = signedData.signedUrl;
  const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString();

  // Record in exports table
  const { data: exportRow, error: insertErr } = await svc
    .from('exports')
    .upsert({
      contract_id:            contractId,
      user_id:                userId,
      export_format: format,
      storage_path:           storagePath,
      storage_bucket:         BUCKET,
      signed_url:             signedUrl,
      signed_url_expires_at:  expiresAt,
      file_size_bytes:        buffer.byteLength,
      generated_at:           new Date().toISOString(),
    }, {
      onConflict: 'contract_id,export_format',
      ignoreDuplicates: false,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[export-storage] Insert error:', insertErr.message);
    // Return signed URL even if DB insert fails
    return { storagePath, signedUrl, exportId: 'unknown' };
  }

  return {
    storagePath,
    signedUrl,
    exportId: exportRow?.id ?? 'unknown',
  };
}

/**
 * Get or regenerate a signed URL for an existing export.
 */
export async function getExportSignedUrl(
  svc: SupabaseClient,
  storagePath: string
): Promise<string | null> {
  const { data, error } = await svc.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * List all exports for a contract.
 */
export async function listContractExports(
  svc: SupabaseClient,
  contractId: string
): Promise<Array<{ id: string; format: string; signedUrl: string | null; fileSizeBytes: number | null; generatedAt: string }>> {
  const { data, error } = await svc
    .from('exports')
    .select('id, export_format, signed_url, signed_url_expires_at, file_size_bytes, generated_at, storage_path')
    .eq('contract_id', contractId)
    .order('generated_at', { ascending: false });

  if (error || !data) return [];

  // Refresh expired signed URLs
  const now = Date.now();
  return Promise.all(data.map(async (e) => {
    let signedUrl = e.signed_url;
    const expires = e.signed_url_expires_at ? new Date(e.signed_url_expires_at).getTime() : 0;

    if (!signedUrl || expires < now + 60_000) {
      // Regenerate
      signedUrl = await getExportSignedUrl(svc, e.storage_path);
      if (signedUrl) {
        const newExpiry = new Date(now + SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString();
        await svc.from('exports').update({
          signed_url: signedUrl,
          signed_url_expires_at: newExpiry,
        }).eq('id', e.id);
      }
    }

    return {
      id:            e.id,
      format:        e.export_format,
      signedUrl,
      fileSizeBytes: e.file_size_bytes,
      generatedAt:   e.generated_at,
    };
  }));
}
