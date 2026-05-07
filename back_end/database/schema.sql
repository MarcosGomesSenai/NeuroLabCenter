CREATE DATABASE IF NOT EXISTS neurolabcenter
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE neurolabcenter;

CREATE TABLE IF NOT EXISTS usuarios (
    id               INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador interno do usuario',
    cpf              VARCHAR(11) NOT NULL COMMENT 'CPF unico do usuario, salvo somente com numeros',
    nome             VARCHAR(120) NOT NULL COMMENT 'Nome completo do usuario',
    telefone         VARCHAR(20) COMMENT 'Telefone de contato',
    email            VARCHAR(120) NOT NULL COMMENT 'Email para contato, notificacoes e recuperacao de acesso',
    senha_hash       VARCHAR(255) NOT NULL COMMENT 'Hash da senha, nunca texto puro',
    tipo_usuario     ENUM('paciente', 'responsavel', 'medico', 'recepcionista', 'admin') NOT NULL DEFAULT 'paciente' COMMENT 'Perfil de acesso do usuario',
    data_cadastro    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de cadastro no sistema',
    ativo            BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica se o usuario esta ativo',

    UNIQUE KEY uk_usuarios_cpf (cpf),
    INDEX idx_usuarios_email (email),
    INDEX idx_usuarios_tipo_usuario (tipo_usuario),
    INDEX idx_usuarios_ativo (ativo)
) COMMENT 'Usuarios do sistema, com autenticacao principal por CPF';

CREATE TABLE IF NOT EXISTS pacientes (
    id                     INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador interno do paciente',
    cpf                    VARCHAR(11) NOT NULL COMMENT 'CPF do paciente vinculado a usuarios.cpf',
    nome                   VARCHAR(120) NOT NULL COMMENT 'Nome do paciente',
    data_nascimento        DATE NOT NULL COMMENT 'Data de nascimento usada para regra de menor de idade',
    cpf_responsavel        VARCHAR(11) COMMENT 'CPF do responsavel legal quando o paciente for menor',
    criado_em              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criacao do registro',
    atualizado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da ultima atualizacao',

    UNIQUE KEY uk_pacientes_cpf (cpf),
    INDEX idx_pacientes_responsavel (cpf_responsavel),
    INDEX idx_pacientes_data_nascimento (data_nascimento),
    CONSTRAINT fk_pacientes_usuario
        FOREIGN KEY (cpf) REFERENCES usuarios(cpf)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_pacientes_responsavel
        FOREIGN KEY (cpf_responsavel) REFERENCES usuarios(cpf)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_paciente_responsavel_diferente
        CHECK (cpf_responsavel IS NULL OR cpf_responsavel <> cpf)
) COMMENT 'Pacientes atendidos pelo NeuroLabCenter, incluindo menores vinculados a responsavel';

CREATE TABLE IF NOT EXISTS unidades (
    id            INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador interno da unidade',
    nome          VARCHAR(150) NOT NULL COMMENT 'Nome da unidade',
    endereco      VARCHAR(220) NOT NULL COMMENT 'Endereco completo da unidade',
    cidade        VARCHAR(100) NOT NULL COMMENT 'Cidade da unidade',
    cep           VARCHAR(8) NOT NULL COMMENT 'CEP da unidade, salvo somente com numeros',
    telefone      VARCHAR(20) COMMENT 'Telefone da unidade',
    horario_ini   TIME NOT NULL COMMENT 'Inicio do horario de atendimento',
    horario_fim   TIME NOT NULL COMMENT 'Fim do horario de atendimento',
    aceita_sus    BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica se a unidade aceita SUS',
    ativo         BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica se a unidade esta ativa',

    INDEX idx_unidades_cep (cep),
    INDEX idx_unidades_cidade (cidade),
    INDEX idx_unidades_ativo (ativo),
    INDEX idx_unidades_aceita_sus (aceita_sus),
    CONSTRAINT chk_unidades_horario
        CHECK (horario_ini < horario_fim)
) COMMENT 'Unidades fisicas ou virtuais disponiveis para agendamento';

CREATE TABLE IF NOT EXISTS convenios (
    id             INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador interno do convenio',
    nome           VARCHAR(120) NOT NULL COMMENT 'Nome do convenio',
    ativo          BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica se o convenio esta ativo',

    UNIQUE KEY uk_convenios_nome (nome),
    INDEX idx_convenios_ativo (ativo)
) COMMENT 'Convenios aceitos pelo NeuroLabCenter';

