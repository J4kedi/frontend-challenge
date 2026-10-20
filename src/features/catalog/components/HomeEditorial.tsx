import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Artwork } from '@/contracts/nft'
import { highlightsOptions } from '../queries'
import { NftImage } from './NftImage'

/** "NFT em destaque — Oferta limitada" (sidebar of the Figma home). */
export function FeaturedNft() {
  const { data } = useQuery(highlightsOptions())
  return (
    <section aria-labelledby="featured-title" className="overflow-hidden rounded-xl bg-surface-dark">
      <h2 id="featured-title" className="px-5 pt-5 text-title-lg font-bold text-accent uppercase">
        NFT em destaque
        <span className="mt-1 block text-center text-title-sm text-foreground">Oferta limitada</span>
      </h2>
      <div className="mt-4">
        {data ? (
          <Link to="/nft/$nftId" params={{ nftId: data.featured.id }} className="block">
            <NftImage artwork={data.featured.artwork} alt={`${data.featured.name}, NFT em destaque`} sizes="310px" className="rounded-xl" />
          </Link>
        ) : (
          <Skeleton className="aspect-square w-full rounded-xl" />
        )}
      </div>
    </section>
  )
}

const PROMOS: { artwork: Artwork; title: string; text: string; search: { tab?: 'new'; collections?: ['arte-digital'] } }[] = [
  {
    artwork: 'emerald',
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    search: { tab: 'new' },
  },
  {
    artwork: 'ivory',
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura on-chain.',
    search: { collections: ['arte-digital'] },
  },
]

export function PromoCards() {
  return (
    <section aria-label="Coleções em destaque" className="mx-auto mt-24 grid max-w-page gap-7 px-4 md:grid-cols-2 md:px-6 xl:px-0">
      {PROMOS.map((promo) => (
        <article key={promo.title} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-xl bg-surface">
          <NftImage artwork={promo.artwork} alt="" sizes="(min-width: 768px) 290px, 50vw" className="h-full rounded-xl" />
          <div className="flex flex-col items-end justify-center gap-3 p-4 text-right lg:p-6">
            <h2 className="text-title-sm font-bold text-foreground">{promo.title}</h2>
            <p className="text-body-sm leading-6 text-muted-foreground">{promo.text}</p>
            <Button asChild size="sm" className="h-10 px-6">
              <Link to="/" search={promo.search} hash="mercado">
                Explorar <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS: { artwork: Artwork; date: string; read: string; title: string; text: string }[] = [
  { artwork: 'ivory', date: '12 de setembro', read: '6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { artwork: 'emerald', date: '13 de setembro', read: '2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { artwork: 'sage', date: '15 de setembro', read: '3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { artwork: 'golden', date: '15 de setembro', read: '2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

/** "Diário da Cunhagem". Editorial pages are out of scope, so "Ler mais" is visibly unavailable. */
export function BlogSection() {
  return (
    <section aria-labelledby="blog-title" className="mx-auto mt-24 max-w-page px-4 md:px-6 xl:px-0">
      <h2 id="blog-title" className="text-center text-heading-lg font-bold text-foreground">
        Diário da Cunhagem
      </h2>
      <p className="mt-2 text-center text-body-sm text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="h-full overflow-hidden rounded-lg bg-surface">
              <div className="aspect-[268/195] overflow-hidden">
                <NftImage artwork={post.artwork} alt="" sizes="(min-width: 1024px) 270px, 50vw" className="h-full rounded-t-lg" />
              </div>
              <div className="space-y-2 p-4">
                <p className="text-caption text-muted-foreground">
                  {post.date} | Leitura de {post.read}
                </p>
                <h3 className="text-body-lg font-bold text-foreground">{post.title}</h3>
                <p className="text-caption-lg leading-5 text-muted-foreground">{post.text}</p>
                <span aria-disabled="true" title="Artigos em breve" className="inline-block cursor-not-allowed text-caption font-bold text-accent">
                  Ler mais → <span className="sr-only">(em breve)</span>
                </span>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
