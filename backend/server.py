from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx
from io import BytesIO

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "entregador"  # admin or entregador
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserCreate(BaseModel):
    email: str
    name: str
    role: str = "entregador"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class Delivery(BaseModel):
    delivery_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entregador_id: str
    entregador_name: str
    client_name: str
    client_email: Optional[str] = None
    address: str
    tracking_code: str = Field(default_factory=lambda: f"IC{uuid.uuid4().hex[:8].upper()}")
    status: str = "pendente"  # pendente, em_transito, entregue, falhou
    notes: Optional[str] = None
    photo: Optional[str] = None  # base64
    signature: Optional[str] = None  # base64
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    delivered_at: Optional[datetime] = None

class DeliveryCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    address: str
    notes: Optional[str] = None
    photo: Optional[str] = None
    signature: Optional[str] = None

class DeliveryUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    photo: Optional[str] = None
    signature: Optional[str] = None

class BulkStatusUpdate(BaseModel):
    delivery_ids: List[str]
    status: str

class DailyReport(BaseModel):
    report_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    total_deliveries: int
    completed: int
    pending: int
    failed: int
    entregador_stats: List[dict]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================

async def get_session_token(request: Request) -> Optional[str]:
    """Get session token from cookie or Authorization header"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    
    # Try Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None

async def get_current_user(request: Request) -> User:
    """Get current authenticated user"""
    session_token = await get_session_token(request)
    if not session_token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    # Find session
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    
    # Check expiry with timezone handling
    expires_at = session.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Sessão expirada")
    
    # Find user
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Utilizador não encontrado")
    
    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=403, detail="Conta desativada")
    
    return User(**user_doc)

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return current_user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID em falta")
    
    try:
        async with httpx.AsyncClient() as client_http:
            auth_response = await client_http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Sessão inválida")
            
            user_data = auth_response.json()
            session_data = SessionDataResponse(**user_data)
    except httpx.RequestError as e:
        logger.error(f"Auth request error: {e}")
        raise HTTPException(status_code=500, detail="Erro de autenticação")
    
    # Check if user exists, create if not
    existing_user = await db.users.find_one(
        {"email": session_data.email},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        role = existing_user.get("role", "entregador")
    else:
        # First user becomes admin, others are entregador
        user_count = await db.users.count_documents({})
        role = "admin" if user_count == 0 else "entregador"
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        
        new_user = {
            "user_id": user_id,
            "email": session_data.email,
            "name": session_data.name,
            "picture": session_data.picture,
            "role": role,
            "created_at": datetime.now(timezone.utc),
            "is_active": True
        }
        await db.users.insert_one(new_user)
    
    # Create session
    expires_at = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    from datetime import timedelta
    expires_at = expires_at + timedelta(days=8)
    
    session_doc = {
        "user_id": user_id,
        "session_token": session_data.session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    
    # Remove old sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_data.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "success": True,
        "user": user_doc,
        "session_token": session_data.session_token
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = await get_session_token(request)
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"success": True, "message": "Sessão terminada"}

# ==================== USER MANAGEMENT (Admin only) ====================

@api_router.get("/users", response_model=List[dict])
async def list_users(admin: User = Depends(require_admin)):
    """List all users (admin only)"""
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return users

@api_router.post("/users")
async def create_user(user_data: UserCreate, admin: User = Depends(require_admin)):
    """Create a new user (admin only)"""
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já registado")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    new_user = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "picture": None,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc),
        "is_active": True
    }
    
    await db.users.insert_one(new_user)
    return {**new_user, "_id": None}

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, admin: User = Depends(require_admin)):
    """Get user by ID (admin only)"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    return user

