import { supabase } from '../supabase';

const tableName = 'magazines';
const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'publications';

function mapMagazine(row) {
  return {
    id: row.id,
    publicationType: row.publication_type,
    title: row.title,
    description: row.description,
    coverUrl: row.cover_url,
    coverPath: row.cover_path,
    coverFileName: row.cover_file_name,
    pdfUrl: row.content_url,
    contentPath: row.content_path,
    contentFileName: row.content_file_name,
    contentFileType: row.content_file_type,
    contentFileSize: row.content_file_size,
    category: row.category,
    issueNumber: row.issue_number,
    volume: row.volume,
    pageCount: row.page_count,
    language: row.language,
    tags: row.tags ?? [],
    features: row.features ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at
  };
}

function safeFileName(fileName) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function uploadPublicationFile(file, folder) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const path = `${folder}/${randomId}-${safeFileName(file.name)}`;

  const { error } = await supabase.storage.from(storageBucket).upload(path, file, {
    contentType: file.type,
    upsert: false
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
    name: file.name,
    size: file.size,
    contentType: file.type
  };
}

export async function removePublicationFiles(paths) {
  const validPaths = paths.filter(Boolean);

  if (validPaths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(storageBucket).remove(validPaths);

  if (error) {
    throw error;
  }
}

export async function getPublishedMagazines() {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return data.map(mapMagazine);
}

export async function getAllMagazines() {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(mapMagazine);
}

export async function getMagazineById(id) {
  const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();

  if (error) {
    throw error;
  }

  return mapMagazine(data);
}

export async function createMagazine(payload) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(tableName)
    .insert({
      publication_type: payload.publicationType ?? 'magazine',
      title: payload.title,
      description: payload.description,
      cover_url: payload.coverUrl,
      cover_path: payload.coverPath,
      cover_file_name: payload.coverFileName,
      content_url: payload.pdfUrl,
      content_path: payload.contentPath,
      content_file_name: payload.contentFileName,
      content_file_type: payload.contentFileType,
      content_file_size: payload.contentFileSize,
      category: payload.category,
      issue_number: payload.issueNumber,
      volume: payload.volume,
      page_count: payload.pageCount,
      language: payload.language,
      tags: payload.tags,
      features: payload.features,
      status: payload.status ?? 'draft',
      updated_at: now,
      published_at: payload.status === 'published' ? now : null
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function updateMagazine(id, payload) {
  const now = new Date().toISOString();
  const updatePayload = {
    publication_type: payload.publicationType ?? 'magazine',
    title: payload.title,
    description: payload.description,
    category: payload.category,
    issue_number: payload.issueNumber,
    volume: payload.volume,
    page_count: payload.pageCount,
    language: payload.language,
    tags: payload.tags,
    features: payload.features,
    status: payload.status ?? 'draft',
    updated_at: now,
    published_at: payload.status === 'published' ? payload.publishedAt ?? now : null
  };

  if (payload.coverUrl) {
    updatePayload.cover_url = payload.coverUrl;
    updatePayload.cover_path = payload.coverPath;
    updatePayload.cover_file_name = payload.coverFileName;
  }

  if (payload.pdfUrl) {
    updatePayload.content_url = payload.pdfUrl;
    updatePayload.content_path = payload.contentPath;
    updatePayload.content_file_name = payload.contentFileName;
    updatePayload.content_file_type = payload.contentFileType;
    updatePayload.content_file_size = payload.contentFileSize;
  }

  const { error } = await supabase.from(tableName).update(updatePayload).eq('id', id);

  if (error) {
    throw error;
  }
}

export async function deleteMagazine(id) {
  const { error } = await supabase.from(tableName).delete().eq('id', id);

  if (error) {
    throw error;
  }
}
