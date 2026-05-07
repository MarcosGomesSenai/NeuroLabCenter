# NeuroLab Center

Projeto reorganizado em uma estrutura inspirada em MVC.

## Estrutura

- `app/views`: paginas HTML do site, como `index.html`, `agendamento.html` e `teleconsulta.html`.
- `assets/css/style.css`: arquivo principal de estilos. Ele importa os arquivos menores de CSS.
- `assets/css/base.css`: variaveis, reset e estilos globais.
- `assets/css/components.css`: botoes, cards, modais e componentes reutilizaveis.
- `assets/css/pages.css`: estilos das paginas institucionais.
- `assets/css/booking.css` e `assets/css/scheduling.css`: estilos de agendamento.
- `assets/css/responsive.css`: ajustes mobile e responsivos.
- `assets/js/shared`: funcoes compartilhadas, como toast, chat, busca, mapa e autenticacao visual.
- `assets/js/app`: estado da aplicacao, formularios, login, cadastro, agenda e dashboard.
- `assets/js/data`: dados fixos de clinicas, medicos, unidades e planos.
- `assets/js/pages`: scripts especificos de paginas.
- `assets/js/features`: funcionalidades maiores, como busca de agendamento, autocomplete e atalhos.
- `assets/js/init`: arquivos de inicializacao.
- `assets/img`: imagens usadas pelo site.
- `apis`: API local Node/Express em estrutura de rotas, controllers, models e config.
- `back_end`: API principal Python/Flask + MySQL com regras de negocio.
- `tools`: scripts auxiliares e versoes antigas guardadas como referencia.

Abra `index.html` na raiz ou `app/views/index.html` diretamente.
