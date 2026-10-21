import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRightIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import type { Artwork } from '@/contracts/nft'
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query'
import { cn } from '@/shared/lib/cn'
import { NftImage } from './NftImage'

/** Editorial hero of the home (Figma "Hero"). Static marketing copy, three slides, no autoplay. */
const SLIDES: { artwork: Artwork; title: string; text: string }[] = [
  {
    artwork: 'emerald',
    title: 'Seja dono do futuro da arte digital',
    text: 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
  },
  {
    artwork: 'golden',
    title: 'Lançamentos que soam como coleção',
    text: 'Edições gênesis direto dos criadores, com procedência verificada e acesso para colecionadores antes da revelação pública.',
  },
  {
    artwork: 'ivory',
    title: 'Arte rara, propriedade verificada',
    text: 'Cada obra chega com contrato inteligente verificado e histórico completo de procedência na rede.',
  },
]

export function HomeHero() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]!
  // One layout in the DOM: a hidden one would still download its priority art
  // (the 1080 px desktop file on a phone) and compete with the LCP image.
  const desktop = useMediaQuery(DESKTOP_QUERY)

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques da Kurio" className="mx-auto max-w-page px-4 md:px-6 xl:px-0">
      {desktop ? (
        <div className="grid min-h-112 grid-cols-[1fr_450px] items-center gap-10 pt-8">
          <div className="relative self-stretch pt-12 lg:pl-10">
            <p className="text-body-sm font-medium text-foreground">Bem-vindo à Kurio</p>
            <h1 className="mt-4 max-w-xl text-display font-bold text-balance text-foreground uppercase lg:text-display-lg">{slide.title}</h1>
            <p className="mt-4 max-w-xl text-body-sm leading-6 text-muted-foreground">{slide.text}</p>
            <Button asChild className="mt-8 w-35 uppercase">
              <Link to="/" hash="mercado">
                Explorar
              </Link>
            </Button>
            <SlideDots index={index} onSelect={setIndex} className="absolute right-0 bottom-12" />
          </div>
          <div className="overflow-hidden rounded-xl">
            <NftImage artwork={slide.artwork} alt="" sizes="450px" priority={index === 0} />
          </div>
        </div>
      ) : (
        // Mobile (Figma "Hero Banner"): two decorative circles, the slide art and a smaller one over its corner
        <div className="relative mt-4 flex min-h-47.5 overflow-hidden rounded-[30px] bg-linear-to-br from-primary/20 to-primary/10 px-4 pt-1.5 pb-7">
          <div aria-hidden="true" className="absolute -top-8 -left-20 size-62 rounded-full bg-linear-to-b from-accent/40 to-primary/5" />
          <div aria-hidden="true" className="absolute -top-2.5 left-18 size-62 rounded-full bg-linear-to-b from-accent/35 to-transparent" />
          <div className="relative z-10 flex-1 pr-2">
            <p className="text-caption font-medium text-foreground">Bem-vindo à Kurio</p>
            <h1 className="mt-1.5 text-title-sm leading-[29px] font-bold text-foreground uppercase">
              Seja dono da <br />
              cultura digital
            </h1>
            <p className="mt-1.5 text-caption leading-[18px] text-muted-foreground">Descubra NFTs selecionados de criadores do mundo todo.</p>
            <Link to="/" hash="mercado" className="inline-flex items-center gap-2 text-caption font-bold text-accent uppercase">
              Explorar <ArrowRightIcon className="size-4 text-primary" />
            </Link>
          </div>
          <div className="relative mt-1 h-fit w-34.5 shrink-0 max-[359px]:w-28">
            <NftImage artwork={slide.artwork} alt="" sizes="138px" priority={index === 0} className="rounded-xl" />
            <div className="absolute top-[64%] left-3.5 w-[42%] overflow-hidden rounded-xl">
              <NftImage artwork="sage" alt="" sizes="58px" />
            </div>
          </div>
          <SlideDots index={index} onSelect={setIndex} className="absolute bottom-0.5 left-1/2 -translate-x-1/2" />
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        Destaque {index + 1} de {SLIDES.length}
      </p>
    </section>
  )
}

function SlideDots({ index, onSelect, className }: { index: number; onSelect: (i: number) => void; className?: string }) {
  return (
    <div className={cn('flex', className)}>
      {SLIDES.map((s, i) => (
        <button
          key={s.artwork}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Mostrar destaque ${i + 1} de ${SLIDES.length}`}
          aria-current={i === index ? 'true' : undefined}
          className="group grid h-6 min-w-6 place-items-center"
        >
          <span aria-hidden="true" className={cn('h-2 rounded-full transition-all', i === index ? 'w-5 bg-primary' : 'w-2 bg-primary/60 group-hover:bg-primary')} />
        </button>
      ))}
    </div>
  )
}
