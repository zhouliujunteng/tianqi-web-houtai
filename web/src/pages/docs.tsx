import { ArrowLeftIcon, FileTextIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingRows, PageHeader } from '@/components/common'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { gql } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useAsync } from '@/lib/useAsync'

interface Doc { id: number; doc_type: string; title: string | null; content: string | null; updated_at: string }

export default function DocsPage() {
  const { type } = useParams()
  const { account } = useAuth()
  const { data, loading, error } = useAsync(async () => {
    const d = await gql<{ platform_doc: Doc[] }>(`query Docs { platform_doc(where: { is_active: { _eq: true } }, order_by: { id: asc }) { id doc_type title content updated_at } }`)
    return d.platform_doc
  }, [account?.id])

  const current = type ? data?.find((d) => d.doc_type === decodeURIComponent(type)) : null

  return (
    <AppShell className="max-w-4xl">
      <PageHeader
        eyebrow="平台文档"
        title={current ? current.title || current.doc_type : '平台文档'}
        description={current ? undefined : '建档须知、提交信息说明、父母必答说明与平台方案郑重声明。'}
        actions={current && <Button asChild variant="outline" size="sm"><Link to="/docs"><ArrowLeftIcon />全部文档</Link></Button>}
      />
      <ErrorState message={error} />
      {loading ? <LoadingRows /> : current ? (
        <Card className="shadow-none">
          <CardContent className="p-6">
            <div className="text-sm leading-7 whitespace-pre-wrap">{current.content || '（文档内容尚未填写）'}</div>
          </CardContent>
        </Card>
      ) : !data?.length ? <EmptyState>还没有已启用的平台文档</EmptyState> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((d) => (
            <Link key={d.id} to={`/docs/${encodeURIComponent(d.doc_type)}`} className="group">
              <Card className="hover:border-brand/50 h-full shadow-none transition-colors">
                <CardHeader className="p-5">
                  <CardDescription className="flex items-center gap-2 text-xs tracking-wide uppercase"><FileTextIcon className="size-3.5" />{d.doc_type}</CardDescription>
                  <CardTitle className="group-hover:text-brand text-base transition-colors">{d.title || d.doc_type}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-muted-foreground line-clamp-2 text-sm">{d.content || '内容尚未填写'}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  )
}
