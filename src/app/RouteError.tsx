import { Link, useRouteError } from 'react-router-dom'
import { BookStack } from '../components/illustrations'

export function RouteError({ notFound }: { notFound?: boolean }) {
  const err = useRouteError() as Error | undefined
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <BookStack className="mx-auto h-28 w-28 text-gold" />
        <div className="folio mt-6">{notFound ? 'Lỗi 404' : 'Sự cố'}</div>
        <h1 className="display mt-2 text-4xl text-ink">{notFound ? 'Trang này không có trong mục lục.' : 'Một trang sách bị rách.'}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">{notFound ? 'Đường dẫn không tồn tại hoặc đã được chuyển sang kệ khác.' : err?.message ?? 'Đã có lỗi không xác định. Dữ liệu học tập của bạn vẫn an toàn.'}</p>
        <Link to="/" className="mt-6 inline-flex h-10 items-center rounded-md bg-burgundy px-5 text-sm text-on-dark">Về trang tổng quan</Link>
      </div>
    </div>
  )
}
