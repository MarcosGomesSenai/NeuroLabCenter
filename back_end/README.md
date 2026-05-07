# Back-end NeuroLab Center

API REST em Python + Flask + MySQL para as regras de negocio do NeuroLab Center.

## Estrutura

- `app.py`: cria a aplicacao Flask e registra as rotas.
- `config.py`: configuracoes por variaveis de ambiente.
- `database/schema.sql`: banco MySQL completo com tabelas, chaves, indices, comentarios e constraints de negocio.
- `database/seed.sql`: dados mock de responsavel, paciente menor, medicos, unidades, convenios, exames, agendamentos e feedback.
- `BUSINESS_RULES.md`: matriz com as 50 regras de negocio implementadas.
- `database/connection.py`: pool de conexao MySQL.
- `database/query_executor.py`: funcoes utilitarias para executar consultas SQL.
- `database/init_db.py`: cria banco/tabelas e popula dados iniciais.
- `routes`: endpoints REST.
- `services`: regras de negocio.
- `utils`: CPF, datas, seguranca, erros e serializacao.

```text
back_end/
├── app.py
├── config.py
├── routes/
│   ├── auth.py
│   ├── usuarios.py
│   ├── pacientes.py
│   ├── agendamentos.py
│   ├── feedback.py
│   └── catalog.py
├── services/
│   ├── auth_service.py
│   ├── paciente_service.py
│   ├── agendamento_service.py
│   ├── feedback_service.py
│   └── catalog_service.py
├── database/
│   ├── connection.py
│   ├── query_executor.py
│   ├── init_db.py
│   ├── schema.sql
│   └── seed.sql
├── tests/
│   └── test_agendamento.py
├── utils/
├── models/
└── requirements.txt
```

## Instalar

```bash
python -m venv back_end\.venv
back_end\.venv\Scripts\activate
pip install -r back_end\requirements.txt
copy back_end\.env.example back_end\.env
```

Edite `.env` com usuario/senha do MySQL.

## Criar banco

```bash
python -m back_end.database.init_db
```

## Rodar API

```bash
python -m back_end.app
```

Padrao: `http://localhost:5000/api`.

## Endpoints principais

### Login

`POST /api/login`

```json
{
  "cpf": "12345678909",
  "senha": "Senha123"
}
```

### Cadastro

`POST /api/usuarios` ou `POST /api/cadastro`

```json
{
  "cpf": "12345678909",
  "nome": "Maria Silva",
  "data_nascimento": "1995-08-20",
  "telefone": "(11) 99999-9999",
  "email": "maria@email.com",
  "senha": "Senha123",
  "tipo_usuario": "paciente"
}
```

Menor de 16 anos exige `cpf_responsavel` ja cadastrado:

```json
{
  "cpf": "98765432100",
  "nome": "Paciente Menor",
  "data_nascimento": "2014-04-10",
  "telefone": "(11) 99999-9999",
  "email": "menor@email.com",
  "senha": "Senha123",
  "tipo_usuario": "paciente",
  "cpf_responsavel": "12345678909"
}
```

### Criar agendamento

`POST /api/agendamentos`

```json
{
  "cpf_cliente": "12345678909",
  "id_medico": 1,
  "id_unidade": 1,
  "data_consulta": "2026-06-10",
  "hora_consulta": "09:00",
  "tipo_consulta": "consulta",
  "tipo_atendimento": "particular"
}
```

Se o paciente for menor, envie `cpf_responsavel`. O status inicial sera `pendente`.

Se o front ainda nao tiver `id_unidade`, pode enviar `cep`; o back-end escolhe uma unidade ativa compativel.

### Consultar disponibilidade

`GET /api/agendamentos/disponibilidade?id_medico=1&id_unidade=1&data=2026-06-10`

Retorna horarios ocupados para o front esconder da agenda.

### Confirmar agendamento de menor

`POST /api/confirmar_agendamento`

```json
{
  "id_agendamento": 12,
  "cpf_responsavel": "12345678909",
  "confirmacao_token": "opcional-se-o-front-usar-link-com-token"
}
```

Para validar o link antes de confirmar:

`GET /api/confirmar_agendamento?id=12&cpf=12345678909&token=...`

### Reagendar

`PUT /api/agendamentos/12`

```json
{
  "cpf_cliente": "12345678909",
  "data_consulta": "2026-06-12",
  "hora_consulta": "10:30"
}
```

### Cancelar

`DELETE /api/agendamentos/12`

```json
{
  "cpf_cliente": "12345678909",
  "motivo": "Nao poderei comparecer"
}
```

Dentro do prazo vira `cancelado`. Fora do prazo vira `falta`.

### Feedback

`POST /api/feedback`

```json
{
  "id_agendamento": 12,
  "cpf_cliente": "12345678909",
  "nota": 5,
  "comentario": "Atendimento excelente."
}
```

Feedback so e aceito para agendamento `confirmado` com data/hora passada. Existe apenas uma avaliacao por agendamento.

## Regras implementadas

- CPF valido e unico.
- Senha com hash bcrypt.
- Menor de 16 anos precisa de responsavel cadastrado.
- Confirmacao de agendamento de menor somente pelo responsavel vinculado.
- SUS somente quando unidade e medico aceitam SUS.
- Convenio somente quando a unidade aceita o convenio informado.
- Teleconsulta somente quando medico/unidade aceitam teleconsulta.
- Slot ativo unico por medico, unidade, data e hora.
- Antecedencia minima por tipo de consulta.
- Limite de reagendamento em 30 dias.
- Cancelamento dentro/fora do prazo.
- Feedback unico por agendamento confirmado com data/hora passada.
