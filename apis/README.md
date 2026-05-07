# APIs da NeuroLab Center

API local para conectar o chat do site com IA Llama/Ollama.

## Estrutura MVC

- `server.js`: entrada da API.
- `src/app.js`: configura Express, CORS, JSON e rotas.
- `src/config`: configuracoes de CORS e Ollama.
- `src/routes`: definicao das rotas HTTP.
- `src/controllers`: validacao da requisicao e resposta.
- `src/models`: comunicacao com o modelo local.

## Como usar

1. Abra o Ollama/Llama no computador.
2. Instale as dependencias:

```bash
cd apis
npm install
```

3. Rode a API:

```bash
npm start
```

4. Abra o site pela raiz `index.html` ou diretamente em `app/views/index.html`.

## Modelo

Por padrao usa:

```bash
llama3.1
```

Para trocar:

```bash
OLLAMA_MODEL=llama3 npm start
```

A API fica em:

```bash
http://localhost:3001/api/chat
```
