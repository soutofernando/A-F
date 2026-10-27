import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ChaPanelaList, type PanelaItem } from "./ChaPanelaList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chá de panela · Alicia & Fernando",
  description:
    "Domingo, 1 de novembro, às 16h. Ecovile Residence, Campina Grande.",
  openGraph: {
    title: "Chá de panela · Alicia & Fernando",
    description:
      "Domingo, 1 de novembro, às 16h. Ecovile Residence, Campina Grande.",
    images: [{
      url: "/cha-panela.webp",
      alt: "Convite do chá de panela de Alicia e Fernando",
    }],
  },
};

export default async function ChaDePanelaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("panela_items")
    .select("id, name, display_order, claimed")
    .order("display_order", { ascending: true });

  return (
    <main className="cp">
      <img
        className="cp-invite"
        src="/cha-panela.webp"
        alt="Convite do chá de panela de Alicia e Fernando, domingo 1 de novembro às 16h, Ecovile Residence, Campina Grande."
      />
      <section className="cp-list">
        <h1 className="text-xl text-left">Lista do chá</h1>
        <h2>
          Nosso chá de panela

          Essa lista é apenas uma inspiração, viu? Você pode escolher qualquer
          presente que desejar, ou até mesmo trazer algo diferente que ache que
          combina com a nossa casa!

          O mais importante para nós é ter você pertinho, compartilhando esse
          momento tão especial da nossa história. Sabemos que essa fase dos
          preparativos é maravilhosa, mas também pode ser um pouquinho
          estressante! Por isso, queremos aproveitar cada etapa, dar boas
          risadas, criar memórias e nos divertir muito com vocês.

          Sua presença e seu carinho já são um presente enorme para nós. Então,
          venha de coração aberto, com vontade de celebrar e fazer parte desse
          momento tão lindo das nossas vidas!

          Esperamos você para comemorar com a gente!
        </h2>
        <p className="cp-lead">
          Toque no item que você pretende dar. O nome de quem escolheu não
          aparece aqui.
        </p>
        <div className="cp-enxoval">
          <p>Cores do enxoval</p>
          <ul>
            <li>
              <span className="cp-swatch cp-swatch-cinza" />
              cinza
            </li>
            <li>
              <span className="cp-swatch cp-swatch-branco" />
              branco
            </li>
            <li>
              <span className="cp-swatch cp-swatch-preto" />
              preto
            </li>
          </ul>
        </div>
        <ChaPanelaList initialItems={(data ?? []) as PanelaItem[]} />
      </section>
    </main>
  );
}
