# PiErCe — Especificação da nova UI ("Bagunça 3")

Escopo: redesenhar a interface do PIERCE Music Companion (React 19 + TypeScript + Vite) no modo `expanded`. Não mexer em Spotify, relógio de reprodução nem na letra sincronizada (parseLrc). Só apresentação.
Referência visual: tela "Bagunça 3 (cor por faixa)" do canvas "PiErCe · antes e depois" (link privado do autor). Medidas saem dela (base 1280×760; usar % da área do app).

## 1. Princípio
Bagunça nas bordas, calma no centro. A letra e o player são sempre legíveis. Textura (ASCII, bolinhas, título gigante) fica atrás ou nas margens e nunca cobre a letra.

## 2. Zonas (base 1280×760)
- Bloco do título (cor da faixa): x 40, y 40, 400×300.
- Capa viva (ASCII animado): x 40, y 356, 400×228, contorno 2px tinta.
- Letra: x 500, y 140, largura 740 (zona livre: x 470–1255, y 120–585).
- Notas/comentários: faixa y 498–560, à direita de x 500.
- Dock do player: x 40, y 604, 1200×120, raio 22, contorno 2px, sombra dura 5×6.
- Info pequena (artista, faixa, relógio): canto superior direito, x 1010, y 34.

## 3. Tipografia
- Título da faixa: sans bold tipo Helvetica (Arimo 700), letter-spacing −0.04em, line-height 0.92, 2 linhas dentro do bloco (104px título curto, 78–84px longo; reduzir proporcionalmente).
- Letra: serifa (Instrument Serif), regular, 68px/1.12 na linha atual; passada 24px itálico; próximas 32px e 26px itálico. A fonte da letra DEVE ser diferente da do título.
- Mono para legendas, relógio e etiquetas (DM Mono ou a Space Mono já usada no repo).
- Carregar as fontes novas em src/index.css (ou index.html) via Google Fonts.

## 3.1 Cor por faixa
A cor muda a cada faixa (não por tempo). Tokens CSS no contêiner da tela: --track-bg, --track-a, --track-b, --track-deep, --track-on-a. Transição: `transition: background .8s, color .8s`.
- Novo `src/services/palette/trackPalette.ts` com `getTrackPalette(track): Promise<TrackPalette>` e funções puras testáveis (contraste, escolha de cores).
- Algoritmo: reduzir a capa a 32×32 via canvas, quantizar; `a` = cor mais saturada; `b` = segunda cor com diferença de matiz > 60° (senão o complemento); `bg` = tom neutro claro (L 90–94%, S < 10%) do matiz da capa; `deep` = `a` escurecida até contraste ≥ 4.5 sobre `bg`; `onA` = branco ou #14142b (maior contraste sobre `a`).
- Fallback (sem capa ou erro de CORS): matiz de `a` por hash do id da faixa.
- Exemplos do mock: vermelho #e8262d / azul #2f46d9 / bg #e8e6e1; amarelo #ffd23f / marinho #1a2a6c / bg #e6ecf4; rosa #ff3d8b / roxo #5a2fd1 / bg #ece6ee. Texto sobre `a` amarelo usa tinta escura.

## 4. Fundo
- Grão fino sobre o bg: pontos de 4px, rgba(20,20,43,.14).
- Título do app ao fundo: "Pi" e "ErCe" em serifa itálica gigante. "Pi": left 23.4%, top −19.7%, fonte 68% da altura, cor `a`. "ErCe": left 36.7%, top 43.4%, fonte 50% da altura, cor `b`. Opacidade por `--title-bg-opacity` (padrão 0.8). Sobre "ErCe", faixa de linhas finas: repeating-linear-gradient(bg+alpha 0 3px, transparent 3px 10px) de left 36.7% até a borda e de top 56.6% até o fim.
- Vinheta ASCII: dois canvases em camada (cor `b` a 50%, cor `deep` a 55%) com caracteres `ÆÉL5%#+i,'.:*Ü8`, limiar de ruído 0.30 e 0.36, 2 quadros/s com deriva lenta. Máscara radial: `radial-gradient(ellipse 46% 44% at 66% 42%, transparent 48%, #000 100%)`, deixando o centro (letra) limpo. Desenhar em canvas (adaptar PierceAsciiField), não em DOM.