CREATE TABLE IF NOT EXISTS unidades_convenios (
    id_unidade      INT NOT NULL COMMENT 'Unidade que aceita o convenio',
    id_convenio     INT NOT NULL COMMENT 'Convenio aceito pela unidade',

    PRIMARY KEY (id_unidade, id_convenio),
    INDEX idx_unidades_convenios_convenio (id_convenio),
    CONSTRAINT fk_unidades_convenios_unidade
        FOREIGN KEY (id_unidade) REFERENCES unidades(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_unidades_convenios_convenio
        FOREIGN KEY (id_convenio) REFERENCES convenios(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) COMMENT 'Relacionamento N para N entre unidades e convenios';

CREATE TABLE IF NOT EXISTS exames (
    id                   INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador interno do exame',
    nome                 VARCHAR(120) NOT NULL COMMENT 'Nome do exame neurologico',
    descricao            TEXT COMMENT 'Descricao do exame',
    preparo_recomendado  TEXT COMMENT 'Orientacoes de preparo para o paciente',
    duracao_minutos      INT COMMENT 'Duracao media do exame em minutos',
    ativo                BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica se o exame esta ativo',

    UNIQUE KEY uk_exames_nome (nome),
    INDEX idx_exames_ativo (ativo),
    CONSTRAINT chk_exames_duracao
        CHECK (duracao_minutos IS NULL OR duracao_minutos > 0)
) COMMENT 'Exames neurologicos disponiveis para agendamento';

CREATE TABLE IF NOT EXISTS medicos (
    id             INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador interno do medico',
    id_usuario     INT NOT NULL COMMENT 'Usuario vinculado ao medico',
    crm            VARCHAR(30) NOT NULL COMMENT 'CRM do medico',
    especialidade  VARCHAR(120) NOT NULL COMMENT 'Especialidade principal do medico',
    ativo          BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica se o medico esta ativo',

    UNIQUE KEY uk_medicos_usuario (id_usuario),
    UNIQUE KEY uk_medicos_crm (crm),
    INDEX idx_medicos_especialidade (especialidade),
    INDEX idx_medicos_ativo (ativo),
    CONSTRAINT fk_medicos_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) COMMENT 'Medicos disponiveis para consultas, exames e teleconsultas';

CREATE TABLE IF NOT EXISTS medicos_unidades (
    id_medico            INT NOT NULL COMMENT 'Medico autorizado na unidade',
    id_unidade           INT NOT NULL COMMENT 'Unidade onde o medico atende',
    aceita_particular    BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica atendimento particular',
    aceita_convenio      BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica atendimento por convenio',
    aceita_sus           BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Indica atendimento SUS',
    aceita_teleconsulta  BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Indica se permite teleconsulta',
    ativo                BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica se o vinculo medico-unidade esta ativo',

    PRIMARY KEY (id_medico, id_unidade),
    INDEX idx_medicos_unidades_unidade (id_unidade),
    INDEX idx_medicos_unidades_ativo (ativo),
    CONSTRAINT fk_medicos_unidades_medico
        FOREIGN KEY (id_medico) REFERENCES medicos(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_medicos_unidades_unidade
        FOREIGN KEY (id_unidade) REFERENCES unidades(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) COMMENT 'Vinculo entre medicos e unidades, com regras de atendimento por unidade';

CREATE TABLE IF NOT EXISTS agendamentos (
    id                          INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador interno do agendamento',
    id_paciente                 INT NOT NULL COMMENT 'Paciente do agendamento',
    id_medico                   INT NOT NULL COMMENT 'Medico do agendamento',
    id_unidade                  INT NOT NULL COMMENT 'Unidade do agendamento',
    id_convenio                 INT NULL COMMENT 'Convenio usado quando tipo_atendimento for convenio',
    id_exame                    INT NULL COMMENT 'Exame vinculado quando tipo_consulta for exame',
    data_consulta               DATE NOT NULL COMMENT 'Data da consulta, exame ou teleconsulta',
    hora_consulta               TIME NOT NULL COMMENT 'Horario da consulta, exame ou teleconsulta',
    tipo_consulta               ENUM('consulta', 'exame', 'teleconsulta') NOT NULL COMMENT 'Tipo de servico agendado',
    tipo_atendimento            ENUM('convenio', 'particular', 'sus') NOT NULL COMMENT 'Forma de atendimento, sem acento para manter consistencia com a API',
    status                      ENUM('pendente', 'confirmado', 'cancelado', 'expirado', 'falta', 'aprovacao_manual') NOT NULL DEFAULT 'pendente' COMMENT 'Status atual do agendamento',
    observacao                  TEXT COMMENT 'Observacoes internas ou enviadas pelo paciente',
    cpf_responsavel_confirmacao VARCHAR(11) COMMENT 'CPF do responsavel autorizado para confirmar agendamento de menor',
    confirmacao_token           CHAR(36) COMMENT 'Token enviado no link de confirmacao do responsavel',
    confirmacao_expira_em       DATETIME COMMENT 'Data e hora de expiracao da confirmacao do responsavel',
    confirmado_em               DATETIME COMMENT 'Data e hora da confirmacao',
    cancelado_em                DATETIME COMMENT 'Data e hora do cancelamento ou falta',
    reagendamentos_count        INT NOT NULL DEFAULT 0 COMMENT 'Quantidade de reagendamentos feitos neste agendamento',
    ultimo_reagendamento_em     DATETIME COMMENT 'Data do ultimo reagendamento',
    criado_em                   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criacao do agendamento',
    atualizado_em               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da ultima atualizacao',
    slot_ativo                  VARCHAR(190) GENERATED ALWAYS AS (
        CASE
            WHEN status IN ('pendente', 'confirmado')
            THEN CONCAT(id_unidade, '-', id_medico, '-', CAST(data_consulta AS CHAR), '-', CAST(hora_consulta AS CHAR))
            ELSE NULL
        END
    ) STORED COMMENT 'Chave calculada para impedir conflito somente em horarios ativos',

    UNIQUE KEY uk_agendamento (slot_ativo),
    INDEX idx_agendamentos_paciente (id_paciente),
    INDEX idx_agendamentos_data_unidade (data_consulta, id_unidade),
    INDEX idx_agendamentos_data_medico (data_consulta, id_medico),
    INDEX idx_agendamentos_hora (hora_consulta),
    INDEX idx_agendamentos_unidade (id_unidade),
    INDEX idx_agendamentos_medico (id_medico),
    INDEX idx_agendamentos_status (status),
    INDEX idx_agendamentos_tipo_atendimento (tipo_atendimento),
    INDEX idx_agendamentos_confirmacao (cpf_responsavel_confirmacao, confirmacao_token),
    CONSTRAINT fk_agendamentos_paciente
        FOREIGN KEY (id_paciente) REFERENCES pacientes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_agendamentos_medico
        FOREIGN KEY (id_medico) REFERENCES medicos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_agendamentos_unidade
        FOREIGN KEY (id_unidade) REFERENCES unidades(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_agendamentos_convenio
        FOREIGN KEY (id_convenio) REFERENCES convenios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_agendamentos_exame
        FOREIGN KEY (id_exame) REFERENCES exames(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_agendamentos_reagendamentos
        CHECK (reagendamentos_count >= 0)
) COMMENT 'Agendamentos de consultas, exames e teleconsultas';

CREATE TABLE IF NOT EXISTS exames_agendamentos (
    id_agendamento  INT NOT NULL COMMENT 'Agendamento vinculado ao exame',
    id_exame        INT NOT NULL COMMENT 'Exame vinculado ao agendamento',

    PRIMARY KEY (id_agendamento, id_exame),
    INDEX idx_exames_agendamentos_exame (id_exame),
    CONSTRAINT fk_exames_agendamentos_agendamento
        FOREIGN KEY (id_agendamento) REFERENCES agendamentos(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_exames_agendamentos_exame
        FOREIGN KEY (id_exame) REFERENCES exames(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) COMMENT 'Relacionamento opcional para agendamentos com mais de um exame';

CREATE TABLE IF NOT EXISTS agendamento_eventos (
    id              INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador interno do evento',
    id_agendamento  INT NOT NULL COMMENT 'Agendamento relacionado ao evento',
    tipo_evento      ENUM('criado', 'confirmado', 'reagendado', 'cancelado', 'falta', 'expirado', 'feedback') NOT NULL COMMENT 'Tipo do evento no historico',
    cpf_autor        VARCHAR(11) COMMENT 'CPF de quem realizou a acao',
    detalhe          TEXT COMMENT 'Detalhe livre sobre o evento',
    criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criacao do evento',

    INDEX idx_eventos_autor_data (cpf_autor, criado_em),
    INDEX idx_eventos_agendamento (id_agendamento),
    INDEX idx_eventos_tipo (tipo_evento),
    CONSTRAINT fk_eventos_agendamento
        FOREIGN KEY (id_agendamento) REFERENCES agendamentos(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) COMMENT 'Historico de eventos dos agendamentos';

CREATE TABLE IF NOT EXISTS feedback (
    id               INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador interno do feedback',
    id_agendamento   INT NOT NULL COMMENT 'Agendamento avaliado',
    nota             TINYINT NOT NULL COMMENT 'Nota de 1 a 5',
    comentario       TEXT COMMENT 'Comentario opcional do paciente',
    data_feedback    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de envio do feedback',

    UNIQUE KEY uk_feedback_agendamento (id_agendamento),
    INDEX idx_feedback_nota (nota),
    INDEX idx_feedback_data (data_feedback),
    CONSTRAINT fk_feedback_agendamento
        FOREIGN KEY (id_agendamento) REFERENCES agendamentos(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chk_feedback_nota
        CHECK (nota BETWEEN 1 AND 5)
) COMMENT 'Feedback dos pacientes, limitado a uma avaliacao por agendamento';

CREATE TABLE IF NOT EXISTS notificacoes (
    id              INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador interno da notificacao',
    id_usuario      INT COMMENT 'Usuario destinatario da notificacao',
    canal           ENUM('email', 'sms', 'whatsapp', 'sistema') NOT NULL DEFAULT 'sistema' COMMENT 'Canal de envio',
    titulo          VARCHAR(160) NOT NULL COMMENT 'Titulo curto da notificacao',
    mensagem        TEXT NOT NULL COMMENT 'Mensagem da notificacao',
    status          ENUM('pendente', 'enviada', 'erro') NOT NULL DEFAULT 'pendente' COMMENT 'Status de envio',
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criacao',
    enviado_em      DATETIME COMMENT 'Data de envio',

    INDEX idx_notificacoes_usuario (id_usuario),
    INDEX idx_notificacoes_status (status),
    CONSTRAINT fk_notificacoes_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) COMMENT 'Notificacoes geradas por confirmacao, cancelamento e avisos do sistema';
