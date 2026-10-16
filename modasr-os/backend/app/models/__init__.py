"""MODASR HUB data model. Every table is tenant-scoped (multi-tenant ready)."""
import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (JSON, BigInteger, Boolean, DateTime, Enum, ForeignKey, Index, Integer, Numeric,
                        String, Text, UniqueConstraint, func)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class TS:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Tenanted:
    tenant_id: Mapped[str] = mapped_column(String(40), default="modasr", index=True)


Money = Numeric(18, 0)  # Toman, integer


# ---------- Enums ----------
class Role(str, enum.Enum):
    super_admin = "super_admin"; admin = "admin"; manager = "manager"; support = "support"
    finance = "finance"; marketing = "marketing"; customer = "customer"

class ProductType(str, enum.Enum):
    telegram_premium = "telegram_premium"; telegram_stars = "telegram_stars"; ai_subscription = "ai_subscription"
    streaming = "streaming"; music = "music"; virtual_number = "virtual_number"; gift_card = "gift_card"
    vpn = "vpn"; digital_subscription = "digital_subscription"; digital_account = "digital_account"
    custom_product = "custom_product"; custom_service = "custom_service"

class DeliveryMode(str, enum.Enum):
    instant_code = "instant_code"; supplier_api = "supplier_api"; manual = "manual"; activation_on_account = "activation_on_account"

class OrderStatus(str, enum.Enum):
    pending_payment = "pending_payment"; paid = "paid"; processing = "processing"; delivered = "delivered"
    cancelled = "cancelled"; refunded = "refunded"; failed = "failed"

class PaymentMethod(str, enum.Enum):
    online = "online"; card_to_card = "card_to_card"; wallet = "wallet"; crypto = "crypto"

class TicketPriority(str, enum.Enum):
    low = "low"; normal = "normal"; high = "high"; urgent = "urgent"

class TicketStatus(str, enum.Enum):
    open = "open"; ai_resolved = "ai_resolved"; waiting_human = "waiting_human"; answered = "answered"; closed = "closed"

class PublishMode(str, enum.Enum):
    manual_approval = "manual_approval"; semi_auto = "semi_auto"; full_auto = "full_auto"


# ---------- Identity ----------
class User(Base, TS, Tenanted):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = pk()
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    full_name: Mapped[str | None] = mapped_column(String(200))
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.customer)
    totp_secret_enc: Mapped[str | None] = mapped_column(Text)
    is_vip: Mapped[bool] = mapped_column(Boolean, default=False)
    segment: Mapped[str | None] = mapped_column(String(40))  # AI CRM segment
    lifetime_value: Mapped[Decimal] = mapped_column(Money, default=0)
    referred_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("affiliates.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    telegram: Mapped["TelegramIdentity | None"] = relationship(back_populates="user", uselist=False)

class TelegramIdentity(Base, TS):
    __tablename__ = "telegram_identities"
    id: Mapped[uuid.UUID] = pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(64))
    first_name: Mapped[str | None] = mapped_column(String(128))
    last_name: Mapped[str | None] = mapped_column(String(128))
    photo_url: Mapped[str | None] = mapped_column(Text)
    auth_date: Mapped[int | None] = mapped_column(BigInteger)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user: Mapped[User] = relationship(back_populates="telegram")

class Session(Base, TS):
    __tablename__ = "sessions"
    id: Mapped[uuid.UUID] = pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    refresh_jti: Mapped[str] = mapped_column(String(64), unique=True)
    user_agent: Mapped[str | None] = mapped_column(String(300))
    ip: Mapped[str | None] = mapped_column(String(64))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


# ---------- Catalog ----------
class Category(Base, TS, Tenanted):
    __tablename__ = "categories"
    id: Mapped[uuid.UUID] = pk()
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"))
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    icon: Mapped[str | None] = mapped_column(String(60))
    sort: Mapped[int] = mapped_column(Integer, default=0)
    profit_percent: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))

