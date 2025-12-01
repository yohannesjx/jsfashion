--
-- PostgreSQL database dump
--


-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    role character varying(50) DEFAULT 'viewer'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admin_users OWNER TO postgres;

--
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admin_users_id_seq OWNER TO postgres;

--
-- Name: admin_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;


--
-- Name: banners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.banners (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    image character varying(512) NOT NULL,
    link character varying(512) DEFAULT ''::character varying NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.banners OWNER TO postgres;

--
-- Name: banners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.banners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.banners_id_seq OWNER TO postgres;

--
-- Name: banners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.banners_id_seq OWNED BY public.banners.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    image character varying(512) DEFAULT ''::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: coupon_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupon_usage (
    id bigint NOT NULL,
    coupon_id bigint,
    customer_id uuid,
    order_id uuid,
    discount_amount numeric(10,2) NOT NULL,
    used_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.coupon_usage OWNER TO postgres;

--
-- Name: coupon_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.coupon_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.coupon_usage_id_seq OWNER TO postgres;

--
-- Name: coupon_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.coupon_usage_id_seq OWNED BY public.coupon_usage.id;


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupons (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    value numeric(10,2) NOT NULL,
    min_order_value numeric(10,2),
    max_discount numeric(10,2),
    usage_limit integer,
    usage_count integer DEFAULT 0,
    single_use_per_customer boolean DEFAULT false,
    applicable_products bigint[],
    applicable_categories bigint[],
    starts_at timestamp without time zone,
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT coupons_type_check CHECK (((type)::text = ANY ((ARRAY['percentage'::character varying, 'fixed'::character varying])::text[])))
);


ALTER TABLE public.coupons OWNER TO postgres;

--
-- Name: coupons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.coupons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.coupons_id_seq OWNER TO postgres;

--
-- Name: coupons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.coupons_id_seq OWNED BY public.coupons.id;


--
-- Name: customer_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_notes (
    id bigint NOT NULL,
    customer_id uuid,
    user_id bigint,
    note text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_notes OWNER TO postgres;

--
-- Name: customer_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customer_notes_id_seq OWNER TO postgres;

--
-- Name: customer_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_notes_id_seq OWNED BY public.customer_notes.id;


--
-- Name: customer_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_tags (
    id bigint NOT NULL,
    customer_id uuid,
    tag character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_tags OWNER TO postgres;

--
-- Name: customer_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customer_tags_id_seq OWNER TO postgres;

--
-- Name: customer_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_tags_id_seq OWNED BY public.customer_tags.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    email character varying(255),
    phone character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    lifetime_value numeric(12,2) DEFAULT 0,
    total_orders integer DEFAULT 0,
    last_order_date timestamp without time zone,
    segment character varying(50)
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: daily_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_stats (
    id bigint NOT NULL,
    date date NOT NULL,
    revenue numeric(12,2) DEFAULT 0,
    orders_count integer DEFAULT 0,
    new_customers integer DEFAULT 0,
    returning_customers integer DEFAULT 0,
    avg_order_value numeric(10,2),
    conversion_rate numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.daily_stats OWNER TO postgres;

--
-- Name: daily_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.daily_stats_id_seq OWNER TO postgres;

--
-- Name: daily_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_stats_id_seq OWNED BY public.daily_stats.id;


--
-- Name: goadmin_menu_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_menu_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_menu_myid_seq OWNER TO postgres;

--
-- Name: goadmin_menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_menu (
    id integer DEFAULT nextval('public.goadmin_menu_myid_seq'::regclass) NOT NULL,
    parent_id integer DEFAULT 0 NOT NULL,
    type integer DEFAULT 0,
    "order" integer DEFAULT 0 NOT NULL,
    title character varying(50) NOT NULL,
    header character varying(100),
    plugin_name character varying(100) NOT NULL,
    icon character varying(50) NOT NULL,
    uri character varying(3000) NOT NULL,
    uuid character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_menu OWNER TO postgres;

--
-- Name: goadmin_operation_log_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_operation_log_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_operation_log_myid_seq OWNER TO postgres;

--
-- Name: goadmin_operation_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_operation_log (
    id integer DEFAULT nextval('public.goadmin_operation_log_myid_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    path character varying(255) NOT NULL,
    method character varying(10) NOT NULL,
    ip character varying(15) NOT NULL,
    input text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_operation_log OWNER TO postgres;

--
-- Name: goadmin_permissions_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_permissions_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_permissions_myid_seq OWNER TO postgres;

--
-- Name: goadmin_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_permissions (
    id integer DEFAULT nextval('public.goadmin_permissions_myid_seq'::regclass) NOT NULL,
    name character varying(50) NOT NULL,
    slug character varying(50) NOT NULL,
    http_method character varying(255),
    http_path text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_permissions OWNER TO postgres;

--
-- Name: goadmin_role_menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_role_menu (
    role_id integer NOT NULL,
    menu_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_role_menu OWNER TO postgres;

--
-- Name: goadmin_role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_role_permissions OWNER TO postgres;

--
-- Name: goadmin_role_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_role_users (
    role_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_role_users OWNER TO postgres;

--
-- Name: goadmin_roles_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_roles_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_roles_myid_seq OWNER TO postgres;

--
-- Name: goadmin_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_roles (
    id integer DEFAULT nextval('public.goadmin_roles_myid_seq'::regclass) NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_roles OWNER TO postgres;

--
-- Name: goadmin_session_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_session_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_session_myid_seq OWNER TO postgres;

--
-- Name: goadmin_session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_session (
    id integer DEFAULT nextval('public.goadmin_session_myid_seq'::regclass) NOT NULL,
    sid character varying(50) NOT NULL,
    "values" character varying(3000) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_session OWNER TO postgres;

--
-- Name: goadmin_site_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_site_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_site_myid_seq OWNER TO postgres;

--
-- Name: goadmin_site; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_site (
    id integer DEFAULT nextval('public.goadmin_site_myid_seq'::regclass) NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    type integer DEFAULT 0,
    description character varying(3000),
    state integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_site OWNER TO postgres;

--
-- Name: goadmin_user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_user_permissions (
    user_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_user_permissions OWNER TO postgres;

--
-- Name: goadmin_users_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_users_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_users_myid_seq OWNER TO postgres;

--
-- Name: goadmin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_users (
    id integer DEFAULT nextval('public.goadmin_users_myid_seq'::regclass) NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    name character varying(100) NOT NULL,
    avatar character varying(255),
    remember_token character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_users OWNER TO postgres;

--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_movements (
    id bigint NOT NULL,
    variant_id bigint,
    quantity_change integer NOT NULL,
    reason character varying(100),
    notes text,
    user_id bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_movements OWNER TO postgres;

--
-- Name: inventory_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_movements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_movements_id_seq OWNER TO postgres;

--
-- Name: inventory_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_movements_id_seq OWNED BY public.inventory_movements.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    user_id bigint,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text,
    link character varying(255),
    metadata jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    variant_id bigint NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_method character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prices (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    variant_id bigint,
    amount bigint,
    currency character varying(3)
);


ALTER TABLE public.prices OWNER TO postgres;

--
-- Name: prices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.prices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.prices_id_seq OWNER TO postgres;

--
-- Name: prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.prices_id_seq OWNED BY public.prices.id;


--
-- Name: product_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_analytics (
    id bigint NOT NULL,
    product_id bigint,
    date date NOT NULL,
    views integer DEFAULT 0,
    add_to_cart integer DEFAULT 0,
    purchases integer DEFAULT 0,
    revenue numeric(12,2) DEFAULT 0
);


ALTER TABLE public.product_analytics OWNER TO postgres;

--
-- Name: product_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_analytics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.product_analytics_id_seq OWNER TO postgres;

--
-- Name: product_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_analytics_id_seq OWNED BY public.product_analytics.id;


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_categories (
    product_id integer NOT NULL,
    category_id integer NOT NULL
);


ALTER TABLE public.product_categories OWNER TO postgres;

--
-- Name: product_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_images (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    product_id bigint,
    url character varying(512) NOT NULL,
    "position" bigint DEFAULT 0
);


ALTER TABLE public.product_images OWNER TO postgres;

--
-- Name: product_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.product_images_id_seq OWNER TO postgres;

--
-- Name: product_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_images_id_seq OWNED BY public.product_images.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    thumbnail character varying(512),
    active boolean DEFAULT true,
    seo_title character varying(255),
    seo_description text,
    seo_keywords text,
    tags text[],
    featured boolean DEFAULT false,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id bigint NOT NULL,
    user_id bigint,
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.refresh_tokens_id_seq OWNER TO postgres;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variants (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    product_id bigint,
    name character varying(255) NOT NULL,
    sku character varying(255) NOT NULL,
    image character varying(512),
    stock bigint DEFAULT 0,
    active boolean DEFAULT true,
    display_order integer DEFAULT 0
);


ALTER TABLE public.variants OWNER TO postgres;

--
-- Name: variants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.variants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.variants_id_seq OWNER TO postgres;

--
-- Name: variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.variants_id_seq OWNED BY public.variants.id;


--
-- Name: warehouse_stock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_stock (
    id bigint NOT NULL,
    warehouse_id bigint,
    variant_id bigint,
    quantity integer DEFAULT 0,
    low_stock_threshold integer DEFAULT 10,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.warehouse_stock OWNER TO postgres;

--
-- Name: warehouse_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warehouse_stock_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.warehouse_stock_id_seq OWNER TO postgres;

--
-- Name: warehouse_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warehouse_stock_id_seq OWNED BY public.warehouse_stock.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    location character varying(255),
    address text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warehouses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.warehouses_id_seq OWNER TO postgres;

--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: admin_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users ALTER COLUMN id SET DEFAULT nextval('public.admin_users_id_seq'::regclass);


--
-- Name: banners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banners ALTER COLUMN id SET DEFAULT nextval('public.banners_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: coupon_usage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_usage ALTER COLUMN id SET DEFAULT nextval('public.coupon_usage_id_seq'::regclass);


--
-- Name: coupons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons ALTER COLUMN id SET DEFAULT nextval('public.coupons_id_seq'::regclass);


--
-- Name: customer_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_notes ALTER COLUMN id SET DEFAULT nextval('public.customer_notes_id_seq'::regclass);


--
-- Name: customer_tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_tags ALTER COLUMN id SET DEFAULT nextval('public.customer_tags_id_seq'::regclass);


--
-- Name: daily_stats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stats ALTER COLUMN id SET DEFAULT nextval('public.daily_stats_id_seq'::regclass);


--
-- Name: inventory_movements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements ALTER COLUMN id SET DEFAULT nextval('public.inventory_movements_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prices ALTER COLUMN id SET DEFAULT nextval('public.prices_id_seq'::regclass);


--
-- Name: product_analytics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_analytics ALTER COLUMN id SET DEFAULT nextval('public.product_analytics_id_seq'::regclass);


--
-- Name: product_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images ALTER COLUMN id SET DEFAULT nextval('public.product_images_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: variants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variants ALTER COLUMN id SET DEFAULT nextval('public.variants_id_seq'::regclass);


--
-- Name: warehouse_stock id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_stock ALTER COLUMN id SET DEFAULT nextval('public.warehouse_stock_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: coupon_usage coupon_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: customer_notes customer_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_pkey PRIMARY KEY (id);


--
-- Name: customer_tags customer_tags_customer_id_tag_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_tags
    ADD CONSTRAINT customer_tags_customer_id_tag_key UNIQUE (customer_id, tag);


--
-- Name: customer_tags customer_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_tags
    ADD CONSTRAINT customer_tags_pkey PRIMARY KEY (id);


--
-- Name: customers customers_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_email_key UNIQUE (email);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: daily_stats daily_stats_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_date_key UNIQUE (date);


--
-- Name: daily_stats daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (id);


--
-- Name: goadmin_menu goadmin_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_menu
    ADD CONSTRAINT goadmin_menu_pkey PRIMARY KEY (id);


--
-- Name: goadmin_operation_log goadmin_operation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_operation_log
    ADD CONSTRAINT goadmin_operation_log_pkey PRIMARY KEY (id);


--
-- Name: goadmin_permissions goadmin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_permissions
    ADD CONSTRAINT goadmin_permissions_pkey PRIMARY KEY (id);


--
-- Name: goadmin_roles goadmin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_roles
    ADD CONSTRAINT goadmin_roles_pkey PRIMARY KEY (id);


--
-- Name: goadmin_session goadmin_session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_session
    ADD CONSTRAINT goadmin_session_pkey PRIMARY KEY (id);


--
-- Name: goadmin_site goadmin_site_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_site
    ADD CONSTRAINT goadmin_site_pkey PRIMARY KEY (id);


--
-- Name: goadmin_users goadmin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_users
    ADD CONSTRAINT goadmin_users_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);


--
-- Name: product_analytics product_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_pkey PRIMARY KEY (id);


--
-- Name: product_analytics product_analytics_product_id_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_product_id_date_key UNIQUE (product_id, date);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (product_id, category_id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: variants variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_pkey PRIMARY KEY (id);


--
-- Name: warehouse_stock warehouse_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_stock
    ADD CONSTRAINT warehouse_stock_pkey PRIMARY KEY (id);


--
-- Name: warehouse_stock warehouse_stock_warehouse_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_stock
    ADD CONSTRAINT warehouse_stock_warehouse_id_variant_id_key UNIQUE (warehouse_id, variant_id);


--
-- Name: warehouses warehouses_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_code_key UNIQUE (code);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_users_email ON public.admin_users USING btree (email);


--
-- Name: idx_admin_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_users_role ON public.admin_users USING btree (role);


--
-- Name: idx_coupon_usage_coupon; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coupon_usage_coupon ON public.coupon_usage USING btree (coupon_id);


--
-- Name: idx_coupon_usage_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coupon_usage_customer ON public.coupon_usage USING btree (customer_id);


--
-- Name: idx_coupon_usage_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coupon_usage_order ON public.coupon_usage USING btree (order_id);


--
-- Name: idx_coupons_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coupons_active ON public.coupons USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_coupons_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coupons_code ON public.coupons USING btree (code);


--
-- Name: idx_coupons_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coupons_expires ON public.coupons USING btree (expires_at);


--
-- Name: idx_customer_notes_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_notes_customer ON public.customer_notes USING btree (customer_id);


--
-- Name: idx_customer_tags_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_tags_customer ON public.customer_tags USING btree (customer_id);


--
-- Name: idx_customers_segment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_segment ON public.customers USING btree (segment);


--
-- Name: idx_daily_stats_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_stats_date ON public.daily_stats USING btree (date DESC);


--
-- Name: idx_inventory_movements_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_movements_created ON public.inventory_movements USING btree (created_at DESC);


--
-- Name: idx_inventory_movements_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_movements_variant ON public.inventory_movements USING btree (variant_id);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_customer ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_product_analytics_product_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_analytics_product_date ON public.product_analytics USING btree (product_id, date DESC);


--
-- Name: idx_products_featured; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_featured ON public.products USING btree (featured) WHERE (featured = true);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_sort_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_sort_order ON public.products USING btree (sort_order);


--
-- Name: idx_products_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_tags ON public.products USING gin (tags);


--
-- Name: idx_refresh_tokens_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_expires ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_variants_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_variants_sku ON public.variants USING btree (sku);


--
-- Name: idx_warehouse_stock_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouse_stock_variant ON public.warehouse_stock USING btree (variant_id);


--
-- Name: admin_users update_admin_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: coupons update_coupons_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_stats update_daily_stats_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_daily_stats_updated_at BEFORE UPDATE ON public.daily_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles update_roles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: warehouses update_warehouses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: coupon_usage coupon_usage_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: coupon_usage coupon_usage_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: coupon_usage coupon_usage_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: coupons coupons_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: customer_notes customer_notes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_notes customer_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id);


--
-- Name: customer_tags customer_tags_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_tags
    ADD CONSTRAINT customer_tags_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: product_images fk_products_images; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT fk_products_images FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: variants fk_products_variants; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT fk_products_variants FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: prices fk_variants_prices; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT fk_variants_prices FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: inventory_movements inventory_movements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id);


--
-- Name: inventory_movements inventory_movements_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: product_analytics product_analytics_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: warehouse_stock warehouse_stock_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_stock
    ADD CONSTRAINT warehouse_stock_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE;


--
-- Name: warehouse_stock warehouse_stock_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_stock
    ADD CONSTRAINT warehouse_stock_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--