## 5. Bloco do título e capa viva
- Bloco: fundo `a`, pontos de meio-tom brancos (6px, máscara que some para baixo), título em `onA`, legenda "artista / faixa NN · ano · álbum" no rodapé (usar dados reais da faixa, sem inventar).
- Capa viva: campo ASCII animado (rampa ` .·:+*#@`) com soma de senos + onda radial; semente muda por faixa; amplitude acompanha o tempo. Selo "CAPA VIVA". Substitui qualquer imagem estática.

## 6. Letra
- Estados por palavra (caixa): já cantada = fundo `a`, texto `onA`; atual = fundo tinta (#14142b), texto branco; próxima = fundo branco, texto `deep`; demais = sem caixa, com halo (`text-shadow` na cor do bg).
- Sem dados por palavra: distribuir as palavras de cada LyricLine proporcionalmente entre startMs e endMs.
- Linhas anterior, atual e próximas em camadas. Manter a rolagem automática da linha atual.

## 7. Bolinhas com palavras da música
- Componente `WordDots`: ~30 bolinhas (14–26px) com rótulo de 13px. Palavras de currentTrack.lyrics: tokenizar, remover stopwords (pt e en), manter 4+ letras, ordenar por frequência e sortear entre as melhores. Sem letra: palavras do título e do artista. Algumas bolinhas sem rótulo.
- Posição por hash do id da faixa, com rejeição nas zonas protegidas (letra, dock, info, notas). Mais bolinhas à esquerda (cores `b` e tinta, rótulo branco).
- Animação: flutuar ±7px (2.6–4.6s, atraso aleatório). Cores: `a`, `b` e tinta.

## 8. Notas (comentários)
Cada nota é uma etiqueta rotacionada (−2° a +2°), sombra dura 3×3 em tinta. Fontes:
1. Notas do usuário, locais (chave `pierce:notes:<trackId>`, itens `{ ms, text }`).
2. Ficha técnica do MusicBrainz (produtor, estúdio, ano).
3. Anotações do Genius (opcional; checar termos de uso).
4. Leitura escrita por IA (opcional, sempre rotulada como gerada).
Mostrar até 3 notas, as mais próximas do tempo atual. Os textos do mock são exemplos.

## 9. Dock do player (zona calma)
Painel claro (rgba(251,250,246,.96)). Da esquerda para a direita: mascote `(◕‿◕)` que balança e solta ♪/♫; título e artista + 3 bolinhas "cor da faixa"; progresso em 54 bolinhas (tocadas = `a`, a atual quica); 12 barras de equalizador; controles redondos de 42px com play de 62px em `a`, pulsando. Adaptar PierceWaveProgress e PixelPlayButton.

## 10. Animações de "play"
Palavra atual percorre a letra; bolinha de progresso quica; mascote e notas; barras do EQ; play pulsa. Só rodam tocando; em pausa, congelar. Respeitar `prefers-reduced-motion` (sem animação; a paleta troca sem transição).

## 11. Acessibilidade
Contraste ≥ 4.5 para texto pequeno. Elementos decorativos com aria-hidden. Botões reais com aria-label.

## 12. Arquivos
Novos: src/services/palette/trackPalette.ts (+ teste), src/components/colagem/{AsciiVignette,LiveCover,WordDots,TrackNotes,PlayDock}.tsx.
Editar: src/index.css, src/types/index.ts (TrackPalette), src/App.tsx, src/components/ExpandedMode.tsx, PierceAsciiField.tsx, PierceWaveProgress.tsx, PixelPlayButton.tsx, TrackStickers.tsx.

## 13. PRs sugeridos (um por assunto)
1. Paleta por faixa e tokens CSS.
2. Tipografia, título gigante ao fundo e vinheta ASCII.
3. Dock do player.
4. Bolinhas com palavras, capa viva e notas.
Cada PR: lint e testes passando; nada de .env, tokens ou .aistudio.

## 14. Aceite
- A cor muda ao trocar de faixa, com transição.
- Título e letra em fontes diferentes.
- "Pi/ErCe" ao fundo, como na referência.
- ASCII e bolinhas não cobrem a letra.
- O player funciona sem depender de animação.
