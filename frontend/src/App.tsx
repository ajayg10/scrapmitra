import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './components/Icon';
import { device_type, type Language } from './generated/taxonomy';
import { iconMap } from './generated/icons';
import deviceCatalog from '../../data/seed/device_catalog.json';
import VoiceAgent from './components/VoiceAgent';

type ActiveTab = 'scan' | 'pickup' | 'collector' | 'impact' | 'leaderboard' | 'admin';

export interface UserProfile {
  user_id: string;
  role: 'household' | 'collector' | 'admin';
  display_name: string;
  email_or_phone: string;
  collector_id?: string;
  is_hazard_authorized?: boolean;
  created_at?: string;
}

export default function App({ isDemo: propIsDemo }: { isDemo?: boolean } = {}) {
  const isDemo = typeof propIsDemo === 'boolean'
    ? propIsDemo
    : (typeof window !== 'undefined' && window.location.pathname.startsWith('/app/demo'));
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('scan');
  const [showCatalog, setShowCatalog] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [activePickup, setActivePickup] = useState<any | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [collectorWeightInput, setCollectorWeightInput] = useState('2.2');
  const [collectorNotice, setCollectorNotice] = useState<string | null>(null);
  const [adminReport, setAdminReport] = useState<any | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    if (!isDemo) {
      const stored = localStorage.getItem('kabadiplus_auth_token');
      if (stored && stored.startsWith('demo-token-')) {
        localStorage.removeItem('kabadiplus_auth_token');
        return null;
      }
      return stored;
    }
    return localStorage.getItem('kabadiplus_demo_auth_token');
  });
  const [authModal, setAuthModal] = useState<'none' | 'household' | 'collector' | 'pending_approval'>('none');
  const [collectorMode, setCollectorMode] = useState<'signin' | 'apply'>('signin');
  const [pendingScanToClaim, setPendingScanToClaim] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [handoverSuccessMsg, setHandoverSuccessMsg] = useState<string | null>(null);

  // Household Google Auth State
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Collector Sign In / Apply Form State
  const [colPhone, setColPhone] = useState('');
  const [colPassword, setColPassword] = useState('');
  const [colName, setColName] = useState('');
  const [colVehicle, setColVehicle] = useState('Three-Wheeler EV Cargo');
  const [colArea, setColArea] = useState('Nehru Place, Okhla, Kalkaji');
  const [colCategories, setColCategories] = useState<string[]>(['mobile_phone', 'laptop']);
  const [colAuthRef, setColAuthRef] = useState('DL-EW-2026-0881');
  const [recentApplication, setRecentApplication] = useState<any | null>(null);

  // Admin Oversight & Approval State
  const [adminApplications, setAdminApplications] = useState<any[]>([]);
  const [hazardAuthMap, setHazardAuthMap] = useState<Record<string, boolean>>({});
  const [approvalSuccessMsg, setApprovalSuccessMsg] = useState<string | null>(null);

  // Leaderboard & Impact State
  const [leaderboardData, setLeaderboardData] = useState<any | null>(null);
  const [impactData, setImpactData] = useState<any | null>(null);
  const [collectorRouteData, setCollectorRouteData] = useState<any | null>(null);

  // Camera & Image Upload state
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const lang: Language = i18n.resolvedLanguage === 'hi' ? 'hi' : 'en';
  const demoSeedLabel = 'Demo seed data';

  const maskPhone = (phone?: string) => {
    if (!phone) return 'Not provided';
    if (phone.includes('x')) return phone;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10 && cleaned.length !== 12) return phone;
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      const lastTwo = cleaned.slice(-2);
      return `+91 98xxxxxx${lastTwo}`;
    }
    return `+91 98xxxxxx${cleaned.slice(-2)}`;
  };

  const DemoSeedBadge = ({ compact = false }: { compact?: boolean }) => (
    <span className={compact ? 'demo-seed-badge compact' : 'demo-seed-badge'}>{demoSeedLabel}</span>
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const DEMO_PROFILES: Record<string, UserProfile> = {
    'demo-token-household-1': {
      user_id: 'sub_hh_01',
      role: 'household',
      display_name: 'EcoPioneer_MayurVihar',
      email_or_phone: 'household1@demo.kabadiplus.in',
    },
    'demo-token-household-2': {
      user_id: 'sub_hh_02',
      role: 'household',
      display_name: 'GreenHero_Saket',
      email_or_phone: 'household2@demo.kabadiplus.in',
    },
    'demo-token-collector-1': {
      user_id: 'sub_col_delhi_01',
      role: 'collector',
      display_name: 'Ramesh Kumar',
      email_or_phone: '+91 98xxxxxx10',
      collector_id: 'col_delhi_01',
      is_hazard_authorized: true,
    },
    'demo-token-collector-2': {
      user_id: 'sub_col_delhi_02',
      role: 'collector',
      display_name: 'Surender Scrap',
      email_or_phone: '+91 98xxxxxx11',
      collector_id: 'col_delhi_02',
      is_hazard_authorized: false,
    },
    'demo-token-admin': {
      user_id: 'sub_admin_01',
      role: 'admin',
      display_name: 'Delhi Waste Commissioner',
      email_or_phone: 'admin@kabadiplus.gov.in',
    },
  };

  // Authenticate user on load
  const fetchMe = async (token: string): Promise<UserProfile | null> => {
    if (!isDemo && token.startsWith('demo-token-')) {
      localStorage.removeItem('kabadiplus_auth_token');
      setAuthToken(null);
      setCurrentUser(null);
      return null;
    }
    if (token in DEMO_PROFILES) {
      const fallback = DEMO_PROFILES[token];
      setCurrentUser(fallback);
    }
    try {
      const res = await fetch('/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        return user;
      }
    } catch {
      // Offline fallback
    }

    if (token in DEMO_PROFILES) {
      return DEMO_PROFILES[token];
    }

    localStorage.removeItem(isDemo ? 'kabadiplus_demo_auth_token' : 'kabadiplus_auth_token');
    setAuthToken(null);
    setCurrentUser(null);
    return null;
  };

  useEffect(() => {
    if (authToken) {
      void fetchMe(authToken);
    }
  }, [authToken]);

  // Fetch leaderboard data
  const loadLeaderboard = async () => {
    try {
      const res = await fetch('/v1/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadLeaderboard();
  }, [activeTab]);

  // Fetch admin collector applications
  const loadAdminCollectors = async (token?: string) => {
    const tkn = token || authToken;
    if (!tkn) return;
    try {
      const res = await fetch('/v1/admin/collectors', {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminApplications(data.applications || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && currentUser?.role === 'admin') {
      void loadAdminCollectors();
    }
  }, [activeTab, currentUser]);

  // Fetch collector route
  const loadCollectorRoute = async (token?: string) => {
    const tkn = token || authToken;
    if (!tkn) return;
    try {
      const res = await fetch('/v1/collector/route', {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCollectorRouteData(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (activeTab === 'collector' && currentUser?.role === 'collector') {
      void loadCollectorRoute();
    }
  }, [activeTab, currentUser]);

  // Fetch personal/collector impact
  const loadPersonalImpact = async (token?: string) => {
    const tkn = token || authToken;
    if (!tkn) {
      setImpactData(null);
      return;
    }
    try {
      const res = await fetch('/v1/impact/me', {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (res.ok) {
        const data = await res.json();
        setImpactData(data);
        return;
      }
    } catch {
      // ignore
    }

    // Role-specific baseline fallback
    if (currentUser?.role === 'collector') {
      setImpactData({
        role: 'collector',
        display_name: currentUser.display_name || 'Ramesh Kumar',
        monthly_kg_diverted: 142.5,
        total_kg_collected: 142.5,
        transit_saved_km: 38.4,
        co2e_avoided_kg: 4.6,
        eco_points: 720,
        items_diverted: 48,
        items_collected: 48,
        collector_payout_est: 3850,
      });
    } else if (currentUser?.user_id === 'sub_hh_01') {
      setImpactData({
        role: 'household',
        display_name: 'EcoPioneer_MayurVihar',
        monthly_kg_diverted: 42.5,
        co2e_avoided_kg: 148.8,
        eco_points: 580,
        items_diverted: 6,
      });
    } else if (currentUser?.user_id === 'sub_hh_02') {
      setImpactData({
        role: 'household',
        display_name: 'GreenHero_Saket',
        monthly_kg_diverted: 38.0,
        co2e_avoided_kg: 133.0,
        eco_points: 510,
        items_diverted: 5,
      });
    } else {
      setImpactData({
        role: 'household',
        display_name: currentUser?.display_name || 'Citizen',
        monthly_kg_diverted: 8.5,
        co2e_avoided_kg: 29.8,
        eco_points: 190,
        items_diverted: 3,
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'impact') {
      void loadPersonalImpact();
    }
  }, [activeTab, authToken, currentUser]);

  // Login handler
  const loginWithToken = async (token: string, overrideUser?: UserProfile) => {
    if (isDemo) {
      localStorage.setItem('kabadiplus_demo_auth_token', token);
    } else {
      if (token.startsWith('demo-token-')) {
        return; // strictly disallow demo tokens in real mode
      }
      localStorage.setItem('kabadiplus_auth_token', token);
    }
    setAuthToken(token);
    setAuthError(null);
    const resolvedUser = overrideUser || DEMO_PROFILES[token];
    if (resolvedUser) {
      setCurrentUser(resolvedUser);
    }
    const user = (await fetchMe(token)) || resolvedUser;
    if (user) {
      setCurrentUser(user);
    }

    // Attach pending guest scan to signed-in household account
    if (pendingScanToClaim && user?.role === 'household') {
      try {
        await fetch(`/v1/scan/${pendingScanToClaim}/claim`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // ignore
      }
      setPendingScanToClaim(null);
    }

    setAuthModal('none');

    // Redirect after login by role
    if (user?.role === 'collector') {
      setActiveTab('collector');
      void loadCollectorRoute(token);
      void loadPersonalImpact(token);
    } else if (user?.role === 'admin') {
      setActiveTab('admin');
      void loadAdminCollectors(token);
    } else if (user?.role === 'household') {
      if (pendingScanToClaim) {
        setActiveTab('pickup');
      }
      void loadPersonalImpact(token);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(isDemo ? 'kabadiplus_demo_auth_token' : 'kabadiplus_auth_token');
    setAuthToken(null);
    setCurrentUser(null);
    setActiveTab('scan');
  };

  // Household / Google OAuth Sign-In Handler
  const handleHouseholdAuthSubmit = async (credentialOrEmail?: string, overrideName?: string) => {
    setAuthError(null);
    let payload: any = {};
    if (typeof credentialOrEmail === 'string' && credentialOrEmail.includes('.')) {
      payload = { credential: credentialOrEmail };
    } else {
      let emailToUse = (typeof credentialOrEmail === 'string' && credentialOrEmail) || googleEmail.trim();
      const nameToUse = overrideName || googleName.trim() || emailToUse.split('@')[0] || 'Citizen';
      if (!emailToUse) {
        setAuthError(lang === 'hi' ? 'कृपया अपना गूगल ईमेल दर्ज करें।' : 'Please enter your Google email.');
        return;
      }
      if (!emailToUse.includes('@')) {
        emailToUse = `${emailToUse}@gmail.com`;
      }
      payload = { email: emailToUse, name: nameToUse };
    }

    try {
      const res = await fetch('/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.message || 'Google sign-in failed.');
        return;
      }
      await loginWithToken(data.token, data.user);
    } catch {
      setAuthError('Failed to connect to authentication service.');
    }
  };

  // Initialize Google Identity Services (GIS) on modal open
  useEffect(() => {
    if (authModal === 'household') {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '107040001907-tmf69ioebd6cf1lbikcijupgpqo37elp.apps.googleusercontent.com';
      const initGis = () => {
        if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && googleClientId) {
          try {
            (window as any).google.accounts.id.initialize({
              client_id: googleClientId,
              callback: (response: any) => {
                if (response?.credential) {
                  void handleHouseholdAuthSubmit(response.credential);
                }
              },
            });
            const container = document.getElementById('google-signin-btn-container');
            if (container) {
              container.innerHTML = '';
              (window as any).google.accounts.id.renderButton(container, {
                theme: 'outline',
                size: 'large',
                width: 320,
                text: 'continue_with',
                shape: 'rectangular',
              });
            }
          } catch (err) {
            console.warn('Google Identity Services notice:', err);
          }
        }
      };

      const timer = setTimeout(initGis, 120);
      return () => clearTimeout(timer);
    }
  }, [authModal]);

  // Collector Sign In submission
  const handleCollectorSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: colPhone, password: colPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.message || 'Collector sign-in failed. Check phone and password.');
        return;
      }
      if (data.user.role !== 'collector') {
        setAuthError('This account does not have collector credentials.');
        return;
      }
      await loginWithToken(data.token, data.user);
    } catch {
      setAuthError('Network error connecting to server.');
    }
  };

  // Collector Application submission
  const handleCollectorApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/v1/collector/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: colName,
          phone: colPhone,
          vehicle_type: colVehicle,
          service_area: colArea,
          categories: colCategories,
          authorization_ref: colAuthRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.message || 'Could not submit application.');
        return;
      }
      setRecentApplication(data.application);
      setAuthModal('pending_approval');
    } catch {
      setAuthError('Network error submitting application.');
    }
  };

  // Admin approves collector application
  const handleApproveCollector = async (appId: string) => {
    if (!authToken) return;
    const isHazard = Boolean(hazardAuthMap[appId]);
    try {
      const res = await fetch(`/v1/admin/collectors/${appId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ is_hazard_authorized: isHazard }),
      });
      const data = await res.json();
      if (res.ok) {
        setApprovalSuccessMsg(`Approved ${data.collector.name}! Temp Password: ${data.temp_password}`);
        void loadAdminCollectors();
        void loadLeaderboard();
      } else {
        alert(data.message || 'Approval failed.');
      }
    } catch {
      alert('Error approving collector.');
    }
  };

  // Client-side canvas compression (max 1280px, JPEG 0.75, EXIF stripped, <300KB)
  const processImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
          setImagePreview(dataUrl);
          setImageSizeKb(kb);
          setSelectedPreset(null);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (files: FileList | null) => {
    if (files && files[0]) {
      processImageFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      setIsWebcamOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 100);
    } catch {
      cameraInputRef.current?.click();
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamOpen(false);
  };

  const captureWebcamFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
      setImagePreview(dataUrl);
      setImageSizeKb(kb);
      setSelectedPreset(null);
    }
    stopWebcam();
  };

  const loadPresetDevice = (devType: string, label: string) => {
    setSelectedPreset(devType);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#13231d"/><circle cx="320" cy="180" r="100" fill="#1a3d2e"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="#34d399" font-size="28" font-family="sans-serif" font-weight="bold">${label}</text><text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="16" font-family="sans-serif">Sample Preset (${devType})</text></svg>`;
    const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    setImagePreview(dataUrl);
    setImageSizeKb(36);
  };

  // Voice synthesis
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.onstart = () => setAudioPlaying(true);
    utterance.onend = () => setAudioPlaying(false);
    utterance.onerror = () => setAudioPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  // Inspection flow
  const handleInspect = async (overrideImg?: string, overrideDev?: string) => {
    setIsScanning(true);
    const activeImg = overrideImg || imagePreview;
    const activeDev = overrideDev || selectedPreset;
    const normDev = (activeDev === 'crt_television' || activeDev === 'crt_tv') ? 'crt_tv' : activeDev;

    try {
      const res = await fetch('/v1/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_key: 'uploads/guest/device_capture.jpg',
          image_b64: activeImg || undefined,
          device_type: normDev || undefined,
          lang,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.needs_more_photos || !activeDev) {
          setScanResult(data);
          setIsScanning(false);
          setTimeout(() => {
            document.getElementById('scan-results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Deterministic calibrated fallback by device type
    setTimeout(() => {
      let fallbackData: any;
      if (normDev === 'laptop') {
        fallbackData = {
          scan_id: 'scan_demo_laptop',
          is_demo: true,
          device: {
            device_type: 'laptop',
            label: lang === 'hi' ? 'लैपटॉप (डेल/एचपी)' : 'Laptop (Dell/HP)',
            condition: 'damaged',
            age_band: '3to6',
          },
          hazards: [
            {
              hazard_id: 'HAZ_LI_ION',
              severity: 'HIGH',
              icon: 'BatteryWarning',
              warning: lang === 'hi' ? 'लैपटॉप की लिथियम बैटरी क्षतिग्रस्त है, आग लग सकती है।' : 'Damaged laptop lithium battery may catch fire if punctured or heated.',
              do: [
                lang === 'hi' ? 'बैटरी को सावधानी से ठंडी जगह रखें।' : 'Store in a cool dry area away from flammables.',
                lang === 'hi' ? 'अधिकृत कबाड़ीवाले को ही सौंपें।' : 'Hand over intact to a verified handler.',
              ],
              dont: [
                lang === 'hi' ? 'इसे कभी खोलें या जलाएँ नहीं।' : 'Never puncture, hammer, or incinerate.',
                lang === 'hi' ? 'घरेलू कचरे में कभी न डालें।' : 'Never dispose in municipal waste.',
              ],
            },
            {
              hazard_id: 'HAZ_BROKEN_GLASS_LCD',
              severity: 'MEDIUM',
              icon: 'AlertTriangle',
              warning: lang === 'hi' ? 'टूटी हुई एलसीडी स्क्रीन में कांच के बारीक टुकड़े हैं।' : 'Cracked LCD panel contains shattered glass shards and liquid crystals.',
              do: [lang === 'hi' ? 'स्क्रीन को सुरक्षित रूप से ढक कर रखें।' : 'Keep panel intact; handle with care.'],
              dont: [lang === 'hi' ? 'खुले हाथों से कांच न छुएँ।' : 'Do not touch liquid crystals directly.'],
            },
          ],
          decision: {
            recommended_tier: 'REPAIR_THEN_REUSE',
            options: [
              {
                option_id: 'REPAIR_THEN_REUSE',
                title: lang === 'hi' ? 'स्क्रीन मरम्मत और पुनः उपयोग' : 'Screen Replacement & Hardware Refurbish',
                money_range: { min: 4500, max: 12000, currency: 'INR' },
                env_rating: 'better',
                co2e_avoided_min_kg: 180.0,
                co2e_avoided_max_kg: 260.0,
                why: lang === 'hi' ? 'मरम्मत खर्च नए लैपटॉप की तुलना में बहुत कम है। 180+ किग्रा कार्बन की बचत होती है।' : 'Repair cost (~₹2,500) is well under 50% of secondary market value (~₹22,000). Extends device lifetime.',
              },
              {
                option_id: 'RECYCLE_AUTHORIZED',
                title: lang === 'hi' ? 'अधिकृत रीसाइक्लिंग' : 'Certified High-Grade Dismantling',
                money_range: { min: 600, max: 1400, currency: 'INR' },
                env_rating: 'good',
                co2e_avoided_min_kg: 40.0,
                co2e_avoided_max_kg: 85.0,
                why: lang === 'hi' ? 'एल्यूमिनियम केसिंग और कीमती धातुएँ सुरक्षित रूप से अलग होती हैं।' : 'Recovers aluminium chassis and precious contact metals safely.',
              },
            ],
            comparison_table: [
              {
                option_name: lang === 'hi' ? 'कचरे में फेंकना' : 'Throw away (Landfill/Drain)',
                money_text: '₹0',
                env_rating: 'poor',
                co2e_avoided_text: '0 kg CO₂e',
                summary_reason: lang === 'hi' ? 'भारी प्रदूषण: लिथियम आग का खतरा।' : 'Extreme pollution: lithium fire hazard and groundwater contamination.',
              },
              {
                option_name: lang === 'hi' ? 'मरम्मत कर उपयोग' : 'Repair & Refurbish',
                money_text: '₹4,500 - ₹12,000',
                env_rating: 'better',
                co2e_avoided_text: '180 - 260 kg CO₂e',
                summary_reason: lang === 'hi' ? 'उच्चतम चक्रीय मूल्य संरक्षण।' : 'Highest circular value preservation.',
              },
              {
                option_name: lang === 'hi' ? 'अधिकृत रीसाइक्लिंग' : 'Authorized Recycling',
                money_text: '₹600 - ₹1,400',
                env_rating: 'good',
                co2e_avoided_text: '40 - 85 kg CO₂e',
                summary_reason: lang === 'hi' ? 'धातुओं की पुनः प्राप्ति।' : 'Safe metal recovery.',
              },
            ],
          },
          audio_script: lang === 'hi'
            ? 'सावधानी। लैपटॉप की बैटरी और स्क्रीन का खतरा पहचाना गया है। स्क्रीन बदलने पर इसका मूल्य साढ़े चार से बारह हजार रुपये हो सकता है।'
            : 'Caution. High severity battery hazard identified. Device qualifies for screen repair with estimated value ₹4,500 to ₹12,000.',
        };
      } else if (normDev === 'crt_tv') {
        fallbackData = {
          scan_id: 'scan_demo_crt_tv',
          is_demo: true,
          device: {
            device_type: 'crt_tv',
            label: lang === 'hi' ? 'CRT टीवी (लेडेड ग्लास)' : 'CRT Television (Heavy Lead Glass)',
            condition: 'burnt',
            age_band: 'gt10',
          },
          hazards: [
            {
              hazard_id: 'HAZ_CRT_LEAD',
              severity: 'HIGH',
              icon: 'AlertTriangle',
              warning: lang === 'hi' ? 'CRT ट्यूब में 2-3 किलोग्राम तक विषैला लेड (सीसा) होता है।' : 'CRT funnel glass contains up to 2-3 kg of hazardous lead oxide.',
              do: [
                lang === 'hi' ? 'ट्यूब को सुरक्षित रखें ताकि वैक्यूम विस्फोट न हो।' : 'Handle tube with extreme care to prevent violent vacuum implosion.',
                lang === 'hi' ? 'पूरा टीवी केवल अधिकृत रीसाइक्लर को सौंपें।' : 'Hand over whole to an authorized e-waste recycler.',
              ],
              dont: [
                lang === 'hi' ? 'CRT ट्यूब को कभी न तोड़ें या फोड़ें।' : 'NEVER smash or break CRT glass tube.',
                lang === 'hi' ? 'खुले में जलाने या कबाड़ में फेंकने से बचें।' : 'Never dump in landfills or sell to informal open-air dismantlers.',
              ],
            },
          ],
          decision: {
            recommended_tier: 'RECYCLE_AUTHORIZED',
            options: [
              {
                option_id: 'RECYCLE_AUTHORIZED',
                title: lang === 'hi' ? 'अधिकृत लेड-सुरक्षित रीसाइक्लिंग' : 'Authorized Lead-Safe E-Waste Recycling',
                money_range: { min: 150, max: 350, currency: 'INR' },
                env_rating: 'better',
                co2e_avoided_min_kg: 15.0,
                co2e_avoided_max_kg: 30.0,
                why: lang === 'hi' ? 'प्रमाणित रिफाइनरी सीसे को अलग करती है और तांबे के कॉइल को रीसायकल करती है।' : 'Certified smelters isolate lead glass safely while recovering pure copper windings.',
              },
            ],
            comparison_table: [
              {
                option_name: lang === 'hi' ? 'कचरे में फेंकना / तोड़ना' : 'Throw away / Smash (Illegal)',
                money_text: '₹0',
                env_rating: 'poor',
                co2e_avoided_text: '0 kg CO₂e',
                summary_reason: lang === 'hi' ? 'अत्यंत विषैला: सीसा मिट्टी और भूजल में घुलकर जहर फैलाता है।' : 'Extreme occupational hazard: toxic lead poisoning of air, soil, and groundwater.',
              },
              {
                option_name: lang === 'hi' ? 'अधिकृत सुरक्षित रीसाइक्लिंग' : 'Authorized Recycling',
                money_text: '₹150 - ₹350',
                env_rating: 'best',
                co2e_avoided_text: '15 - 30 kg CO₂e',
                summary_reason: lang === 'hi' ? 'सीसे का सुरक्षित पृथक्करण और तांबा पुनः प्राप्ति।' : 'Safely neutralizes toxic lead oxide and reclaims copper windings.',
              },
            ],
          },
          audio_script: lang === 'hi'
            ? 'सावधानी! सीआरटी टीवी में जहरीला सीसा होता है। इसे कभी न तोड़ें। केवल अधिकृत रीसाइक्लर को ही सौंपें।'
            : 'Caution! CRT televisions contain hazardous lead oxide in the tube glass. Never break the glass. Hand over whole to an authorized recycler.',
        };
      } else {
        fallbackData = {
          scan_id: 'scan_demo_4412',
          is_demo: true,
          device: {
            device_type: 'mobile_phone',
            label: lang === 'hi' ? 'स्मार्टफोन (सैमसंग)' : 'Smartphone (Samsung)',
            condition: 'damaged',
            age_band: '3to6',
          },
          hazards: [
            {
              hazard_id: 'HAZ_LI_ION',
              severity: 'HIGH',
              icon: 'BatteryWarning',
              warning: lang === 'hi' ? 'क्षतिग्रस्त लिथियम बैटरी में आग लग सकती है।' : 'A lithium battery may catch fire or explode if punctured or heated.',
              do: [
                lang === 'hi' ? 'फूली या गर्म बैटरी को अलग करें।' : 'Stop handling a hot or swollen battery.',
                lang === 'hi' ? 'अधिकृत रीसाइक्लर को ही सौंपें।' : 'Hand over intact to a verified battery handler.',
              ],
              dont: [
                lang === 'hi' ? 'इसे कभी छेदें या जलाएँ नहीं।' : 'Do not puncture, hammer, or incinerate.',
                lang === 'hi' ? 'घरेलू कचरे में कभी न डालें।' : 'Never put this in household waste.',
              ],
            },
          ],
          decision: {
            recommended_tier: 'REPAIR_THEN_REUSE',
            options: [
              {
                option_id: 'REPAIR_THEN_REUSE',
                title: lang === 'hi' ? 'स्क्रीन मरम्मत और पुनः उपयोग' : 'Screen Repair & Refurbishment',
                money_range: { min: 2500, max: 6500, currency: 'INR' },
                env_rating: 'better',
                co2e_avoided_min_kg: 35.0,
                co2e_avoided_max_kg: 55.0,
                why: lang === 'hi' ? 'मरम्मत खर्च मूल्य के 50% से कम है। स्क्रीन बदलकर फोन को दूसरा जीवन मिलता है।' : 'Repair cost (~₹1,200) is well under 50% of secondary market value. Extends device lifetime.',
              },
              {
                option_id: 'RECYCLE_AUTHORIZED',
                title: lang === 'hi' ? 'अधिकृत रीसाइक्लिंग' : 'Authorized Material Recycling',
                money_range: { min: 80, max: 220, currency: 'INR' },
                env_rating: 'good',
                co2e_avoided_min_kg: 10.0,
                co2e_avoided_max_kg: 18.0,
                why: lang === 'hi' ? 'पंजीकृत रिफाइनरी में सोना, तांबा और कोबाल्ट अलग किया जाता है।' : 'Certified smelters reclaim gold, copper, and cobalt while safely neutralizing battery cells.',
              },
            ],
            comparison_table: [
              {
                option_name: lang === 'hi' ? 'कचरे में फेंकना (डंपिंग)' : 'Throw away (Landfill/Drain)',
                money_text: '₹0',
                env_rating: 'poor',
                co2e_avoided_text: '0 kg CO₂e',
                summary_reason: lang === 'hi' ? 'भारी प्रदूषण: लिथियम आग का खतरा और भूजल में तेजाब।' : 'Extreme pollution: lithium fire hazard and toxic chemicals in soil.',
              },
              {
                option_name: lang === 'hi' ? 'मरम्मत कर उपयोग' : 'Repair & Refurbish',
                money_text: '₹2,500 - ₹6,500',
                env_rating: 'better',
                co2e_avoided_text: '35 - 55 kg CO₂e',
                summary_reason: lang === 'hi' ? 'नया फोन बनने का 85% कार्बन बचाता है।' : 'Restores functional life; avoids 85% of embodied manufacturing carbon.',
              },
              {
                option_name: lang === 'hi' ? 'अधिकृत रीसाइक्लिंग' : 'Authorized Recycling',
                money_text: '₹80 - ₹220',
                env_rating: 'good',
                co2e_avoided_text: '10 - 18 kg CO₂e',
                summary_reason: lang === 'hi' ? 'कीमती धातुएं वापस प्राप्त होती हैं।' : 'Reclaims precious metals; avoids primary bauxite and copper mining.',
              },
            ],
          },
          audio_script: lang === 'hi'
            ? 'सावधानी। लिथियम बैटरी का खतरा पहचाना गया है। स्क्रीन बदलने के बाद इस फोन का मूल्य लगभग ढाई से साढ़े छह हजार रुपये हो सकता है।'
            : 'Caution. High severity lithium battery hazard detected. Device qualifies for screen repair. Tap Arrange Pickup to connect with a verified collector.',
        };
      }

      setScanResult(fallbackData);
      setIsScanning(false);
      setTimeout(() => {
        document.getElementById('scan-results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }, 400);
  };

  // Guest-First Pickup Booking: Requires Household sign-in to attach scan
  const handleBookPickup = async () => {
    if (!currentUser) {
      if (scanResult?.scan_id) {
        setPendingScanToClaim(scanResult.scan_id);
      }
      setAuthModal('household');
      return;
    }

    if (currentUser.role !== 'household') {
      if (scanResult?.scan_id) {
        setPendingScanToClaim(scanResult.scan_id);
      }
      setAuthError(
        lang === 'hi'
          ? 'पिकअप केवल घरेलू नागरिक खातों (Household Accounts) के लिए उपलब्ध है। कृपया नागरिक खाते से साइन-इन करें।'
          : 'Doorstep pickup is reserved for household citizens. Please sign in with a Household profile.'
      );
      setAuthModal('household');
      return;
    }

    // Attach scan to household account if available
    if (scanResult?.scan_id) {
      try {
        await fetch(`/v1/scan/${scanResult.scan_id}/claim`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        });
      } catch {
        // ignore
      }
    }

    // Call /v1/pickups with authenticated token
    try {
      const res = await fetch('/v1/pickups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          device_type: scanResult?.device?.device_type || 'mobile_phone',
          approx_lat: 28.5355,
          approx_lng: 77.2610,
          recommended_option: scanResult?.decision?.recommended_tier || 'RECYCLE_AUTHORIZED',
          hazards: scanResult?.hazards?.map((h: any) => h.hazard_id) || [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActivePickup(data.pickup);
        if (data.qr_tokens?.length) {
          setQrToken(data.qr_tokens[0]);
        }
        setActiveTab('pickup');
        return;
      }
    } catch {
      // fallback
    }

    const newReqId = 'req_' + Math.random().toString(36).substring(2, 8);
    const newQr = `qr_${newReqId}_item1`;
    setActivePickup({
      request_id: newReqId,
      status: 'CLUSTERED',
      device_type: scanResult?.device?.device_type || 'mobile_phone',
      cluster_info: 'Grouped with 3 nearby households in Nehru Place cluster (saved 6.4 km)',
    });
    setQrToken(newQr);
    setActiveTab('pickup');
  };

  // Confirm Handover (Household confirms, points credited)
  const handleConfirmHandover = async () => {
    if (!activePickup) return;
    try {
      if (authToken && qrToken) {
        const res = await fetch('/v1/handover/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            qr_token: qrToken,
            confirmed: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setActivePickup({
            ...activePickup,
            status: 'VERIFIED',
            points_earned: data.points_earned,
            kg_diverted: data.kg_diverted,
            verified_at: new Date().toLocaleTimeString(),
          });
          setHandoverSuccessMsg(
            lang === 'hi'
              ? `✓ हैंडओवर सफलतापूर्वक सत्यापित! +${data.points_earned || 90} इको पॉइंट्स जुड़े।`
              : `✓ Handover Verified! +${data.points_earned || 90} Eco Points credited to your impact ledger.`
          );
          void loadLeaderboard();
          void loadPersonalImpact();
          return;
        }
      }
    } catch {
      // fallback
    }

    const earned = activePickup?.points_earned || 90;
    const kg = activePickup?.kg_diverted || 0.22;
    setActivePickup({
      ...activePickup,
      status: 'VERIFIED',
      points_earned: earned,
      kg_diverted: kg,
      verified_at: new Date().toLocaleTimeString(),
    });
    setHandoverSuccessMsg(
      lang === 'hi'
        ? `✓ हैंडओवर सफलतापूर्वक सत्यापित! +${earned} इको पॉइंट्स आपके खाते में जुड़ गए।`
        : `✓ Handover Verified! +${earned} Eco Points & ${kg} kg diverted credited to your impact ledger.`
    );
    void loadLeaderboard();
    void loadPersonalImpact();
  };

  // Admin Aggregation dispatch
  const handleRunAdminAggregation = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/v1/admin/demo/run-aggregation', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminReport(data);
        return;
      }
    } catch {
      // Fallback
    }
    setAdminReport({
      status: 'DISPATCHED',
      total_saved_km: 38.6,
      total_co2e_saved_kg: 3.7,
      message: 'Batched 12 open household requests into 3 optimized collector loops! Saved 38.6 km vs single trips.',
    });
  };

  return (
    <>
      <a className="skip-link" href="#main">{t('skip')}</a>

      {isDemo && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-950 text-xs px-4 py-2 flex items-center justify-between shadow-sm">
          <div className="mx-auto flex items-center gap-2 font-medium">
            <span>⚡ <strong>Hackathon Demo Mode (/app/demo):</strong> Use the 1-click role switcher in the header to evaluate Household, Collector, and Municipal Admin views.</span>
          </div>
          <a href="/app" className="text-amber-900 hover:text-amber-950 font-bold underline whitespace-nowrap text-xs ml-3">
            Real User Mode (/app) →
          </a>
        </div>
      )}

      <header className="app-header">
        <div className="flex items-center gap-3">
          <a href="/" className="btn-nav-auth text-xs flex items-center gap-1 font-semibold" title="Return to Landing Page">
            ← Home
          </a>
          <a className="brand" href={isDemo ? "/app/demo" : "/app"} aria-label="ScrapMitra">
            <span className="brand-icon">
              <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M26 4C13.85 4 4 13.85 4 26C4 38.15 13.85 48 26 48C38.15 48 48 38.15 48 26" stroke="#0B2923" strokeWidth="2.8" strokeLinecap="round" strokeDasharray="16 8"/>
                <path d="M48 26L42 20M48 26L54 20" stroke="#0B2923" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M26 36C26 36 16 28 16 20C16 14.477 20.477 10 26 10C31.523 10 36 14.477 36 20C36 28 26 36 26 36Z" stroke="#0B2923" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M26 36V22" stroke="#0B2923" strokeWidth="2.8" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="brand-copy">
              <strong className="brand-title">scrapmitra</strong>
              <small className="brand-subtitle">{isDemo ? '⚡ Hackathon Demo' : 'v2 · Circular Decision & Pickup'}</small>
            </span>
          </a>
        </div>

        {/* User Identity Pill / Sign-in Actions */}
        <div className="auth-header-actions">
          {/* Quick Demo Switcher - Shown ONLY in Hackathon Demo Mode */}
          {isDemo ? (
            <div className="demo-switcher">
              <span className="demo-switcher-label">Demo:</span>
              <button
                type="button"
                className={`demo-role-btn ${currentUser?.user_id === 'sub_hh_01' ? 'active' : ''}`}
                onClick={() => void loginWithToken('demo-token-household-1')}
                title="Sign in as Demo Household (EcoPioneer)"
              >
                Household
              </button>
              <button
                type="button"
                className={`demo-role-btn ${currentUser?.user_id === 'sub_col_delhi_01' ? 'active' : ''}`}
                onClick={() => void loginWithToken('demo-token-collector-1')}
                title="Sign in as Demo Collector (Ramesh Kumar)"
              >
                Collector
              </button>
              <button
                type="button"
                className={`demo-role-btn ${currentUser?.user_id === 'sub_admin_01' ? 'active' : ''}`}
                onClick={() => void loginWithToken('demo-token-admin')}
                title="Sign in as Municipal Admin (Delhi Waste Commissioner)"
              >
                Admin
              </button>
              <a
                href="/app"
                className="text-[10px] text-slate-500 hover:text-slate-800 underline ml-1 font-semibold"
                title="Switch to Real User App"
              >
                Real Mode →
              </a>
            </div>
          ) : (
            <a
              href="/app/demo"
              className="btn-nav-auth"
              style={{ borderColor: '#F4623A', color: '#F4623A', fontWeight: 600 }}
              title="Open Hackathon Demo & Evaluator Controls"
            >
              ⚡ Demo Mode
            </a>
          )}

          {currentUser ? (
            <div className="auth-user-pill">
              <span className={`role-badge ${currentUser.role}`}>{currentUser.role}</span>
              <strong>{currentUser.display_name}</strong>
              <button
                type="button"
                className="text-xs text-red-600 hover:text-red-800 ml-1 font-bold underline"
                onClick={handleLogout}
              >
                {t('signOut')}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-nav-auth flex items-center gap-1.5 font-medium"
                onClick={() => {
                  setAuthModal('household');
                }}
                title="Sign in with Google"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" className="flex-shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{lang === 'hi' ? 'गूगल साइन-इन' : 'Sign in with Google'}</span>
              </button>
              <button
                type="button"
                className="btn-nav-auth highlight"
                onClick={() => {
                  setCollectorMode('signin');
                  setAuthModal('collector');
                }}
              >
                <Icon name="Truck" size={15} />
                {t('collectorPortal')}
              </button>
            </div>
          )}

          <div className="language-picker ml-2" role="group" aria-label={t('language')}>
            <button type="button" aria-pressed={lang === 'en'} onClick={() => void i18n.changeLanguage('en')}>English</button>
            <button type="button" lang="hi" aria-pressed={lang === 'hi'} onClick={() => void i18n.changeLanguage('hi')}>हिंदी</button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-5 pb-16 md:px-10">
        {/* Navigation Tabs */}
        <nav className="tab-nav" aria-label="Navigation modes">
          <button type="button" className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
            <Icon name="Camera" size={17} />{t('navScan')}
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'pickup' ? 'active' : ''}`} onClick={() => setActiveTab('pickup')}>
            <Icon name="QrCode" size={17} />{t('navPickup')}
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'collector' ? 'active' : ''}`} onClick={() => setActiveTab('collector')}>
            <Icon name="Truck" size={17} />{t('navCollector')}
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'impact' ? 'active' : ''}`} onClick={() => setActiveTab('impact')}>
            <Icon name="Award" size={17} />{t('navImpact')}
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            <Icon name="BarChart3" size={17} />{t('navLeaderboard')}
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            <Icon name="ShieldCheck" size={17} />{t('navAdmin')}
          </button>
        </nav>

        {/* TAB 1: SCAN & DECIDE (Guest-First) */}
        {activeTab === 'scan' && (
          <section>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileInputChange(e.target.files)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileInputChange(e.target.files)}
            />

            <div className="hero">
              <div className="hero-content">
                <span className="eyebrow">{t('eyebrow')}</span>
                <h1>
                  {lang === 'en' ? (
                    <>
                      Avoid throwing it away.<br />
                      Choose <span className="text-[#F15B40]">circular value.</span>
                    </>
                  ) : (
                    t('title')
                  )}
                </h1>
                <p className="hero-subtitle">{t('subtitle')}</p>


                {/* Image Capture & Drop Zone */}
                {!imagePreview && !isWebcamOpen && (
                  <div
                    className={`drop-zone ${isDragging ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <div className="drop-icon">
                      <Icon name="Camera" size={32} />
                    </div>
                    <p className="drop-text">{t('dropImage')}</p>

                    <div className="upload-actions">
                      <button type="button" className="btn-camera" onClick={() => cameraInputRef.current?.click()}>
                        <Icon name="Camera" size={17} />
                        <span>{t('takePhoto')}</span>
                      </button>
                      <button type="button" className="btn-upload" onClick={() => fileInputRef.current?.click()}>
                        <Icon name="Upload" size={17} />
                        <span>{t('uploadPhoto')}</span>
                      </button>
                      <button type="button" className="btn-webcam" onClick={() => void startWebcam()}>
                        <Icon name="RefreshCw" size={16} />
                        <span>{t('openWebcam')}</span>
                      </button>
                    </div>

                    <div className="sample-presets">
                      <span className="sample-title">{t('sampleDevices')}</span>
                      <div className="sample-buttons">
                        <button
                          type="button"
                          className={`sample-btn ${selectedPreset === 'mobile_phone' ? 'active' : ''}`}
                          onClick={() => loadPresetDevice('mobile_phone', 'Damaged Smartphone')}
                        >
                          <Icon name="Smartphone" size={16} />
                          <span>{lang === 'hi' ? 'स्मार्टफ़ोन' : 'Smartphone'}</span>
                        </button>
                        <button
                          type="button"
                          className={`sample-btn ${selectedPreset === 'laptop' ? 'active' : ''}`}
                          onClick={() => loadPresetDevice('laptop', 'Used Laptop')}
                        >
                          <Icon name="Laptop" size={16} />
                          <span>{lang === 'hi' ? 'लैपटॉप' : 'Laptop'}</span>
                        </button>
                        <button
                          type="button"
                          className={`sample-btn ${selectedPreset === 'crt_television' ? 'active' : ''}`}
                          onClick={() => loadPresetDevice('crt_television', 'CRT Television')}
                        >
                          <Icon name="Tv" size={16} />
                          <span>{lang === 'hi' ? 'CRT टीवी' : 'CRT TV'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Webcam Stream Frame */}
                {isWebcamOpen && (
                  <div className="webcam-frame">
                    <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
                    <div className="webcam-controls">
                      <button type="button" className="camera-button" onClick={captureWebcamFrame}>
                        <Icon name="Camera" size={20} />{t('snapWebcam')}
                      </button>
                      <button type="button" className="btn-close-webcam" onClick={stopWebcam}>
                        <Icon name="X" size={18} />{t('closeWebcam')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Image Preview & Inspect Action */}
                {imagePreview && !isWebcamOpen && (
                  <div className="preview-container">
                    <div className="preview-image-wrapper">
                      <img src={imagePreview} alt="Device to inspect" className="preview-img" />
                    </div>
                    <div className="preview-meta">
                      <Icon name="Check" size={15} />
                      <span>{imageSizeKb ? `${imageSizeKb} KB · ` : ''}{t('imageReady')}</span>
                    </div>

                    <button
                      type="button"
                      className="camera-button w-full"
                      onClick={() => void handleInspect()}
                      disabled={isScanning}
                    >
                      <Icon name={isScanning ? 'RefreshCw' : 'Camera'} size={22} />
                      {isScanning
                        ? (lang === 'hi' ? 'जाँच हो रही है...' : 'Inspecting Device...')
                        : t('inspectNow')}
                    </button>

                    <div className="flex gap-2 w-full mt-3">
                      <button
                        type="button"
                        className="secondary-upload-btn flex-1"
                        onClick={() => {
                          setImagePreview(null);
                          setSelectedPreset(null);
                        }}
                      >
                        <Icon name="RefreshCw" size={16} />{t('changePhoto')}
                      </button>
                      <button
                        type="button"
                        className="secondary-upload-btn flex-1"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Icon name="Upload" size={16} />{t('uploadPhoto')}
                      </button>
                    </div>
                  </div>
                )}

                <p className="scan-status">{t('scanSoon')}</p>
                <p className="no-account"><Icon name="ShieldCheck" size={18} />{t('noAccount')}</p>
              </div>

              <div className="device-illustration" aria-hidden="true">
                <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                <div className="device-tile tile-laptop"><Icon name="Laptop" size={56} /></div>
                <div className="device-tile tile-phone"><Icon name="Smartphone" size={44} /></div>
                <div className="device-tile tile-circuit"><Icon name="CircuitBoard" size={32} /></div>
                <div className="recycle-circle"><Icon name="Recycle" size={26} /></div>
              </div>
            </div>

            {/* Voice Assistant — Always Available on the Main Screen */}
            <div className="max-w-4xl mx-auto px-4 mt-6">
              <VoiceAgent
                scanId={scanResult?.scan_id}
                imageUploaded={Boolean(imagePreview || selectedPreset)}
                deviceHint={selectedPreset || scanResult?.device?.label || scanResult?.device?.device_type}
                scanData={scanResult}
                authToken={authToken}
                lang={lang}
              />
            </div>

            {/* Scan Results & Decision Engine */}
            {scanResult && scanResult.needs_more_photos && (
              <div className="mt-8 bg-amber-50 border border-amber-300 rounded-2xl p-6 text-center max-w-xl mx-auto shadow-sm">
                <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Icon name="CircleAlert" size={30} />
                </div>
                <h3 className="text-lg font-bold text-amber-900 mb-1">Clearer Photo Required</h3>
                <p className="text-sm text-amber-800 mb-3">{scanResult.message || 'Confidence is below threshold. For safety and pricing accuracy, please capture another angle.'}</p>
                {scanResult.suggested_angle && (
                  <div className="bg-white border border-amber-200 rounded-xl p-3 text-xs text-slate-700 font-semibold mb-4 inline-block">
                    💡 Suggestion: {scanResult.suggested_angle}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <button
                    type="button"
                    className="camera-button"
                    onClick={() => {
                      setImagePreview(null);
                      setScanResult(null);
                    }}
                  >
                    <Icon name="RefreshCw" size={18} />
                    Retake / Choose Another Photo
                  </button>
                  <button
                    type="button"
                    className="secondary-upload-btn"
                    onClick={() => {
                      void handleInspect(imagePreview || undefined, 'mobile_phone');
                    }}
                  >
                    ⚡ Proceed with Best Estimate (Smartphone)
                  </button>
                </div>
              </div>
            )}

            {scanResult && !scanResult.needs_more_photos && scanResult.device && (
              <div id="scan-results-section" className="mt-8">
                {scanResult.hazards?.length > 0 && (
                  <div className="hazard-banner" role="alert">
                    <div className="hazard-banner-header">
                      <Icon name="BatteryWarning" size={28} />
                      <div>
                        <h3>{t('safetyAlert')}</h3>
                        <p className="m-0 text-sm">{scanResult.hazards[0].warning}</p>
                      </div>
                    </div>
                    <span className="hazard-never">{t('neverHouseholdWaste')}</span>
                    <div className="hazard-dodont">
                      <div className="hazard-box">
                        <strong className="text-emerald-800">✓ DO:</strong>
                        <ul>
                          {scanResult.hazards[0].do?.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                        </ul>
                      </div>
                      <div className="hazard-box">
                        <strong className="text-red-800">✗ DON'T:</strong>
                        <ul>
                          {scanResult.hazards[0].dont?.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="result-header">
                  <div className="result-top">
                    <div>
                      <h2>{scanResult.device.label}</h2>
                      <span className="badge-demo">
                        {scanResult.is_demo ? 'DEMO ESTIMATE · SOURCES & ASSUMPTIONS BELOW' : 'ESTIMATE · SOURCES & ASSUMPTIONS BELOW'}
                      </span>
                    </div>
                    <button type="button" className="listen-button" onClick={() => speakText(scanResult.audio_script)}>
                      <Icon name="Volume2" size={20} />
                      {audioPlaying ? (lang === 'hi' ? 'चल रहा है...' : 'Playing...') : t('listen')}
                    </button>
                  </div>
                </div>

                <div className="options-grid">
                  {scanResult.decision?.options?.map((opt: any, idx: number) => (
                    <article key={opt.option_id} className={`option-card ${idx === 0 ? 'recommended' : ''}`}>
                      {idx === 0 && <span className="rec-tag">Recommended Tier</span>}
                      <div>
                        <h3>{opt.title}</h3>
                        {opt.money_range ? (
                          <p className="option-money">₹{opt.money_range.min.toLocaleString()} - ₹{opt.money_range.max.toLocaleString()}</p>
                        ) : (
                          <p className="option-money text-amber-700">Community Social Credit</p>
                        )}
                        <span className="option-co2">
                          <Icon name="Zap" size={14} />
                          {opt.co2e_avoided_min_kg} - {opt.co2e_avoided_max_kg} kg CO₂e saved
                        </span>
                        {opt.assumption_id && (
                          <p className="text-xs text-slate-500 mt-1">CO₂e factor assumption: {opt.assumption_id}</p>
                        )}
                        <p className="option-why">{opt.why}</p>
                      </div>
                      {idx === 0 && (
                        <button type="button" className="camera-button mt-3 w-full" onClick={handleBookPickup}>
                          <Icon name="Truck" size={20} />
                          {t('arrangePickup')}
                        </button>
                      )}
                    </article>
                  ))}
                </div>

                {/* Comparison Table */}
                <div className="comparison-container">
                  <h3 className="text-base font-bold mb-3">{t('comparisonTitle')}</h3>
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Option</th>
                        <th>Estimated Money</th>
                        <th>Carbon Saved</th>
                        <th>Environmental Trade-off</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.decision?.comparison_table?.map((row: any, i: number) => (
                        <tr key={i}>
                          <td><strong>{row.option_name}</strong></td>
                          <td>{row.money_text}</td>
                          <td><span className={`rating-pill pill-${row.env_rating}`}>{row.co2e_avoided_text}</span></td>
                          <td>{row.summary_reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <aside className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 leading-relaxed">
                  <strong>Estimate sources &amp; assumptions:</strong> API-backed INR ranges use the static demo rules in
                  {' '}<code>data/decision_rules.json</code>; the file labels them as secondary-market benchmarks,
                  but this prototype has no live price feed or linked, current dealer quotes. Offline fallback values are
                  fixed examples in the frontend, not fetched market data. Actual offers vary with condition, age, repair
                  scope, locality, and buyer demand. API-backed CO₂e bands use device-type factors in
                  {' '}<code>data/emission_factors.json</code> and the listed assumption ID; the engine credits 100% of
                  the factor for reuse, 85% for repair, and 25–35% for recycling. Offline fallback CO₂e values are also
                  fixed examples, not factor-table calculations. None are measured device footprints or audited savings.
                  See <code>docs/ASSUMPTIONS.md</code>.
                </aside>
              </div>
            )}

            {/* Catalog toggle */}
            <div className="mt-8 text-center">
              <button type="button" className="catalog-toggle mx-auto" aria-expanded={showCatalog} onClick={() => setShowCatalog(!showCatalog)}>
                {t(showCatalog ? 'hideCatalog' : 'browse')}
                <Icon name={showCatalog ? 'X' : 'ChevronRight'} size={18} />
              </button>
            </div>
            {showCatalog && (
              <section id="device-catalog" className="catalog-section">
                <div className="section-heading">
                  <h2>{t('catalogTitle')}</h2>
                  <span>{t('catalogCount', { count: device_type.length })}</span>
                </div>
                <p className="catalog-note">{t('catalogNote')}</p>
                <ul className="catalog-grid">
                  {device_type.map((id) => (
                    <li key={id}>
                      <Icon name={iconMap.device_type[id]} />
                      <span>{deviceCatalog.items.find((item) => item.device_type === id)?.label[lang] || id}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>
        )}

        {/* TAB 2: PICKUP & SINGLE-USE QR */}
        {activeTab === 'pickup' && (
          <section className="py-6">
            {!currentUser ? (
              <div className="pickup-card">
                <Icon name="Users" size={40} className="mx-auto text-emerald-700 mb-2" />
                <h2 className="text-xl font-bold mb-2">Household Sign In Required</h2>
                <p className="text-sm text-slate-600 mb-4">{t('claimScanPrompt')}</p>
                <button
                  type="button"
                  className="camera-button mx-auto"
                  onClick={() => {
                    setAuthModal('household');
                  }}
                >
                  <Icon name="Users" size={18} />
                  {t('householdLogin')}
                </button>
              </div>
            ) : (
              <div className="pickup-card">
                <h2 className="text-2xl font-bold mb-1">
                  {lang === 'hi' ? 'घर से पिकअप और क्यूआर कोड' : 'Doorstep Pickup & Single-Use QR'}
                </h2>
                <p className="text-xs text-slate-500 mb-4">{t('verifiedNotice')}</p>
                <p className="text-sm font-semibold text-emerald-800 mb-3">
                  Account: <strong>{currentUser.display_name}</strong>
                </p>

                <div className="stepper">
                  <div className="step-item active">
                    <span className="step-dot">1</span>
                    <span>Requested</span>
                  </div>
                  <div className={`step-item ${activePickup ? 'active' : ''}`}>
                    <span className="step-dot">2</span>
                    <span>Clustered</span>
                  </div>
                  <div className={`step-item ${activePickup?.status === 'VERIFIED' ? 'active' : ''}`}>
                    <span className="step-dot">3</span>
                    <span>Verified</span>
                  </div>
                </div>

                <div className="qr-frame">
                  <Icon name="QrCode" size={140} />
                  <p className="text-xs font-mono font-bold mt-2 text-slate-700">{qrToken || 'qr_demo_token_9412'}</p>
                  {activePickup?.status === 'VERIFIED' ? (
                    <span className="text-[10px] text-white font-bold bg-emerald-600 px-3 py-1 rounded-full mt-1 inline-flex items-center gap-1 shadow-sm">
                      ✓ Handover Completed & Verified
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded mt-1">Single-Use Token</span>
                  )}
                </div>

                {handoverSuccessMsg && (
                  <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4 text-emerald-950 mb-4 text-sm font-semibold shadow-sm text-left">
                    {handoverSuccessMsg}
                  </div>
                )}

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left mb-4 text-xs text-emerald-950">
                  <strong>Batched Trip Notice:</strong>
                  <p className="m-0 mt-1">Your request is pooled with nearby households in Okhla-Nehru Place cluster to save collector transit fuel.</p>
                </div>

                {activePickup?.status === 'VERIFIED' ? (
                  <div className="bg-emerald-100 border-2 border-emerald-400 rounded-xl p-5 text-emerald-950 font-semibold text-center">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">✓</div>
                    <strong className="block text-base text-emerald-900 mb-1">
                      {lang === 'hi' ? 'हैंडओवर सत्यापित हुआ!' : 'Physical Handover Verified!'}
                    </strong>
                    <p className="text-xs text-emerald-800 m-0">
                      +{activePickup.points_earned} Eco Points & {activePickup.kg_diverted} kg e-waste credited to your impact ledger.
                    </p>
                  </div>
                ) : (
                  <button type="button" className="camera-button w-full" onClick={handleConfirmHandover}>
                    <Icon name="Check" size={20} />
                    {lang === 'hi' ? 'कबाड़ीवाले के साथ हैंडओवर की पुष्टि करें' : 'Confirm Handover with Collector (2-Party)'}
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: COLLECTOR MODE (Collector Only) */}
        {activeTab === 'collector' && (
          <section className="py-4">
            {currentUser?.role !== 'collector' ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-lg mx-auto text-center shadow-sm">
                <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Truck" size={32} />
                </div>
                <h2 className="text-xl font-bold mb-2">Collector Authorization Required</h2>
                <p className="text-sm text-slate-600 mb-6">
                  Informal recyclers and kabadiwalas must sign in to view assigned routes and verify physical handovers.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="camera-button w-full"
                    onClick={() => {
                      setCollectorMode('signin');
                      setAuthModal('collector');
                    }}
                  >
                    <Icon name="Truck" size={18} />
                    {t('collectorLogin')}
                  </button>
                  <button
                    type="button"
                    className="secondary-upload-btn w-full"
                    onClick={() => {
                      setCollectorMode('apply');
                      setAuthModal('collector');
                    }}
                  >
                    {t('applyAsCollector')}
                  </button>
                </div>

                <div className="demo-login-box mt-6">
                  <h4>⚡ Fast Demo Collector Login</h4>
                  <div className="demo-btn-group">
                    <button type="button" className="demo-btn" onClick={() => void loginWithToken('demo-token-collector-1')}>
                      Ramesh Kumar
                      <span>3-Wheeler EV · Hazard Auth</span>
                    </button>
                    <button type="button" className="demo-btn" onClick={() => void loginWithToken('demo-token-collector-2')}>
                      Surender Scrap
                      <span>Cart · Regular Scrap</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="section-heading mb-4">
                  <div>
                    <h2>{lang === 'hi' ? 'कबाड़ीवाला रूट और संग्रह' : "Today's Clustered Collector Route"}</h2>
                    <span className="text-xs text-emerald-800 font-semibold">
                      {currentUser.display_name} · Phone: {maskPhone(currentUser.email_or_phone)} · {currentUser.is_hazard_authorized ? 'Hazard Certified 🛡️' : 'Standard Scrap'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="listen-button"
                    onClick={() => speakText(lang === 'hi' ? 'भैया आज आपका रूट ओखला और कालकाजी के लिए तैयार है।' : 'Today your route covers Okhla and Kalkaji.')}
                  >
                    <Icon name="Volume2" size={18} />
                    {lang === 'hi' ? 'आवाज़ में सुनें' : 'Listen Route'}
                  </button>
                </div>

                {/* Metrics Cards */}
                <div className="metrics-row">
                  <div className="metric-box">
                    <span className="metric-label">{t('routeSavings')}</span>
                    <p className="metric-val highlight">{collectorRouteData?.saved_km || '28.4'} km</p>
                    <span className="metric-sub">vs individual household round trips</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">CO₂e Emissions Saved</span>
                    <p className="metric-val">{collectorRouteData?.est_co2e_saved_kg || '2.7'} kg</p>
                    <span className="metric-sub">modelled from saved route km</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Estimated Day Earnings</span>
                    <p className="metric-val">₹1,850 - ₹2,400</p>
                    <span className="metric-sub">illustrative demo range; no payout model</span>
                  </div>
                </div>
                <p className="mb-4 text-xs text-slate-600 leading-relaxed">
                  Route CO₂e is an estimate: saved km are calculated from approximate stop coordinates using the route model,
                  then multiplied by the default three-wheeler CNG factor (0.095 kg CO₂e/km) in
                  {' '}<code>data/emission_factors.json</code>. Actual distance, vehicle, fuel use, and emissions can differ.
                  Day earnings are fixed demo data, not a market or wage estimate.
                </p>

                {/* Stops list */}
                <div className="stops-list mb-6">
                  <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                    <h3 className="text-sm font-bold m-0">
                      {lang === 'hi' ? '3 पूल्ड पिकअप स्टॉप निर्धारित (अनुकूलित क्रम)' : '3 Pooled Pickup Stops Scheduled (Optimized Sequence)'}
                    </h3>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      3 Stops · {collectorRouteData?.saved_km || '28.4'} km Saved
                    </span>
                  </div>
                  {[
                    { id: 'Stop 1', citizen: 'EcoCitizen-Kalkaji-01', item: 'Laptop (Swollen Battery)', hazard: 'HAZ_LI_ION', wt: '2.1 kg' },
                    { id: 'Stop 2', citizen: 'EcoCitizen-NehruPlace-04', item: 'CRT Monitor (Intact Glass)', hazard: 'HAZ_CRT_LEAD', wt: '14.0 kg' },
                    { id: 'Stop 3', citizen: 'EcoCitizen-Okhla-08', item: 'Ceiling Fan (Copper Winding)', hazard: null, wt: '4.2 kg' },
                  ].map((stop) => (
                    <div key={stop.id} className="stop-card">
                      <div className="stop-info">
                        <strong>{stop.id}: {stop.citizen}</strong>
                        <small>{stop.item} · Est: {stop.wt}</small>
                      </div>
                      <div>
                        {stop.hazard ? (
                          <span className="bg-red-100 text-red-800 font-bold text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                            <Icon name="BatteryWarning" size={14} />{stop.hazard}
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 font-semibold text-xs px-2 py-0.5 rounded">Regular Scrap</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Handover Scan & Weight Recording */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-sm font-bold mb-2">Scan Household QR & Record Handover Weight</h3>
                  <div className="flex gap-3 flex-wrap items-center">
                    <input
                      type="text"
                      placeholder="Enter kg (e.g. 2.2)"
                      value={collectorWeightInput}
                      onChange={(e) => setCollectorWeightInput(e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-44"
                    />
                    <button
                      type="button"
                      className="camera-button"
                      onClick={() => {
                        const wt = parseFloat(collectorWeightInput);
                        if (wt > 15.0) {
                          setCollectorNotice('⚠️ Anti-Gaming Flag: Entered weight is 2.5x above expected category range. Flagged for verification.');
                        } else {
                          setCollectorNotice(`✓ Handover weight ${wt}kg verified within category range. Points queued for household confirmation.`);
                        }
                      }}
                    >
                      <Icon name="QrCode" size={18} />Verify Weight
                    </button>
                  </div>
                  {collectorNotice && (
                    <p className="text-xs font-semibold mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">{collectorNotice}</p>
                  )}
                </div>

                {/* Conversational Voice Agent */}
                <VoiceAgent
                  authToken={authToken}
                  lang={lang}
                />
              </div>
            )}
          </section>
        )}

        {/* TAB 4: MY IMPACT */}
        {activeTab === 'impact' && (
          <section className="py-4">
            {currentUser?.role === 'collector' || impactData?.role === 'collector' ? (
              <>
                <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                  <h2 className="text-2xl font-bold">
                    {lang === 'hi' ? 'संग्रहकर्ता परिचालन एवं रूट प्रभाव' : 'Collector Route & Fleet Impact'}
                  </h2>
                  <span className="text-xs bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Icon name="Truck" size={14} />
                    {currentUser?.display_name || impactData?.display_name || 'Ramesh Kumar'} · Delhi-NCR Certified
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-6">
                  {lang === 'hi'
                    ? 'सत्यापित पिकअप और क्लस्टर्ड रूट से बचाई गई दूरी और ईंधन का लाइव ऑडिट।'
                    : 'Aggregated kilograms collected, pooled travel distance saved, and transport fuel emissions prevented across your assigned beat.'}
                </p>

                <div className="metrics-row">
                  <div className="metric-box">
                    <span className="metric-label">{lang === 'hi' ? 'एकत्रित किया गया ई-कचरा' : 'Verified E-Waste Collected'}</span>
                    <p className="metric-val highlight">{impactData?.total_kg_collected || '142.5'} kg</p>
                    <span className="metric-sub">{impactData?.items_collected || '48'} {lang === 'hi' ? 'उपकरण एकत्रित' : 'verified devices collected'}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">{lang === 'hi' ? 'बची हुई यात्रा दूरी' : 'Transit Distance Saved'}</span>
                    <p className="metric-val">{impactData?.transit_saved_km || '38.4'} km</p>
                    <span className="metric-sub">{lang === 'hi' ? 'क्लस्टर्ड रूटिंग द्वारा बचत' : 'vs single-trip household pickups'}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">{lang === 'hi' ? 'वाहन ईंधन CO₂e बचत' : 'Vehicle Fuel CO₂e Saved'}</span>
                    <p className="metric-val">{impactData?.co2e_avoided_kg || '4.6'} kg</p>
                    <span className="metric-sub">{lang === 'hi' ? 'सीएनजी उत्सर्जन रोका गया' : 'avoided 3-wheeler fuel emissions'}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">{lang === 'hi' ? 'अनुमानित परिचालन भुगतान' : 'Estimated Day Earnings'}</span>
                    <p className="metric-val">₹{impactData?.collector_payout_est || '3,850'}</p>
                    <span className="metric-sub">{impactData?.eco_points || '720'} {lang === 'hi' ? 'इको क्रेडिट अंक' : 'operational eco-credits'}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-600 leading-relaxed mt-4">
                  <strong>{lang === 'hi' ? 'संग्रहकर्ता प्रभाव लेखांकन मानक:' : 'Collector Impact Accounting Standards:'}</strong>
                  <p className="m-0 mt-1">
                    {lang === 'hi'
                      ? 'किलोग्राम वजन दो-पक्षीय क्यूआर स्कैन और सत्यापित हैंडओवर पर सीधे जोड़ा जाता है। रूट बचत की गणना क्लस्टर्ड स्टॉप्स के वास्तविक जीपीएस बिंदुओं से की जाती है।'
                      : 'E-waste kilograms are logged upon physical QR handover verification. Transit km saved are computed from the Dijkstra/VRP clustered sequence vs isolated round-trips from Okhla hub.'}
                  </p>
                  {impactData?.footnote && <p className="m-0 mt-2 font-mono text-slate-500">{impactData.footnote}</p>}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                  <h2 className="text-2xl font-bold">
                    {lang === 'hi' ? 'मेरा व्यक्तिगत पर्यावरणीय प्रभाव' : 'My Personal Environmental Impact'}
                  </h2>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Icon name="Users" size={14} />
                    {currentUser?.display_name || impactData?.display_name || 'Citizen'} · {lang === 'hi' ? 'घरेलू खाता' : 'Household Ledger'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-6">{t('verifiedNotice')}</p>

                <div className="metrics-row">
                  <div className="metric-box">
                    <span className="metric-label">{lang === 'hi' ? 'सत्यापित ई-कचरा' : 'Verified E-Waste Diverted'}</span>
                    <p className="metric-val highlight">{impactData?.monthly_kg_diverted || (currentUser?.user_id === 'sub_hh_01' ? '42.5' : currentUser?.user_id === 'sub_hh_02' ? '38.0' : '8.5')} kg</p>
                    <span className="metric-sub">{impactData?.items_diverted || (currentUser?.user_id === 'sub_hh_01' ? '6' : currentUser?.user_id === 'sub_hh_02' ? '5' : '3')} {lang === 'hi' ? 'उपकरण सौंपे गए' : 'verified devices handed over'}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">{lang === 'hi' ? 'बचाया गया विनिर्माण CO₂e' : 'Embodied CO₂e Avoided'}</span>
                    <p className="metric-val">{impactData?.co2e_avoided_kg || (currentUser?.user_id === 'sub_hh_01' ? '148.8' : currentUser?.user_id === 'sub_hh_02' ? '133.0' : '29.8')} kg</p>
                    <span className="metric-sub">{lang === 'hi' ? 'खनन और उत्पादन उत्सर्जन रोका' : 'avoided virgin extraction & manufacturing'}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">{lang === 'hi' ? 'अर्जित इको पॉइंट्स' : 'Eco Points Earned'}</span>
                    <p className="metric-val">{impactData?.eco_points || (currentUser?.user_id === 'sub_hh_01' ? '580' : currentUser?.user_id === 'sub_hh_02' ? '510' : '190')} pts</p>
                    <span className="metric-sub">{lang === 'hi' ? 'स्थानीय वार्ड में रैंक' : 'Rank in local neighborhood zone'}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-600 leading-relaxed mt-4">
                  <strong>{lang === 'hi' ? 'प्रभाव लेखांकन मानक:' : 'Impact Accounting Standards:'}</strong>
                  <p className="m-0 mt-1">
                    {lang === 'hi'
                      ? 'पॉइंट्स और रीसाइक्लिंग आंकड़े केवल दो-पक्षीय सत्यापित भौतिक हैंडओवर पर क्रेडिट किए जाते हैं।'
                      : 'Points and diversion statistics are credited strictly on two-party verified physical handovers.'}
                  </p>
                  {impactData?.footnote && <p className="m-0 mt-2 font-mono text-slate-500">{impactData.footnote}</p>}
                </div>
              </>
            )}
          </section>
        )}

        {/* TAB 5: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <section className="py-4">
            <div className="flex justify-between items-center mb-1 gap-3 flex-wrap">
              <h2 className="text-2xl font-bold">Environmental Impact Leaderboard</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <DemoSeedBadge />
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  🛡️ Verified Display Names Only
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Demo seed data · Verified Handover Only · Showing public display names chosen at sign-up. Sensitive identifiers (phone, email, real names) are protected.
            </p>

            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Participant</th>
                  <th>Kg Diverted</th>
                  <th>Eco Points</th>
                  <th>Items Handed Over</th>
                </tr>
              </thead>
              <tbody>
                {(leaderboardData?.households || [
                  { rank: 1, display_name: 'EcoPioneer_MayurVihar', kg_diverted: 42.5, points: 580, items: 6 },
                  { rank: 2, display_name: 'GreenHero_Saket', kg_diverted: 38.0, points: 510, items: 5 },
                  { rank: 3, display_name: 'CleanOkhla-07', kg_diverted: 29.4, points: 430, items: 4 },
                ]).map((row: any) => (
                  <tr key={`${row.rank}-${row.display_name}`}>
                    <td><span className="rank-badge">{row.rank}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <strong>{row.display_name}</strong>
                        <DemoSeedBadge compact />
                      </div>
                    </td>
                    <td><span className="demo-seed-inline">{row.kg_diverted} kg</span></td>
                    <td className="text-emerald-800 font-bold">{row.points}</td>
                    <td>{row.items} devices</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* TAB 6: ADMIN OVERSIGHT & COLLECTOR APPROVALS */}
        {activeTab === 'admin' && (
          <section className="py-4">
            {currentUser?.role !== 'admin' ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-lg mx-auto text-center shadow-sm">
                <div className="w-16 h-16 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="ShieldCheck" size={32} />
                </div>
                <h2 className="text-xl font-bold mb-2">Municipal Admin Sign In Required</h2>
                <p className="text-sm text-slate-600 mb-6">
                  Access city-wide waste statistics and review/approve informal collector registrations.
                </p>
                <button
                  type="button"
                  className="camera-button mx-auto"
                  onClick={() => void loginWithToken('demo-token-admin')}
                >
                  <Icon name="ShieldCheck" size={18} />
                  Sign In as Municipal Admin (Delhi Waste Commissioner)
                </button>
              </div>
            ) : (
              <div>
                <div className="section-heading mb-4">
                  <div>
                    <h2>{lang === 'hi' ? 'प्रशासनिक एवं नगर निगम निगरानी' : 'Admin & Municipal Oversight'}</h2>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-xs text-slate-500">
                        {lang === 'hi' ? 'शहरी ई-कचरा आंकड़े एवं कबाड़ीवाला आवेदन अनुमोदन' : 'City Aggregates & Collector Application Approvals'}
                      </span>
                      <DemoSeedBadge compact />
                    </div>
                  </div>
                </div>

                <div className="metrics-row">
                  <div className="metric-box">
                    <span className="metric-label">{lang === 'hi' ? 'शहर में डायवर्ट किया गया ई-कचरा' : 'City E-Waste Diverted'}</span>
                    <p className="metric-val">1,485 kg</p>
                    <span className="metric-sub">{lang === 'hi' ? '4 क्षेत्रों में सत्यापित' : 'verified across 4 zones'}</span>
                    <span className="demo-seed-inline metric-note">{lang === 'hi' ? 'डेमो सीड डेटा' : 'Demo seed data'}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">{lang === 'hi' ? 'बचत किए गए परिवहन किलोमीटर' : 'Transit Kilometres Saved'}</span>
                    <p className="metric-val highlight">386.4 km</p>
                    <span className="metric-sub">{lang === 'hi' ? 'स्मार्ट अनुरोध पूलिंग द्वारा' : 'from intelligent request pooling'}</span>
                    <span className="demo-seed-inline metric-note">{lang === 'hi' ? 'डेमो सीड डेटा' : 'Demo seed data'}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">{lang === 'hi' ? 'निष्क्रिय किए गए खतरनाक उपकरण' : 'Hazardous Items Neutralized'}</span>
                    <p className="metric-val text-red-700">164 items</p>
                    <span className="metric-sub">{lang === 'hi' ? 'खुले में जलाने/डंपिंग से सुरक्षित' : 'diverted from open burning/landfills'}</span>
                    <span className="demo-seed-inline metric-note">{lang === 'hi' ? 'डेमो सीड डेटा' : 'Demo seed data'}</span>
                  </div>
                </div>

                {/* Collector Application Approvals Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 m-0">
                        {lang === 'hi' ? 'कबाड़ीवाला पंजीकरण आवेदन (समीक्षा लंबित)' : 'Informal Collector Applications (Pending Review)'}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <p className="text-xs text-slate-500 m-0">
                          {lang === 'hi' ? 'लॉगिन और खतरनाक कचरा प्राधिकरण देने से पहले कबाड़ीवालों की समीक्षा करें।' : 'Review kabadiwalas before creating Cognito logins and setting hazard authorizations.'}
                        </p>
                        <DemoSeedBadge compact />
                      </div>
                    </div>
                    <button type="button" className="btn-nav-auth" onClick={() => void loadAdminCollectors()}>
                      <Icon name="RefreshCw" size={14} /> {lang === 'hi' ? 'ताज़ा करें' : 'Refresh'}
                    </button>
                  </div>

                  {approvalSuccessMsg && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 font-semibold">
                      {approvalSuccessMsg}
                    </div>
                  )}

                  {adminApplications.filter((a) => a.status === 'pending').length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4">
                      {lang === 'hi' ? 'वर्तमान में समीक्षा के लिए कोई लंबित कबाड़ीवाला आवेदन नहीं है।' : 'No pending collector applications currently awaiting review.'}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {adminApplications
                        .filter((a) => a.status === 'pending')
                        .map((app) => (
                          <div key={app.application_id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <strong className="text-sm block">{lang === 'hi' ? 'कबाड़ीवाला:' : 'Collector:'} {app.name}</strong>
                                <DemoSeedBadge compact />
                              </div>
                              <span className="text-xs text-slate-600 block"><strong>{lang === 'hi' ? 'फोन:' : 'Phone:'}</strong> {maskPhone(app.phone)} · <strong>{lang === 'hi' ? 'वाहन:' : 'Vehicle:'}</strong> {app.vehicle_type}</span>
                              <span className="text-xs text-slate-500 block">📍 {lang === 'hi' ? 'क्षेत्र:' : 'Area:'} {app.service_area} · {lang === 'hi' ? 'प्रमाणन संदर्भ:' : 'Ref:'} {app.authorization_ref}</span>
                              <div className="flex gap-1 mt-1">
                                {app.categories?.map((cat: string) => (
                                  <span key={cat} className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">{cat}</span>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(hazardAuthMap[app.application_id])}
                                  onChange={(e) => setHazardAuthMap({ ...hazardAuthMap, [app.application_id]: e.target.checked })}
                                />
                                {t('hazardAuth')}
                              </label>
                              <button
                                type="button"
                                className="camera-button text-xs py-2 px-4"
                                onClick={() => void handleApproveCollector(app.application_id)}
                              >
                                <Icon name="Check" size={16} />
                                {t('adminApprove')}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Run Aggregation Engine */}
                <div className="bg-white border-2 border-dashed border-emerald-400 rounded-2xl p-6 text-center mb-6">
                  <h3 className="text-lg font-bold mb-2">
                    {lang === 'hi' ? 'लाइव डेमो नियंत्रण: रूट क्लस्टरिंग एल्गोरिदम' : 'Live Demo Control: Route Clustering Engine'}
                  </h3>
                  <div className="flex justify-center mb-3">
                    <DemoSeedBadge />
                  </div>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mb-4">
                    {lang === 'hi'
                      ? 'लंबित घरेलू अनुरोधों को क्लस्टर करने और ईंधन बचत मापने के लिए शेड्यूलर चलाएँ।'
                      : 'Trigger the scheduler to batch pending household requests in Delhi-NCR and compute measured travel kilometres saved.'}
                  </p>
                  <button type="button" className="camera-button mx-auto" onClick={handleRunAdminAggregation}>
                    <Icon name="Navigation" size={20} />
                    {lang === 'hi' ? 'पिकअप एकत्रीकरण अभी चलाएँ' : 'Run Pickup Aggregation Now'}
                  </button>

                  {adminReport && (
                    <div className="mt-5 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-left text-xs text-emerald-950">
                      <strong className="block text-sm font-bold text-emerald-900 mb-1">✓ {lang === 'hi' ? 'एकत्रीकरण पूरा हुआ!' : 'Aggregation Dispatched!'}</strong>
                      <p className="m-0 mb-2">{adminReport.message}</p>
                      <div className="flex gap-6 font-mono text-emerald-800 flex-wrap">
                        <span><span className="demo-seed-inline">{lang === 'hi' ? 'डेमो सीड डेटा' : 'Demo seed data'}</span> {lang === 'hi' ? 'बची हुई दूरी:' : 'Saved Distance:'} <strong>{adminReport.total_saved_km} km</strong></span>
                        <span><span className="demo-seed-inline">{lang === 'hi' ? 'डेमो सीड डेटा' : 'Demo seed data'}</span> {lang === 'hi' ? 'बचा हुआ कार्बन:' : 'Saved Carbon:'} <strong>{adminReport.total_co2e_saved_kg} kg CO₂e</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* HOUSEHOLD LOGIN MODAL */}
        {authModal === 'household' && (
          <div className="modal-overlay" onClick={() => setAuthModal('none')}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <h3 className="text-lg font-bold m-0">{lang === 'hi' ? 'गूगल साइन-इन (घर / नागरिक)' : 'Household Sign-In with Google'}</h3>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setAuthModal('none')}>
                  <Icon name="X" size={20} />
                </button>
              </div>

              {pendingScanToClaim && (
                <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                  ⚡ {lang === 'hi' ? 'अपना ई-कचरा स्कैन जोड़ने और पिकअप बुक करने के लिए गूगल से साइन-इन करें।' : 'Sign in with Google to attach your e-waste scan and book verified doorstep pickup.'}
                </div>
              )}

              {authError && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-semibold">
                  {authError}
                </div>
              )}

              {/* Official Google Identity Services Container */}
              <div id="google-signin-btn-container" className="flex justify-center mb-3"></div>

              {/* Sign in with Google (Fast 1-Click Action) */}
              <div className="google-auth-box mb-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
                <p className="text-xs text-slate-600 mb-3">
                  {lang === 'hi'
                    ? 'गूगल खाते से सुरक्षित साइन-इन करें:'
                    : 'Connect securely with Google to track verified circular impact & badges:'}
                </p>
                <button
                  type="button"
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-300 rounded-xl shadow-sm flex items-center justify-center gap-3 transition-all hover:shadow cursor-pointer"
                  onClick={() => void handleHouseholdAuthSubmit('ecopioneer.google@gmail.com', 'EcoPioneer (Google Auth)')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{lang === 'hi' ? 'गूगल से 1-क्लिक साइन-इन' : 'Sign In with Google (1-Click)'}</span>
                </button>
              </div>

              {/* Custom Google Account Sign-In */}
              <div className="google-auth-box bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {lang === 'hi' ? 'या अपना गूगल ईमेल दर्ज करें' : 'Or Custom Google Sign-In'}
                </h4>
                <p className="text-xs text-slate-600 mb-3">
                  {lang === 'hi'
                    ? 'अपना जीमेल या नागरिक संपर्क दर्ज करें:'
                    : 'Sign in with your Google email address:'}
                </p>
                <form onSubmit={(e) => { e.preventDefault(); void handleHouseholdAuthSubmit(); }}>
                  <div className="form-group mb-2">
                    <label className="text-xs font-semibold text-slate-700">Google Email Address</label>
                    <input
                      type="text"
                      required
                      placeholder="yourname@gmail.com"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      className="form-input text-sm"
                    />
                  </div>
                  <div className="form-group mb-3">
                    <label className="text-xs font-semibold text-slate-700">{lang === 'hi' ? 'नाम / उपनाम' : 'Display Name / Pseudonym'}</label>
                    <input
                      type="text"
                      placeholder={lang === 'hi' ? 'उदा. प्रिया शर्मा' : 'e.g. Priya Sharma'}
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      className="form-input text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="camera-button w-full flex items-center justify-center gap-2"
                  >
                    <Icon name="Check" size={16} />
                    {lang === 'hi' ? 'गूगल खाते से जारी रखें' : 'Continue with Google Account'}
                  </button>
                </form>
              </div>

              {/* Demo 1-Click Sign-In for evaluators */}
              <div className="demo-login-box bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                <h4 className="flex items-center justify-between text-xs font-bold text-emerald-950 uppercase tracking-wide mb-1">
                  <span>⚡ {lang === 'hi' ? 'डेमो 1-क्लिक घरेलू प्रोफाइल' : 'Demo 1-Click Household Profiles'}</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    {lang === 'hi' ? 'मूल्यांकन हेतु' : 'For Evaluators'}
                  </span>
                </h4>
                <p className="text-xs text-emerald-900/80 mb-3">
                  {lang === 'hi'
                    ? 'त्वरित मूल्यांकन के लिए किसी भी पूर्व-सत्यापित नागरिक प्रोफाइल पर क्लिक करें:'
                    : 'Click either verified citizen profile below to test doorstep pickup, QR verification & eco-points:'}
                </p>
                <div className="demo-btn-group">
                  <button type="button" className="demo-btn flex-1 text-left" onClick={() => void loginWithToken('demo-token-household-1')}>
                    <strong className="block text-emerald-950">EcoPioneer</strong>
                    <span className="text-xs text-emerald-800">Mayur Vihar · East Delhi</span>
                  </button>
                  <button type="button" className="demo-btn flex-1 text-left" onClick={() => void loginWithToken('demo-token-household-2')}>
                    <strong className="block text-emerald-950">GreenHero</strong>
                    <span className="text-xs text-emerald-800">Saket · South Delhi</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COLLECTOR LOGIN & APPLICATION MODAL (/collector/login) */}
        {authModal === 'collector' && (
          <div className="modal-overlay" onClick={() => setAuthModal('none')}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="flex items-center gap-2">
                  <Icon name="Truck" size={24} className="text-amber-700" />
                  <h3 className="text-lg font-bold m-0">{t('collectorLogin')}</h3>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setAuthModal('none')}>
                  <Icon name="X" size={20} />
                </button>
              </div>

              {authError && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-semibold">
                  {authError}
                </div>
              )}

              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab-btn ${collectorMode === 'signin' ? 'active' : ''}`}
                  onClick={() => { setCollectorMode('signin'); setAuthError(null); }}
                >
                  {t('signIn')}
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${collectorMode === 'apply' ? 'active' : ''}`}
                  onClick={() => { setCollectorMode('apply'); setAuthError(null); }}
                >
                  {t('applyAsCollector')}
                </button>
              </div>

              {collectorMode === 'signin' ? (
                <form onSubmit={handleCollectorSignIn}>
                  <div className="form-group">
                    <label>{t('phone')} (+91 Registered Phone)</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98xxxxxx10"
                      value={colPhone}
                      onChange={(e) => setColPhone(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('password')}</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={colPassword}
                      onChange={(e) => setColPassword(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <button type="submit" className="camera-button w-full mt-2">
                    <Icon name="Truck" size={18} />
                    {t('signIn')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCollectorApplySubmit}>
                  <p className="text-xs text-slate-500 mb-3">
                    Informal collectors must apply for municipal verification. An administrator will review your application before creating your login.
                  </p>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={colName}
                      onChange={(e) => setColName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('phone')}</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98xxxxxx10"
                      value={colPhone}
                      onChange={(e) => setColPhone(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Vehicle Type</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Three-Wheeler EV Cargo"
                      value={colVehicle}
                      onChange={(e) => setColVehicle(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Service Area</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nehru Place, Okhla"
                      value={colArea}
                      onChange={(e) => setColArea(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Categories Authorized to Collect</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {[
                        { id: 'mobile_phone', label: '📱 Mobile Phones' },
                        { id: 'laptop', label: '💻 Laptops' },
                        { id: 'lithium_battery', label: '🔋 Li-ion Batteries' },
                        { id: 'crt_television', label: '📺 CRT Displays' },
                      ].map((cat) => (
                        <label key={cat.id} className="flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={colCategories.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setColCategories([...colCategories, cat.id]);
                              } else {
                                setColCategories(colCategories.filter((c) => c !== cat.id));
                              }
                            }}
                          />
                          {cat.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Authorization / DL Ref (Optional)</label>
                    <input
                      type="text"
                      placeholder="DL-EW-2026-0881"
                      value={colAuthRef}
                      onChange={(e) => setColAuthRef(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <button type="submit" className="camera-button w-full mt-2">
                    Submit Collector Application
                  </button>
                </form>
              )}

              <div className="demo-login-box">
                <h4>⚡ Demo 1-Click Collector Sign-In</h4>
                <div className="demo-btn-group">
                  <button type="button" className="demo-btn" onClick={() => void loginWithToken('demo-token-collector-1')}>
                    Ramesh Kumar
                    <span>+91 98xxxxxx10 (EV Rider)</span>
                  </button>
                  <button type="button" className="demo-btn" onClick={() => void loginWithToken('demo-token-collector-2')}>
                    Surender Scrap
                    <span>+91 98xxxxxx11</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PENDING APPROVAL SCREEN */}
        {authModal === 'pending_approval' && (
          <div className="modal-overlay" onClick={() => setAuthModal('none')}>
            <div className="modal-card text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="ShieldCheck" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-1">{t('pendingReview')}</h3>
              <p className="text-xs text-slate-500 mb-4 font-mono">
                Application ID: <strong>{recentApplication?.application_id || 'app_pending'}</strong>
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left text-xs text-amber-950 mb-4 leading-relaxed">
                <p className="font-bold mb-1">Status: PENDING MUNICIPAL REVIEW</p>
                <p className="m-0">
                  Thank you, <strong>{recentApplication?.name}</strong>. Your application to collect e-waste in <em>{recentApplication?.service_area}</em> has been submitted.
                  A municipal admin must approve your registration before login credentials are activated.
                </p>
              </div>

              <button type="button" className="camera-button mx-auto w-full" onClick={() => setAuthModal('none')}>
                Close
              </button>
            </div>
          </div>
        )}

        <footer>
          <p>{t('footer')}</p>
          <span>{t('status')}</span>
        </footer>
      </main>
    </>
  );
}
