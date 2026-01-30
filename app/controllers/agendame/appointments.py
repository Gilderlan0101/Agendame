from datetime import datetime, timedelta
from typing import Any, Dict, List


class SearchForAppointments:
    """
    Fake service para ambiente de desenvolvimento.
    Simula agendamentos sem banco de dados.
    """

    def __init__(self):
        now = datetime.now()

        # Base fake de dados
        self._appointments = [
            {
                'id': 1,
                'client_name': 'João Silva',
                'service_name': 'Corte de cabelo',
                'price': 40.00,
                'datetime': (now + timedelta(hours=1)).isoformat(),
                'status': 'scheduled',
            },
            {
                'id': 2,
                'client_name': 'Maria Souza',
                'service_name': 'Barba',
                'price': 25.00,
                'datetime': (now + timedelta(hours=2)).isoformat(),
                'status': 'scheduled',
            },
            {
                'id': 3,
                'client_name': 'Carlos Lima',
                'service_name': 'Corte + Barba',
                'price': 60.00,
                'datetime': (now + timedelta(hours=3)).isoformat(),
                'status': 'scheduled',
            },
        ]

    def search(
        self,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        total = len(self._appointments)

        data = self._appointments[offset : offset + limit]

        return {
            'appointments': data,
            'pagination': {
                'total': total,
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total,
            },
        }


# Instância única (simula um service layer real)
_fake_service = SearchForAppointments()


# === Função exportada para o router ===
async def search_for_appointments(
    schema: dict, company_id: int
) -> Dict[str, Any]:
    """
    Função fake usada em desenvolvimento.
    Mantém a mesma interface do futuro serviço real.
    """

    limit = schema.get('limit', 100)
    offset = schema.get('offset', 0)

    return _fake_service.search(limit=limit, offset=offset)
