import { getBrandBySlug } from '@/lib/brand/brand-resolver'
import { BrandProvider } from '@/lib/brand/brand-context'

export default async function BrandStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { brandSlug: string }
}) {
  const brand = await getBrandBySlug(params.brandSlug)
  return <BrandProvider brand={brand}>{children}</BrandProvider>
}
