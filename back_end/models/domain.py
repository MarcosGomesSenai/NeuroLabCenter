from dataclasses import dataclass
from datetime import date, time
from typing import Optional


@dataclass(frozen=True)
class AppointmentRequest:
    cpf_cliente: str
    id_medico: int
    id_unidade: int
    data_consulta: date
    hora_consulta: time
    tipo_consulta: str
    tipo_atendimento: str
    cpf_responsavel: Optional[str] = None
    id_convenio: Optional[int] = None
    id_exame: Optional[int] = None
