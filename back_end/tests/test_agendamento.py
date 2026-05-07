import unittest

try:
    from back_end.app import create_app
except ModuleNotFoundError as error:
    create_app = None
    IMPORT_ERROR = error
else:
    IMPORT_ERROR = None


@unittest.skipIf(create_app is None, f"Dependencia ausente: {IMPORT_ERROR}")
class AgendamentoRoutesTest(unittest.TestCase):
    def setUp(self):
        self.app = create_app()

    def test_rotas_de_agendamento_registradas(self):
        rotas = {rule.rule for rule in self.app.url_map.iter_rules()}

        self.assertIn("/api/agendamentos", rotas)
        self.assertIn("/api/agendamentos/disponibilidade", rotas)
        self.assertIn("/api/agendamentos/<int:appointment_id>", rotas)
        self.assertIn("/api/confirmar_agendamento", rotas)


if __name__ == "__main__":
    unittest.main()