class Supplier(Base, TS, Tenanted):
    __tablename__ = "suppliers"
    id: Mapped[uuid.UUID] = pk()
    name: Mapped[str] = mapped_column(String(120), unique=True)
    api_url: Mapped[str | None] = mapped_column(Text)
    api_key_enc: Mapped[str | None] = mapped_column(Text)  # AES-GCM
    adapter: Mapped[str] = mapped_column(String(40), default="generic_json")
    mapping: Mapped[dict] = mapped_column(JSON, default=dict)
    balance: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    balance_currency: Mapped[str] = mapped_column(String(8), default="USD")
    healthy: Mapped[bool] = mapped_column(Boolean, default=True)
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    latency_ms: Mapped[int | None] = mapped_column(Integer)

class Product(Base, TS, Tenanted):
    __tablename__ = "products"
    id: Mapped[uuid.UUID] = pk()
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"))
    type: Mapped[ProductType] = mapped_column(Enum(ProductType))
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    title_en: Mapped[str | None] = mapped_column(String(200))
    short: Mapped[str | None] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    seo: Mapped[dict] = mapped_column(JSON, default=dict)
    images: Mapped[list] = mapped_column(JSON, default=list)
    specs: Mapped[dict] = mapped_column(JSON, default=dict)
    faq: Mapped[list] = mapped_column(JSON, default=list)
    risk_level: Mapped[str] = mapped_column(String(10), default="low")
    requires_admin_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sales_count: Mapped[int] = mapped_column(Integer, default=0)
    variants: Mapped[list["Variant"]] = relationship(back_populates="product", cascade="all, delete-orphan")

class Variant(Base, TS):
    __tablename__ = "variants"
    id: Mapped[uuid.UUID] = pk()
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(160))          # e.g. "۳ ماهه"
    duration_days: Mapped[int | None] = mapped_column(Integer)
    region: Mapped[str | None] = mapped_column(String(20))
    devices: Mapped[int | None] = mapped_column(Integer)
    account_type: Mapped[str | None] = mapped_column(String(30))  # personal / shared / family
    delivery_mode: Mapped[DeliveryMode] = mapped_column(Enum(DeliveryMode), default=DeliveryMode.manual)
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("suppliers.id"))
    supplier_sku: Mapped[str | None] = mapped_column(String(120))
    cost_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    cost_currency: Mapped[str] = mapped_column(String(8), default="USD")
    profit_percent: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    profit_fixed: Mapped[Decimal | None] = mapped_column(Money)
    min_profit: Mapped[Decimal | None] = mapped_column(Money)
    manual_price: Mapped[Decimal | None] = mapped_column(Money)
    price: Mapped[Decimal | None] = mapped_column(Money)     # computed, cached
    price_needs_review: Mapped[bool] = mapped_column(Boolean, default=False)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True)
    warranty_days: Mapped[int] = mapped_column(Integer, default=0)
    product: Mapped[Product] = relationship(back_populates="variants")

class StockCode(Base, TS):
    __tablename__ = "stock_codes"
    id: Mapped[uuid.UUID] = pk()
    variant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("variants.id", ondelete="CASCADE"), index=True)
    code_enc: Mapped[str] = mapped_column(Text)
    used_by_order: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id"))
    __table_args__ = (Index("ix_stock_free", "variant_id", "used_by_order"),)


