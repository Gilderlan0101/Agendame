import requests
import json

def test_rotas_trial():
    """Testa as rotas para TrialAccounts"""

    base_url = "https://agendame.onrender.com"

    # Testar com o slug do TrialAccount
    company_identifier = "paulo-shop"  # Substitua pelo slug real

    print("=" * 80)
    print("TESTANDO ROTAS PARA TRIALACCOUNT")
    print("=" * 80)

    # 1. Testar rota de serviços
    print(f"\n1. Testando rota: /services/{company_identifier}")
    print("-" * 40)

    try:
        response = requests.get(
            f"{base_url}/services/{company_identifier}",
            params={"search_by": "auto", "is_active": True},
            headers={"Accept": "application/json"}
        )

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sucesso!")
            print(f"   Empresa: {data.get('company')}")
            print(f"   Slug: {data.get('company_slug')}")
            print(f"   Username: {data.get('company_username')}")
            print(f"   Total serviços: {data.get('total_services')}")

            # Mostrar primeiros 3 serviços
            services = data.get('services', [])[:3]
            for i, service in enumerate(services, 1):
                print(f"   Serviço {i}: {service.get('name')} - R$ {service.get('price')}")

        else:
            print(f"❌ Erro!")
            try:
                error_data = response.json()
                print(f"   Detalhe: {error_data.get('detail')}")
            except:
                print(f"   Response: {response.text}")

    except Exception as e:
        print(f"❌ Exceção: {e}")

    # 2. Testar se existe na tabela trial
    print(f"\n2. Verificando banco de dados:")
    print("-" * 40)

    import psycopg2

    try:
        conn = psycopg2.connect(
            host="dpg-d5vbeqiqcgvc739eokag-a.oregon-postgres.render.com",
            database="agandame_db",
            user="agandame_db_user",
            password="mF8qLWrWFIlhwIBAo0NobfDE8Gom04zH",
            port=5432
        )

        cursor = conn.cursor()

        # Buscar na tabela trial
        cursor.execute("""
            SELECT id, business_slug, username, business_name, email
            FROM trial
            WHERE business_slug = %s OR username = %s OR business_name = %s
        """, (company_identifier, company_identifier, company_identifier))

        trial_result = cursor.fetchone()

        if trial_result:
            print(f"✅ Encontrado na tabela 'trial':")
            print(f"   ID: {trial_result[0]}")
            print(f"   Slug: {trial_result[1]}")
            print(f"   Username: {trial_result[2]}")
            print(f"   Business: {trial_result[3]}")
            print(f"   Email: {trial_result[4]}")
        else:
            print(f"❌ NÃO encontrado na tabela 'trial'")

        # Buscar na tabela users
        cursor.execute("""
            SELECT id, business_slug, username, business_name, email
            FROM users
            WHERE business_slug = %s OR username = %s OR business_name = %s
        """, (company_identifier, company_identifier, company_identifier))

        user_result = cursor.fetchone()

        if user_result:
            print(f"\n✅ Encontrado na tabela 'users':")
            print(f"   ID: {user_result[0]}")
            print(f"   Slug: {user_result[1]}")
            print(f"   Username: {user_result[2]}")
            print(f"   Business: {user_result[3]}")
            print(f"   Email: {user_result[4]}")
        else:
            print(f"\n❌ NÃO encontrado na tabela 'users'")

        # Verificar serviços associados ao trial
        if trial_result:
            trial_id = trial_result[0]
            cursor.execute("""
                SELECT COUNT(*) as total_services
                FROM services
                WHERE trial_account_id = %s AND is_active = true
            """, (trial_id,))

            count_result = cursor.fetchone()
            print(f"\n📊 Serviços ativos para este TrialAccount: {count_result[0]}")

            cursor.execute("""
                SELECT id, name, price, duration_minutes
                FROM services
                WHERE trial_account_id = %s AND is_active = true
                ORDER BY "order", name
            """, (trial_id,))

            services = cursor.fetchall()
            if services:
                print(f"   Lista de serviços:")
                for service in services:
                    print(f"   - ID: {service[0]}, Nome: {service[1]}, Preço: R$ {service[2]}, Duração: {service[3]}min")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Erro ao consultar banco: {e}")

    # 3. Testar com diferentes search_by
    print(f"\n3. Testando diferentes métodos de busca:")
    print("-" * 40)

    search_methods = ['auto', 'slug', 'username', 'name']

    for method in search_methods:
        try:
            response = requests.get(
                f"{base_url}/services/{company_identifier}",
                params={"search_by": method, "is_active": True},
                headers={"Accept": "application/json"}
            )

            print(f"   search_by='{method}': Status {response.status_code}")

        except Exception as e:
            print(f"   search_by='{method}': ❌ Erro - {e}")

if __name__ == "__main__":
    test_rotas_trial()
