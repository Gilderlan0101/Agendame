import os
from pathlib import Path
from urllib.parse import quote

from fastapi import Request, status
from fastapi.templating import Jinja2Templates


# ======================================================
class TemplatesConfig:
    """Configuração dos templates Jinja2 para FastAPI."""

    def __init__(self):
        # BASE_DIR é o diretório do projeto (Agendame/)
        self.BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        print(f'BASE_DIR: {self.BASE_DIR}')
        # Diretório de templates (dentro de app/)
        self.template_dir = f"{self.BASE_DIR}/templates"
        self.templates = Jinja2Templates(directory=str(self.template_dir))
        # Diretório de arquivos estáticos (dentro de app/)
        self.static_dir = f"{self.BASE_DIR}/static"
        # Verificar se o diretório static existe
        if not os.path.exists(self.static_dir):
            print(f'Aviso: Diretório static não encontrado: {self.static_dir}')
            # Criar o diretório se não existir
            os.mkdir(path=self.static_dir)
            print(f'Diretório static criado: {self.static_dir}')
########################################################################
templates_config = TemplatesConfig()
templates = templates_config.templates



import os
from urllib.parse import quote
from typing import List

from fastapi import Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware


# ======================================================
# MIDDLEWARE DE AUTENTICAÇÃO
# ======================================================
class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware para verificação de autenticação"""

    def __init__(self, app):
        super().__init__(app)

        # Verifica se está em produção
        self.is_production = os.getenv('ENVIRONMENT', 'development') == 'production'

        # Domínio para cookies (em produção)
        self.cookie_domain = os.getenv('COOKIE_DOMAIN', None)

        # Rotas públicas que NÃO precisam de autenticação
        self.public_routes = {
            '/',  # Landpage
            '/login',  # Página de login HTML
            '/auth/agendame/trial',  # Página de trial
            '/404',  # Página 404
            '/health',
            '/ping',
            '/keepalive',
            '/docs',
            '/redoc',
            '/openapi.json',
            '/favicon.ico',
            '/robots.txt',
            '/sitemap.xml',
        }

        # APIs públicas (não redirecionam, retornam JSON)
        self.public_api_routes = {
            '/auth/login',  # API de login (POST)
            '/auth/register',  # API de registro
            '/auth/signup/free-trial',  # API de trial
            '/auth/debug',  # API de debug
        }

        # Prefixos de rotas públicas
        self.public_prefixes = [
            '/static/',
            '/docs/',
            '/redoc/',
            '/openapi',
            '/favicon',
            '/health',  # Para monitoramento
        ]

        # Hosts/domínios permitidos (para produção)
        self.allowed_hosts = self._get_allowed_hosts()

    def _get_allowed_hosts(self) -> List[str]:
        """Obtém lista de hosts permitidos do ambiente"""
        hosts_str = os.getenv('ALLOWED_HOSTS', '')
        if hosts_str:
            return [host.strip() for host in hosts_str.split(',')]

        # Hosts padrão
        default_hosts = ['localhost', '127.0.0.1']
        if self.is_production:
            # Em produção, adicione seu domínio
            domain = os.getenv('DOMAIN')
            if domain:
                default_hosts.append(domain)
                default_hosts.append(f'www.{domain}')

        return default_hosts

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method

        # Verificação de host (em produção)
        if self.is_production and request.headers.get('host'):
            host = request.headers.get('host').split(':')[0]
            if host not in self.allowed_hosts:
                print(f"✗ Host não permitido: {host}")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={'detail': 'Host não permitido'}
                )

        # Log simplificado em produção
        if self.is_production:
            print(f"{method} {path}")
        else:
            print(f"\n=== MIDDLEWARE: {method} {path} ===")

        # Verifica se é uma rota pública
        if self._is_public_route(path, method):
            if not self.is_production:
                print(f"✓ Rota pública: {path}")
            return await call_next(request)

        if not self.is_production:
            print(f"✗ Rota protegida: {path}")

        # Verifica autenticação
        auth_result = await self._check_authentication(request)

        if auth_result.get('authenticated'):
            # Usuário autenticado
            if not self.is_production:
                print(f"✓ Usuário autenticado: {auth_result.get('user')}")
            request.state.user = auth_result.get('user')
            return await call_next(request)
        else:
            # Usuário não autenticado
            error_msg = auth_result.get('error')
            if not self.is_production:
                print(f"✗ Não autenticado: {error_msg}")
            return await self._handle_unauthenticated(request, error_msg)

    def _is_public_route(self, path: str, method: str = "GET") -> bool:
        """Verifica se a rota é pública"""

        # 1. Verifica match exato em rotas públicas
        if path in self.public_routes:
            return True

        # 2. Verifica APIs públicas (para métodos específicos)
        if path in self.public_api_routes:
            # API de login: só é pública para POST
            if path == '/auth/login':
                return method == 'POST'
            # API de debug: sempre pública
            if path == '/auth/debug':
                return True
            # Demais APIs são públicas para todos os métodos
            return True

        # 3. Verifica prefixos públicos
        for prefix in self.public_prefixes:
            if path.startswith(prefix):
                return True

        # 4. Páginas de agendamento público
        if path.startswith('/agendame/') and not path.startswith('/agendame/dashboard'):
            # Verifica se é uma página de empresa ou agendamento público
            parts = path.split('/')
            if len(parts) >= 3:
                # Exemplos públicos: /agendame/nome-empresa
                # Exemplos privados: /agendame/dashboard, /agendame/services
                private_sections = ['dashboard', 'services', 'appointments', 'clients', 'company', 'settings', 'profile']
                if parts[2] not in private_sections:
                    return True

        # 5. Rotas curtas de empresas (ex: /nome-empresa)
        if len(path.split('/')) == 2 and path != '/':
            # Exemplo: /corte-supremo
            slug = path.strip('/')
            if slug and '/' not in slug:
                return True

        return False

    async def _check_authentication(self, request: Request) -> dict:
        """Verifica se o usuário está autenticado"""

        access_token = request.cookies.get('access_token')

        if not access_token:
            # Tentar obter do header Authorization
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                access_token = auth_header.split(' ')[1]

        if not access_token:
            return {'authenticated': False, 'error': 'Acesso negado.'}

        if not self.is_production:
            print(f"Token encontrado: {access_token[:20]}...")

        try:
            from app.service.jwt.jwt_decode_token import DecodeToken
            from app.models.trial import TrialAccount
            from app.models.user import User

            # Tenta decodificar o token
            decoded_data = DecodeToken(access_token)

            if not decoded_data:
                return {'authenticated': False, 'error': 'Token inválido.'}

            # OBTÉM O USUÁRIO REAL DO BANCO DE DADOS
            user_id = decoded_data.user_id

            # Busca primeiro na tabela de usuários normais
            user = await User.get_or_none(id=user_id)
            is_trial = False

            # Se não encontrou, busca na tabela trial
            if not user:
                user = await TrialAccount.get_or_none(id=user_id)
                is_trial = True

            if not user:
                return {'authenticated': False, 'error': 'Usuário não encontrado.'}

            # Adiciona informações adicionais ao usuário
            user_data = {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'business_name': getattr(user, 'business_name', None),
                'business_slug': getattr(user, 'business_slug', None),
                'phone': getattr(user, 'phone', ''),
                'is_trial': is_trial,
                # Adiciona o objeto original para referência
                '_user_obj': user
            }

            return {
                'authenticated': True,
                'user': user_data,  # Agora com dados reais do usuário
                'decoded_token': decoded_data
            }

        except Exception as e:
            if not self.is_production:
                print(f"Erro ao verificar token: {e}")
            return {'authenticated': False, 'error': 'Erro de autenticação'}

    async def _handle_unauthenticated(self, request: Request, error: str = None):
        """Lida com requisições não autenticadas"""

        path = request.url.path

        if not self.is_production:
            print(f"Tratando requisição não autenticada para: {path}")

        # Se for uma API (começa com /api/ ou /auth/ e NÃO é login), retorna JSON
        if (path.startswith('/api/') or
            (path.startswith('/auth/') and path != '/auth/login') or
            path.startswith('/agendame/api/')):

            if not self.is_production:
                print("Retornando erro JSON para API")

            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    'detail': 'Não autenticado',
                    'error': error or 'Acesso negado.',
                },
                headers={
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                    'Pragma': 'no-cache'
                } if self.is_production else {}
            )

        # Se já estiver na página de login, mostra a página
        if path == '/login' or path.startswith('/agendame/trial'):
            if not self.is_production:
                print("Já está em rota pública de login/trial")

            # Chama o próximo handler (que renderizará a página)
            return await self.app(request.scope, request.receive, request._send)

        # Para rotas web, redireciona para login
        next_url = quote(path, safe='')
        redirect_url = f'/login?next={next_url}'

        if error:
            redirect_url += f'&error={quote(error)}'

        if not self.is_production:
            print(f"Redirecionando para: {redirect_url}")

        response = RedirectResponse(
            url=redirect_url,
            status_code=status.HTTP_303_SEE_OTHER
        )

        # Headers de segurança em produção
        if self.is_production:
            response.headers.update({
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'X-Frame-Options': 'DENY',
                'X-Content-Type-Options': 'nosniff',
                'Referrer-Policy': 'strict-origin-when-cross-origin'
            })

        return response