# ---------- Commerce ----------
class Order(Base, TS, Tenanted):
    __tablename__ = "orders"
    id: Mapped[uuid.UUID] = pk()
    number: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.pending_payment, index=True)
    channel: Mapped[str] = mapped_column(String(20), default="web")  # web / bot / miniapp / business
    subtotal: Mapped[Decimal] = mapped_column(Money)
    discount: Mapped[Decimal] = mapped_column(Money, default=0)
    total: Mapped[Decimal] = mapped_column(Money)
    cost_total: Mapped[Decimal] = mapped_column(Money, default=0)
    coupon_code: Mapped[str | None] = mapped_column(String(40))
    payment_method: Mapped[PaymentMethod | None] = mapped_column(Enum(PaymentMethod))
    affiliate_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("affiliates.id"))
    notes: Mapped[dict] = mapped_column(JSON, default=dict)
    items: Mapped[list["OrderItem"]] = relationship(cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[uuid.UUID] = pk()
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("variants.id"))
    title: Mapped[str] = mapped_column(String(240))
    qty: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Money)
    unit_cost: Mapped[Decimal] = mapped_column(Money, default=0)
    delivery_payload_enc: Mapped[str | None] = mapped_column(Text)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class Payment(Base, TS):
    __tablename__ = "payments"
    id: Mapped[uuid.UUID] = pk()
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod))
    amount: Mapped[Decimal] = mapped_column(Money)
    gateway_ref: Mapped[str | None] = mapped_column(String(120), unique=True)  # authority
    tracking_code: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    receipt_url: Mapped[str | None] = mapped_column(Text)
    ai_check: Mapped[dict | None] = mapped_column(JSON)
    idempotency_key: Mapped[str | None] = mapped_column(String(80), unique=True)

class WalletTransaction(Base, TS):
    __tablename__ = "wallet_transactions"
    id: Mapped[uuid.UUID] = pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(20))  # topup / purchase / refund / commission / cashback / payout
    amount: Mapped[Decimal] = mapped_column(Money)  # signed
    balance_after: Mapped[Decimal] = mapped_column(Money)
    reference: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="completed")

class Coupon(Base, TS, Tenanted):
    __tablename__ = "coupons"
    id: Mapped[uuid.UUID] = pk()
    code: Mapped[str] = mapped_column(String(40), unique=True)
    kind: Mapped[str] = mapped_column(String(10), default="percent")  # percent / fixed
    value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    max_discount: Mapped[Decimal | None] = mapped_column(Money)
    min_order: Mapped[Decimal | None] = mapped_column(Money)
    usage_limit: Mapped[int | None] = mapped_column(Integer)
    per_user_limit: Mapped[int | None] = mapped_column(Integer, default=1)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    affiliate_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("affiliates.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Affiliate(Base, TS, Tenanted):
    __tablename__ = "affiliates"
    id: Mapped[uuid.UUID] = pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", use_alter=True), unique=True)
    code: Mapped[str] = mapped_column(String(24), unique=True)
    commission_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=5)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    earned: Mapped[Decimal] = mapped_column(Money, default=0)
    paid_out: Mapped[Decimal] = mapped_column(Money, default=0)

class Referral(Base, TS):
    __tablename__ = "referrals"
    id: Mapped[uuid.UUID] = pk()
    affiliate_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("affiliates.id"), index=True)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), unique=True)
    commission: Mapped[Decimal] = mapped_column(Money)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / approved / paid / void

class Favorite(Base, TS):
    __tablename__ = "favorites"
    id: Mapped[uuid.UUID] = pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)

class Cart(Base, TS):
    __tablename__ = "carts"
    id: Mapped[uuid.UUID] = pk()
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True)
    items: Mapped[list] = mapped_column(JSON, default=list)  # [{sku, qty}]
    recovered: Mapped[bool] = mapped_column(Boolean, default=False)
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------- Support ----------
class Ticket(Base, TS, Tenanted):
    __tablename__ = "tickets"
    id: Mapped[uuid.UUID] = pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id"))
    subject: Mapped[str] = mapped_column(String(200))
    priority: Mapped[TicketPriority] = mapped_column(Enum(TicketPriority), default=TicketPriority.normal)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), default=TicketStatus.open, index=True)
    channel: Mapped[str] = mapped_column(String(20), default="web")
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    ai_summary: Mapped[str | None] = mapped_column(Text)
    sentiment: Mapped[str | None] = mapped_column(String(16))

class TicketMessage(Base, TS):
    __tablename__ = "ticket_messages"
    id: Mapped[uuid.UUID] = pk()
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    author: Mapped[str] = mapped_column(String(10))  # user / ai / admin
    body: Mapped[str] = mapped_column(Text)
    attachments: Mapped[list] = mapped_column(JSON, default=list)
    internal_note: Mapped[bool] = mapped_column(Boolean, default=False)


