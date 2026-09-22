import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface Option { value: string; label: string }

/** 受控下拉：value 为空字符串时显示占位符（Radix 不允许空 value，内部用 __all__ 代理） */
export function Picker({ value, onChange, options, placeholder = '请选择', className, disabled, allowEmpty = true }: {
  value: string
  onChange: (v: string) => void
  options: readonly string[] | Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
  allowEmpty?: boolean
}) {
  const opts: Option[] = (options as (string | Option)[]).map((o) => typeof o === 'string' ? { value: o, label: o } : o)
  return (
    <Select value={value === '' ? '__all__' : value} onValueChange={(v) => onChange(v === '__all__' ? '' : v)} disabled={disabled}>
      <SelectTrigger className={cn('w-full', className)}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__all__">{placeholder}</SelectItem>}
        {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
