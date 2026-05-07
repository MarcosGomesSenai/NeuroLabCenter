# Organizacao do JavaScript

Os arquivos foram nomeados para facilitar a busca pelo assunto:

- `shared/toast.js`: notificacoes visuais.
- `shared/auth-header.js`: header dinamico, logout e guarda de agendamento.
- `shared/address-search.js`: CEP, endereco, ViaCEP e busca de unidades.
- `shared/medical-chat.js`: chat de duvidas com IA local.
- `app/state-storage.js`: chaves do localStorage, helpers e estado global.
- `app/forms-auth.js`: login, cadastro, mascaras e validacoes.
- `app/booking-flow.js`: fluxo classico de agendamento.
- `data/clinic-data.js`: unidades, medicos e planos.
- `pages/*.js`: ajustes especificos de paginas.
- `features/booking-*.js`: versoes e melhorias do agendamento.
- `features/address-autocomplete.js`: autocomplete de endereco e distancia.
- `init/*.js`: inicializacao e eventos de carregamento.

Os HTMLs carregam os scripts nessa ordem porque o projeto usa funcoes globais chamadas por `onclick` no proprio HTML.