# ---------- AI ----------
class AIConversation(Base, TS):
    __tablename__ = "ai_conversations"
    id: Mapped[uuid.UUID] = pk()
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True)
    channel: Mapped[str] = mapped_column(String(20))
    external_chat_id: Mapped[str | None] = mapped_column(String(64), index=True)
    agent: Mapped[str] = mapped_column(String(20), default="sales")
    messages: Mapped[list] = mapped_column(JSON, default=list)
    intent_score: Mapped[int] = mapped_column(Integer, default=0)
    escalated: Mapped[bool] = mapped_column(Boolean, default=False)
    human_takeover: Mapped[bool] = mapped_column(Boolean, default=False)

class KnowledgeArticle(Base, TS, Tenanted):
    __tablename__ = "knowledge_articles"
    id: Mapped[uuid.UUID] = pk()
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(20), default="faq")  # faq / policy / blog / guide
    published: Mapped[bool] = mapped_column(Boolean, default=True)

class AIAction(Base, TS):
    """Every action the AI proposes/executes. Sensitive ones need human approval."""
    __tablename__ = "ai_actions"
    id: Mapped[uuid.UUID] = pk()
    agent: Mapped[str] = mapped_column(String(20))
    action: Mapped[str] = mapped_column(String(60))
    payload: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="proposed")  # proposed / approved / executed / rejected
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    result: Mapped[dict | None] = mapped_column(JSON)


# ---------- Channels & automation ----------
class Channel(Base, TS, Tenanted):
    __tablename__ = "channels"
    id: Mapped[uuid.UUID] = pk()
    platform: Mapped[str] = mapped_column(String(20))  # telegram_channel / telegram_group / instagram / whatsapp / discord
    external_id: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(160))
    role: Mapped[str] = mapped_column(String(20), default="marketing")  # marketing / sales_feed / admin
    publish_mode: Mapped[PublishMode] = mapped_column(Enum(PublishMode), default=PublishMode.manual_approval)
    credentials_enc: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint("platform", "external_id"),)

class ScheduledPost(Base, TS):
    __tablename__ = "scheduled_posts"
    id: Mapped[uuid.UUID] = pk()
    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id"), index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("products.id"))
    kind: Mapped[str] = mapped_column(String(20), default="product")  # product / discount / campaign / announcement
    caption: Mapped[str] = mapped_column(Text)
    media: Mapped[list] = mapped_column(JSON, default=list)
    buttons: Mapped[list] = mapped_column(JSON, default=list)
    publish_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft / approved / published / failed
    external_message_id: Mapped[str | None] = mapped_column(String(40))
    dedupe_key: Mapped[str | None] = mapped_column(String(120), unique=True)

class Campaign(Base, TS, Tenanted):
    __tablename__ = "campaigns"
    id: Mapped[uuid.UUID] = pk()
    name: Mapped[str] = mapped_column(String(160))
    goal: Mapped[str | None] = mapped_column(String(200))
    plan: Mapped[dict] = mapped_column(JSON, default=dict)  # AI-generated plan
    coupon_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("coupons.id"))
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="draft")

class EventOutbox(Base, TS):
    """Transactional outbox → n8n / Telegram / email. Guarantees at-least-once with idempotency."""
    __tablename__ = "event_outbox"
    id: Mapped[uuid.UUID] = pk()
    event: Mapped[str] = mapped_column(String(60), index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_error: Mapped[str | None] = mapped_column(Text)


# ---------- Rates & ops ----------
class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    currency: Mapped[str] = mapped_column(String(8), index=True)
    toman: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    sources: Mapped[list] = mapped_column(JSON)  # [{name, value, ok, ms}]
    healthy: Mapped[bool] = mapped_column(Boolean, default=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    actor_type: Mapped[str] = mapped_column(String(10), default="user")  # user / ai / system
    action: Mapped[str] = mapped_column(String(80))
    target: Mapped[str | None] = mapped_column(String(120))
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    ip: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

class Setting(Base, Tenanted):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)
