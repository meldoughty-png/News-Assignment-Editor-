import React, { useState, useEffect, useMemo, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { io, Socket } from "socket.io-client";
import { BrandSymbol } from './components/BrandSymbol';
import { jsPDF } from "jspdf";
import { 
  Calendar as CalendarIcon, 
  Users, 
  ClipboardList, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  User, 
  BarChart3,
  Search,
  CheckCircle2,
  Mail,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  LayoutGrid,
  List,
  Trash2,
  Filter,
  FileText,
  Lightbulb,
  X,
  ChevronDown,
  Settings,
  Radio,
  Globe,
  CreditCard,
  ShieldCheck,
  Zap,
  MessageSquare,
  Activity,
  TrendingUp,
  Hash,
  LogOut,
  Printer,
  FileDown
} from "lucide-react";

// Types
type LanguageCode = 'en' | 'es' | 'fr' | 'pt' | 'de' | 'it' | 'hi' | 'zh';
type SubscriptionTier = 'Free' | 'Pro' | 'Enterprise';

interface Newsroom {
  id: string;
  name: string;
  region: string;
  style: string;
  color: string;
  reporters: string[];
  language: LanguageCode;
  subscriptionTier: SubscriptionTier;
  paymentEmail?: string;
  bankDetails?: string;
  cryptoAddress?: string;
  ownerUid?: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  importance: 'High' | 'Medium' | 'Low';
  suggestedReporter: string;
  category: string;
  date: string; // YYYY-MM-DD
  newsroomId: string;
  dueDate?: string; // YYYY-MM-DD
  completed?: boolean;
  createdBy?: string;
  createdAt?: any;
}

export interface Article {
  id: string; // linked to assignment id
  assignmentId: string;
  title: string;
  subtitle: string;
  body: string;
  status: 'Draft' | 'In Progress' | 'Review' | 'Published';
  assignedReporter: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string; // ISO date
  collaborators: string[];
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'editor' | 'reporter';
  subscriptionTier: SubscriptionTier;
  createdAt: any;
}

type ReporterStatus = 'Available' | 'Busy' | 'On Leave';

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    livePressFeed: "Live Press Feed",
    scanForAnnouncements: "Scan for Announcements",
    autoSync: "Auto-Sync",
    updatesEvery5m: "Updates every 5m",
    lastAutoScan: "Last auto-scan",
    internalContext: "Internal Context",
    editorsDesk: "Editor's Desk",
    staffDirectory: "Staff Directory",
    addStaffMember: "Add Staff Member",
    newsroomManagement: "Newsroom Management",
    subscription: "Subscription",
    upgradeToPro: "Upgrade to Pro",
    language: "Language",
    assignments: "Assignments",
    shareBrief: "Share Brief",
    addManual: "Add Manual",
    suggested: "Suggested",
    importance: "Importance",
    category: "Category",
    reporter: "Reporter",
    dueDate: "Due Date",
    completed: "Completed",
    pending: "Pending",
    billing: "Billing & Charges",
    currentPlan: "Current Plan",
    manageBilling: "Manage Billing",
    securePayments: "Secure Payments via Stripe, PayPal & Google Wallet",
    pricingTitle: "Choose Your Plan",
    pricingSub: "Scale your newsroom with advanced AI capabilities",
    free: "Free",
    pro: "Pro",
    enterprise: "Enterprise",
    select: "Select Plan",
    current: "Current",
    perMonth: "/mo",
    features: "Features",
    aiScanning: "AI Real-time Scanning",
    multiLanguage: "Multi-language Support",
    unlimitedReporters: "Unlimited Reporters",
    prioritySupport: "Priority Support",
    customAI: "Custom AI Style Training",
    marketingKit: "Marketing Kit",
    adAssets: "Ad Assets",
    socialMedia: "Social Media",
    emailTemplates: "Email Templates",
    copyToClipboard: "Copy to Clipboard",
    marketingTitle: "Marketing & Ad Assets",
    marketingSub: "Professional assets to help you market Newsroom AI to global media organizations",
    adHeadline1: "Automate Your Newsroom with Real-Time AI",
    adBody1: "Scan global frequencies, manage assignments, and coordinate your staff with the world's first AI-native news assignment editor. Try Newsroom AI today.",
    adHeadline2: "The Future of Newsroom Management is Here",
    adBody2: "Stop manual tracking. Let AI handle the scanning while you focus on the storytelling. Multi-language support for global organizations.",
    emailHeadline1: "Transform Your Newsroom with AI-Native Management",
    emailBody1: "Dear Editor,\n\nIn today's fast-paced media landscape, staying ahead of the curve is no longer optional—it's a necessity. Introducing Newsroom AI, the world's first AI-native news assignment editor designed to streamline your editorial workflow.\n\nKey Capabilities:\n- Real-time AI scanning of global news frequencies.\n- Automated assignment suggestions based on your newsroom's unique style.\n- Multi-language support for regional and international coverage.\n- Seamless staff coordination and real-time collaboration.\n\nJoin the future of journalism today. Visit our dashboard to get started.\n\nBest regards,\nMelissa Doughty\nCreator of Newsroom AI",
    emailHeadline2: "Scale Your Media Organization with Newsroom AI",
    emailBody2: "Hello,\n\nManaging a modern newsroom requires more than just spreadsheets. It requires intelligence. Newsroom AI provides the tools you need to coordinate your reporters, track assignments, and discover breaking stories before they hit the wire.\n\nWhether you're a local newsroom in Trinidad and Tobago or a global media conglomerate, Newsroom AI scales with you. Our Enterprise tier offers custom AI model training and unlimited reporter seats.\n\nReady to elevate your editorial desk?\n\nExplore Newsroom AI: https://newsroom-ai.app\n\nSincerely,\nThe Newsroom AI Team",
    payPalSimple: "Pay via PayPal (No Key Required)",
    manualBank: "Manual Bank Transfer",
    invoiceInstructions: "Please transfer the amount to the bank details below. Your account will be upgraded once the transfer is confirmed.",
    confirmTransfer: "I have sent the transfer",
    paymentEmailLabel: "Payment Email (PayPal)",
    bankDetailsLabel: "Bank Details (Wire Transfer)",
    cryptoAddressLabel: "Crypto Wallet Address (BTC/ETH)",
    manualInstructionsTitle: "Manual Payment Instructions",
    cryptoPayment: "Pay with Crypto",
    tagline: "Making it easier to share the news",
    worldNews: "World News",
    followUp: "Follow-up Required",
    amendDate: "Amend Date",
  },
  es: {
    livePressFeed: "Feed de Prensa en Vivo",
    scanForAnnouncements: "Escanear Anuncios",
    autoSync: "Sincronización Automática",
    updatesEvery5m: "Actualiza cada 5m",
    lastAutoScan: "Último escaneo",
    internalContext: "Contexto Interno",
    editorsDesk: "Mesa del Editor",
    staffDirectory: "Directorio de Personal",
    addStaffMember: "Agregar Miembro",
    newsroomManagement: "Gestión de Redacción",
    subscription: "Suscripción",
    upgradeToPro: "Mejorar a Pro",
    language: "Idioma",
    assignments: "Asignaciones",
    shareBrief: "Compartir Resumen",
    addManual: "Agregar Manual",
    suggested: "Sugerido",
    importance: "Importancia",
    category: "Categoría",
    reporter: "Reportero",
    dueDate: "Fecha de Entrega",
    completed: "Completado",
    pending: "Pendiente",
    billing: "Facturación y Cargos",
    currentPlan: "Plan Actual",
    manageBilling: "Gestionar Facturación",
    pricingTitle: "Elige tu Plan",
    pricingSub: "Escala tu redacción con capacidades avanzadas de IA",
    free: "Gratis",
    pro: "Pro",
    enterprise: "Empresa",
    select: "Seleccionar Plan",
    current: "Actual",
    perMonth: "/mes",
    features: "Características",
    aiScanning: "Escaneo de IA en tiempo real",
    multiLanguage: "Soporte multi-idioma",
    unlimitedReporters: "Reporteros ilimitados",
    prioritySupport: "Soporte prioritario",
    customAI: "Entrenamiento de estilo de IA personalizado",
    paymentEmailLabel: "Correo de Pago (PayPal)",
    bankDetailsLabel: "Detalles Bancarios (Transferencia)",
    cryptoAddressLabel: "Dirección de Cripto (BTC/ETH)",
    manualInstructionsTitle: "Instrucciones de Pago Manual",
    cryptoPayment: "Pagar con Cripto",
    securePayments: "Pagos Seguros",
    tagline: "Haciendo más fácil compartir las noticias",
    worldNews: "Noticias del Mundo",
    followUp: "Seguimiento Requerido",
    amendDate: "Enmendar Fecha",
  },
  fr: {
    livePressFeed: "Flux de Presse en Direct",
    scanForAnnouncements: "Scanner les Annonces",
    autoSync: "Auto-Sincronisation",
    updatesEvery5m: "Mise à jour toutes les 5m",
    lastAutoScan: "Dernier scan",
    internalContext: "Contexte Interne",
    editorsDesk: "Bureau de l'Éditeur",
    staffDirectory: "Répertoire du Personnel",
    addStaffMember: "Ajouter un Membre",
    newsroomManagement: "Gestion de la Rédaction",
    subscription: "Abonnement",
    upgradeToPro: "Passer à Pro",
    language: "Langue",
    assignments: "Missions",
    shareBrief: "Partager le Brief",
    addManual: "Ajouter Manuel",
    suggested: "Suggéré",
    importance: "Importance",
    category: "Catégorie",
    reporter: "Reporter",
    dueDate: "Date d'Échéance",
    completed: "Terminé",
    pending: "En attente",
    billing: "Facturation et Frais",
    currentPlan: "Plan Actuel",
    manageBilling: "Gérer la Facturation",
    pricingTitle: "Choisissez votre forfait",
    pricingSub: "Faites évoluer votre rédaction avec des capacités d'IA avancées",
    free: "Gratuit",
    pro: "Pro",
    enterprise: "Entreprise",
    select: "Choisir le forfait",
    current: "Actuel",
    perMonth: "/mois",
    features: "Fonctionnalités",
    aiScanning: "Analyse IA en temps réel",
    multiLanguage: "Support multilingue",
    unlimitedReporters: "Reporters illimités",
    prioritySupport: "Support prioritaire",
    customAI: "Entraînement de style IA personnalisé",
    tagline: "Faciliter le partage des nouvelles",
  },
  pt: {
    livePressFeed: "Feed de Imprensa ao Vivo",
    scanForAnnouncements: "Escanear Anúncios",
    autoSync: "Sincronização Automática",
    updatesEvery5m: "Atualiza a cada 5m",
    lastAutoScan: "Último escaneamento",
    internalContext: "Contexto Interno",
    editorsDesk: "Mesa do Editor",
    staffDirectory: "Diretório de Equipe",
    addStaffMember: "Adicionar Membro",
    newsroomManagement: "Gestão da Redação",
    subscription: "Assinatura",
    upgradeToPro: "Atualizar para Pro",
    language: "Idioma",
    assignments: "Tarefas",
    shareBrief: "Compartilhar Resumo",
    addManual: "Adicionar Manual",
    suggested: "Sugerido",
    importance: "Importância",
    category: "Categoria",
    reporter: "Repórter",
    dueDate: "Data de Entrega",
    completed: "Concluído",
    pending: "Pendente",
    billing: "Faturamento e Cobranças",
    currentPlan: "Plano Atual",
    manageBilling: "Gerenciar Faturamento",
    pricingTitle: "Escolha seu Plano",
    pricingSub: "Escale sua redação com capacidades avançadas de IA",
    free: "Grátis",
    pro: "Pro",
    enterprise: "Empresa",
    select: "Selecionar Plano",
    current: "Atual",
    perMonth: "/mês",
    features: "Recursos",
    aiScanning: "Varredura de IA em tempo real",
    multiLanguage: "Suporte multi-idioma",
    unlimitedReporters: "Repórteres ilimitados",
    prioritySupport: "Suporte prioritário",
    customAI: "Treinamento de estilo de IA personalizado",
    tagline: "Tornando mais fácil compartilhar as notícias",
  },
  de: {
    livePressFeed: "Live-Presse-Feed",
    scanForAnnouncements: "Nach Ankündigungen suchen",
    autoSync: "Auto-Synchronisierung",
    updatesEvery5m: "Aktualisierung alle 5 Min.",
    lastAutoScan: "Letzter Scan",
    internalContext: "Interner Kontext",
    editorsDesk: "Redaktionsschreibtisch",
    staffDirectory: "Personalverzeichnis",
    addStaffMember: "Mitarbeiter hinzufügen",
    newsroomManagement: "Redaktionsverwaltung",
    subscription: "Abonnement",
    upgradeToPro: "Auf Pro upgraden",
    language: "Sprache",
    assignments: "Aufgaben",
    shareBrief: "Briefing teilen",
    addManual: "Manuell hinzufügen",
    suggested: "Vorgeschlagen",
    importance: "Wichtigkeit",
    category: "Kategorie",
    reporter: "Reporter",
    dueDate: "Fälligkeitsdatum",
    completed: "Abgeschlossen",
    pending: "Ausstehend",
    billing: "Abrechnung & Gebühren",
    currentPlan: "Aktueller Plan",
    manageBilling: "Abrechnung verwalten",
    pricingTitle: "Wählen Sie Ihren Plan",
    pricingSub: "Skalieren Sie Ihre Redaktion mit fortschrittlichen KI-Funktionen",
    free: "Kostenlos",
    pro: "Pro",
    enterprise: "Unternehmen",
    select: "Plan auswählen",
    current: "Aktuell",
    perMonth: "/Mon.",
    features: "Funktionen",
    aiScanning: "KI-Echtzeit-Scanning",
    multiLanguage: "Mehrsprachige Unterstützung",
    unlimitedReporters: "Unbegrenzte Reporter",
    prioritySupport: "Priorisierter Support",
    customAI: "Benutzerdefiniertes KI-Stiltraining",
    tagline: "Das Teilen von Nachrichten einfacher machen",
  },
  it: {
    livePressFeed: "Feed Stampa dal Vivo",
    scanForAnnouncements: "Scansiona Annunci",
    autoSync: "Sincronizzazione Automatica",
    updatesEvery5m: "Aggiorna ogni 5m",
    lastAutoScan: "Ultima scansione",
    internalContext: "Contesto Interno",
    editorsDesk: "Scrivania dell'Editore",
    staffDirectory: "Elenco del Personale",
    addStaffMember: "Aggiungi Membro",
    newsroomManagement: "Gestione Redazione",
    subscription: "Abbonamento",
    upgradeToPro: "Passa a Pro",
    language: "Lingua",
    assignments: "Incarichi",
    shareBrief: "Condividi Brief",
    addManual: "Aggiungi Manuale",
    suggested: "Suggerito",
    importance: "Importanza",
    category: "Categoria",
    reporter: "Reporter",
    dueDate: "Data di Scadenza",
    completed: "Completato",
    pending: "In attesa",
    billing: "Fatturazione e Costi",
    currentPlan: "Piano Attuale",
    manageBilling: "Gestisci Fatturazione",
    pricingTitle: "Scegli il tuo piano",
    pricingSub: "Scala la tua redazione con capacità IA avanzate",
    free: "Gratis",
    pro: "Pro",
    enterprise: "Enterprise",
    select: "Seleziona piano",
    current: "Attuale",
    perMonth: "/mese",
    features: "Caratteristiche",
    aiScanning: "Scansione IA in tempo reale",
    multiLanguage: "Supporto multilingue",
    unlimitedReporters: "Reporter illimitati",
    prioritySupport: "Supporto prioritario",
    customAI: "Addestramento stile IA personalizzato",
    tagline: "Rendere più facile condividere le notizie",
  },
  hi: {
    livePressFeed: "लाइव प्रेस फीड",
    scanForAnnouncements: "घोषणाओं के लिए स्कैन करें",
    autoSync: "ऑटो-सिंक",
    updatesEvery5m: "हर 5 मिनट में अपडेट",
    lastAutoScan: "अंतिम ऑटो-स्कैन",
    internalContext: "आंतरिक संदर्भ",
    editorsDesk: "संपादक की डेस्क",
    staffDirectory: "स्टाफ निर्देशिका",
    addStaffMember: "स्टाफ सदस्य जोड़ें",
    newsroomManagement: "न्यूज़रूम प्रबंधन",
    subscription: "सदस्यता",
    upgradeToPro: "प्रो में अपग्रेड करें",
    language: "भाषा",
    assignments: "कार्य",
    shareBrief: "ब्रीफ साझा करें",
    addManual: "मैन्युअल जोड़ें",
    suggested: "सुझाया गया",
    importance: "महत्व",
    category: "श्रेणी",
    reporter: "रिपोर्टर",
    dueDate: "नियत तिथि",
    completed: "पूरा हुआ",
    pending: "लंबित",
    billing: "बिलिंग और शुल्क",
    currentPlan: "वर्तमान योजना",
    manageBilling: "बिलिंग प्रबंधित करें",
    pricingTitle: "अपनी योजना चुनें",
    pricingSub: "उन्नत AI क्षमताओं के साथ अपने न्यूज़रूम को स्केल करें",
    free: "मुफ़्त",
    pro: "प्रो",
    enterprise: "एंटरप्राइज",
    select: "योजना चुनें",
    current: "वर्तमान",
    perMonth: "/माह",
    features: "विशेषताएं",
    aiScanning: "AI रीयल-टाइम स्कैनिंग",
    multiLanguage: "बहु-भाषा समर्थन",
    unlimitedReporters: "असीमित रिपोर्टर",
    prioritySupport: "प्राथमिकता समर्थन",
    customAI: "कस्टम AI स्टाइल ट्रेनिंग",
    tagline: "समाचार साझा करना आसान बनाना",
  },
  zh: {
    livePressFeed: "实时新闻源",
    scanForAnnouncements: "扫描公告",
    autoSync: "自动同步",
    updatesEvery5m: "每5分钟更新一次",
    lastAutoScan: "上次自动扫描",
    internalContext: "内部背景",
    editorsDesk: "编辑台",
    staffDirectory: "员工目录",
    addStaffMember: "添加员工",
    newsroomManagement: "新闻编辑室管理",
    subscription: "订阅",
    upgradeToPro: "升级到专业版",
    language: "语言",
    assignments: "任务",
    shareBrief: "分享简报",
    addManual: "手动添加",
    suggested: "建议",
    importance: "重要性",
    category: "类别",
    reporter: "记者",
    截止日期: "截止日期",
    completed: "已完成",
    pending: "待处理",
    billing: "账单和费用",
    currentPlan: "当前计划",
    manageBilling: "管理账单",
    pricingTitle: "选择您的计划",
    pricingSub: "利用先进的 AI 能力扩展您的新闻编辑室",
    free: "免费",
    pro: "专业版",
    enterprise: "企业版",
    select: "选择计划",
    current: "当前",
    perMonth: "/月",
    features: "功能",
    aiScanning: "AI 实时扫描",
    multiLanguage: "多语言支持",
    unlimitedReporters: "无限记者",
    prioritySupport: "优先支持",
    customAI: "自定义 AI 风格训练",
    tagline: "让分享新闻变得更简单",
  }
};

const GEN_MODEL = "gemini-3-flash-preview";

