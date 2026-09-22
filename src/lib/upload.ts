import SparkMD5 from 'spark-md5'
import { gql } from './api'

/** Zion MediaFormat 枚举里我们允许的图片格式 */
const IMAGE_FORMATS: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/svg+xml': 'SVG',
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export interface UploadedImage { id: number; url: string }

function md5Base64(buf: ArrayBuffer): string {
  const hex = SparkMD5.ArrayBuffer.hash(buf)
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin)
}

/**
 * Zion 图片上传三步：算 MD5 → 换预签名地址 → PUT 原文件。
 * 签名里包含 Content-MD5 与 Content-Type，两个请求头都必须原样带上，否则 OSS 返回 SignatureDoesNotMatch。
 */
export async function uploadImage(file: File): Promise<UploadedImage> {
  const format = IMAGE_FORMATS[file.type]
  if (!format) throw new Error('只支持 PNG / JPG / WEBP / GIF / SVG 图片')
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`图片不能超过 ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB`)

  const buf = await file.arrayBuffer()
  const md5 = md5Base64(buf)

  const data = await gql<{ imagePresignedUrl: { imageId: number; uploadUrl: string; downloadUrl: string } }>(
    `mutation Presign($md5: String!, $fmt: MediaFormat!) {
      imagePresignedUrl(imgMd5Base64: $md5, imageSuffix: $fmt) { imageId uploadUrl downloadUrl }
    }`,
    { md5, fmt: format },
  )
  const { imageId, uploadUrl, downloadUrl } = data.imagePresignedUrl

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type, 'Content-MD5': md5 },
    body: buf,
  })
  if (!res.ok) throw new Error(`图片上传失败（${res.status}）`)

  return { id: imageId, url: downloadUrl }
}
