import { ImagePlusIcon, Loader2Icon, XIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { ErrorState } from '@/components/common'
import { Button } from '@/components/ui/button'
import { uploadImage, type UploadedImage } from '@/lib/upload'
import { cn } from '@/lib/utils'

interface Props {
  value: UploadedImage | null
  onChange: (v: UploadedImage | null) => void
  label?: string
  className?: string
  disabled?: boolean
}

/** 单张图片：选文件 → 上传 → 回传 {id,url}，id 写进 `<字段>_id` */
export function ImagePicker({ value, onChange, label = '上传图片', className, disabled }: Props) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true); setErr(null)
    try { onChange(await uploadImage(file)) }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = '' }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input ref={inputRef} id={id} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className="border-border relative w-fit overflow-hidden rounded-lg border">
          <img src={value.url} alt="" className="h-32 w-32 object-cover" />
          {!disabled && (
            <button type="button" onClick={() => onChange(null)} aria-label="移除图片"
              className="bg-background/80 absolute top-1 right-1 rounded-md p-1 backdrop-blur hover:bg-background">
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      ) : (
        <Button type="button" variant="outline" disabled={busy || disabled} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2Icon className="animate-spin" /> : <ImagePlusIcon />}
          {busy ? '上传中…' : label}
        </Button>
      )}
      <ErrorState message={err} title="上传失败" />
    </div>
  )
}

/** 多张图片 */
export function ImageGallery({ value, onChange, max = 9, disabled }: { value: UploadedImage[]; onChange: (v: UploadedImage[]) => void; max?: number; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true); setErr(null)
    try {
      const room = max - value.length
      const picked = [...files].slice(0, Math.max(0, room))
      const uploaded: UploadedImage[] = []
      for (const f of picked) uploaded.push(await uploadImage(f))
      onChange([...value, ...uploaded])
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = '' }
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files)} />
      <div className="flex flex-wrap gap-3">
        {value.map((img, i) => (
          <div key={`${img.id}-${i}`} className="border-border relative overflow-hidden rounded-lg border">
            <img src={img.url} alt="" className="h-24 w-24 object-cover" />
            {!disabled && (
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="移除图片"
                className="bg-background/80 absolute top-1 right-1 rounded-md p-1 backdrop-blur hover:bg-background">
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {value.length < max && !disabled && (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="border-border text-muted-foreground hover:border-brand hover:text-brand flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs transition-colors disabled:opacity-50">
            {busy ? <Loader2Icon className="size-5 animate-spin" /> : <ImagePlusIcon className="size-5" />}
            {busy ? '上传中' : `${value.length}/${max}`}
          </button>
        )}
      </div>
      <ErrorState message={err} title="上传失败" />
    </div>
  )
}