const INITIAL_NEWSROOMS: Newsroom[] = [
  // Trinidad & Tobago
  { 
    id: 'guardian', 
    name: 'Trinidad Guardian', 
    region: 'Trinidad & Tobago',
    style: 'Traditional, business-oriented, comprehensive, "The Old Lady of St. Vincent Street"',
    color: '#1e40af',
    reporters: ['Shaliza Hassanali', 'Gail Alexander', 'Charles Kong Soo', 'Radhica De Silva'],
    language: 'en',
    subscriptionTier: 'Pro',
    paymentEmail: 'accounts@guardian.co.tt',
    bankDetails: 'First Citizens Bank\nAccount: 987654321\nBranch: Independence Square',
    cryptoAddress: '0xguardiancaribbeancryptoaddress'
  },
  { 
    id: 'express', 
    name: 'Trinidad Express', 
    region: 'Trinidad & Tobago',
    style: 'Investigative, hard-hitting, political commentary, independent',
    color: '#15803d',
    reporters: ['Anna Ramdass', 'Ria Taitt', 'Rickie Ramdass', 'Denyse Renne'],
    language: 'en',
    subscriptionTier: 'Enterprise',
    paymentEmail: 'news@trinidadexpress.com'
  },
  { 
    id: 'ttt', 
    name: 'TTT Live Online', 
    region: 'Trinidad & Tobago',
    style: 'National development, cultural heritage, government-aligned, educational',
    color: '#2563eb',
    reporters: ['DK Ragnauth', 'Stacy-Ann Providence', 'Mahalia Joseph-Wharton'],
    language: 'en',
    subscriptionTier: 'Free',
    paymentEmail: 'info@ttt.co.tt'
  },
  {
    id: 'cnc3',
    name: 'CNC3 News',
    region: 'Trinidad & Tobago',
    style: 'Visual storytelling, rapid breaking news, broadcast focus',
    color: '#dc2626',
    reporters: ['Francesca Hawkins', 'Khamal Georges', 'Sonia Noel'],
    language: 'en',
    subscriptionTier: 'Pro',
    paymentEmail: 'news@cnc3.co.tt'
  },
  // Caribbean
  {
    id: 'gleaner',
    name: 'The Gleaner',
    region: 'Caribbean (Jamaica)',
    style: 'Authoritative, investigative, historic significance',
    color: '#171717',
    reporters: ['Jovan Johnson', 'Livern Barrett', 'Damion Mitchell'],
    language: 'en',
    subscriptionTier: 'Enterprise',
    paymentEmail: 'editorial@gleanerjm.com'
  },
  {
    id: 'barbadostoday',
    name: 'Barbados Today',
    region: 'Caribbean (Barbados)',
    style: 'Digital-first, community-centric, rapid breaking news',
    color: '#0369a1',
    reporters: ['Marlon Madden', 'Krystal Penny Bowen', 'Emmanuel Joseph'],
    language: 'en',
    subscriptionTier: 'Free',
    paymentEmail: 'contact@barbadostoday.bb'
  },
  {
    id: 'stabroek',
    name: 'Stabroek News',
    region: 'Caribbean (Guyana)',
    style: 'Independent, focus on governance and human rights',
    color: '#1e3a8a',
    reporters: ['Dhanash Ramroop', 'Thandeka Percival'],
    language: 'en',
    subscriptionTier: 'Pro',
    paymentEmail: 'news@stabroeknews.com'
  },
  {
    id: 'loop',
    name: 'Loop News',
    region: 'Caribbean (Regional)',
    style: 'Hyper-local, mobile-first, lifestyle and breaking news',
    color: '#f97316',
    reporters: ['Dara Healy', 'Melissa Williams'],
    language: 'en',
    subscriptionTier: 'Free',
    paymentEmail: 'support@loopnews.com'
  },
  // North America
  {
    id: 'nytimes',
    name: 'The New York Times',
    region: 'North America',
    style: 'In-depth reporting, global influence, high journalistic standards',
    color: '#121212',
    reporters: ['Maggie Haberman', 'David Leonhardt', 'Ezra Klein'],
    language: 'en',
    subscriptionTier: 'Enterprise',
    paymentEmail: 'news-tips@nytimes.com'
  },
  {
    id: 'washingtonpost',
    name: 'The Washington Post',
    region: 'North America',
    style: 'Political focus, investigative, "Democracy Dies in Darkness"',
    color: '#000000',
    reporters: ['Bob Woodward', 'Taylor Lorenz', 'David Fahrenthold'],
    language: 'en',
    subscriptionTier: 'Enterprise',
    paymentEmail: 'tips@washpost.com'
  },
  {
    id: 'cnn',
    name: 'CNN',
    region: 'North America',
    style: '24-hour breaking news, global reach, multimedia focus',
    color: '#cc0000',
    reporters: ['Anderson Cooper', 'Christiane Amanpour', 'Jake Tapper'],
    language: 'en',
    subscriptionTier: 'Enterprise',
    paymentEmail: 'news@cnn.com'
  },
  {
    id: 'cbc',
    name: 'CBC News',
    region: 'North America',
    style: 'Public service, Canadian focus, diverse perspectives',
    color: '#e31837',
    reporters: ['Adrienne Arsenault', 'Ian Hanomansing'],
    language: 'en',
    subscriptionTier: 'Pro',
    paymentEmail: 'news@cbc.ca'
  },
  {
    id: 'ap',
    name: 'Associated Press',
    region: 'North America (Global)',
    style: 'Standard-setting, objective, widespread distribution',
    color: '#000000',
    reporters: ['Julie Pace', 'Daisy Veerasingham'],
    language: 'en',
    subscriptionTier: 'Enterprise',
    paymentEmail: 'info@ap.org'
  },
  // Europe
  {
    id: 'bbc',
    name: 'BBC News',
    region: 'Europe',
    style: 'Impartial, global perspective, public service broadcasting',
    color: '#bb1919',
    reporters: ['Lyse Doucet', 'Jeremy Bowen', 'Katya Adler'],
    language: 'en',
    subscriptionTier: 'Enterprise'
  },
  {
    id: 'reuters',
    name: 'Reuters',
    region: 'Europe (Global)',
    style: 'Fact-based, rapid, neutral, financial and political focus',
    color: '#ff8000',
    reporters: ['Stephen Adler', 'Alessandra Galloni'],
    language: 'en',
    subscriptionTier: 'Enterprise'
  },
  {
    id: 'guardian-uk',
    name: 'The Guardian',
    region: 'Europe',
    style: 'Progressive, investigative, independent ownership',
    color: '#052962',
    reporters: ['Jonathan Freedland', 'Marina Hyde', 'George Monbiot'],
    language: 'en',
    subscriptionTier: 'Enterprise'
  },
  {
    id: 'afp',
    name: 'Agence France-Presse',
    region: 'Europe',
    style: 'Global news agency, rapid, multilingual, objective',
    color: '#0055a4',
    reporters: ['Armelle De Rocquigny', 'Jean-Luc Testault'],
    language: 'fr',
    subscriptionTier: 'Enterprise'
  },
  {
    id: 'elpais',
    name: 'El País',
    region: 'Europe (Spain)',
    style: 'Spanish authority, global reach in Spanish-speaking world',
    color: '#121212',
    reporters: ['Pepa Bueno', 'Carlos E. Cué'],
    language: 'es',
    subscriptionTier: 'Pro'
  },
  {
    id: 'lemonde',
    name: 'Le Monde',
    region: 'Europe (France)',
    style: 'Intellectual, in-depth analysis, French authority',
    color: '#121212',
    reporters: ['Jérôme Fenoglio', 'Sylvie Kauffmann'],
    language: 'fr',
    subscriptionTier: 'Enterprise'
  },
  // Asia & Middle East
  {
    id: 'aljazeera',
    name: 'Al Jazeera',
    region: 'Asia & Middle East',
    style: 'Global South perspective, in-depth analysis, investigative',
    color: '#c2410c',
    reporters: ['Wael Al-Dahdouh', 'Kamahl Santamaria'],
    language: 'en',
    subscriptionTier: 'Enterprise'
  },
  {
    id: 'scmp',
    name: 'South China Morning Post',
    region: 'Asia & Middle East',
    style: 'China focus, regional authority, business and politics',
    color: '#000000',
    reporters: ['Gary Cheung', 'Jeffie Lam'],
    language: 'zh',
    subscriptionTier: 'Pro'
  },
  {
    id: 'timesofindia',
    name: 'The Times of India',
    region: 'Asia & Middle East',
    style: 'Mass circulation, comprehensive, diverse Indian coverage',
    color: '#121212',
    reporters: ['Sagarika Ghose', 'Rajdeep Sardesai'],
    language: 'hi',
    subscriptionTier: 'Pro'
  },
  {
    id: 'straitstimes',
    name: 'The Straits Times',
    region: 'Asia & Middle East (Singapore)',
    style: 'Regional authority, business focus, Southeast Asian perspective',
    color: '#000000',
    reporters: ['Warren Fernandez', 'Sumiko Tan'],
    language: 'en',
    subscriptionTier: 'Pro'
  },
  // Africa
  {
    id: 'premiumtimes',
    name: 'Premium Times',
    region: 'Africa',
    style: 'Investigative, governance focus, Nigerian authority',
    color: '#000000',
    reporters: ['Musikilu Mojeed', 'Nicholas Ibekwe'],
    language: 'en',
    subscriptionTier: 'Pro'
  },
  {
    id: 'mailguardian',
    name: 'Mail & Guardian',
    region: 'Africa',
    style: 'South African focus, investigative, independent',
    color: '#e31e24',
    reporters: ['Ferial Haffajee', 'Phillip de Wet'],
    language: 'en',
    subscriptionTier: 'Pro'
  },
  {
    id: 'dailymaverick',
    name: 'Daily Maverick',
    region: 'Africa (South Africa)',
    style: 'Investigative, hard-hitting, political commentary',
    color: '#000000',
    reporters: ['Branko Brkic', 'Ferial Haffajee'],
    language: 'en',
    subscriptionTier: 'Pro'
  },
  // Oceania
  {
    id: 'abc-au',
    name: 'ABC News Australia',
    region: 'Oceania',
    style: 'Public service, Australian focus, regional depth',
    color: '#000000',
    reporters: ['Leigh Sales', 'Stan Grant'],
    language: 'en',
    subscriptionTier: 'Enterprise'
  },
  {
    id: 'nzherald',
    name: 'NZ Herald',
    region: 'Oceania (New Zealand)',
    style: 'Comprehensive, local focus, investigative',
    color: '#000000',
    reporters: ['Shayne Currie', 'Audrey Young'],
    language: 'en',
    subscriptionTier: 'Pro'
  },
  // South & Central America
  {
    id: 'oglobo',
    name: 'O Globo',
    region: 'South America (Brazil)',
    style: 'Brazilian authority, comprehensive, political and cultural focus',
    color: '#1d4ed8',
    reporters: ['Merval Pereira', 'Miriam Leitão'],
    language: 'pt',
    subscriptionTier: 'Enterprise'
  },
  {
    id: 'lanacion',
    name: 'La Nación',
    region: 'South America (Argentina)',
    style: 'Conservative, traditional, in-depth political analysis',
    color: '#0f172a',
    reporters: ['Joaquín Morales Solá', 'Hugo Alconada Mon'],
    language: 'es',
    subscriptionTier: 'Pro'
  },
  // Additional Caribbean
  {
    id: 'thevoice',
    name: 'The Voice of Saint Lucia',
    region: 'Caribbean (St. Lucia)',
    style: 'Community-focused, historic, local advocacy',
    color: '#0ea5e9',
    reporters: ['Stan Bishop', 'Catherine Morris'],
    language: 'en',
    subscriptionTier: 'Free'
  },
  {
    id: 'newtoday',
    name: 'The New Today',
    region: 'Caribbean (Grenada)',
    style: 'Independent, political analysis, local news',
    color: '#15803d',
    reporters: ['George Worme', 'Linda Straker'],
    language: 'en',
    subscriptionTier: 'Free'
  },
  {
    id: 'nouvelliste',
    name: 'Le Nouvelliste',
    region: 'Caribbean (Haiti)',
    style: 'Authoritative, French-language, historic significance',
    color: '#b91c1c',
    reporters: ['Frantz Duval', 'Roberson Alphonse'],
    language: 'fr',
    subscriptionTier: 'Enterprise'
  },
  {
    id: 'bvinews',
    name: 'BVI News',
    region: 'Caribbean (BVI)',
    style: 'Digital-first, breaking news, community updates',
    color: '#1d4ed8',
    reporters: ['Ron Grant', 'Kamal Haynes'],
    language: 'en',
    subscriptionTier: 'Pro'
  },
  {
    id: 'curacaochronicle',
    name: 'Curaçao Chronicle',
    region: 'Caribbean (Curacao)',
    style: 'English-language, business and tourism focus',
    color: '#0369a1',
    reporters: ['Dick Drayer', 'Jacintha Constancia'],
    language: 'en',
    subscriptionTier: 'Pro'
  },
  {
    id: 'bonairenu',
    name: 'Bonaire.nu',
    region: 'Caribbean (Bonaire)',
    style: 'Local news, Dutch and Papiamento focus',
    color: '#f59e0b',
    reporters: ['Harald Linkels', 'Belinda van der Gaag'],
    language: 'en',
    subscriptionTier: 'Free'
  },
  {
    id: 'arubatoday',
    name: 'Aruba Today',
    region: 'Caribbean (Aruba)',
    style: 'Tourism-focused, English-language daily',
    color: '#0891b2',
    reporters: ['Linda Reijnders', 'Ken Wolff'],
    language: 'en',
    subscriptionTier: 'Free'
  }
];