@api_router.patch("/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, admin: User = Depends(require_admin)):
    """Update user (admin only)"""
    update_dict = {k: v for k, v in user_data.dict().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return updated_user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(require_admin)):
    """Delete user (admin only)"""
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Não pode eliminar a sua própria conta")
    
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    # Also delete their sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    return {"success": True, "message": "Utilizador eliminado"}

@api_router.get("/users/{user_id}/stats")
async def get_user_stats(user_id: str, admin: User = Depends(require_admin)):
    """Get stats for a specific user (admin only)"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    # Get delivery stats
    pipeline = [
        {"$match": {"entregador_id": user_id}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    stats_cursor = db.deliveries.aggregate(pipeline)
    stats_list = await stats_cursor.to_list(100)
    
    stats = {
        "total": 0,
        "pendente": 0,
        "em_transito": 0,
        "entregue": 0,
        "falhou": 0
    }
    
    for stat in stats_list:
        if stat["_id"] in stats:
            stats[stat["_id"]] = stat["count"]
            stats["total"] += stat["count"]
    
    # Get today's deliveries
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.deliveries.count_documents({
        "entregador_id": user_id,
        "created_at": {"$gte": today_start}
    })
    
    return {
        "user": user,
        "stats": stats,
        "today_deliveries": today_count
    }

# ==================== DELIVERIES ====================

@api_router.get("/deliveries")
async def list_deliveries(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List deliveries - admin sees all, entregador sees their own"""
    query = {}
    
    if current_user.role != "admin":
        query["entregador_id"] = current_user.user_id
    
    if status:
        query["status"] = status
    
    deliveries = await db.deliveries.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return deliveries

@api_router.post("/deliveries")
async def create_delivery(
    delivery_data: DeliveryCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new delivery"""
    delivery = Delivery(
        entregador_id=current_user.user_id,
        entregador_name=current_user.name,
        **delivery_data.dict()
    )
    
    await db.deliveries.insert_one(delivery.dict())
    return delivery

@api_router.get("/deliveries/{delivery_id}")
async def get_delivery(delivery_id: str, current_user: User = Depends(get_current_user)):
    """Get delivery by ID"""
    delivery = await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
    
    # Check access
    if current_user.role != "admin" and delivery["entregador_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return delivery

@api_router.patch("/deliveries/{delivery_id}")
async def update_delivery(
    delivery_id: str,
    delivery_data: DeliveryUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update delivery"""
    delivery = await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
    
    # Check access
    if current_user.role != "admin" and delivery["entregador_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_dict = {k: v for k, v in delivery_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    # Set delivered_at if status changed to entregue
    if delivery_data.status == "entregue" and delivery["status"] != "entregue":
        update_dict["delivered_at"] = datetime.now(timezone.utc)
    
    await db.deliveries.update_one(
        {"delivery_id": delivery_id},
        {"$set": update_dict}
    )
    
    updated = await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})
    return updated

@api_router.delete("/deliveries/{delivery_id}")
async def delete_delivery(delivery_id: str, admin: User = Depends(require_admin)):
    """Delete delivery (admin only)"""
    result = await db.deliveries.delete_one({"delivery_id": delivery_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
    return {"success": True, "message": "Entrega eliminada"}

@api_router.post("/deliveries/bulk-status")
async def bulk_update_status(
    data: BulkStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    """Bulk update delivery status"""
    query = {"delivery_id": {"$in": data.delivery_ids}}
    
    if current_user.role != "admin":
        query["entregador_id"] = current_user.user_id
    
    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if data.status == "entregue":
        update_data["delivered_at"] = datetime.now(timezone.utc)
    
    result = await db.deliveries.update_many(query, {"$set": update_data})
    
    return {
        "success": True,
        "updated_count": result.modified_count
    }

# ==================== DASHBOARD & STATS ====================

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    if current_user.role == "admin":
        # Admin sees all stats
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        stats_cursor = db.deliveries.aggregate(pipeline)
        stats_list = await stats_cursor.to_list(100)
        
        stats = {
            "total": 0,
            "pendente": 0,
            "em_transito": 0,
            "entregue": 0,
            "falhou": 0
        }
        
        for stat in stats_list:
            if stat["_id"] in stats:
                stats[stat["_id"]] = stat["count"]
                stats["total"] += stat["count"]
        
        # Today's stats
        today_pipeline = [
            {"$match": {"created_at": {"$gte": today_start}}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        today_cursor = db.deliveries.aggregate(today_pipeline)
        today_list = await today_cursor.to_list(100)
        
        today_stats = {
            "total": 0,
            "pendente": 0,
            "em_transito": 0,
            "entregue": 0,
            "falhou": 0
        }
        
        for stat in today_list:
            if stat["_id"] in today_stats:
                today_stats[stat["_id"]] = stat["count"]
                today_stats["total"] += stat["count"]
        
        # Active entregadores count
        entregadores_count = await db.users.count_documents({"role": "entregador", "is_active": True})
        
        return {
            "all_time": stats,
            "today": today_stats,
            "entregadores_count": entregadores_count
        }
    else:
        # Entregador sees their own stats
        pipeline = [
            {"$match": {"entregador_id": current_user.user_id}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        stats_cursor = db.deliveries.aggregate(pipeline)
        stats_list = await stats_cursor.to_list(100)
        
        stats = {
            "total": 0,
            "pendente": 0,
            "em_transito": 0,
            "entregue": 0,
            "falhou": 0
        }
        
        for stat in stats_list:
            if stat["_id"] in stats:
                stats[stat["_id"]] = stat["count"]
                stats["total"] += stat["count"]
        
        # Today's stats
        today_count = await db.deliveries.count_documents({
            "entregador_id": current_user.user_id,
            "created_at": {"$gte": today_start}
        })
        
        return {
            "all_time": stats,
            "today": {"total": today_count},
            "entregadores_count": 0
        }

@api_router.get("/stats/entregadores")
async def get_entregadores_stats(admin: User = Depends(require_admin)):
    """Get stats for all entregadores (admin only)"""
    entregadores = await db.users.find(
        {"role": "entregador", "is_active": True},
        {"_id": 0}
    ).to_list(1000)
    
    result = []
    for entregador in entregadores:
        pipeline = [
            {"$match": {"entregador_id": entregador["user_id"]}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        stats_cursor = db.deliveries.aggregate(pipeline)
        stats_list = await stats_cursor.to_list(100)
        
        stats = {"total": 0, "pendente": 0, "em_transito": 0, "entregue": 0, "falhou": 0}
        for stat in stats_list:
            if stat["_id"] in stats:
                stats[stat["_id"]] = stat["count"]
                stats["total"] += stat["count"]
        
        result.append({
            "user": entregador,
            "stats": stats
        })
    
    return result

# ==================== REPORTS ====================

@api_router.get("/reports/daily")
async def get_daily_report(
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get daily report data"""
    if date:
        try:
            report_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD")
    else:
        report_date = datetime.now(timezone.utc)
    
    start_of_day = report_date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    end_of_day = report_date.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
    
    query = {"created_at": {"$gte": start_of_day, "$lte": end_of_day}}
    
    if current_user.role != "admin":
        query["entregador_id"] = current_user.user_id
    
    deliveries = await db.deliveries.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate stats
    stats = {"total": len(deliveries), "pendente": 0, "em_transito": 0, "entregue": 0, "falhou": 0}
    for d in deliveries:
        if d["status"] in stats:
            stats[d["status"]] += 1
    
    # Stats by entregador
    entregador_stats = {}
    for d in deliveries:
        eid = d["entregador_id"]
        if eid not in entregador_stats:
            entregador_stats[eid] = {
                "name": d["entregador_name"],
                "total": 0, "pendente": 0, "em_transito": 0, "entregue": 0, "falhou": 0
            }
        entregador_stats[eid]["total"] += 1
        if d["status"] in entregador_stats[eid]:
            entregador_stats[eid][d["status"]] += 1
    
    return {
        "date": report_date.strftime("%Y-%m-%d"),
        "stats": stats,
        "entregador_stats": list(entregador_stats.values()),
        "deliveries": deliveries
    }

@api_router.get("/reports/excel")
async def download_excel_report(
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Download daily report as Excel"""
    import xlsxwriter
    
    if date:
        try:
            report_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido")
    else:
        report_date = datetime.now(timezone.utc)
    
    start_of_day = report_date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    end_of_day = report_date.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
    
    query = {"created_at": {"$gte": start_of_day, "$lte": end_of_day}}
    
    if current_user.role != "admin":
        query["entregador_id"] = current_user.user_id
    
    deliveries = await db.deliveries.find(query, {"_id": 0}).to_list(1000)
    
    # Create Excel file
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet("Entregas")
    
    # Header format
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#1a365d',
        'font_color': 'white',
        'border': 1
    })
    
    # Headers
    headers = ["Código", "Cliente", "Email", "Morada", "Entregador", "Estado", "Notas", "Data Criação", "Data Entrega"]
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_format)
    
    # Status translation
    status_pt = {
        "pendente": "Pendente",
        "em_transito": "Em Trânsito",
        "entregue": "Entregue",
        "falhou": "Falhou"
    }
    
    # Data
    for row, delivery in enumerate(deliveries, start=1):
        worksheet.write(row, 0, delivery.get("tracking_code", ""))
        worksheet.write(row, 1, delivery.get("client_name", ""))
        worksheet.write(row, 2, delivery.get("client_email", ""))
        worksheet.write(row, 3, delivery.get("address", ""))
        worksheet.write(row, 4, delivery.get("entregador_name", ""))
        worksheet.write(row, 5, status_pt.get(delivery.get("status", ""), delivery.get("status", "")))
        worksheet.write(row, 6, delivery.get("notes", ""))
        
        created_at = delivery.get("created_at")
        if created_at:
            worksheet.write(row, 7, created_at.strftime("%Y-%m-%d %H:%M") if hasattr(created_at, 'strftime') else str(created_at))
        
        delivered_at = delivery.get("delivered_at")
        if delivered_at:
            worksheet.write(row, 8, delivered_at.strftime("%Y-%m-%d %H:%M") if hasattr(delivered_at, 'strftime') else str(delivered_at))
    
    # Auto-fit columns
    for col in range(len(headers)):
        worksheet.set_column(col, col, 18)
    
    workbook.close()
    output.seek(0)
    
    filename = f"relatorio_entregas_{report_date.strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/reports/pdf")
async def download_pdf_report(
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Download daily report as PDF"""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    
    if date:
        try:
            report_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido")
    else:
        report_date = datetime.now(timezone.utc)
    
    start_of_day = report_date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    end_of_day = report_date.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
    
    query = {"created_at": {"$gte": start_of_day, "$lte": end_of_day}}
    
    if current_user.role != "admin":
        query["entregador_id"] = current_user.user_id
    
    deliveries = await db.deliveries.find(query, {"_id": 0}).to_list(1000)
    
    # Create PDF
    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=landscape(A4), topMargin=1*cm, bottomMargin=1*cm)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=20,
        alignment=1
    )
    
    # Title
    elements.append(Paragraph(f"Relatório de Entregas - {report_date.strftime('%d/%m/%Y')}", title_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Stats summary
    stats = {"total": len(deliveries), "pendente": 0, "em_transito": 0, "entregue": 0, "falhou": 0}
    for d in deliveries:
        if d["status"] in stats:
            stats[d["status"]] += 1
    
    summary = f"Total: {stats['total']} | Pendentes: {stats['pendente']} | Em Trânsito: {stats['em_transito']} | Entregues: {stats['entregue']} | Falhadas: {stats['falhou']}"
    elements.append(Paragraph(summary, styles['Normal']))
    elements.append(Spacer(1, 0.5*cm))
    
    # Status translation
    status_pt = {
        "pendente": "Pendente",
        "em_transito": "Em Trânsito",
        "entregue": "Entregue",
        "falhou": "Falhou"
    }
    
    # Table
    if deliveries:
        data = [["Código", "Cliente", "Morada", "Entregador", "Estado", "Data"]]
        for d in deliveries:
            created_at = d.get("created_at")
            date_str = created_at.strftime("%H:%M") if hasattr(created_at, 'strftime') else ""
            data.append([
                d.get("tracking_code", "")[:12],
                d.get("client_name", "")[:20],
                d.get("address", "")[:30],
                d.get("entregador_name", "")[:15],
                status_pt.get(d.get("status", ""), d.get("status", "")),
                date_str
            ])
        
        table = Table(data, colWidths=[2.5*cm, 4*cm, 6*cm, 3.5*cm, 2.5*cm, 2*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("Sem entregas registadas nesta data.", styles['Normal']))
    
    doc.build(elements)
    output.seek(0)
    
    filename = f"relatorio_entregas_{report_date.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/reports/close-day")
async def close_day(admin: User = Depends(require_admin)):
    """Close the day and generate final report (admin only)"""
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")
    
    # Check if already closed
    existing = await db.daily_reports.find_one({"date": today_str})
    if existing:
        raise HTTPException(status_code=400, detail="O dia já foi fechado")
    
    start_of_day = today.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = today.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    deliveries = await db.deliveries.find(
        {"created_at": {"$gte": start_of_day, "$lte": end_of_day}},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate stats
    stats = {"total": len(deliveries), "pendente": 0, "em_transito": 0, "entregue": 0, "falhou": 0}
    entregador_stats = {}
    
    for d in deliveries:
        if d["status"] in stats:
            stats[d["status"]] += 1
        
        eid = d["entregador_id"]
        if eid not in entregador_stats:
            entregador_stats[eid] = {
                "user_id": eid,
                "name": d["entregador_name"],
                "total": 0, "pendente": 0, "em_transito": 0, "entregue": 0, "falhou": 0
            }
        entregador_stats[eid]["total"] += 1
        if d["status"] in entregador_stats[eid]:
            entregador_stats[eid][d["status"]] += 1
    
    report = DailyReport(
        date=today_str,
        total_deliveries=stats["total"],
        completed=stats["entregue"],
        pending=stats["pendente"],
        failed=stats["falhou"],
        entregador_stats=list(entregador_stats.values())
    )
    
    await db.daily_reports.insert_one(report.dict())
    
    return {
        "success": True,
        "report": report.dict()
    }

@api_router.get("/reports/history")
async def get_reports_history(admin: User = Depends(require_admin)):
    """Get history of daily reports (admin only)"""
    reports = await db.daily_reports.find({}, {"_id": 0}).sort("date", -1).to_list(100)
    return reports

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "Intercourier Corvo API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
