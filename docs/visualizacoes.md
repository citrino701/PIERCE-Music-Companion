# Visualizações e layouts

O modo "Tela cheia" mostra uma **visualização** (hoje só a *Colagem*, a Bagunça 3) em um **layout** que depende do tamanho da janela.

## Layouts
`src/services/colagem/layout.ts` decide o layout (função `resolveLayout`):

| Layout | Quando | O que é |
| --- | --- | --- |
| `full` | janela ≥ 1000 px de largura e mais larga que alta | composição completa 1280×760, escalada |
| `reading` | janela pequena (padrão) | faixa fina de título + letra enorme + player enxuto |
| `stacked` | janela pequena (opção) | bloco de título + capa, letra, player em duas linhas |

O menu (botão ☰ no canto superior esquerdo) permite forçar o layout, ligar/desligar elementos
(título, capa viva, bolinhas, ASCII, Pi/ErCe, notas), usar presets (Completo/Leitura/Mínimo) e mudar o
tamanho da letra (80–140%). Tudo fica salvo em `localStorage` na chave `pierce:view`.

## Adicionar uma visualização totalmente diferente
1. Crie `src/components/colagem/views/MinhaView.tsx` (ou outra pasta) com um componente `React.FC<StageViewProps>`
   (`views/types.ts`). Ele recebe a faixa, progresso, letra ativa, controles e o layout/elementos escolhidos.
   Ocupe o pai com `position: absolute; inset: 0`. Ignore o `layout` se a visualização não tiver variantes.
2. Registre em `views/registry.ts`:
   ```ts
   { id: 'minha', label: 'Minha view', description: '...', Component: MinhaView }
   ```
   O `id` fica salvo nas preferências: nunca renomeie depois de publicado.
3. Com 2+ visualizações o seletor aparece sozinho no menu.

Para novos elementos liguáveis, adicione a chave em `StageElements`/`ELEMENT_LABELS`/`DEFAULT_ELEMENTS` em `layout.ts`.