export default function App() {
  const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showSyncDropdown, setShowSyncDropdown] = useState(false);
  const [newsrooms, setNewsrooms] = useState<Newsroom[]>(INITIAL_NEWSROOMS);
  const [isManagingNewsrooms, setIsManagingNewsrooms] = useState(false);
  const [adminPayouts, setAdminPayouts] = useState<any[]>([]);
  const [platformRevenue, setPlatformRevenue] = useState(0);
  const [creatorDetails, setCreatorDetails] = useState({ paypal: '', bank: '', crypto: '' });
  const [isAdminTab, setIsAdminTab] = useState<'orgs' | 'payouts'>('orgs');
  const [showToSModal, setShowToSModal] = useState(false);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubmittingNewsletter, setIsSubmittingNewsletter] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [marketingTab, setMarketingTab] = useState<'assets' | 'outreach'>('assets');
  const [outreachEmail, setOutreachEmail] = useState('');
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [manualPaymentTier, setManualPaymentTier] = useState<SubscriptionTier | null>(null);
  const [showLanding, setShowLanding] = useState(true);

  const t = (key: string) => {
    const lang = selectedNewsroom?.language || 'en';
    return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || key;
  };

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio playback failed:', e));
  };
  const [newNewsroomForm, setNewNewsroomForm] = useState<Partial<Newsroom>>({
    name: '',
    region: '',
    style: '',
    color: '#3b82f6',
    reporters: [],
    language: 'en',
    subscriptionTier: 'Free',
    paymentEmail: '',
    bankDetails: '',
    cryptoAddress: ''
  });
  const [hideCompleted, setHideCompleted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, Assignment[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedNewsroom, setSelectedNewsroom] = useState(INITIAL_NEWSROOMS[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [worldNewsSuggestions, setWorldNewsSuggestions] = useState<Record<string, string>>({});
  const [isGeneratingWorldSuggestions, setIsGeneratingWorldSuggestions] = useState(false);
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({
    title: '',
    description: '',
    importance: 'Medium',
    category: 'General',
    dueDate: '',
    suggestedReporter: ''
  });
  const [newsroomStaff, setNewsroomStaff] = useState<Record<string, string[]>>(
    INITIAL_NEWSROOMS.reduce((acc, room) => ({ ...acc, [room.id]: room.reporters }), {})
  );
  const [internalContext, setInternalContext] = useState<string>("");
  const [editorsNotes, setEditorsNotes] = useState<string>("");
  const [longFormIdeas, setLongFormIdeas] = useState<string>("");
  const [reporterStatuses, setReporterStatuses] = useState<Record<string, ReporterStatus>>({});
  const [statusFilter, setStatusFilter] = useState<ReporterStatus | 'All'>('All');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  // Article Collaboration & Editing states
  const [articles, setArticles] = useState<Record<string, Article>>({});
  const [selectedArticleAssignment, setSelectedArticleAssignment] = useState<Assignment | null>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [editingAsReporter, setEditingAsReporter] = useState<string>("Editor-in-Chief");

  // Real-time Collaboration State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ id: string, name: string }>>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string, user: string, text: string, timestamp: number }>>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [activeEdits, setActiveEdits] = useState<Record<string, string>>({}); // assignmentTitle -> userName
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [isGeneratingTrending, setIsGeneratingTrending] = useState(false);
  const [sentimentResults, setSentimentResults] = useState<Record<string, { sentiment: string, score: number }>>({});
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || !selectedNewsroom) return;

    socket.emit("join", { 
      name: "Editor", // In a real app, this would be the logged-in user's name
      newsroomId: selectedNewsroom.id 
    });

    socket.on("users:update", (users: Array<{ id: string, name: string }>) => {
      setOnlineUsers(users);
    });

    socket.on("chat:history", (history: any[]) => {
      setChatMessages(history);
    });

    socket.on("chat:message", (message: any) => {
      setChatMessages(prev => [...prev, message]);
      if (!isChatOpen) playNotificationSound();
    });

    socket.on("activity:edit", ({ user, assignmentTitle }: { user: string, assignmentTitle: string }) => {
      setActiveEdits(prev => ({ ...prev, [assignmentTitle]: user }));
      // Clear after 3 seconds
      setTimeout(() => {
        setActiveEdits(prev => {
          const next = { ...prev };
          delete next[assignmentTitle];
          return next;
        });
      }, 3000);
    });

    return () => {
      socket.off("users:update");
      socket.off("chat:history");
      socket.off("chat:message");
      socket.off("activity:edit");
    };
  }, [socket, selectedNewsroom, isChatOpen]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const sendChatMessage = () => {
    if (!chatInput.trim() || !selectedNewsroom) return;
    
    const messageData = {
      id: Math.random().toString(36).substr(2, 9),
      user: 'Editor',
      text: chatInput,
      timestamp: Date.now(),
      newsroomId: selectedNewsroom.id
    };

    setChatMessages(prev => [...prev, messageData]);
    if (socket) {
      socket.emit("chat:message", messageData);
    }
    setChatInput("");
  };

  const broadcastEdit = (assignmentTitle: string) => {
    if (!socket) return;
    socket.emit("activity:edit", assignmentTitle);
  };

  const fetchTrendingTopics = async () => {
    setIsGeneratingTrending(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze current global and regional trends (focusing on ${selectedNewsroom.region}) to suggest 5 trending news topics for today. Provide them as a simple list of strings.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
      });
      setTrendingTopics(JSON.parse(response.text || "[]"));
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingTrending(false);
    }
  };

  const analyzeSentiment = async (assignmentId: string, title: string, description: string) => {
    setIsAnalyzingSentiment(assignmentId);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the social media sentiment for the following news topic: "${title}". Description: "${description}". Provide a sentiment label (Positive, Neutral, Negative) and a confidence score (0-100). Return as JSON.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentiment: { type: Type.STRING },
              score: { type: Type.NUMBER }
            },
            required: ["sentiment", "score"]
          }
        },
      });
      const result = JSON.parse(response.text || "{}");
      setSentimentResults(prev => ({ ...prev, [assignmentId]: result }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingSentiment(null);
    }
  };

  const fetchAdminPayouts = async () => {
    try {
      const res = await fetch('/api/admin/payouts');
      const data = await res.json();
      setAdminPayouts(data.payouts);
      setPlatformRevenue(data.platformRevenue);
      setCreatorDetails(data.creatorPayoutDetails || { paypal: '', bank: '', crypto: '' });
    } catch (e) {
      console.error("Failed to fetch payouts", e);
    }
  };

  const saveCreatorDetails = async () => {
    try {
      const res = await fetch('/api/admin/creator-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creatorDetails)
      });
      if (res.ok) alert('Creator payout details updated!');
    } catch (e) {
      console.error("Failed to save creator details", e);
    }
  };

  const processPayout = async (payoutId: string) => {
    try {
      const res = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId })
      });
      if (res.ok) {
        setAdminPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: 'Processed' } : p));
      }
    } catch (e) {
      console.error("Failed to process payout", e);
    }
  };

  useEffect(() => {
    if (isManagingNewsrooms && isAdminTab === 'payouts') {
      fetchAdminPayouts();
    }
  }, [isManagingNewsrooms, isAdminTab]);

  useEffect(() => {
    trackEvent('app_open');
  }, []);

  const trackEvent = async (type: 'newsroom' | 'assignment' | 'app_open' | 'newsletter_signup') => {
    try {
      await fetch(`/api/track/${type}`, { method: 'POST' });
    } catch (e) {
      console.error(`Failed to track ${type}`, e);
    }
  };

  const addNewsroom = () => {
    if (!newNewsroomForm.name || !newNewsroomForm.region) return;
    const id = newNewsroomForm.name.toLowerCase().replace(/\s+/g, '-');
    const newsroom: Newsroom = {
      id,
      name: newNewsroomForm.name,
      region: newNewsroomForm.region,
      style: newNewsroomForm.style || 'General',
      color: newNewsroomForm.color || '#3b82f6',
      reporters: newNewsroomForm.reporters || [],
      language: (newNewsroomForm.language as LanguageCode) || 'en',
      subscriptionTier: (newNewsroomForm.subscriptionTier as SubscriptionTier) || 'Free',
      paymentEmail: newNewsroomForm.paymentEmail,
      bankDetails: newNewsroomForm.bankDetails,
      cryptoAddress: newNewsroomForm.cryptoAddress
    };

    setNewsrooms(prev => [...prev, newsroom]);
    setNewNewsroomForm({ name: '', region: '', style: '', color: '#3b82f6', reporters: [], language: 'en', subscriptionTier: 'Free' });
    trackEvent('newsroom');
  };

  const deleteNewsroom = (id: string) => {
    if (newsrooms.length <= 1) return;
    setNewsrooms(prev => prev.filter(r => r.id !== id));
  };

  const selectedDateKey = selectedDate.toISOString().split('T')[0];
  const currentReporters = newsroomStaff[selectedNewsroom.id] || [];
  
  const filterAssignments = (assignments: Assignment[]) => 
    assignments.filter(event => {
      const isWorldNews = event.category === 'World News';
      const matchesNewsroom = event.newsroomId === selectedNewsroom.id || isWorldNews;
      
      const matchesSearch = 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.suggestedReporter.toLowerCase().includes(searchTerm.toLowerCase());
      
      const reporterStatus = reporterStatuses[event.suggestedReporter] || 'Available';
      const matchesStatus = statusFilter === 'All' || reporterStatus === statusFilter;
      
      const matchesCompletion = !hideCompleted || !event.completed;
      
      return matchesNewsroom && matchesSearch && matchesStatus && matchesCompletion;
    });

  const toggleAssignmentCompletion = (dateKey: string, title: string) => {
    setEvents(prev => {
      const dayEvents = prev[dateKey] || [];
      const updatedEvents = dayEvents.map(e => 
        e.title === title && (e.newsroomId === selectedNewsroom.id || e.category === 'World News')
          ? { ...e, completed: !e.completed } 
          : e
      );
      return { ...prev, [dateKey]: updatedEvents };
    });
  };

  const selectedDayEvents = filterAssignments(events[selectedDateKey] || []);

  const updateReporterName = (index: number, newName: string) => {
    setNewsroomStaff(prev => {
      const updated = [...prev[selectedNewsroom.id]];
      updated[index] = newName;
      return { ...prev, [selectedNewsroom.id]: updated };
    });
  };

  const reassignReporter = (dateKey: string, title: string, newReporter: string) => {
    setEvents(prev => {
      const dayEvents = prev[dateKey] || [];
      const updatedEvents = dayEvents.map(e => 
        e.title === title && e.newsroomId === selectedNewsroom.id 
          ? { ...e, suggestedReporter: newReporter } 
          : e
      );
      return { ...prev, [dateKey]: updatedEvents };
    });
  };

  const amendAssignmentDate = (oldDateKey: string, title: string, newDateKey: string) => {
    if (oldDateKey === newDateKey || !newDateKey) return;
    
    setEvents(prev => {
      const oldDayEvents = prev[oldDateKey] || [];
      const assignment = oldDayEvents.find(e => e.title === title && (e.newsroomId === selectedNewsroom.id || e.category === 'World News'));
      if (!assignment) return prev;

      const updatedOldDay = oldDayEvents.filter(e => !(e.title === title && (e.newsroomId === selectedNewsroom.id || e.category === 'World News')));
      const newDayEvents = prev[newDateKey] || [];
      const updatedNewDay = [{ ...assignment, date: newDateKey }, ...newDayEvents];

      return {
        ...prev,
        [oldDateKey]: updatedOldDay,
        [newDateKey]: updatedNewDay
      };
    });
  };

  const deleteAssignment = (dateKey: string, title: string) => {
    setEvents(prev => {
      const dayEvents = prev[dateKey] || [];
      const updatedEvents = dayEvents.filter(e => !(e.title === title && e.newsroomId === selectedNewsroom.id));
      return { ...prev, [dateKey]: updatedEvents };
    });
    setDeletingIdx(null);
  };

  const syncAssignments = async (range: 'Month' | 'Week' | 'Day', triggerNotification = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let timeContext = "";
      if (range === 'Month') {
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        const year = currentDate.getFullYear();
        timeContext = `the entire month of ${monthName} ${year}`;
      } else if (range === 'Week') {
        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - currentDate.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        timeContext = `the week of ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
      } else {
        timeContext = `the day of ${selectedDate.toLocaleDateString()}`;
      }

      const prompt = `
        Generate a comprehensive list of news assignments and major events for editors at "${selectedNewsroom.name}" covering ${selectedNewsroom.region} for ${timeContext}.
        
        CRITICAL: The assignments MUST reflect the specific editorial style and perspective of ${selectedNewsroom.name}: ${selectedNewsroom.style}.
        
        LANGUAGE: The output (titles, descriptions, categories) MUST be in ${selectedNewsroom.language === 'en' ? 'English' : selectedNewsroom.language === 'es' ? 'Spanish' : selectedNewsroom.language === 'fr' ? 'French' : selectedNewsroom.language === 'pt' ? 'Portuguese' : selectedNewsroom.language === 'de' ? 'German' : selectedNewsroom.language === 'it' ? 'Italian' : selectedNewsroom.language === 'hi' ? 'Hindi' : 'Chinese'}.
        
        Available Reporters for ${selectedNewsroom.name}: ${currentReporters.join(', ')}. 
        Please prefer assigning these reporters to the tasks.
        
        MANDATORY: Use Google Search to find real-time information from official government channels, press conference invitations, and official announcements relevant to ${selectedNewsroom.region} and significant global events.
        
        Include:
        1. Official government press conferences and media invitations.
        2. Major policy announcements and legislative sessions.
        3. Public holidays, cultural festivals, and community events.
        4. Court dates and significant political milestones.
        5. Global breaking news that impacts ${selectedNewsroom.region}.
        6. WORLD NEWS: Identify significant global stories that require follow-up or localized coverage for ${selectedNewsroom.region}. Categorize these specifically as "World News".
        
        ${internalContext ? `Incorporate this internal context: "${internalContext}"` : ""}
        ${editorsNotes ? `Editor's Notes & Suggestions: "${editorsNotes}"` : ""}
        ${longFormIdeas ? `Long Form & Feature Ideas to develop: "${longFormIdeas}"` : ""}
        
        For each assignment, provide:
        1. Title: Clear and concise.
        2. Description: Background and coverage angle.
        3. Importance: Scale of High, Medium, or Low.
        4. Suggested Reporter: One of the available reporters listed above.
        5. Category: e.g., Politics, Culture, Crime, Business.
        6. Date: The specific date in YYYY-MM-DD format within the specified time range.
        7. Due Date: Optional due date in YYYY-MM-DD format.
      `;

      const response = await ai.models.generateContent({
        model: GEN_MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                importance: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                suggestedReporter: { type: Type.STRING },
                category: { type: Type.STRING },
                date: { type: Type.STRING },
                dueDate: { type: Type.STRING }
              },
              required: ["title", "description", "importance", "suggestedReporter", "category", "date"]
            }
          }
        },
      });

      const result = (JSON.parse(response.text || "[]") as Assignment[]).map(event => ({
        ...event,
        id: Math.random().toString(36).substr(2, 9),
        newsroomId: selectedNewsroom.id,
        completed: false
      }));
      
      let addedNew = false;
      setEvents(prev => {
        const updatedEvents = { ...prev };
        result.forEach(event => {
          const dayKey = event.date;
          if (!updatedEvents[dayKey]) updatedEvents[dayKey] = [];
          if (!updatedEvents[dayKey].some(e => e.title === event.title && e.newsroomId === selectedNewsroom.id)) {
            updatedEvents[dayKey] = [event, ...updatedEvents[dayKey]];
            addedNew = true;
          }
        });
        return updatedEvents;
      });

      if (addedNew && triggerNotification) {
        playNotificationSound();
      }

      setLastUpdated(new Date().toLocaleTimeString());
      setLastSyncTime(new Date());
    } catch (err) {
      console.error(err);
      setError("Failed to synchronize with news frequencies. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  const sendOutreach = (email: string, template: 'editorial' | 'business') => {
    const subject = template === 'editorial' ? t('emailHeadline1') : t('emailHeadline2');
    const body = template === 'editorial' ? t('emailBody1') : t('emailBody2');
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleSubscriptionSelect = async (tier: SubscriptionTier, method: 'Stripe' | 'PayPal' | 'Manual' | 'Crypto' = 'Stripe') => {
    if (tier === 'Free') {
      setNewsrooms(prev => prev.map(r => r.id === selectedNewsroom.id ? { ...r, subscriptionTier: 'Free' } : r));
      setSelectedNewsroom(prev => ({ ...prev, subscriptionTier: 'Free' }));
      setShowSubscriptionModal(false);
      return;
    }

    if (method === 'Manual' || method === 'Crypto') {
      setManualPaymentTier(tier);
      setShowManualPaymentModal(true);
      return;
    }

    if (method === 'PayPal') {
      // Standard PayPal HTML Form (No Key Required)
      const businessEmail = selectedNewsroom.paymentEmail || 'billing@newsroomai.com';
      const amount = tier === 'Pro' ? '49.00' : '249.00';
      const itemName = `Newsroom AI ${tier} Subscription - ${selectedNewsroom.name}`;
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://www.paypal.com/cgi-bin/webscr';
      
      const fields = {
        cmd: '_xclick',
        business: businessEmail,
        item_name: itemName,
        amount: amount,
        currency_code: 'USD',
        no_shipping: '1',
        return: `${window.location.origin}/?success=true&newsroomId=${selectedNewsroom.id}&tier=${tier}`,
        cancel_return: `${window.location.origin}/?canceled=true`,
      };

      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, newsroomId: selectedNewsroom.id }),
      });
      const { url, error } = await response.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      console.error("Stripe Checkout Error:", err);
      setError("Failed to initiate checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Persistence and Auto-sync effects
  useEffect(() => {
    // Handle Stripe Success/Cancel
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const newsroomId = params.get('newsroomId');
      const tier = params.get('tier') as SubscriptionTier;
      if (newsroomId && tier) {
        setNewsrooms(prev => prev.map(r => r.id === newsroomId ? { ...r, subscriptionTier: tier } : r));
        // Update selected newsroom if it matches
        setSelectedNewsroom(prev => prev.id === newsroomId ? { ...prev, subscriptionTier: tier } : prev);
        setShowLanding(false); // Go straight to app
        // Clean URL
        window.history.replaceState({}, '', '/');
      }
    }

    const saved = localStorage.getItem('news_assignments_v1');
    if (saved) {
      try {
        setEvents(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved assignments", e);
      }
    }

    const savedArticles = localStorage.getItem('news_articles_v1');
    if (savedArticles) {
      try {
        setArticles(JSON.parse(savedArticles));
      } catch (e) {
        console.error("Failed to load saved articles", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('news_assignments_v1', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('news_articles_v1', JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoSyncEnabled) {
      // Initial sync on enable
      syncAssignments('Day', true);
      
      // Set up interval (every 5 minutes)
      interval = setInterval(() => {
        syncAssignments('Day', true);
      }, 5 * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoSyncEnabled, selectedNewsroom.id]);

  const shareBrief = () => {
    const dayEvents = filterAssignments(events[selectedDateKey] || []);
    if (dayEvents.length === 0) return;

    const text = dayEvents.map(a => 
      `[${a.importance.toUpperCase()}] ${a.title}\nCategory: ${a.category}\nReporter: ${a.suggestedReporter}\n${a.dueDate ? `Due Date: ${a.dueDate}\n` : ''}Description: ${a.description}\n`
    ).join('\n---\n\n');
    
    const suggestions = worldNewsSuggestions[`${selectedNewsroom.id}-${selectedDateKey}`];
    
    navigator.clipboard.writeText(`ASSIGNMENT BRIEF: ${selectedDateKey}\n\n${text}${suggestions ? `\n\nWORLD NEWS LOCALIZED ANGLES:\n${suggestions}` : ''}`);
    alert(`Brief for ${selectedDateKey} copied to clipboard.`);
  };

  const exportBriefPDF = () => {
    const dayEvents = filterAssignments(events[selectedDateKey] || []);
    if (dayEvents.length === 0) {
      alert("No assignments scheduled for this date to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const newsroomColor = selectedNewsroom.color || '#3b82f6';
    
    // Hex to rgb helper
    const hexToRgb = (hex: string) => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
      const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
      const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
      return { r, g, b };
    };
    
    const brandRgb = hexToRgb(newsroomColor);

    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);

    let y = 25;

    // Helper to add a new page and reset Y position
    const startNewPage = () => {
      doc.addPage();
      y = margin + 10;
    };

    // Helper to check for space and break to new page if needed
    const checkSpace = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin - 15) {
        startNewPage();
        return true;
      }
      return false;
    };

    // Draw top branding accent bar on First Page
    doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    doc.rect(margin, y, contentWidth, 3, "F");
    y += 8;

    // Document Header Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`${selectedNewsroom.name || 'Newsroom'}`, margin, y);
    y += 7;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("EDITORIAL DAILY ASSIGNMENT BRIEF", margin, y);
    y += 6;

    // Sub-header metadata
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    const metaStr = `DATE: ${selectedDateKey}   |   REGION: ${selectedNewsroom.region || 'General'}   |   STYLE: ${selectedNewsroom.style || 'Standard'}`;
    doc.text(metaStr, margin, y);
    y += 4;

    // Header dividing line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    // Priority Counters stats block
    const high = dayEvents.filter(e => e.importance === 'High').length;
    const med = dayEvents.filter(e => e.importance === 'Medium').length;
    const low = dayEvents.filter(e => e.importance === 'Low').length;

    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(margin, y, contentWidth, 12, "F");
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.rect(margin, y, contentWidth, 12, "S");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Total Assignments: ${dayEvents.length}`, margin + 5, y + 7.5);

    doc.setFont("Helvetica", "normal");
    const statsRightOffset = margin + contentWidth - 5;
    doc.text(`Low Priority: ${low}`, statsRightOffset - 25, y + 7.5);
    doc.text(`Medium Priority: ${med}`, statsRightOffset - 60, y + 7.5);
    doc.text(`High Priority: ${high}`, statsRightOffset - 90, y + 7.5);
    y += 20;

    // Assignments iteration
    dayEvents.forEach((item, index) => {
      // Split description text to fit pageWidth and calculate required lines
      const splitDesc = doc.splitTextToSize(item.description || "No description provided.", contentWidth - 10) as string[];
      const descLinesCount = splitDesc.length;
      const descHeight = descLinesCount * 4.5;
      
      // Calculate approximately how much height this assignment block will take
      // Title (6) + Metadata (5) + Desc (descHeight) + Space (12)
      const totalBlockHeight = 6 + 5 + descHeight + 12;

      checkSpace(totalBlockHeight);

      // Checkbox rectangle for physical tick-off (4x4 mm)
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.setLineWidth(0.3);
      const checkboxX = margin + contentWidth - 8;
      doc.rect(checkboxX, y - 1, 4, 4, "S");

      // Draw Importance highlight pill
      let impColor = { r: 100, g: 116, b: 139 }; // Slate
      if (item.importance === 'High') {
        impColor = { r: 225, g: 29, b: 72 }; // Red 600
      } else if (item.importance === 'Medium') {
        impColor = { r: 217, g: 119, b: 6 }; // Amber 600
      }
      doc.setFillColor(impColor.r, impColor.g, impColor.b);
      doc.rect(margin, y - 1, 14, 4.5, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(item.importance.toUpperCase(), margin + 2, y + 2.2);

      // Category tag next to priority
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(115, 115, 115); // gray-500
      doc.text(item.category.toUpperCase(), margin + 17, y + 2.4);

      y += 6;

      // Assignment title text
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(`${index + 1}. ${item.title}`, margin, y);
      y += 5.5;

      // Metadata information
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(115, 115, 115); // gray-500
      let metInfo = `Assigned Reporter: ${item.suggestedReporter || 'Unassigned'}`;
      if (item.dueDate) {
        metInfo += `   |   Due Date: ${item.dueDate}`;
      }
      if (item.completed) {
        metInfo += `   |   Status: Completed`;
      } else {
        metInfo += `   |   Status: Scheduled`;
      }
      doc.text(metInfo, margin, y);
      y += 5;

      // Description paragraphs rendering
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(64, 64, 64); // neutral-700
      splitDesc.forEach((line: string) => {
        checkSpace(6);
        doc.text(line, margin, y);
        y += 4.5;
      });

      y += 6;

      // Divider line under item
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setLineWidth(0.3);
      doc.line(margin, y - 2, margin + contentWidth, y - 2);
      y += 5;
    });

    // Check for world news localized suggestions
    const suggestions = worldNewsSuggestions[`${selectedNewsroom.id}-${selectedDateKey}`];
    if (suggestions) {
      checkSpace(35);
      
      y += 4;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b);
      doc.text("WORLD NEWS LOCALIZED ANGLES", margin, y);
      y += 5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("AI-generated localization options based on active global streams", margin, y);
      y += 4;

      doc.setDrawColor(brandRgb.r, brandRgb.g, brandRgb.b);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85); // slate-700
      
      const splitSug = doc.splitTextToSize(suggestions, contentWidth) as string[];
      splitSug.forEach((line: string) => {
        checkSpace(6);
        doc.text(line, margin, y);
        y += 4.8;
      });
    }

    // Decorate footer and page numbering on all pages
    const totalPageCount = doc.getNumberOfPages();
    for (let i = 1; i <= totalPageCount; i++) {
      doc.setPage(i);
      
      // Footer text row
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - margin, margin + contentWidth, pageHeight - margin);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Newsroom AI  |  ${selectedNewsroom.name || 'Daily Briefing (Confidential & Internal)'}`, margin, pageHeight - margin + 5);
      doc.text(`Page ${i} of ${totalPageCount}`, margin + contentWidth - 16, pageHeight - margin + 5);

      if (i > 1) {
        // Runner header for multi-page documents
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`${selectedNewsroom.name.toUpperCase()} DAILY BRIEFING — ${selectedDateKey}`, margin, margin);
        doc.line(margin, margin + 2, margin + contentWidth, margin + 2);
      }
    }

    // Trigger PDF download in browser
    doc.save(`NewsroomAI-Brief-${selectedDateKey}.pdf`);
  };

  const generateArticleDraftWithAI = async (assignment: Assignment) => {
    setIsGeneratingArticle(true);
    try {
      const response = await fetch("/api/articles/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: assignment.title,
          description: assignment.description,
          category: assignment.category,
          style: selectedNewsroom.style,
          region: selectedNewsroom.region
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate article draft.");
      }

      const generated = await response.json();

      const newArticle: Article = {
        id: assignment.id,
        assignmentId: assignment.id,
        title: generated.title || assignment.title,
        subtitle: generated.subtitle || "",
        body: generated.body || "",
        status: 'Draft',
        assignedReporter: assignment.suggestedReporter || editingAsReporter || "Editor-in-Chief",
        lastUpdatedBy: editingAsReporter,
        lastUpdatedAt: new Date().toISOString(),
        collaborators: [editingAsReporter]
      };

      setArticles(prev => ({
        ...prev,
        [assignment.id]: newArticle
      }));

    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to generate article draft. Please check server configuration.");
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  const openArticleEditor = (assignment: Assignment) => {
    setSelectedArticleAssignment(assignment);
    setIsArticleModalOpen(true);
    
    if (!articles[assignment.id]) {
      const skeleton: Article = {
        id: assignment.id,
        assignmentId: assignment.id,
        title: assignment.title,
        subtitle: "",
        body: `Reporter: ${assignment.suggestedReporter || 'Unassigned'}\n\n[Write the article draft here. You can click 'Generate Initial Draft with AI' to instantly write a professional journalist report based on the breaking news angle!]`,
        status: 'Draft',
        assignedReporter: assignment.suggestedReporter || "Editor-in-Chief",
        lastUpdatedBy: "Editor-in-Chief",
        lastUpdatedAt: new Date().toISOString(),
        collaborators: []
      };
      setArticles(prev => ({
        ...prev,
        [assignment.id]: skeleton
      }));
    }

    if (assignment.suggestedReporter) {
      setEditingAsReporter(assignment.suggestedReporter);
    } else {
      setEditingAsReporter("Editor-in-Chief");
    }
  };

  const updateArticleField = (assignmentId: string, field: keyof Article, value: any) => {
    setArticles(prev => {
      const active = prev[assignmentId];
      if (!active) return prev;
      
      const updatedCollaborators = [...active.collaborators];
      if (editingAsReporter && !updatedCollaborators.includes(editingAsReporter)) {
        updatedCollaborators.push(editingAsReporter);
      }

      return {
        ...prev,
        [assignmentId]: {
          ...active,
          [field]: value,
          lastUpdatedBy: editingAsReporter,
          lastUpdatedAt: new Date().toISOString(),
          collaborators: updatedCollaborators
        }
      };
    });
  };

  const exportArticlePDF = (article: Article, targetNewsroom?: Newsroom) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const activeRoom = targetNewsroom || selectedNewsroom;
    const newsroomColor = activeRoom.color || '#3b82f6';
    const hexToRgb = (hex: string) => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
      const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
      const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
      return { r, g, b };
    };
    
    const brandRgb = hexToRgb(newsroomColor);
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);

    let y = 25;

    doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    doc.rect(margin, y, contentWidth, 3, "F");
    y += 10;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(activeRoom.name.toUpperCase() + "  |  BREAKING CORRESPONDENCE (" + (activeRoom.region || "Global") + ")", margin, y);
    y += 7;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    const splitTitle = doc.splitTextToSize(article.title, contentWidth);
    doc.text(splitTitle, margin, y);
    y += (splitTitle.length * 7) + 3;

    if (article.subtitle) {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105); // slate-600
      const splitSubtitle = doc.splitTextToSize(article.subtitle, contentWidth);
      doc.text(splitSubtitle, margin, y);
      y += (splitSubtitle.length * 5) + 4;
    }

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    const metaStr = `ASSIGNED REPORTER: ${article.assignedReporter || "Unassigned"}   |   TIER/STATUS: ${article.status}   |   LAST REVISED: ${new Date(article.lastUpdatedAt).toLocaleString()}`;
    doc.text(metaStr, margin, y);
    y += 4;

    doc.line(margin, y, margin + contentWidth, y);
    y += 10;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85); // slate-700
    
    const paragraphs = article.body.split(/\n\n+/);
    
    paragraphs.forEach((p) => {
      const splitP = doc.splitTextToSize(p.trim(), contentWidth);
      const blockHeight = splitP.length * 5.2;

      if (y + blockHeight > pageHeight - margin - 15) {
        doc.addPage();
        y = margin + 12;
      }

      doc.text(splitP, margin, y);
      y += blockHeight + 6;
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - margin, margin + contentWidth, pageHeight - margin);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`CONFIDENTIAL DRAFT  |  NEWSROOM AI EDITORIAL COLLABORATIVE`, margin, pageHeight - margin + 6);
      doc.text(`Page ${i} of ${totalPages}`, margin + contentWidth - 16, pageHeight - margin + 6);
    }

    doc.save(`Article-${article.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`);
  };

  const generateWorldNewsSuggestions = async () => {
    const worldNews = (events[selectedDateKey] || []).filter(e => e.category === 'World News');
    if (worldNews.length === 0) {
      setError("No World News stories found to localize for this date. Try scanning for announcements first.");
      return;
    }

    setIsGeneratingWorldSuggestions(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        You are a senior editorial consultant for "${selectedNewsroom.name}" in ${selectedNewsroom.region}.
        Your task is to provide localized coverage angles for the following global news stories.
        
        Newsroom Style: ${selectedNewsroom.style}
        Region: ${selectedNewsroom.region}
        
        World News Stories:
        ${worldNews.map(n => `- ${n.title}: ${n.description}`).join('\n')}
        
        For each story, suggest a specific localized angle that would resonate with the audience in ${selectedNewsroom.region} and fits the ${selectedNewsroom.style} style.
        
        Format the output as a clean, professional editorial brief in ${selectedNewsroom.language === 'en' ? 'English' : selectedNewsroom.language === 'es' ? 'Spanish' : 'the newsroom language'}.
      `;

      const response = await ai.models.generateContent({
        model: GEN_MODEL,
        contents: prompt,
      });

      setWorldNewsSuggestions(prev => ({
        ...prev,
        [`${selectedNewsroom.id}-${selectedDateKey}`]: response.text || "No suggestions generated."
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to generate localized world news angles.");
    } finally {
      setIsGeneratingWorldSuggestions(false);
    }
  };

  const addManualAssignment = () => {
    if (!newAssignment.title || !newAssignment.description || !selectedNewsroom) return;
    
    const assignment: Assignment = {
      id: Math.random().toString(36).substr(2, 9),
      title: newAssignment.title,
      description: newAssignment.description,
      importance: (newAssignment.importance as any) || 'Medium',
      category: newAssignment.category || 'General',
      suggestedReporter: newAssignment.suggestedReporter || (currentReporters[0] || 'Unassigned'),
      date: selectedDateKey,
      newsroomId: selectedNewsroom.id,
      dueDate: newAssignment.dueDate,
      completed: false
    };

    setEvents(prev => {
      const dayEvents = prev[selectedDateKey] || [];
      return { ...prev, [selectedDateKey]: [assignment, ...dayEvents] };
    });
    
    setIsAddingManual(false);
    setNewAssignment({ title: '', description: '', importance: 'Medium', category: 'General', dueDate: '', suggestedReporter: '' });
    trackEvent('assignment');
  };

  const fetchSuggestionsForDay = async () => {
    setIsGeneratingSuggestions(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        Generate 3-5 specific news assignment suggestions for ${selectedDate.toDateString()} for the "${selectedNewsroom.name}" newsroom.
        Newsroom Style: ${selectedNewsroom.style}
        Region: ${selectedNewsroom.region}
        Available Reporters: ${currentReporters.join(', ')}
        
        LANGUAGE: The output (titles, descriptions, categories) MUST be in ${selectedNewsroom.language === 'en' ? 'English' : selectedNewsroom.language === 'es' ? 'Spanish' : selectedNewsroom.language === 'fr' ? 'French' : selectedNewsroom.language === 'pt' ? 'Portuguese' : selectedNewsroom.language === 'de' ? 'German' : selectedNewsroom.language === 'it' ? 'Italian' : selectedNewsroom.language === 'hi' ? 'Hindi' : 'Chinese'}.
        
        MANDATORY: Search for real-time information from official government channels, press conference invitations, and official announcements relevant to ${selectedNewsroom.region} and significant global events for this date.
        If a story is a significant global event that impacts multiple regions, categorize it specifically as "World News" so it can be shared across all newsrooms.
        
        Context:
        - Internal Context: ${internalContext}
        - Editor's Notes: ${editorsNotes}
        - Feature Ideas: ${longFormIdeas}
        
        Provide assignments in JSON format with: title, description, importance (High/Medium/Low), suggestedReporter, category, date (${selectedDateKey}), and an optional dueDate (YYYY-MM-DD).
      `;

      const response = await ai.models.generateContent({
        model: GEN_MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                importance: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                suggestedReporter: { type: Type.STRING },
                category: { type: Type.STRING },
                date: { type: Type.STRING },
                dueDate: { type: Type.STRING }
              },
              required: ["title", "description", "importance", "suggestedReporter", "category", "date"]
            }
          }
        },
      });

      const suggestions = (JSON.parse(response.text || "[]") as Assignment[]).map(s => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        newsroomId: selectedNewsroom.id
      }));
      
      setEvents(prev => {
        const existing = prev[selectedDateKey] || [];
        const filtered = suggestions.filter(s => !existing.some(e => e.title === s.title));
        filtered.forEach(() => trackEvent('assignment'));
        return {
          ...prev,
          [selectedDateKey]: [...existing, ...filtered]
        };
      });
    } catch (err) {
      console.error(err);
      setError("Failed to generate suggestions for this day.");
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Calendar Logic
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for previous month
    for (let i = 0; i < firstDay; i++) {
      const prevDate = new Date(year, month, -i);
      days.unshift({ date: prevDate, currentMonth: false });
    }
    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(year, month, i), currentMonth: true });
    }
    return days;
  }, [currentDate]);

  const daysInWeek = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  if (showLanding) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-brand-primary overflow-x-hidden">
          {/* Navigation */}
          <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 px-6 lg:px-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandSymbol size={52} />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-brand-primary leading-none">NEWSROOM<span className="text-brand-accent">AI</span></span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{t('tagline')}</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#about" className="text-sm font-bold text-brand-primary/60 hover:text-brand-accent transition-colors">About</a>
              <a href="#features" className="text-sm font-bold text-brand-primary/60 hover:text-brand-accent transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-bold text-brand-primary/60 hover:text-brand-accent transition-colors">Pricing</a>
              <button 
                onClick={() => setShowLanding(false)}
                className="px-6 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-accent transition-all shadow-lg shadow-brand-primary/20"
              >
                Enter Dashboard
              </button>
            </div>
          </nav>

          {/* Hero Section */}
          <section className="pt-40 pb-20 px-6 lg:px-12 max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center"
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: 0.2
                }}
                className="mb-10 relative"
              >
                <div className="absolute inset-0 bg-sky-400/30 blur-[60px] rounded-full -z-10 animate-pulse" />
                <BrandSymbol size={160} className="drop-shadow-2xl" />
              </motion.div>

              <span className="px-4 py-1.5 bg-brand-accent/10 text-brand-accent rounded-full text-xs font-bold uppercase tracking-widest mb-6 inline-block">
                {t('tagline')}
              </span>
              <h1 className="text-5xl lg:text-7xl font-black text-brand-primary mb-8 leading-[1.1] tracking-tight">
                Automate Your Newsroom <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-ibis via-brand-sunset to-brand-accent">With Real-Time AI.</span>
              </h1>
              <p className="text-xl text-brand-primary/60 max-w-2xl mx-auto mb-10 leading-relaxed">
                Scan global frequencies, manage assignments, and coordinate your staff with the world's first AI-native news assignment editor.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => setShowLanding(false)}
                  className="w-full sm:w-auto px-10 py-4 bg-brand-accent text-white rounded-2xl text-lg font-bold shadow-2xl shadow-brand-accent/30 hover:scale-105 transition-all flex items-center justify-center gap-3"
                >
                  Get Started Free <ChevronRight size={20} />
                </button>
                <a 
                  href="#features"
                  className="w-full sm:w-auto px-10 py-4 bg-white border border-slate-200 text-brand-primary rounded-2xl text-lg font-bold hover:bg-slate-50 transition-all"
                >
                  View Features
                </a>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-20 relative"
            >
              <div className="absolute inset-0 bg-brand-accent/20 blur-[120px] rounded-full -z-10" />
              <div className="modern-card p-2 bg-white/50 backdrop-blur-xl border-white/50 shadow-2xl overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/newsroom-dashboard/1920/1080" 
                  alt="Dashboard Preview" 
                  className="rounded-xl w-full h-auto"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </section>

          {/* About Section */}
          <section id="about" className="py-24 px-6 lg:px-12 bg-slate-50 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="px-4 py-1.5 bg-brand-accent/10 text-brand-accent rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 inline-block">
                    What Sets Us Apart
                  </span>
                  <h2 className="text-4xl lg:text-5xl font-black text-brand-primary mb-8 leading-tight">
                    The Future of Newsroom <br />
                    <span className="text-brand-accent">Intelligence.</span>
                  </h2>
                  <p className="text-brand-primary/70 text-lg mb-8 leading-relaxed">
                    Newsroom AI distinguishes itself from traditional newsroom management tools through a unique fusion of cultural identity, AI-native automation, and global scalability.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-brand-ibis">
                        <Radio size={18} />
                        <h4 className="font-bold text-brand-primary">AI-Native Feed</h4>
                      </div>
                      <p className="text-sm text-brand-primary/60">Automated lead discovery before stories hit the wire.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-brand-sunset">
                        <BrandSymbol size={18} />
                        <h4 className="font-bold text-brand-primary">Digital Pan Identity</h4>
                      </div>
                      <p className="text-sm text-brand-primary/60">Fusing Caribbean heritage with global AI technology.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-brand-accent">
                        <Globe size={18} />
                        <h4 className="font-bold text-brand-primary">Multi-Language</h4>
                      </div>
                      <p className="text-sm text-brand-primary/60">Native support for 8+ languages across continents.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-brand-ibis">
                        <Activity size={18} />
                        <h4 className="font-bold text-brand-primary">Live Collaboration</h4>
                      </div>
                      <p className="text-sm text-brand-primary/60">Real-time indicators for seamless editorial teamwork.</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-brand-accent/10 blur-[100px] rounded-full -z-10" />
                  <div className="modern-card p-8 bg-white border-slate-100 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-20 -bottom-20 opacity-5">
                      <BrandSymbol size={300} />
                    </div>
                    <div className="space-y-6 relative z-10">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="text-xs font-bold text-brand-accent uppercase tracking-widest mb-2">Marketing & Outreach</h4>
                        <p className="text-sm text-brand-primary/70">Built-in assets to help you introduce the platform to global media directors.</p>
                      </div>
                      <div className="p-4 bg-brand-primary rounded-2xl border border-brand-primary/20 text-white shadow-xl shadow-brand-primary/20">
                        <h4 className="text-xs font-bold text-brand-accent uppercase tracking-widest mb-2">Enterprise Training</h4>
                        <p className="text-sm text-white/80">Custom AI style training to ensure automated suggestions match your newsroom's voice.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section id="features" className="py-24 px-6 lg:px-12 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-4xl font-black text-brand-primary mb-4">Built for Modern Media</h2>
                <p className="text-brand-primary/60">Everything you need to run a high-velocity news organization.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-ibis/20 transition-all group">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-brand-ibis shadow-sm mb-6 group-hover:scale-110 transition-transform">
                    <Radio size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-brand-primary mb-3">Live Press Feed</h3>
                  <p className="text-brand-primary/60 text-sm leading-relaxed">Automatically scan government channels, press invitations, and global announcements in real-time.</p>
                </div>
                <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-sunset/20 transition-all group">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-brand-sunset shadow-sm mb-6 group-hover:scale-110 transition-transform">
                    <Globe size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-brand-primary mb-3">Multi-Language AI</h3>
                  <p className="text-brand-primary/60 text-sm leading-relaxed">Native support for 8+ languages. AI suggestions and UI automatically adapt to your organization's language.</p>
                </div>
                <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-accent/20 transition-all group">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-brand-accent shadow-sm mb-6 group-hover:scale-110 transition-transform">
                    <Zap size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-brand-primary mb-3">Staff Coordination</h3>
                  <p className="text-brand-primary/60 text-sm leading-relaxed">Manage reporter availability, assign tasks based on expertise, and track progress with ease.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Marketing Kit Section */}
          <section className="py-24 px-6 lg:px-12 bg-brand-primary text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-20 opacity-10 -z-0">
              <BrandSymbol size={400} />
            </div>
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <span className="px-4 py-1.5 bg-brand-accent/20 text-brand-accent rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 inline-block">
                    Global Outreach
                  </span>
                  <h2 className="text-4xl lg:text-5xl font-black mb-8 leading-tight">
                    Ready to Market to <br />
                    <span className="text-brand-accent">Global Newsrooms?</span>
                  </h2>
                  <p className="text-white/70 text-lg mb-10 leading-relaxed">
                    We've built a comprehensive marketing kit to help you introduce Newsroom AI to media organizations worldwide. From professional ad copy to automated email templates, everything is ready for your outreach.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-brand-accent/20 rounded-xl flex items-center justify-center text-brand-accent shrink-0">
                        <Mail size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">Email Outreach Templates</h4>
                        <p className="text-white/60 text-sm">Professionally crafted emails for Editors-in-Chief and Media Directors.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-brand-accent/20 rounded-xl flex items-center justify-center text-brand-accent shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">Ad Copy & Visuals</h4>
                        <p className="text-white/60 text-sm">High-impact headlines and body text for social media and display ads.</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setShowLanding(false); setShowMarketingModal(true); }}
                    className="mt-12 px-8 py-4 bg-brand-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-brand-accent/20"
                  >
                    Access Marketing Kit
                  </button>
                </div>
                <div className="relative">
                  <div className="modern-card bg-white/5 border-white/10 p-8 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center text-white">
                        <Mail size={18} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-white/60">Sample Outreach Email</span>
                    </div>
                    <div className="space-y-4">
                      <div className="h-4 bg-white/10 rounded w-3/4" />
                      <div className="h-4 bg-white/10 rounded w-full" />
                      <div className="h-4 bg-white/10 rounded w-5/6" />
                      <div className="h-4 bg-white/10 rounded w-1/2" />
                      <div className="pt-4 space-y-2">
                        <div className="h-2 bg-white/5 rounded w-full" />
                        <div className="h-2 bg-white/5 rounded w-full" />
                        <div className="h-2 bg-white/5 rounded w-3/4" />
                      </div>
                    </div>
                    <div className="mt-8 p-4 bg-brand-accent/10 border border-brand-accent/20 rounded-xl">
                      <p className="text-[10px] text-brand-accent font-bold uppercase tracking-widest mb-1">AI Capability Highlight</p>
                      <p className="text-xs text-white/70">"Newsroom AI provides the tools you need to coordinate your reporters, track assignments, and discover breaking stories before they hit the wire."</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="py-24 px-6 lg:px-12 bg-slate-50">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-4xl font-black text-brand-primary mb-4">Simple, Transparent Pricing</h2>
                <p className="text-brand-primary/60">Choose the plan that fits your organization's scale.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Free */}
                <div className="bg-white p-10 rounded-3xl border border-slate-200 flex flex-col">
                  <h3 className="text-xl font-bold text-brand-primary mb-2">Free</h3>
                  <div className="text-4xl font-black text-brand-primary mb-6">$0<span className="text-lg font-normal text-slate-400">/mo</span></div>
                  <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-sm text-brand-primary/70"><CheckCircle2 size={18} className="text-brand-accent" /> Basic AI Suggestions</li>
                    <li className="flex items-center gap-3 text-sm text-brand-primary/70"><CheckCircle2 size={18} className="text-brand-accent" /> 5 Reporters Max</li>
                    <li className="flex items-center gap-3 text-sm text-brand-primary/70"><CheckCircle2 size={18} className="text-brand-accent" /> Manual Sync Only</li>
                  </ul>
                  <button 
                    onClick={() => setShowLanding(false)}
                    className="w-full py-4 bg-slate-100 text-brand-primary rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Get Started
                  </button>
                </div>

                {/* Pro */}
                <div className="bg-white p-10 rounded-3xl border-2 border-brand-accent flex flex-col relative shadow-2xl shadow-brand-accent/10">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-accent text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">Most Popular</div>
                  <h3 className="text-xl font-bold text-brand-primary mb-2">Pro</h3>
                  <div className="text-4xl font-black text-brand-primary mb-6">$49<span className="text-lg font-normal text-slate-400">/mo</span></div>
                  <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-sm text-brand-primary/70"><CheckCircle2 size={18} className="text-brand-accent" /> Real-time AI Scanning</li>
                    <li className="flex items-center gap-3 text-sm text-brand-primary/70"><CheckCircle2 size={18} className="text-brand-accent" /> Multi-Language Support</li>
                    <li className="flex items-center gap-3 text-sm text-brand-primary/70"><CheckCircle2 size={18} className="text-brand-accent" /> 20 Reporters Max</li>
                    <li className="flex items-center gap-3 text-sm text-brand-primary/70"><CheckCircle2 size={18} className="text-brand-accent" /> Priority Support</li>
                  </ul>
                  <button 
                    onClick={() => setShowLanding(false)}
                    className="w-full py-4 bg-brand-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all"
                  >
                    Get Started
                  </button>
                </div>

                {/* Enterprise */}
                <div className="bg-brand-primary p-10 rounded-3xl border border-brand-primary flex flex-col text-white shadow-2xl shadow-brand-primary/20">
                  <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                  <div className="text-4xl font-black mb-6">$249<span className="text-lg font-normal text-white/50">/mo</span></div>
                  <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-sm text-white/80"><CheckCircle2 size={18} className="text-brand-accent" /> Unlimited Reporters</li>
                    <li className="flex items-center gap-3 text-sm text-white/80"><CheckCircle2 size={18} className="text-brand-accent" /> Custom AI Models</li>
                    <li className="flex items-center gap-3 text-sm text-white/80"><CheckCircle2 size={18} className="text-brand-accent" /> Dedicated Manager</li>
                    <li className="flex items-center gap-3 text-sm text-white/80"><CheckCircle2 size={18} className="text-brand-accent" /> API Access</li>
                  </ul>
                  <button 
                    onClick={() => setShowLanding(false)}
                    className="w-full py-4 bg-white text-brand-primary rounded-2xl font-bold hover:bg-slate-50 transition-all"
                  >
                    Contact Sales
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Newsletter Section */}
          <section className="py-24 px-6 lg:px-12 bg-white relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-ibis/5 -z-10" />
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-20 h-20 bg-brand-ibis/10 rounded-3xl flex items-center justify-center text-brand-ibis mx-auto mb-8 shadow-inner">
                <Mail size={32} />
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-brand-primary mb-4 italic tracking-tight">Stay Ahead of the Curve</h2>
              <p className="text-brand-primary/60 mb-10 text-lg">Join 500+ newsroom leaders receiving our weekly bulletin on AI in Journalism.</p>
              
              {!newsletterSuccess ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setIsSubmittingNewsletter(true);
                    setTimeout(() => {
                      setIsSubmittingNewsletter(false);
                      setNewsletterSuccess(true);
                      trackEvent('newsletter_signup');
                    }, 1500);
                  }}
                  className="flex flex-col md:flex-row gap-3 max-w-lg mx-auto"
                >
                  <input 
                    type="email" 
                    required
                    placeholder="Enter your professional email"
                    className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-brand-ibis transition-all font-medium text-brand-primary shadow-sm"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                  />
                  <button 
                    disabled={isSubmittingNewsletter}
                    className="px-8 py-4 bg-brand-ibis text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-xl shadow-brand-ibis/30 disabled:opacity-50"
                  >
                    {isSubmittingNewsletter ? 'Joining...' : 'Subscribe'}
                  </button>
                </form>
              ) : (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="modern-card p-6 border-emerald-100 bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={24} /> Welcome to the future of news production. Check your inbox!
                </motion.div>
              )}
              <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">No junk. Only pure editorial innovation. Unsubscribe anytime.</p>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 px-6 lg:px-12 border-t border-slate-100 bg-white">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <BrandSymbol size={32} />
                <div className="flex flex-col">
                <span className="text-lg font-black tracking-tighter text-brand-primary">NEWSROOM<span className="text-brand-accent">AI</span></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('tagline')}</span>
              </div>
              </div>
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">© 2026 Newsroom AI. All rights reserved.</p>
              <div className="flex items-center gap-4 text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-widest">Supports PayPal & Google Wallet</span>
              </div>
              <div className="flex items-center gap-6">
                <a href="#" className="text-xs font-bold text-slate-400 hover:text-brand-primary transition-colors">Privacy</a>
                <a href="#" className="text-xs font-bold text-slate-400 hover:text-brand-primary transition-colors">Terms</a>
              </div>
            </div>
          </footer>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-7xl mx-auto gap-8" style={{ '--dynamic-accent': selectedNewsroom.color } as React.CSSProperties}>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-accent mb-1">
            <BrandSymbol size={24} />
            <span className="text-sm font-semibold uppercase tracking-wider">Newsroom AI by Melissa Doughty — {t('tagline')}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-brand-primary tracking-tight">{selectedNewsroom.name} Calendar</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Filter size={16} className="text-slate-400" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-accent focus:ring-brand-accent"
              />
              <span className="text-xs font-medium text-brand-primary/70">Hide Done</span>
            </label>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 w-full md:w-64">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text"
              placeholder="Search assignments..."
              className="text-sm font-medium outline-none bg-transparent w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Users size={16} className="text-slate-400" />
            <select 
              className="text-sm font-medium outline-none bg-transparent"
              value={selectedNewsroom.id}
              onChange={(e) => {
                const room = newsrooms.find(r => r.id === e.target.value);
                if (room) setSelectedNewsroom(room);
              }}
            >
              {Array.from(new Set(newsrooms.map(r => r.region))).map(region => (
                <optgroup key={region} label={region}>
                  {newsrooms.filter(r => r.region === region).map(room => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button 
            onClick={() => {
              const shareUrl = window.location.href;
              navigator.clipboard.writeText(shareUrl);
              alert("Dashboard link copied! Share it with your team.");
            }}
            className="flex items-center gap-2 bg-brand-accent text-white rounded-lg px-4 py-2 text-xs font-bold hover:opacity-90 transition-all shadow-md shadow-brand-accent/20"
          >
            <Send size={14} /> Share
          </button>
          
          <button 
            onClick={() => setIsManagingNewsrooms(true)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-brand-accent transition-colors"
            title="Manage Media Organizations"
          >
            <Settings size={18} />
          </button>

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-2 border rounded-lg transition-all relative ${isChatOpen ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white text-slate-400 border-slate-200 hover:text-brand-accent'}`}
            title="Real-time Collaboration Chat"
          >
            <MessageSquare size={18} />
            {onlineUsers.length > 1 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {onlineUsers.length}
              </span>
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowViewDropdown(!showViewDropdown)}
                onBlur={() => setTimeout(() => setShowViewDropdown(false), 200)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-xs font-bold text-brand-primary hover:bg-slate-200 transition-all"
              >
                {view === 'month' && <LayoutGrid size={16} />}
                {view === 'week' && <CalendarIcon size={16} />}
                {view === 'day' && <Clock size={16} />}
                {view === 'list' && <List size={16} />}
                <span className="capitalize">{view} View</span>
                <ChevronDown size={14} className={`transition-transform ${showViewDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showViewDropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <button onClick={() => { setView('month'); setShowViewDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs flex items-center gap-2">
                    <LayoutGrid size={14} /> Month
                  </button>
                  <button onClick={() => { setView('week'); setShowViewDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs flex items-center gap-2">
                    <CalendarIcon size={14} /> Week
                  </button>
                  <button onClick={() => { setView('day'); setShowViewDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs flex items-center gap-2">
                    <Clock size={14} /> Day
                  </button>
                  <button onClick={() => { setView('list'); setShowViewDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs flex items-center gap-2">
                    <List size={14} /> List
                  </button>
                </div>
              )}
            </div>

            <div className="relative flex items-center">
              <button 
                onClick={() => {
                  if (view === 'month') syncAssignments('Month');
                  else if (view === 'week') syncAssignments('Week');
                  else syncAssignments('Day');
                }}
                disabled={loading}
                className="btn-primary rounded-r-none border-r border-brand-accent/30"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                Sync {view === 'month' ? 'Month' : view === 'week' ? 'Week' : 'Day'}
              </button>
              <button 
                onClick={() => setShowSyncDropdown(!showSyncDropdown)}
                onBlur={() => setTimeout(() => setShowSyncDropdown(false), 200)}
                disabled={loading}
                className="btn-primary rounded-l-none px-2"
              >
                <ChevronDown size={14} className={`transition-transform ${showSyncDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSyncDropdown && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <button onClick={() => { syncAssignments('Month'); setShowSyncDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs">Sync Month</button>
                  <button onClick={() => { syncAssignments('Week'); setShowSyncDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs">Sync Week</button>
                  <button onClick={() => { syncAssignments('Day'); setShowSyncDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs">Sync Day</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Context & Tools */}
        <aside className="lg:col-span-3 flex flex-col gap-6">
          <div className="modern-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Users size={16} /> Staff Management
            </h3>
            <div className="flex flex-col gap-2">
              {currentReporters.map((name, idx) => (
                <div key={idx} className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg group">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => updateReporterName(idx, e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all"
                    />
                    <button 
                      onClick={() => {
                        setNewsroomStaff(prev => {
                          const updated = [...prev[selectedNewsroom.id]];
                          updated.splice(idx, 1);
                          return { ...prev, [selectedNewsroom.id]: updated };
                        });
                      }}
                      title="Remove staff member"
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        (reporterStatuses[name] || 'Available') === 'Available' ? 'bg-emerald-500' :
                        (reporterStatuses[name] || 'Available') === 'Busy' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <select 
                        className="text-[10px] font-bold text-slate-500 bg-transparent outline-none cursor-pointer"
                        value={reporterStatuses[name] || 'Available'}
                        onChange={(e) => setReporterStatuses(prev => ({ ...prev, [name]: e.target.value as ReporterStatus }))}
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setNewsroomStaff(prev => ({ ...prev, [selectedNewsroom.id]: [...(prev[selectedNewsroom.id] || []), "New Reporter"] }))}
                className="w-full py-2 border border-dashed border-slate-200 rounded-lg text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:border-brand-accent/30 hover:text-brand-accent transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Plus size={12} /> Add Staff Member
              </button>
            </div>
          </div>

          <div className="modern-card p-6 bg-gradient-to-br from-brand-primary to-brand-accent text-white border-none">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/80 mb-4 flex items-center gap-2">
              <TrendingUp size={16} /> Trending News Pulse
            </h3>
            <div className="space-y-3">
              {isGeneratingTrending ? (
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <RefreshCw size={12} className="animate-spin" /> Analyzing global trends...
                </div>
              ) : trendingTopics.length > 0 ? (
                trendingTopics.map((topic, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all cursor-pointer group">
                    <Hash size={12} className="mt-0.5 text-brand-accent" />
                    <span className="text-[11px] font-medium leading-tight">{topic}</span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-white/60 italic">No trends found for this region.</p>
              )}
              <button 
                onClick={fetchTrendingTopics}
                className="w-full mt-2 py-1.5 bg-white/10 hover:bg-white/20 rounded text-[9px] font-bold uppercase tracking-widest transition-all"
              >
                Refresh Pulse
              </button>
            </div>
          </div>

          <div className="modern-card p-6 bg-brand-primary text-white border-none">
            <h3 className="text-sm font-bold uppercase tracking-widest text-brand-accent mb-4 flex items-center gap-2">
              <Radio size={16} className="animate-pulse" /> {t('livePressFeed')}
            </h3>
            <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
              Scan official government channels, press conference invitations, and global announcements for {selectedNewsroom.region}.
            </p>
            <button 
              onClick={() => syncAssignments('Day')}
              disabled={loading}
              className="w-full py-2 bg-brand-accent hover:opacity-90 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 mb-3"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {t('scanForAnnouncements')}
            </button>

            <div className="flex items-center justify-between p-2 bg-white/10 rounded-lg border border-white/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-tighter">{t('autoSync')}</span>
                <span className="text-[8px] text-slate-400">{t('updatesEvery5m')}</span>
              </div>
              <button 
                onClick={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
                className={`w-10 h-5 rounded-full relative transition-colors ${isAutoSyncEnabled ? 'bg-brand-accent' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isAutoSyncEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            
            {lastSyncTime && (
              <div className="mt-2 text-[8px] text-slate-500 text-center italic">
                {t('lastAutoScan')}: {lastSyncTime.toLocaleTimeString()}
              </div>
            )}

            {/* World News Follow-up Section */}
            {filterAssignments(events[selectedDateKey] || []).some(e => e.category === 'World News') && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-accent mb-3 flex items-center gap-2">
                  <Globe size={12} /> {t('worldNews')} — {t('followUp')}
                </h4>
                <div className="space-y-2">
                  {filterAssignments(events[selectedDateKey] || [])
                    .filter(e => e.category === 'World News')
                    .map((story, idx) => (
                      <div key={idx} className="p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-1">
                            <h5 className="text-[10px] font-bold leading-tight line-clamp-2">{story.title}</h5>
                            {story.newsroomId !== selectedNewsroom.id && (
                              <span className="text-[8px] font-bold text-brand-accent/70 uppercase tracking-widest flex items-center gap-1">
                                <Globe size={8} /> {newsrooms.find(r => r.id === story.newsroomId)?.name || 'Global'}
                              </span>
                            )}
                          </div>
                          <span className={`text-[8px] px-1 rounded font-bold ${
                            story.importance === 'High' ? 'bg-red-500/20 text-red-400' :
                            story.importance === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {story.importance}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {story.description}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="modern-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <CreditCard size={16} /> {t('billing')}
            </h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">{t('currentPlan')}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedNewsroom.subscriptionTier === 'Enterprise' ? 'bg-purple-100 text-purple-700' :
                  selectedNewsroom.subscriptionTier === 'Pro' ? 'bg-brand-accent/10 text-brand-accent' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {selectedNewsroom.subscriptionTier}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700">
                {selectedNewsroom.subscriptionTier === 'Free' ? '$0' : selectedNewsroom.subscriptionTier === 'Pro' ? '$49' : '$249'}{t('perMonth')}
              </div>
            </div>
            <button 
              onClick={() => setShowSubscriptionModal(true)}
              className="w-full py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-brand-primary/70 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 mb-2"
            >
              <Zap size={14} className="text-amber-500" /> {t('upgradeToPro')}
            </button>
            <button 
              onClick={() => setShowMarketingModal(true)}
              className="w-full py-2 bg-brand-accent/10 text-brand-accent border border-brand-accent/20 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent/20 transition-all flex items-center justify-center gap-2"
            >
              <BarChart3 size={14} /> {t('marketingKit')}
            </button>
          </div>

          <div className="modern-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Globe size={16} /> {t('language')}
            </h3>
            <select 
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all"
              value={selectedNewsroom.language}
              onChange={(e) => {
                const newLang = e.target.value as LanguageCode;
                setNewsrooms(prev => prev.map(r => r.id === selectedNewsroom.id ? { ...r, language: newLang } : r));
                setSelectedNewsroom(prev => ({ ...prev, language: newLang }));
              }}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="pt">Português</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="hi">हिन्दी</option>
              <option value="zh">中文</option>
            </select>
          </div>

          <div className="modern-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <ClipboardList size={16} /> Internal Context
            </h3>
            <textarea 
              className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all resize-none"
              placeholder="Add internal memos, reporter availability, or specific angles..."
              value={internalContext}
              onChange={(e) => setInternalContext(e.target.value)}
            />
          </div>

          <div className="modern-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <FileText size={16} /> Editor's Desk
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Notes & Suggestions</label>
                <textarea 
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all resize-none"
                  placeholder="General editorial guidance..."
                  value={editorsNotes}
                  onChange={(e) => setEditorsNotes(e.target.value)}
                />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <Lightbulb size={10} className="text-amber-500" /> Long Form & Feature Ideas
                </label>
                <textarea 
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all resize-none"
                  placeholder="Deep dives, investigative pieces..."
                  value={longFormIdeas}
                  onChange={(e) => setLongFormIdeas(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modern-card p-6 bg-brand-primary text-white">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Send size={16} /> Distribution
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Brief for {selectedDateKey}: {filterAssignments(events[selectedDateKey] || []).length} assignments.
            </p>
            <button 
              onClick={shareBrief}
              disabled={filterAssignments(events[selectedDateKey] || []).length === 0 || loading}
              className="w-full bg-brand-accent hover:opacity-90 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              <ClipboardList size={18} />
              Copy Day Brief
            </button>

            <button 
              onClick={exportBriefPDF}
              disabled={filterAssignments(events[selectedDateKey] || []).length === 0 || loading}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              <FileDown size={18} />
              Export PDF Brief
            </button>

            <div className="pt-4 border-t border-white/10">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <Globe size={12} className="text-brand-accent" /> World News Localizer
              </h4>
              <button 
                onClick={generateWorldNewsSuggestions}
                disabled={isGeneratingWorldSuggestions || (events[selectedDateKey] || []).filter(e => e.category === 'World News').length === 0}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingWorldSuggestions ? <RefreshCw size={12} className="animate-spin" /> : <Lightbulb size={12} />}
                Generate Local Angles
              </button>
              
              {worldNewsSuggestions[`${selectedNewsroom.id}-${selectedDateKey}`] && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                  <p className="text-[9px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {worldNewsSuggestions[`${selectedNewsroom.id}-${selectedDateKey}`]}
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="modern-card p-4 border-red-100 bg-red-50 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </aside>

        {/* Main Content: Calendar or List */}
        <main className="lg:col-span-9 flex flex-col gap-6">
          {view === 'month' ? (
            <div className="modern-card p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-brand-primary flex items-center gap-3">
                  <CalendarIcon className="text-brand-accent" />
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    Today
                  </button>
                  <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-slate-50 p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
                {daysInMonth.map(({ date, currentMonth }, idx) => {
                  const key = date.toISOString().split('T')[0];
                  const dayEvents = events[key] || [];
                  const isSelected = key === selectedDateKey;
                  const isToday = key === new Date().toISOString().split('T')[0];

                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setSelectedDate(date);
                        setIsModalOpen(true);
                        setDeletingIdx(null);
                      }}
                      className={`calendar-day ${!currentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                    >
                      <span className={`text-sm font-medium ${isSelected ? 'text-brand-accent' : ''}`}>
                        {date.getDate()}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {filterAssignments(dayEvents).map((e, i) => (
                          <div 
                            key={i} 
                            className={`event-dot ${
                              e.completed ? 'bg-slate-300' :
                              e.importance === 'High' ? 'bg-rose-500' : 
                              e.importance === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            } ${e.completed ? 'opacity-40' : ''}`}
                            title={`${e.title} ${e.completed ? '(Done)' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : view === 'week' ? (
            <div className="modern-card p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-brand-primary flex items-center gap-3">
                  <CalendarIcon className="text-brand-accent" />
                  Week View
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() - 7);
                    setCurrentDate(d);
                  }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    Today
                  </button>
                  <button onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() + 7);
                    setCurrentDate(d);
                  }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-4">
                {daysInWeek.map((date, idx) => {
                  const key = date.toISOString().split('T')[0];
                  const dayEvents = events[key] || [];
                  const isToday = key === new Date().toISOString().split('T')[0];
                  const isSelected = key === selectedDateKey;

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedDate(date);
                        setIsModalOpen(true);
                        setDeletingIdx(null);
                      }}
                      className={`modern-card p-4 min-h-[400px] flex flex-col gap-3 cursor-pointer transition-all hover:shadow-md ${isToday ? 'ring-2 ring-brand-accent/20 border-brand-accent' : ''} ${isSelected ? 'bg-brand-accent/5' : ''}`}
                    >
                      <div className="flex flex-col items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{date.toLocaleDateString('default', { weekday: 'short' })}</span>
                        <span className={`text-xl font-bold ${isToday ? 'text-brand-accent' : 'text-brand-primary'}`}>{date.getDate()}</span>
                      </div>
                      <div className={`flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-1 ${hideCompleted ? '' : ''}`}>
                        {filterAssignments(dayEvents).map((event, i) => (
                          <div 
                            key={i} 
                            className={`p-2 rounded-lg border text-[10px] font-medium transition-all ${
                              event.completed ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-60' :
                              event.importance === 'High' ? 'bg-rose-50 border-rose-100 text-rose-700' : 
                              event.importance === 'Medium' ? 'bg-amber-50 border-amber-100 text-amber-700' : 
                              'bg-emerald-50 border-emerald-100 text-emerald-700'
                            }`}
                          >
                            <div className={`font-bold truncate ${event.completed ? 'line-through' : ''}`}>{event.title}</div>
                            <div className="opacity-70 truncate">{event.category}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : view === 'day' ? (
            <div className="modern-card p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-brand-primary flex items-center gap-3">
                  <Clock className="text-brand-accent" />
                  {selectedDate.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d);
                  }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setSelectedDate(new Date())} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    Today
                  </button>
                  <button onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d);
                  }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid gap-6">
                {filterAssignments(events[selectedDateKey] || []).length > 0 ? (
                  filterAssignments(events[selectedDateKey] || []).map((event, i) => (
                    <div 
                      key={i}
                      onClick={() => {
                        setIsModalOpen(true);
                        setDeletingIdx(null);
                        broadcastEdit(event.title);
                      }}
                      className="modern-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-brand-accent/30 transition-all relative"
                    >
                      {activeEdits[event.title] && (
                        <div className="absolute -top-2 -right-2 bg-brand-accent text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg animate-pulse z-10">
                          <Activity size={10} /> {activeEdits[event.title]} is editing...
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`badge-${event.importance.toLowerCase()} ${event.completed ? 'opacity-50' : ''}`}>{event.importance}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.category}</span>
                          {event.newsroomId !== selectedNewsroom.id && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-brand-accent uppercase tracking-widest bg-brand-accent/10 px-2 py-0.5 rounded-full">
                              <Globe size={10} /> {newsrooms.find(r => r.id === event.newsroomId)?.name || 'Global'}
                            </span>
                          )}
                          {event.completed && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                              <CheckCircle2 size={10} /> Done
                            </span>
                          )}
                        </div>
                        <h3 className={`text-lg font-bold text-brand-primary mb-1 ${event.completed ? 'line-through text-slate-400' : ''}`}>{event.title}</h3>
                        <p className={`text-sm text-slate-500 line-clamp-2 mb-3 ${event.completed ? 'text-slate-400' : ''}`}>{event.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); analyzeSentiment(event.id, event.title, event.description); }}
                              disabled={isAnalyzingSentiment === event.id}
                              className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-brand-accent flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              {isAnalyzingSentiment === event.id ? <RefreshCw size={10} className="animate-spin" /> : <TrendingUp size={10} />}
                              Analyze Sentiment
                            </button>
                            {sentimentResults[event.id] && (
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                                sentimentResults[event.id].sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-700' :
                                sentimentResults[event.id].sentiment === 'Negative' ? 'bg-rose-100 text-rose-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {sentimentResults[event.id].sentiment} ({sentimentResults[event.id].score}%)
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 md:ml-auto">
                            {articles[event.id] ? (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-md border ${
                                  articles[event.id].status === 'Published' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                  articles[event.id].status === 'Review' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                  articles[event.id].status === 'In Progress' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  'bg-slate-50 border-slate-200 text-slate-700'
                                }`}>
                                  Article: {articles[event.id].status}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openArticleEditor(event); }}
                                  className="text-[9px] font-bold uppercase tracking-widest text-brand-accent hover:underline flex items-center gap-1 bg-brand-accent/5 px-2 py-1 rounded"
                                >
                                  <FileText size={10} /> Edit Article
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); openArticleEditor(event); }}
                                className="text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-brand-accent hover:bg-slate-150 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded transition-colors"
                              >
                                <FileText size={10} /> Create Article Draft
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAssignmentCompletion(selectedDateKey, event.title);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            event.completed ? 'bg-emerald-500 text-white' : 'bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20'
                          }`}
                          title={event.completed ? "Mark as Not Done" : "Mark as Done"}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reporter</p>
                          <p className="text-xs font-bold text-slate-700">{event.suggestedReporter}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex flex-col">
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t('amendDate')}</label>
                          <div className="flex items-center gap-1">
                            <CalendarIcon size={10} className="text-brand-accent" />
                            <input 
                              type="date" 
                              className="text-[10px] font-bold text-slate-600 outline-none bg-transparent cursor-pointer"
                              value={event.date}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                amendAssignmentDate(selectedDateKey, event.title, e.target.value);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <CalendarIcon size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">No assignments scheduled for this day.</p>
                    <button 
                      onClick={() => syncAssignments('Day')}
                      className="mt-4 text-brand-accent hover:text-brand-accent/80 text-xs font-bold flex items-center gap-1"
                    >
                      <RefreshCw size={14} /> Sync Day
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-4"
            >
              {/* Date Range Filter */}
              <div className="modern-card p-4 flex flex-wrap items-center gap-4 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Period:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-brand-accent"
                  />
                  <span className="text-slate-300">to</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-brand-accent"
                  />
                </div>

                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                  <Users size={16} className="text-slate-400" />
                  <select 
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-brand-accent"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Available">Available Only</option>
                    <option value="Busy">Busy Only</option>
                    <option value="On Leave">On Leave Only</option>
                  </select>
                </div>

                {(startDate || endDate || statusFilter !== 'All') && (
                  <button 
                    onClick={() => { setStartDate(""); setEndDate(""); setStatusFilter('All'); }}
                    className="text-[10px] font-bold text-brand-accent uppercase hover:underline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {(Object.entries(events) as [string, Assignment[]][])
                .filter(([date]) => {
                  if (startDate && date < startDate) return false;
                  if (endDate && date > endDate) return false;
                  return true;
                })
                .map(([date, dayEvents]) => [date, filterAssignments(dayEvents)] as [string, Assignment[]])
                .filter(([_, dayEvents]) => dayEvents.length > 0)
                .sort()
                .map(([date, dayEvents]) => (
                <div key={date} className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarIcon size={12} /> {date}
                  </h3>
                  <div className="grid gap-3">
                    {dayEvents.map((event, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setSelectedDate(new Date(date));
                          setIsModalOpen(true);
                          setDeletingIdx(null);
                          broadcastEdit(event.title);
                        }}
                        className={`modern-card p-4 flex justify-between items-center cursor-pointer hover:border-brand-accent/30 transition-all relative ${event.completed ? 'opacity-60' : ''}`}
                      >
                        {activeEdits[event.title] && (
                          <div className="absolute -top-2 -right-2 bg-brand-accent text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg animate-pulse z-10">
                            <Activity size={10} /> {activeEdits[event.title]} is editing...
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAssignmentCompletion(date, event.title);
                            }}
                            className={`p-1 rounded-full transition-colors ${event.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-brand-accent'}`}
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <div>
                            <h4 className={`font-bold text-brand-primary ${event.completed ? 'line-through text-slate-400' : ''}`}>{event.title}</h4>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs text-slate-500">{event.category} • {event.suggestedReporter}</p>
                              {event.newsroomId !== selectedNewsroom.id && (
                                <span className="flex items-center gap-1 text-[8px] font-bold text-brand-accent uppercase tracking-widest bg-brand-accent/10 px-1.5 py-0.5 rounded-full">
                                  <Globe size={8} /> {newsrooms.find(r => r.id === event.newsroomId)?.name || 'Global'}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                              <button 
                                onClick={(e) => { e.stopPropagation(); analyzeSentiment(event.id, event.title, event.description); }}
                                disabled={isAnalyzingSentiment === event.id}
                                className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-brand-accent flex items-center gap-1 transition-colors disabled:opacity-50"
                              >
                                {isAnalyzingSentiment === event.id ? <RefreshCw size={10} className="animate-spin" /> : <TrendingUp size={10} />}
                                Analyze Sentiment
                              </button>
                              {sentimentResults[event.id] && (
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                                  sentimentResults[event.id].sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-700' :
                                  sentimentResults[event.id].sentiment === 'Negative' ? 'bg-rose-100 text-rose-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {sentimentResults[event.id].sentiment} ({sentimentResults[event.id].score}%)
                                </div>
                              )}

                              {articles[event.id] ? (
                                <div className="flex items-center gap-1.5 ml-1">
                                  <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded border ${
                                    articles[event.id].status === 'Published' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                    articles[event.id].status === 'Review' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                    articles[event.id].status === 'In Progress' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                    'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}>
                                    {articles[event.id].status}
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openArticleEditor(event); }}
                                    className="text-[9px] font-bold uppercase tracking-widest text-brand-accent hover:underline flex items-center gap-0.5"
                                  >
                                    Edit Article
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openArticleEditor(event); }}
                                  className="text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-brand-accent hover:underline flex items-center gap-0.5"
                                >
                                  + Draft Article
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end mr-2">
                            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t('amendDate')}</label>
                            <input 
                              type="date" 
                              className="text-[10px] font-bold text-slate-600 outline-none bg-slate-50 border border-slate-200 rounded px-1 cursor-pointer"
                              value={event.date}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                amendAssignmentDate(date, event.title, e.target.value);
                              }}
                            />
                          </div>
                          <span className={`badge-${event.importance.toLowerCase()} ${event.completed ? 'opacity-50' : ''}`}>
                            {event.importance}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </main>
      </div>

      {/* Manage Newsrooms Modal */}
      {/* Subscription Modal */}
      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 bg-brand-primary/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <BrandSymbol size={32} />
                  <div>
                    <h2 className="text-2xl font-bold text-brand-primary">{t('pricingTitle')}</h2>
                    <p className="text-sm text-slate-500">{t('pricingSub')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSubscriptionModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free Plan */}
                <div className={`p-6 rounded-2xl border-2 flex flex-col ${selectedNewsroom.subscriptionTier === 'Free' ? 'border-brand-accent bg-brand-accent/5' : 'border-slate-100'}`}>
                  <h3 className="text-lg font-bold text-brand-primary mb-2">{t('free')}</h3>
                  <div className="text-3xl font-bold text-brand-primary mb-4">$0<span className="text-sm font-normal text-brand-primary/60">{t('perMonth')}</span></div>
                  <ul className="flex-1 space-y-3 mb-8">
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Basic AI Suggestions</li>
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> 5 Reporters Max</li>
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Manual Sync Only</li>
                  </ul>
                  <button 
                    onClick={() => handleSubscriptionSelect('Free')}
                    disabled={selectedNewsroom.subscriptionTier === 'Free'}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                      selectedNewsroom.subscriptionTier === 'Free' ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-brand-primary text-white hover:bg-brand-accent'
                    }`}
                  >
                    {selectedNewsroom.subscriptionTier === 'Free' ? t('current') : t('select')}
                  </button>
                </div>

                {/* Pro Plan */}
                <div className={`p-6 rounded-2xl border-2 flex flex-col relative ${selectedNewsroom.subscriptionTier === 'Pro' ? 'border-brand-accent bg-brand-accent/5' : 'border-slate-100 shadow-xl shadow-brand-accent/5'}`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">Most Popular</div>
                  <h3 className="text-lg font-bold text-brand-primary mb-2">{t('pro')}</h3>
                  <div className="text-3xl font-bold text-brand-primary mb-4">$49<span className="text-sm font-normal text-brand-primary/60">{t('perMonth')}</span></div>
                  <ul className="flex-1 space-y-3 mb-8">
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('aiScanning')}</li>
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('multiLanguage')}</li>
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> 20 Reporters Max</li>
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('prioritySupport')}</li>
                  </ul>
                  <button 
                    onClick={() => handleSubscriptionSelect('Pro', 'Stripe')}
                    disabled={selectedNewsroom.subscriptionTier === 'Pro' || loading}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all mb-2 ${
                      selectedNewsroom.subscriptionTier === 'Pro' ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-brand-accent text-white hover:opacity-90'
                    }`}
                  >
                    {loading ? <RefreshCw className="animate-spin mx-auto" size={18} /> : (selectedNewsroom.subscriptionTier === 'Pro' ? t('current') : t('select'))}
                  </button>
                  <button 
                    onClick={() => handleSubscriptionSelect('Pro', 'PayPal')}
                    disabled={selectedNewsroom.subscriptionTier === 'Pro'}
                    className="w-full py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-brand-primary/70 hover:bg-slate-100 transition-all mb-2"
                  >
                    {t('payPalSimple')}
                  </button>
                  <button 
                    onClick={() => handleSubscriptionSelect('Pro', 'Manual')}
                    disabled={selectedNewsroom.subscriptionTier === 'Pro'}
                    className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-primary/70 transition-all mb-2"
                  >
                    {t('manualBank')}
                  </button>
                  <button 
                    onClick={() => handleSubscriptionSelect('Pro', 'Crypto')}
                    disabled={selectedNewsroom.subscriptionTier === 'Pro'}
                    className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-brand-accent hover:opacity-80 transition-all"
                  >
                    {t('cryptoPayment')}
                  </button>
                </div>

                {/* Enterprise Plan */}
                <div className={`p-6 rounded-2xl border-2 flex flex-col ${selectedNewsroom.subscriptionTier === 'Enterprise' ? 'border-brand-accent bg-brand-accent/5' : 'border-slate-100'}`}>
                  <h3 className="text-lg font-bold text-brand-primary mb-2">{t('enterprise')}</h3>
                  <div className="text-3xl font-bold text-brand-primary mb-4">$249<span className="text-sm font-normal text-brand-primary/60">{t('perMonth')}</span></div>
                  <ul className="flex-1 space-y-3 mb-8">
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('unlimitedReporters')}</li>
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('customAI')}</li>
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Dedicated Account Manager</li>
                    <li className="text-xs text-brand-primary/70 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> API Access</li>
                  </ul>
                  <button 
                    onClick={() => handleSubscriptionSelect('Enterprise', 'Stripe')}
                    disabled={selectedNewsroom.subscriptionTier === 'Enterprise' || loading}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all mb-2 ${
                      selectedNewsroom.subscriptionTier === 'Enterprise' ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {loading ? <RefreshCw className="animate-spin mx-auto" size={18} /> : (selectedNewsroom.subscriptionTier === 'Enterprise' ? t('current') : t('select'))}
                  </button>
                  <button 
                    onClick={() => handleSubscriptionSelect('Enterprise', 'PayPal')}
                    disabled={selectedNewsroom.subscriptionTier === 'Enterprise'}
                    className="w-full py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-brand-primary/70 hover:bg-slate-100 transition-all mb-2"
                  >
                    {t('payPalSimple')}
                  </button>
                  <button 
                    onClick={() => handleSubscriptionSelect('Enterprise', 'Manual')}
                    disabled={selectedNewsroom.subscriptionTier === 'Enterprise'}
                    className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-primary/70 transition-all mb-2"
                  >
                    {t('manualBank')}
                  </button>
                  <button 
                    onClick={() => handleSubscriptionSelect('Enterprise', 'Crypto')}
                    disabled={selectedNewsroom.subscriptionTier === 'Enterprise'}
                    className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-brand-accent hover:opacity-80 transition-all"
                  >
                    {t('cryptoPayment')}
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-8">
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t('securePayments')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <CreditCard size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Cancel Anytime</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Payment Instructions Modal */}
      <AnimatePresence>
        {showManualPaymentModal && (
          <div className="fixed inset-0 bg-brand-primary/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <BrandSymbol size={24} />
                  <h3 className="text-lg font-bold text-brand-primary">{t('manualInstructionsTitle')}</h3>
                </div>
                <button 
                  onClick={() => setShowManualPaymentModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="p-4 bg-brand-accent/5 border border-brand-accent/10 rounded-xl">
                  <p className="text-sm text-brand-primary/70 leading-relaxed">
                    {t('invoiceInstructions')}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('bankDetailsLabel')}</label>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg font-mono text-xs text-slate-700 whitespace-pre-wrap">
                      {selectedNewsroom.bankDetails || 'Bank: Global Media Bank\nIBAN: GB1234567890\nSWIFT: GMB123'}
                    </div>
                  </div>

                  {selectedNewsroom.cryptoAddress && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('cryptoAddressLabel')}</label>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg font-mono text-xs text-slate-700 break-all">
                        {selectedNewsroom.cryptoAddress}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => {
                      if (manualPaymentTier) {
                        setNewsrooms(prev => prev.map(r => r.id === selectedNewsroom.id ? { ...r, subscriptionTier: manualPaymentTier } : r));
                        setSelectedNewsroom(prev => ({ ...prev, subscriptionTier: manualPaymentTier }));
                      }
                      setShowManualPaymentModal(false);
                      setShowSubscriptionModal(false);
                    } }
                    className="w-full py-3 bg-brand-accent text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                  >
                    {t('confirmTransfer')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Marketing Kit Modal */}
      <AnimatePresence>
        {showMarketingModal && (
          <div className="fixed inset-0 bg-brand-primary/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-brand-accent/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white">
                    <BrandSymbol size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-brand-primary">{t('marketingTitle')}</h2>
                    <p className="text-sm text-slate-500">{t('marketingSub')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => setMarketingTab('assets')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${marketingTab === 'assets' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-400 hover:text-brand-primary'}`}
                  >
                    Assets & Templates
                  </button>
                  <button 
                    onClick={() => setMarketingTab('outreach')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${marketingTab === 'outreach' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-400 hover:text-brand-primary'}`}
                  >
                    Direct Outreach
                  </button>
                </div>
                <button 
                  onClick={() => setShowMarketingModal(false)}
                  className="p-2 hover:bg-brand-primary/10 rounded-full transition-colors text-brand-primary"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                {marketingTab === 'assets' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Ad Copy Section */}
                    <div className="space-y-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <FileText size={16} /> {t('adAssets')}
                      </h3>
                      
                    <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 group relative">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest">Headline Option 1</span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(t('adHeadline1'))}
                          className="p-1.5 bg-white border border-brand-primary/10 rounded-lg text-brand-primary/40 hover:text-brand-accent transition-colors"
                          title={t('copyToClipboard')}
                        >
                          <ClipboardList size={14} />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-brand-primary leading-tight">{t('adHeadline1')}</p>
                    </div>

                      <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 group relative">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest">Ad Body Text</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(t('adBody1'))}
                            className="p-1.5 bg-white border border-brand-primary/10 rounded-lg text-brand-primary/40 hover:text-brand-accent transition-colors"
                            title={t('copyToClipboard')}
                          >
                            <ClipboardList size={14} />
                          </button>
                        </div>
                        <p className="text-sm text-brand-primary/70 leading-relaxed">{t('adBody1')}</p>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest">Headline Option 2</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(t('adHeadline2'))}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-brand-accent transition-colors"
                            title={t('copyToClipboard')}
                          >
                            <ClipboardList size={14} />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-brand-primary leading-tight">{t('adHeadline2')}</p>
                      </div>

                      {/* Email Templates */}
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 pt-4">
                        <Mail size={16} /> {t('emailTemplates')}
                      </h3>

                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest">Email 1: Editorial Focus</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(`${t('emailHeadline1')}\n\n${t('emailBody1')}`)}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-brand-accent transition-colors"
                            title={t('copyToClipboard')}
                          >
                            <ClipboardList size={14} />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-brand-primary mb-2">{t('emailHeadline1')}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-3 whitespace-pre-wrap">{t('emailBody1')}</p>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest">Email 2: Business/Scale Focus</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(`${t('emailHeadline2')}\n\n${t('emailBody2')}`)}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-brand-accent transition-colors"
                            title={t('copyToClipboard')}
                          >
                            <ClipboardList size={14} />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-brand-primary mb-2">{t('emailHeadline2')}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-3 whitespace-pre-wrap">{t('emailBody2')}</p>
                      </div>
                    </div>

                    {/* Visual Assets Section */}
                    <div className="space-y-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <LayoutGrid size={16} /> Visual Previews
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="p-6 bg-brand-primary rounded-2xl border border-brand-primary/20 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BrandSymbol size={120} />
                          </div>
                          <div className="relative z-10">
                            <h4 className="text-xs font-bold text-brand-accent uppercase tracking-widest mb-2">Brand Identity: The "Digital Pan"</h4>
                            <p className="text-sm text-slate-300 leading-relaxed mb-4">
                              Our symbol fuses global AI technology with Caribbean heritage. The concentric circles and nodes represent the <strong>Trinidadian Steelpan</strong>, reimagined as a digital data network.
                            </p>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Symbolism</span>
                                <span className="text-xs text-white font-medium">Hummingbird "N" & Steelpan Nodes</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Palette</span>
                                <span className="text-xs text-white font-medium">Scarlet Ibis Red & Sunset Gold</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 relative group">
                          <img 
                            src="https://picsum.photos/seed/ad-visual-1/800/450" 
                            alt="Ad Visual 1" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/80 via-transparent to-transparent p-6 flex flex-col justify-end">
                            <p className="text-white font-bold text-sm leading-tight mb-1">{t('adHeadline1')}</p>
                            <p className="text-white/60 text-[10px] uppercase tracking-widest">Display Ad 300x250</p>
                          </div>
                        </div>

                        <div className="aspect-square rounded-2xl overflow-hidden border border-slate-200 relative group">
                          <img 
                            src="https://picsum.photos/seed/ad-visual-2/800/800" 
                            alt="Ad Visual 2" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/80 via-transparent to-transparent p-6 flex flex-col justify-end">
                            <p className="text-white font-bold text-sm leading-tight mb-1">{t('adHeadline2')}</p>
                            <p className="text-white/60 text-[10px] uppercase tracking-widest">Social Media Post 1080x1080</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="p-6 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl">
                      <h3 className="text-lg font-bold text-brand-primary mb-4 flex items-center gap-2">
                        <Send size={20} className="text-brand-accent" /> Custom Outreach
                      </h3>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <input 
                            type="email" 
                            placeholder="Enter newsroom email address..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all"
                            value={outreachEmail}
                            onChange={(e) => setOutreachEmail(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => outreachEmail && sendOutreach(outreachEmail, 'editorial')}
                            disabled={!outreachEmail}
                            className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-xs hover:bg-brand-accent transition-all disabled:opacity-50"
                          >
                            Send Editorial
                          </button>
                          <button 
                            onClick={() => outreachEmail && sendOutreach(outreachEmail, 'business')}
                            disabled={!outreachEmail}
                            className="px-6 py-3 bg-brand-accent text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all disabled:opacity-50"
                          >
                            Send Business
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-3 uppercase font-bold tracking-widest">Opens your default email client with pre-filled template</p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Globe size={16} /> Global Media Organizations
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {INITIAL_NEWSROOMS.map(room => (
                          <div key={room.id} className="p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-lg transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: room.color }}>
                                {room.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-brand-primary text-sm">{room.name}</h4>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{room.region}</p>
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => room.paymentEmail && sendOutreach(room.paymentEmail, 'editorial')}
                                className="p-2 bg-slate-50 text-brand-primary rounded-lg hover:bg-brand-primary hover:text-white transition-all"
                                title="Send Editorial Outreach"
                              >
                                <Mail size={16} />
                              </button>
                              <button 
                                onClick={() => room.paymentEmail && sendOutreach(room.paymentEmail, 'business')}
                                className="p-2 bg-slate-50 text-brand-accent rounded-lg hover:bg-brand-accent hover:text-white transition-all"
                                title="Send Business Outreach"
                              >
                                <TrendingUp size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-accent shadow-sm mb-4">
                      <Globe size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-brand-primary mb-2">Google Ads</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Target keywords like "newsroom management", "editorial workflow", and "AI journalism".</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-accent shadow-sm mb-4">
                      <Users size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-brand-primary mb-2">LinkedIn Ads</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Target job titles like "Editor-in-Chief", "News Director", and "Digital Strategist".</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-accent shadow-sm mb-4">
                      <Send size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-brand-primary mb-2">Email Outreach</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Direct outreach to media conglomerates and independent newsrooms globally.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Brand Guidelines Included</span>
                </div>
                <button 
                  onClick={() => setShowMarketingModal(false)}
                  className="px-6 py-2 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-accent transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Newsrooms Modal */}
      <AnimatePresence>
        {isManagingNewsrooms && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManagingNewsrooms(false)}
              className="fixed inset-0 bg-brand-primary/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <BrandSymbol size={32} />
                  <div>
                    <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest block mb-1">{t('organizationManagement')}</span>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setIsAdminTab('orgs')}
                        className={`text-xl font-bold transition-colors ${isAdminTab === 'orgs' ? 'text-brand-primary' : 'text-slate-300 hover:text-slate-400'}`}
                      >
                        {t('mediaOrganizations')}
                      </button>
                      <button 
                        onClick={() => setIsAdminTab('payouts')}
                        className={`text-xl font-bold transition-colors ${isAdminTab === 'payouts' ? 'text-brand-primary' : 'text-slate-300 hover:text-slate-400'}`}
                      >
                        Payouts
                      </button>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsManagingNewsrooms(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isAdminTab === 'orgs' ? (
                  <>
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('addNewOrganization')}</h4>
                  <div className="modern-card p-5 border-brand-accent/20 bg-brand-accent/5 space-y-3">
                    <input 
                      type="text" 
                      placeholder="Organization Name"
                      className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent"
                      value={newNewsroomForm.name || ''}
                      onChange={e => setNewNewsroomForm({...newNewsroomForm, name: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Region (e.g. Caribbean, North America)"
                      className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent"
                      value={newNewsroomForm.region || ''}
                      onChange={e => setNewNewsroomForm({...newNewsroomForm, region: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{t('language')}</label>
                        <select 
                          className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent"
                          value={newNewsroomForm.language || 'en'}
                          onChange={e => setNewNewsroomForm({...newNewsroomForm, language: e.target.value as LanguageCode})}
                        >
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="fr">Français</option>
                          <option value="pt">Português</option>
                          <option value="de">Deutsch</option>
                          <option value="it">Italiano</option>
                          <option value="hi">हिन्दी</option>
                          <option value="zh">中文</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{t('subscriptionTier')}</label>
                        <select 
                          className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent"
                          value={newNewsroomForm.subscriptionTier || 'Free'}
                          onChange={e => setNewNewsroomForm({...newNewsroomForm, subscriptionTier: e.target.value as SubscriptionTier})}
                        >
                          <option value="Free">Free</option>
                          <option value="Pro">Pro</option>
                          <option value="Enterprise">Enterprise</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-500 uppercase">Brand Color:</label>
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                        value={newNewsroomForm.color || '#3b82f6'}
                        onChange={e => setNewNewsroomForm({...newNewsroomForm, color: e.target.value})}
                      />
                      <span className="text-xs font-mono text-slate-400 uppercase">{newNewsroomForm.color}</span>
                    </div>
                    <textarea 
                      placeholder="Editorial Style/Description"
                      className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent h-20 resize-none"
                      value={newNewsroomForm.style || ''}
                      onChange={e => setNewNewsroomForm({...newNewsroomForm, style: e.target.value})}
                    />
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('securePayments')} (No Key Mode)</h5>
                      <input 
                        type="email" 
                        placeholder={t('paymentEmailLabel')}
                        className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent"
                        value={newNewsroomForm.paymentEmail || ''}
                        onChange={e => setNewNewsroomForm({...newNewsroomForm, paymentEmail: e.target.value})}
                      />
                      <textarea 
                        placeholder={t('bankDetailsLabel')}
                        className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent h-16 resize-none"
                        value={newNewsroomForm.bankDetails || ''}
                        onChange={e => setNewNewsroomForm({...newNewsroomForm, bankDetails: e.target.value})}
                      />
                      <input 
                        type="text" 
                        placeholder={t('cryptoAddressLabel')}
                        className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent"
                        value={newNewsroomForm.cryptoAddress || ''}
                        onChange={e => setNewNewsroomForm({...newNewsroomForm, cryptoAddress: e.target.value})}
                      />
                    </div>
                    <button 
                      onClick={addNewsroom}
                      className="w-full bg-brand-accent text-white py-2 rounded text-xs font-bold hover:opacity-90 transition-colors"
                    >
                      {t('addNewOrganization')}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('existingOrganizations')}</h4>
                  <div className="space-y-3">
                    {newsrooms.map(room => (
                      <div key={room.id} className="modern-card p-4 flex flex-col gap-3 group">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-brand-primary text-sm">{room.name}</h5>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{room.region}</p>
                          </div>
                          <button 
                            onClick={() => deleteNewsroom(room.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Organization"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">{t('paymentEmailLabel')}</label>
                            <input 
                              type="email"
                              className="w-full p-1.5 text-[11px] border border-slate-100 rounded bg-slate-50 outline-none focus:border-brand-accent"
                              value={room.paymentEmail || ''}
                              onChange={e => setNewsrooms(prev => prev.map(r => r.id === room.id ? { ...r, paymentEmail: e.target.value } : r))}
                              placeholder="PayPal Email"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">{t('bankDetailsLabel')}</label>
                            <input 
                              type="text"
                              className="w-full p-1.5 text-[11px] border border-slate-100 rounded bg-slate-50 outline-none focus:border-brand-accent"
                              value={room.bankDetails || ''}
                              onChange={e => setNewsrooms(prev => prev.map(r => r.id === room.id ? { ...r, bankDetails: e.target.value } : r))}
                              placeholder="IBAN / SWIFT"
                            />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">{t('cryptoAddressLabel')}</label>
                            <input 
                              type="text"
                              className="w-full p-1.5 text-[11px] border border-slate-100 rounded bg-slate-50 outline-none focus:border-brand-accent"
                              value={room.cryptoAddress || ''}
                              onChange={e => setNewsrooms(prev => prev.map(r => r.id === room.id ? { ...r, cryptoAddress: e.target.value } : r))}
                              placeholder="BTC or ETH Address"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded uppercase">{room.language}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            room.subscriptionTier === 'Enterprise' ? 'bg-purple-100 text-purple-700' :
                            room.subscriptionTier === 'Pro' ? 'bg-brand-accent/10 text-brand-accent' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {room.subscriptionTier}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={14} className="text-brand-accent" /> System Admin
                      </h4>
                      <div className="modern-card p-4 bg-slate-50 border-slate-200">
                        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                          Trigger a manual engagement and sales report to <strong>mel.doughty@gmail.com</strong>. 
                          This will reset the daily tracking counters.
                        </p>
                        <button 
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/admin/send-report', { method: 'POST' });
                              if (res.ok) alert('Report sent successfully!');
                              else alert('Failed to send report. Check server logs.');
                            } catch (e) {
                              alert('Error sending report.');
                            }
                          }}
                          className="w-full py-2 bg-brand-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
                        >
                          <Send size={12} /> Send Daily Report Now
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="modern-card p-4 bg-brand-accent/5 border-brand-accent/10">
                        <p className="text-[10px] font-bold text-brand-accent uppercase tracking-widest mb-1">Total Platform Earnings</p>
                        <p className="text-2xl font-bold text-brand-primary">${(platformRevenue / 100).toFixed(2)}</p>
                        <p className="text-[8px] text-slate-400 mt-1">Destined for: {creatorDetails.paypal || creatorDetails.bank || creatorDetails.crypto || 'No Address Set'}</p>
                      </div>
                      <div className="modern-card p-4 bg-slate-50 border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Transfers</p>
                        <p className="text-2xl font-bold text-brand-primary">{adminPayouts.filter(p => p.status === 'Pending').length}</p>
                        <p className="text-[8px] text-slate-400 mt-1">Awaiting manual processing</p>
                      </div>
                    </div>

                    <div className="modern-card p-5 border-brand-accent/20 bg-brand-accent/5 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={16} className="text-brand-accent" />
                        <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest">Creator Payout Address</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">PayPal Email</label>
                          <input 
                            type="email"
                            className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent"
                            value={creatorDetails.paypal}
                            onChange={e => setCreatorDetails({...creatorDetails, paypal: e.target.value})}
                            placeholder="PayPal Email"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Bank Details (IBAN/SWIFT)</label>
                          <input 
                            type="text"
                            className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent"
                            value={creatorDetails.bank}
                            onChange={e => setCreatorDetails({...creatorDetails, bank: e.target.value})}
                            placeholder="Bank Details"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Crypto Address (BTC/ETH)</label>
                          <input 
                            type="text"
                            className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent"
                            value={creatorDetails.crypto}
                            onChange={e => setCreatorDetails({...creatorDetails, crypto: e.target.value})}
                            placeholder="Crypto Address"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={saveCreatorDetails}
                        className="w-full bg-brand-accent text-white py-2 rounded text-xs font-bold hover:opacity-90 transition-colors"
                      >
                        Update Creator Billing Address
                      </button>
                    </div>

                    <div className="space-y-4">
                      {adminPayouts.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                            <CreditCard size={24} />
                          </div>
                          <p className="text-xs text-slate-400">No payout history found.</p>
                        </div>
                      ) : (
                        adminPayouts.sort((a, b) => b.timestamp - a.timestamp).map(payout => {
                          const room = newsrooms.find(r => r.id === payout.newsroomId);
                          return (
                            <div key={payout.id} className="modern-card p-4 space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-bold text-brand-primary text-sm">{room?.name || 'Unknown Newsroom'}</h5>
                                  <p className="text-[10px] text-slate-500">{new Date(payout.timestamp).toLocaleString()}</p>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  payout.status === 'Processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {payout.status}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between py-2 border-y border-slate-50">
                                <span className="text-xs text-slate-500">Amount to Transfer:</span>
                                <span className="text-lg font-bold text-brand-primary">${(payout.amount / 100).toFixed(2)}</span>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payout Details</p>
                                <div className="p-2 bg-slate-50 rounded text-[11px] text-slate-600 font-mono break-all">
                                  {payout.method === 'Automatic' ? (
                                    <>
                                      {room?.paymentEmail && <div>PayPal: {room.paymentEmail}</div>}
                                      {room?.bankDetails && <div>Bank: {room.bankDetails}</div>}
                                      {room?.cryptoAddress && <div>Crypto: {room.cryptoAddress}</div>}
                                      {!room?.paymentEmail && !room?.bankDetails && !room?.cryptoAddress && <div>No details provided.</div>}
                                    </>
                                  ) : (
                                    <div>{payout.details}</div>
                                  )}
                                </div>
                              </div>

                              {payout.status === 'Pending' && (
                                <button 
                                  onClick={() => processPayout(payout.id)}
                                  className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                >
                                  <CheckCircle2 size={14} /> Mark as Transferred
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar Modal for Day Details */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setDeletingIdx(null);
              }}
              className="fixed inset-0 bg-brand-primary/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest block mb-1">Assignment Details</span>
                  <h3 className="text-xl font-bold text-brand-primary">
                    {selectedDate.toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setDeletingIdx(null);
                  }}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {selectedDayEvents.length} Assignments & Suggestions
                  </span>
                  <div className="flex gap-2">
                    {!isAddingManual && (
                      <button 
                        onClick={() => setIsAddingManual(true)}
                        className="text-brand-accent hover:text-brand-accent/80 text-xs font-bold flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Manual
                      </button>
                    )}
                    <button 
                      onClick={fetchSuggestionsForDay}
                      disabled={isGeneratingSuggestions}
                      className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      {isGeneratingSuggestions ? <RefreshCw size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                      AI Suggestions
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {isAddingManual && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="modern-card p-5 border-brand-accent/20 bg-brand-accent/5 overflow-hidden"
                      >
                        <h4 className="text-sm font-bold text-brand-primary mb-4 flex items-center gap-2">
                          <Plus size={16} className="text-brand-accent" /> New Assignment
                        </h4>
                        <div className="space-y-3">
                          <input 
                            type="text" 
                            placeholder="Assignment Title"
                            className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent"
                            value={newAssignment.title || ''}
                            onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                          />
                          <textarea 
                            placeholder="Description & Angle"
                            className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-brand-accent h-20 resize-none"
                            value={newAssignment.description || ''}
                            onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select 
                              className="p-2 text-xs border border-slate-200 rounded outline-none"
                              value={newAssignment.importance || 'Medium'}
                              onChange={e => setNewAssignment({...newAssignment, importance: e.target.value as any})}
                            >
                              <option value="High">High Priority</option>
                              <option value="Medium">Medium Priority</option>
                              <option value="Low">Low Priority</option>
                            </select>
                            <input 
                              type="text" 
                              placeholder="Category"
                              className="p-2 text-xs border border-slate-200 rounded outline-none"
                              value={newAssignment.category || ''}
                              onChange={e => setNewAssignment({...newAssignment, category: e.target.value})}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Due Date (Optional)</label>
                            <input 
                              type="date" 
                              className="p-2 text-xs border border-slate-200 rounded outline-none focus:border-brand-accent"
                              value={newAssignment.dueDate || ''}
                              onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                            />
                          </div>
                          <select 
                            className="w-full p-2 text-xs border border-slate-200 rounded outline-none"
                            value={newAssignment.suggestedReporter || ''}
                            onChange={e => setNewAssignment({...newAssignment, suggestedReporter: e.target.value})}
                          >
                            <option value="">Select Reporter</option>
                            {currentReporters.map(r => (
                              <option key={r} value={r}>
                                {r} — {reporterStatuses[r] || 'Available'}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={addManualAssignment}
                              className="flex-1 bg-brand-accent text-white py-2 rounded text-xs font-bold hover:opacity-90 transition-colors"
                            >
                              Save Assignment
                            </button>
                            <button 
                              onClick={() => setIsAddingManual(false)}
                              className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-slate-500 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {selectedDayEvents.length ? (
                    selectedDayEvents.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="modern-card p-5 group border-slate-200 relative overflow-hidden"
                      >
                        <AnimatePresence>
                          {deletingIdx === idx && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 text-center"
                            >
                              <AlertCircle className="text-red-500 mb-2" size={24} />
                              <h3 className="text-sm font-bold text-brand-primary mb-1">Delete Assignment?</h3>
                              <p className="text-[10px] text-slate-500 mb-4">This action cannot be undone.</p>
                              <div className="flex gap-2 w-full">
                                <button 
                                  onClick={() => deleteAssignment(selectedDateKey, item.title)}
                                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-[10px] font-bold hover:bg-red-700"
                                >
                                  Yes, Delete
                                </button>
                                <button 
                                  onClick={() => setDeletingIdx(null)}
                                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-[10px] font-bold hover:bg-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className={`flex justify-between items-start mb-3 ${item.completed ? 'opacity-50' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className={`badge-${item.importance.toLowerCase()}`}>
                              {item.importance}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => toggleAssignmentCompletion(selectedDateKey, item.title)}
                              className={`transition-colors ${item.completed ? 'text-emerald-500' : 'text-slate-200 hover:text-brand-accent'}`}
                              title={item.completed ? "Mark as Not Done" : "Mark as Done"}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button 
                              onClick={() => setDeletingIdx(idx)}
                              className="text-slate-200 hover:text-red-500 transition-colors"
                              title="Delete Assignment"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <h2 className={`text-lg font-bold text-brand-primary mb-2 ${item.completed ? 'line-through text-slate-400' : ''}`}>{item.title}</h2>
                        <p className={`text-sm text-brand-primary/70 mb-4 leading-relaxed ${item.completed ? 'text-slate-400' : ''}`}>{item.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <button 
                            onClick={() => analyzeSentiment(item.id, item.title, item.description)}
                            disabled={isAnalyzingSentiment === item.id}
                            className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-brand-accent flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            {isAnalyzingSentiment === item.id ? <RefreshCw size={10} className="animate-spin" /> : <TrendingUp size={10} />}
                            Analyze Sentiment
                          </button>
                          {sentimentResults[item.id] && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                              sentimentResults[item.id].sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-700' :
                              sentimentResults[item.id].sentiment === 'Negative' ? 'bg-rose-100 text-rose-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {sentimentResults[item.id].sentiment} ({sentimentResults[item.id].score}%)
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            {articles[item.id] ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded border ${
                                  articles[item.id].status === 'Published' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                  articles[item.id].status === 'Review' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                  articles[item.id].status === 'In Progress' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  'bg-slate-50 border-slate-200 text-slate-700'
                                }`}>
                                  Article: {articles[item.id].status}
                                </span>
                                <button
                                  onClick={() => openArticleEditor(item)}
                                  className="text-[9px] font-bold uppercase tracking-widest text-brand-accent hover:underline flex items-center gap-0.5 bg-brand-accent/5 px-2 py-0.5 rounded"
                                >
                                  Edit Article
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openArticleEditor(item)}
                                className="text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-brand-accent hover:underline flex items-center gap-0.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
                              >
                                + Draft Article
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {item.dueDate && (
                          <div className="flex items-center gap-1.5 mb-4 text-[10px] font-bold text-brand-accent bg-brand-accent/5 px-2 py-1 rounded-md w-fit">
                            <CalendarIcon size={12} />
                            <span>DUE: {new Date(item.dueDate).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-slate-700">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <User size={16} />
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                (reporterStatuses[item.suggestedReporter] || 'Available') === 'Available' ? 'bg-emerald-500' :
                                (reporterStatuses[item.suggestedReporter] || 'Available') === 'Busy' ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Assigned To</span>
                              <select 
                                className="text-sm font-semibold bg-transparent outline-none cursor-pointer hover:text-brand-accent transition-colors"
                                value={item.suggestedReporter}
                                onChange={(e) => reassignReporter(selectedDateKey, item.title, e.target.value)}
                              >
                                <option value={item.suggestedReporter}>
                                  {item.suggestedReporter} ({(reporterStatuses[item.suggestedReporter] || 'Available')})
                                </option>
                                {currentReporters.filter(r => r !== item.suggestedReporter).map(reporter => (
                                  <option key={reporter} value={reporter}>
                                    {reporter} ({(reporterStatuses[reporter] || 'Available')})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t('amendDate')}</label>
                            <div className="flex items-center gap-1">
                              <CalendarIcon size={10} className="text-brand-accent" />
                              <input 
                                type="date" 
                                className="text-[10px] font-bold text-slate-600 outline-none bg-slate-50 border border-slate-200 rounded px-1 cursor-pointer"
                                value={item.date}
                                onChange={(e) => amendAssignmentDate(selectedDateKey, item.title, e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                      <CalendarIcon size={32} className="mb-2 opacity-20" />
                      <p className="text-sm italic">No assignments scheduled for this date.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-3">
                <button 
                  onClick={shareBrief}
                  disabled={selectedDayEvents.length === 0}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} />
                  Share Briefing
                </button>
                <button 
                  onClick={exportBriefPDF}
                  disabled={selectedDayEvents.length === 0}
                  className="bg-brand-accent hover:opacity-90 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FileDown size={14} />
                  Export PDF
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[60] border-l border-slate-100 flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center text-white">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-primary">Newsroom Chat</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{onlineUsers.length} Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 text-slate-400 hover:text-brand-primary transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.user === 'Editor' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{msg.user}</span>
                    <span className="text-[8px] text-slate-300">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] ${msg.user === 'Editor' ? 'bg-brand-accent text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                />
                <button 
                  onClick={sendChatMessage}
                  className="p-2 bg-brand-accent text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-accent/20"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-auto pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs text-center md:text-left">
        <div className="flex flex-col gap-1">
          <p>© 2026 Newsroom AI by Melissa Doughty • Port of Spain, Trinidad and Tobago</p>
          <p className="font-medium text-slate-500">The ultimate AI-powered editorial management tool for modern newsrooms.</p>
        </div>
        <div className="flex gap-6">
          {lastUpdated && <span>System Sync: {lastUpdated}</span>}
          <button onClick={() => setShowToSModal(true)} className="hover:text-brand-accent transition-colors">Terms of Service</button>
          <a href="#" className="hover:text-brand-accent transition-colors">Support</a>
          <a href="#" className="hover:text-brand-accent transition-colors">Privacy Policy</a>
        </div>
      </footer>

      {/* Powered by Branding Footer */}
      <footer className="pb-8 flex flex-col items-center justify-center gap-4 opacity-30 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 grayscale group-hover:grayscale-0 transition-all cursor-default">
          <BrandSymbol size={16} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary">Powered by Newsroom AI</span>
        </div>
      </footer>

      {/* Article Collaborative Draft Modal */}
      <AnimatePresence>
        {isArticleModalOpen && selectedArticleAssignment && (
          <div className="fixed inset-0 flex items-center justify-center z-[90] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsArticleModalOpen(false)}
              className="absolute inset-0 bg-brand-primary/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div 
                className="p-6 border-b border-slate-100 flex items-center justify-between"
                style={{ borderTop: `4px solid ${selectedNewsroom.color || '#3b82f6'}` }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-accent/10 rounded-xl text-brand-accent">
                    <FileText size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest block mb-1">
                      Collaborative Journalist Workspace
                    </span>
                    <h3 className="text-xl font-bold text-brand-primary">
                      {articles[selectedArticleAssignment.id]?.status === 'Published' ? "Published Article Copy" : "Editorial Draft & Revision Desk"}
                    </h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Select active writing identity */}
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Acting As:</span>
                    <select
                      className="text-xs font-semibold bg-transparent border-none outline-none text-brand-primary cursor-pointer"
                      value={editingAsReporter}
                      onChange={(e) => setEditingAsReporter(e.target.value)}
                    >
                      <option value="Editor-in-Chief">Editor-in-Chief</option>
                      {(newsroomStaff[selectedNewsroom.id] || []).map((reporter) => (
                        <option key={reporter} value={reporter}>{reporter} (Reporter)</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={() => setIsArticleModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Main Layout Split */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Form: Editable Draft Content */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Assignment Reference
                    </label>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="inline-block text-[8px] font-bold uppercase tracking-widest bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full mb-2">
                        {selectedArticleAssignment.importance} Priority • {selectedArticleAssignment.category}
                      </span>
                      <h4 className="font-bold text-brand-primary text-sm mb-1">{selectedArticleAssignment.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{selectedArticleAssignment.description}</p>
                    </div>
                  </div>

                  {/* AI Writing assistant integration! */}
                  <div className="bg-gradient-to-r from-brand-accent/10 to-indigo-50 border border-brand-accent/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-brand-accent text-white rounded-lg mt-0.5 animate-pulse">
                        <Zap size={16} />
                      </div>
                      <div>
                        <h5 className="font-bold text-brand-primary text-xs font-sans">Gemini Press Draft Writer</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Generate an official localized, high-fidelity article matching the {selectedNewsroom.name} style guide.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isGeneratingArticle}
                      onClick={() => generateArticleDraftWithAI(selectedArticleAssignment)}
                      className="px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap disabled:opacity-50"
                    >
                      {isGeneratingArticle ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          Drafting...
                        </>
                      ) : (
                        <>
                          <Zap size={12} />
                          Generate Draft with AI
                        </>
                      )}
                    </button>
                  </div>

                  {/* Editorial Fields */}
                  {articles[selectedArticleAssignment.id] ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Article Title Headline
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-brand-accent text-sm font-bold text-brand-primary transition-all"
                          value={articles[selectedArticleAssignment.id].title}
                          onChange={(e) => updateArticleField(selectedArticleAssignment.id, 'title', e.target.value)}
                          placeholder="Fascinating report headline..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Subtitle & Lead Paragraph Hook
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-brand-accent text-xs font-medium text-slate-600 transition-all"
                          value={articles[selectedArticleAssignment.id].subtitle}
                          onChange={(e) => updateArticleField(selectedArticleAssignment.id, 'subtitle', e.target.value)}
                          placeholder="Brief sum in one or two compelling sentences..."
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Full Article Body Draft (Double line break for new paragraphs)
                          </label>
                          <span className="text-[9px] font-semibold text-slate-400">
                            {articles[selectedArticleAssignment.id].body.split(/\s+/).filter(Boolean).length} Words
                          </span>
                        </div>
                        <textarea
                          rows={12}
                          className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:border-brand-accent text-xs font-sans leading-relaxed text-slate-700 transition-all font-serif"
                          value={articles[selectedArticleAssignment.id].body}
                          onChange={(e) => updateArticleField(selectedArticleAssignment.id, 'body', e.target.value)}
                          placeholder="Type or generate localized award-winning reporting copy..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Current Article Tier
                          </label>
                          <select
                            className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-accent text-xs font-semibold text-brand-primary transition-all bg-white"
                            value={articles[selectedArticleAssignment.id].status}
                            onChange={(e) => updateArticleField(selectedArticleAssignment.id, 'status', e.target.value as any)}
                          >
                            <option value="Draft">Drafting Mode</option>
                            <option value="In Progress">Reporter Assisting</option>
                            <option value="Review">Editorial Overlook/Review</option>
                            <option value="Published">Published & Shared</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Assigned Journalist File
                          </label>
                          <select
                            className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-accent text-xs font-semibold text-brand-primary transition-all bg-white"
                            value={articles[selectedArticleAssignment.id].assignedReporter}
                            onChange={(e) => updateArticleField(selectedArticleAssignment.id, 'assignedReporter', e.target.value)}
                          >
                            <option value="Editor-in-Chief">Editor-in-Chief</option>
                            {(newsroomStaff[selectedNewsroom.id] || []).map((reporter) => (
                              <option key={reporter} value={reporter}>{reporter}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No draft generated yet. Click 'Generate Draft with AI' to start!
                    </div>
                  )}
                </div>

                {/* Right Tab: Regional Syndication Channels & Press copy downloads */}
                <div className="space-y-6 animate-fade-in">
                  {/* Regional Localization Detail */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-brand-accent uppercase tracking-widest mb-2">
                      <Globe size={12} /> Newsroom Regional Scope
                    </span>
                    <h5 className="font-bold text-brand-primary text-sm mb-1">{selectedNewsroom.region} Newsroom Hub</h5>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      All articles drafted here are custom-localized according to the <span className="font-semibold text-slate-700">{selectedNewsroom.style}</span> style guide of <span className="font-semibold">{selectedNewsroom.name}</span>.
                    </p>
                    
                    {/* Primary Newsroom Download PDF */}
                    <button
                      onClick={() => articles[selectedArticleAssignment.id] && exportArticlePDF(articles[selectedArticleAssignment.id])}
                      disabled={!articles[selectedArticleAssignment.id]}
                      className="w-full py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                    >
                      <FileDown size={14} />
                      Download Press Copy (PDF)
                    </button>
                    
                    {articles[selectedArticleAssignment.id] && (
                      <p className="text-[10px] text-slate-400 text-center mt-2 font-mono">
                        Includes: {selectedNewsroom.name.toUpperCase()} Brand Board Header
                      </p>
                    )}
                  </div>

                  {/* Syndicated Downlinks for Newsrooms in specific regions */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-brand-accent uppercase tracking-widest mb-1.5">
                      <Users size={12} /> Regional Syndication
                    </span>
                    <h5 className="font-bold text-brand-primary text-xs mb-1">Geographic Co-op Channels</h5>
                    <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                      Other news organizations registered in the <span className="font-bold text-indigo-700">{selectedNewsroom.region || "Global"}</span> region authorized to select, customize, and download this region-specific article draft:
                    </p>

                    <div className="space-y-3">
                      {newsrooms.filter(n => n.region === selectedNewsroom.region && n.id !== selectedNewsroom.id).map(room => (
                        <div 
                          key={room.id}
                          className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-slate-300 transition-colors"
                        >
                          <div>
                            <h6 className="font-bold text-brand-primary text-xs">{room.name}</h6>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: room.color }} />
                              {room.style.length > 25 ? room.style.slice(0, 25) + "..." : room.style}
                            </p>
                          </div>

                          <button
                            title={`Download custom-branded news story for ${room.name}`}
                            onClick={() => {
                              const active = articles[selectedArticleAssignment.id];
                              if (active) {
                                exportArticlePDF(active, room);
                              }
                            }}
                            disabled={!articles[selectedArticleAssignment.id]}
                            className="p-2 bg-slate-50 text-brand-primary hover:bg-indigo-50 hover:text-brand-accent rounded-lg border border-slate-200 transition-all disabled:opacity-50"
                          >
                            <FileDown size={13} />
                          </button>
                        </div>
                      ))}
                      
                      {newsrooms.filter(n => n.region === selectedNewsroom.region && n.id !== selectedNewsroom.id).length === 0 && (
                        <p className="text-[11px] text-slate-400 italic text-center py-2">
                          No other registered bureaux in the {selectedNewsroom.region} region.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Collaborative revision logs */}
                  {articles[selectedArticleAssignment.id] && (
                    <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200/60 text-[11px] text-slate-500 space-y-2">
                      <h6 className="font-bold text-[9px] uppercase tracking-wider text-slate-600 block">Revision Metadata</h6>
                      <div>
                        <strong>Last Edited By:</strong> {articles[selectedArticleAssignment.id].lastUpdatedBy || "System Core"}
                      </div>
                      <div>
                        <strong>Revision Time:</strong> {new Date(articles[selectedArticleAssignment.id].lastUpdatedAt).toLocaleString()}
                      </div>
                      <div>
                        <strong>Co-Authors:</strong> {articles[selectedArticleAssignment.id].collaborators.join(', ') || "Editor-in-Chief"}
                      </div>
                    </div>
                  )}

                </div>

              </div>

              {/* Modal Footer Controls */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 italic font-medium flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-saving to cloud/local workspace
                </span>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsArticleModalOpen(false)}
                    className="px-6 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl text-xs font-bold transition-all"
                  >
                    Close Workspace
                  </button>
                  <button
                    onClick={() => {
                      if (articles[selectedArticleAssignment.id]) {
                        // Mark as Review
                        updateArticleField(selectedArticleAssignment.id, 'status', 'Review');
                        setIsArticleModalOpen(false);
                      }
                    }}
                    disabled={!articles[selectedArticleAssignment.id]}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    Submit for Editorial Review
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Terms of Service Modal */}
      <AnimatePresence>
        {showToSModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowToSModal(false)}
              className="absolute inset-0 bg-brand-primary/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <BrandSymbol size={32} />
                  <div>
                    <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest block mb-1">Legal Agreement</span>
                    <h3 className="text-xl font-bold text-brand-primary">Terms of Service</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setShowToSModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 prose prose-slate prose-sm max-w-none">
                <h4 className="text-brand-primary font-bold">1. Agreement to Terms</h4>
                <p>By using Newsroom AI, you agree to be bound by these terms. This application is provided as a service to media organizations for editorial management and AI-assisted journalism.</p>
                
                <h4 className="text-brand-primary font-bold">2. Subscription & Fees</h4>
                <p>Media organizations agree to pay the subscription fees associated with their chosen tier (Pro or Enterprise). Fees are billed monthly and are non-refundable.</p>
                
                <h4 className="text-brand-primary font-bold">3. Revenue Sharing & Platform Fees</h4>
                <p>The app creator (Melissa Doughty) receives a <strong>30% platform fee</strong> from all subscription revenue processed through the application. The remaining 70% is allocated to the media organization's account for operational use, minus any third-party processing fees.</p>
                
                <h4 className="text-brand-primary font-bold">4. Ownership & Intellectual Property</h4>
                <p>The Newsroom AI platform, including its code, design, and AI integrations, is the intellectual property of Melissa Doughty. Media organizations retain ownership of the content created using the platform.</p>
                
                <h4 className="text-brand-primary font-bold">5. Limitation of Liability</h4>
                <p>The app creator is not liable for any editorial errors or consequences resulting from the use of AI-generated suggestions. Final editorial control remains with the media organization.</p>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowToSModal(false)}
                  className="px-8 py-2 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-primary/90 transition-all"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
  );
}
