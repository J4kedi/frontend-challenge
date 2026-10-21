import { Link } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { BrandIcon, type Brand } from '@/components/icons/BrandIcon'
import { COLLECTION_LABEL, type Collection } from '@/contracts/nft'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const FOOTER_COLLECTIONS: Collection[] = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'utilidade']
const SOCIALS: { brand: Brand; label: string }[] = [
  { brand: 'facebook', label: 'Facebook' },
  { brand: 'instagram', label: 'Instagram' },
  { brand: 'twitter', label: 'Twitter' },
  { brand: 'linkedin', label: 'LinkedIn' },
  { brand: 'youtube', label: 'YouTube' },
]

/** Links outside the challenge scope stay visible (Figma) but are not interactive. */
function Soon({ children }: { children: string }) {
  return (
    <span aria-disabled="true" title="Em breve" className="cursor-not-allowed">
      {children}
    </span>
  )
}

export function SiteFooter() {
  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    toast.info('A newsletter não faz parte desta demonstração: nenhum e-mail foi cadastrado.')
  }

  return (
    <footer className="mt-24 hidden md:block">
      <div className="mx-auto max-w-page px-6 xl:px-0">
        <div className="grid grid-cols-3 gap-0 rounded-t-lg bg-surface px-12 py-8 shadow-overlay lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="border-r border-primary pr-6 not-first:pl-4">
              <span
                aria-hidden="true"
                className="mb-4 grid size-18 place-items-center rounded-full bg-primary text-title font-bold text-ink"
              >
                {feature.letter}
              </span>
              <h2 className="text-title-sm font-bold text-foreground">{feature.title}</h2>
              <p className="mt-2 text-body-sm leading-[22px] text-muted-foreground">{feature.text}</p>
            </div>
          ))}
          <form className="col-span-3 mt-8 max-w-md lg:col-span-1 lg:mt-0 lg:max-w-none lg:pl-4" onSubmit={subscribe} aria-labelledby="newsletter-title">
            <h2 id="newsletter-title" className="text-title-sm leading-4 font-bold text-foreground">
              Antecipe-se ao próximo lançamento
            </h2>
            <div className="mt-4 flex">
              <label htmlFor="newsletter-email" className="sr-only">
                E-mail para a newsletter
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="digite seu e-mail..."
                className="h-10 min-w-0 flex-1 rounded-l-sm bg-surface-dark px-3 text-body-sm text-foreground placeholder:text-muted-foreground"
              />
              <button type="submit" className="h-10 rounded-r-sm bg-primary px-4 text-title-sm font-bold text-ink">
                Enviar
              </button>
            </div>
            <p className="mt-4 text-caption-lg text-muted-foreground">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </form>
        </div>

        <div className="grid grid-cols-4 items-center bg-surface-dark px-8 py-8 text-body-sm text-foreground">
          <span className="font-bold tracking-wide">KURIO</span>
          <span>Feito para colecionadores, criadores e cultura</span>
          <span>contato@email.com</span>
          <span>+55 11 4002 8922</span>
        </div>

        <div className="grid grid-cols-4 bg-surface px-8 py-8">
          <nav aria-labelledby="footer-profile">
            <h2 id="footer-profile" className="text-title-sm font-bold text-foreground">
              Meu perfil
            </h2>
            <ul className="mt-2 space-y-2 text-body-sm text-foreground">
              <li>
                <Link to="/profile" className="hover:text-accent">
                  Meu perfil
                </Link>
              </li>
              <li>
                <Soon>Minha coleção</Soon>
              </li>
              <li>
                <Soon>Atividade</Soon>
              </li>
              <li>
                <Soon>Estúdio do criador</Soon>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-accent">
                  Lista de interesse
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-help">
            <h2 id="footer-help" className="text-title-sm font-bold text-foreground">
              Central de ajuda
            </h2>
            <ul className="mt-2 space-y-2 text-body-sm text-foreground">
              {['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map(
                (label) => (
                  <li key={label}>
                    <Soon>{label}</Soon>
                  </li>
                ),
              )}
            </ul>
          </nav>
          <nav aria-labelledby="footer-collections">
            <h2 id="footer-collections" className="text-title-sm font-bold text-foreground">
              Coleções
            </h2>
            <ul className="mt-2 space-y-2 text-body-sm text-foreground">
              {FOOTER_COLLECTIONS.map((collection) => (
                <li key={collection}>
                  <Link to="/" search={{ collections: [collection] }} hash="mercado" className="hover:text-accent">
                    {COLLECTION_LABEL[collection]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="text-title-sm font-bold text-foreground">Redes sociais</h2>
            <ul className="mt-2 flex gap-2" aria-label="Redes sociais (em breve)">
              {SOCIALS.map((social) => (
                <li key={social.brand}>
                  <span
                    aria-disabled="true"
                    title={`${social.label} (em breve)`}
                    className="grid size-8 place-items-center rounded-sm border border-primary text-primary"
                  >
                    <BrandIcon brand={social.brand} className="size-4" />
                    <span className="sr-only">{social.label}</span>
                  </span>
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-title-sm font-bold text-foreground">Carteiras compatíveis</h2>
            <p className="mt-2 inline-flex rounded-sm border border-border-soft bg-surface-dark px-2.5 py-1.5 text-micro font-bold tracking-wide text-accent">
              METAMASK • WALLETCONNECT • COINBASE
            </p>
          </div>
        </div>
        <p className="bg-ink py-4 text-center text-body-sm text-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}
