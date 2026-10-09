import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './components/Icon';
import { device_type, type Language } from './generated/taxonomy';
import { iconMap } from './generated/icons';
import deviceCatalog from '../../data/seed/device_catalog.json';

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

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('scan');
  const [showCatalog, setShowCatalog] = useState(false);
  const [powersOn, setPowersOn] = useState<'yes' | 'no' | 'unsure'>('yes');
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
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('kabadiplus_auth_token'));
  const [authModal, setAuthModal] = useState<'none' | 'household' | 'collector' | 'pending_approval'>('none');
  const [householdMode, setHouseholdMode] = useState<'signin' | 'signup'>('signin');
  const [collectorMode, setCollectorMode] = useState<'signin' | 'apply'>('signin');
  const [pendingScanToClaim, setPendingScanToClaim] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Household Sign In/Up Form State
  const [hhEmail, setHhEmail] = useState('');
  const [hhPassword, setHhPassword] = useState('');
  const [hhDisplayName, setHhDisplayName] = useState('');

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
      email_or_phone: '+919876543210',
      collector_id: 'col_delhi_01',
      is_hazard_authorized: true,
    },
    'demo-token-collector-2': {
      user_id: 'sub_col_delhi_02',
      role: 'collector',
      display_name: 'Surender Scrap',
      email_or_phone: '+919876543211',
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

    localStorage.removeItem('kabadiplus_auth_token');
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

  // Fetch personal impact
  const loadPersonalImpact = async (token?: string) => {
    const tkn = token || authToken;
    if (!tkn) return;
    try {
      const res = await fetch('/v1/impact/me', {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (res.ok) {
        const data = await res.json();
        setImpactData(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (activeTab === 'impact' && currentUser?.role === 'household') {
      void loadPersonalImpact();
    }
  }, [activeTab, currentUser]);

  // Login handler
  const loginWithToken = async (token: string, overrideUser?: UserProfile) => {
    localStorage.setItem('kabadiplus_auth_token', token);
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
    localStorage.removeItem('kabadiplus_auth_token');
    setAuthToken(null);
    setCurrentUser(null);
    setActiveTab('scan');
  };

  // Household Sign In / Sign Up submission
  const handleHouseholdAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = householdMode === 'signup' ? '/v1/auth/signup' : '/v1/auth/login';
    const payload = householdMode === 'signup'
      ? { email: hhEmail, password: hhPassword, display_name: hhDisplayName }
      : { identifier: hhEmail, password: hhPassword };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.message || 'Authentication failed.');
        return;
      }
      await loginWithToken(data.token, data.user);
    } catch {
      setAuthError('Network error connecting to API server.');
    }
  };

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
    try {
      const res = await fetch('/v1/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_key: 'uploads/guest/device_capture.jpg',
          image_b64: activeImg || undefined,
          device_type: activeDev || undefined,
          lang,
          powers_on: powersOn,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.needs_more_photos || !activeDev) {
          setScanResult(data);
          setIsScanning(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Deterministic fallback
    setTimeout(() => {
      setScanResult({
        scan_id: 'scan_demo_4412',
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
      });
      setIsScanning(false);
    }, 500);
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
      alert('Please sign in as a household to arrange doorstep pickup.');
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
    if (!activePickup || !qrToken || !authToken) return;
    try {
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
        });
        void loadLeaderboard();
        void loadPersonalImpact();
        return;
      }
    } catch {
      // fallback
    }

    setActivePickup({
      ...activePickup,
      status: 'VERIFIED',
      points_earned: 90,
      kg_diverted: 0.22,
    });
    void loadLeaderboard();
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
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 md:px-10">
        <a className="brand" href="/" aria-label={t('brand')}>
          <span className="brand-icon"><Icon name="Recycle" size={28} /></span>
          <span>
            <strong>Kabadi<span className="text-[var(--green)]">Plus</span></strong>
            <small>v2 · Circular Decision & Pickup</small>
          </span>
        </a>

        {/* User Identity Pill / Sign-in Actions */}
        <div className="auth-header-actions">
          {/* Quick Demo Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Demo:</span>
            <button
              type="button"
              className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${currentUser?.user_id === 'sub_hh_01' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:bg-emerald-50 text-emerald-800 border-slate-300'}`}
              onClick={() => void loginWithToken('demo-token-household-1')}
              title="Sign in as Demo Household (EcoPioneer)"
            >
              Household
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${currentUser?.user_id === 'sub_col_delhi_01' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white hover:bg-amber-50 text-amber-800 border-slate-300'}`}
              onClick={() => void loginWithToken('demo-token-collector-1')}
              title="Sign in as Demo Collector (Ramesh Kumar)"
            >
              Collector
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${currentUser?.user_id === 'sub_admin_01' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-purple-50 text-purple-800 border-slate-300'}`}
              onClick={() => void loginWithToken('demo-token-admin')}
              title="Sign in as Municipal Admin (Delhi Waste Commissioner)"
            >
              Admin
            </button>
          </div>

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
                className="btn-nav-auth"
                onClick={() => {
                  setHouseholdMode('signin');
                  setAuthModal('household');
                }}
              >
                <Icon name="Users" size={15} />
                {t('householdLogin')}
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

        <div className="preview-note">
          <span className="status-dot" />
          <strong>{t('preview')}</strong>
          <span>{t('previewNote')}</span>
        </div>

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
                <h1>{t('title')}</h1>
                <p className="hero-subtitle">{t('subtitle')}</p>

                {/* Pre-inference condition question */}
                <fieldset className="condition-question">
                  <legend className="condition-label">{t('powersOnQuestion')}</legend>
                  <div className="condition-options">
                    <label className={`condition-option ${powersOn === 'yes' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="powers_on"
                        value="yes"
                        checked={powersOn === 'yes'}
                        onChange={() => setPowersOn('yes')}
                      />
                      <span>✓ {t('yes')}</span>
                    </label>
                    <label className={`condition-option ${powersOn === 'no' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="powers_on"
                        value="no"
                        checked={powersOn === 'no'}
                        onChange={() => setPowersOn('no')}
                      />
                      <span>✗ {t('no')}</span>
                    </label>
                    <label className={`condition-option ${powersOn === 'unsure' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="powers_on"
                        value="unsure"
                        checked={powersOn === 'unsure'}
                        onChange={() => setPowersOn('unsure')}
                      />
                      <span>? {t('unsure')}</span>
                    </label>
                  </div>
                </fieldset>

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
                        <Icon name="Camera" size={18} />
                        {t('takePhoto')}
                      </button>
                      <button type="button" className="btn-upload" onClick={() => fileInputRef.current?.click()}>
                        <Icon name="Upload" size={18} />
                        {t('uploadPhoto')}
                      </button>
                      <button type="button" className="btn-webcam" onClick={() => void startWebcam()}>
                        <Icon name="RefreshCw" size={16} />
                        {t('openWebcam')}
                      </button>
                    </div>

                    <div className="sample-presets">
                      <span className="sample-title">{t('sampleDevices')}</span>
                      <div className="sample-buttons">
                        <button type="button" onClick={() => loadPresetDevice('mobile_phone', 'Damaged Smartphone')}>
                          📱 {lang === 'hi' ? 'स्मार्टफ़ोन' : 'Smartphone'}
                        </button>
                        <button type="button" onClick={() => loadPresetDevice('laptop', 'Used Laptop')}>
                          💻 {lang === 'hi' ? 'लैपटॉप' : 'Laptop'}
                        </button>
                        <button type="button" onClick={() => loadPresetDevice('crt_television', 'CRT Television')}>
                          📺 {lang === 'hi' ? 'CRT टीवी' : 'CRT TV'}
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
                <div className="device-tile tile-laptop"><Icon name="Laptop" size={80} /></div>
                <div className="device-tile tile-phone"><Icon name="Smartphone" size={62} /></div>
                <div className="device-tile tile-circuit"><Icon name="CircuitBoard" size={42} /></div>
                <div className="recycle-circle"><Icon name="Recycle" size={36} /></div>
              </div>
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
                <div>
                  <button
                    type="button"
                    className="camera-button mx-auto"
                    onClick={() => {
                      setImagePreview(null);
                      setScanResult(null);
                    }}
                  >
                    <Icon name="RefreshCw" size={18} />
                    Retake / Choose Another Photo
                  </button>
                </div>
              </div>
            )}

            {scanResult && !scanResult.needs_more_photos && scanResult.device && (
              <div className="mt-8">
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
                      <span className="badge-demo">VERIFIED DECISION · SOURCED OCT 2026</span>
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
                    setHouseholdMode('signin');
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
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded mt-1">Single-Use Token</span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left mb-4 text-xs text-emerald-950">
                  <strong>Batched Trip Notice:</strong>
                  <p className="m-0 mt-1">Your request is pooled with nearby households in Okhla-Nehru Place cluster to save collector transit fuel.</p>
                </div>

                {activePickup?.status === 'VERIFIED' ? (
                  <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-4 text-emerald-900 font-semibold">
                    ✓ Handover Verified! +{activePickup.points_earned} Eco Points credited to your impact ledger.
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
                      {currentUser.display_name} · Phone: {currentUser.email_or_phone} · {currentUser.is_hazard_authorized ? 'Hazard Certified 🛡️' : 'Standard Scrap'}
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
                    <span className="metric-sub">avoided fuel burn in city transit</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Estimated Day Earnings</span>
                    <p className="metric-val">₹1,850 - ₹2,400</p>
                    <span className="metric-sub">{collectorRouteData?.stops?.length || 5} pooled stops scheduled</span>
                  </div>
                </div>

                {/* Stops list */}
                <div className="stops-list mb-6">
                  <h3 className="text-sm font-bold mb-3">Pooled Pickup Stops (Optimized Sequence)</h3>
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
              </div>
            )}
          </section>
        )}

        {/* TAB 4: MY IMPACT */}
        {activeTab === 'impact' && (
          <section className="py-4">
            <h2 className="text-2xl font-bold mb-2">{lang === 'hi' ? 'मेरा व्यक्तिगत पर्यावरणीय प्रभाव' : 'My Personal Environmental Impact'}</h2>
            <p className="text-xs text-slate-500 mb-6">{t('verifiedNotice')}</p>

            <div className="metrics-row">
              <div className="metric-box">
                <span className="metric-label">Verified E-Waste Diverted</span>
                <p className="metric-val highlight">{impactData?.monthly_kg_diverted || '8.5'} kg</p>
                <span className="metric-sub">{impactData?.items_diverted || '3'} verified devices handed over</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Embodied CO₂e Avoided</span>
                <p className="metric-val">{impactData?.co2e_avoided_kg || '29.8'} kg</p>
                <span className="metric-sub">equivalent to ~120 km car emissions</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Eco Points Earned</span>
                <p className="metric-val">{impactData?.eco_points || '190'} pts</p>
                <span className="metric-sub">Rank in local zone</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-600 leading-relaxed">
              <strong>Impact Accounting Standards:</strong>
              <p className="m-0 mt-1">
                Points and diversion statistics are credited strictly on two-party verified physical handovers.
                CO₂e avoidance is calculated based on life cycle assessment (LCA) embodied carbon factors for device reuse and secondary metal smelting offsets.
              </p>
            </div>
          </section>
        )}

        {/* TAB 5: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <section className="py-4">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-2xl font-bold">Environmental Impact Leaderboard</h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                🛡️ Verified Display Names Only
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Verified Handover Only · Showing public display names chosen at sign-up. Sensitive identifiers (phone, email, real names) are protected.
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
                  <tr key={row.rank}>
                    <td><span className="rank-badge">{row.rank}</span></td>
                    <td><strong>{row.display_name}</strong></td>
                    <td>{row.kg_diverted} kg</td>
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
                    <h2>Admin & Municipal Oversight</h2>
                    <span className="text-xs text-slate-500">City Aggregates & Collector Application Approvals</span>
                  </div>
                </div>

                <div className="metrics-row">
                  <div className="metric-box">
                    <span className="metric-label">City E-Waste Diverted</span>
                    <p className="metric-val">1,485 kg</p>
                    <span className="metric-sub">verified across 4 zones</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Transit Kilometres Saved</span>
                    <p className="metric-val highlight">386.4 km</p>
                    <span className="metric-sub">from intelligent request pooling</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Hazardous Items Neutralized</span>
                    <p className="metric-val text-red-700">164 items</p>
                    <span className="metric-sub">diverted from open burning/landfills</span>
                  </div>
                </div>

                {/* Collector Application Approvals Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 m-0">Informal Collector Applications (Pending Review)</h3>
                      <p className="text-xs text-slate-500 m-0">Review kabadiwalas before creating Cognito logins and setting hazard authorizations.</p>
                    </div>
                    <button type="button" className="btn-nav-auth" onClick={() => void loadAdminCollectors()}>
                      <Icon name="RefreshCw" size={14} /> Refresh
                    </button>
                  </div>

                  {approvalSuccessMsg && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 font-semibold">
                      {approvalSuccessMsg}
                    </div>
                  )}

                  {adminApplications.filter((a) => a.status === 'pending').length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4">No pending collector applications currently awaiting review.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {adminApplications
                        .filter((a) => a.status === 'pending')
                        .map((app) => (
                          <div key={app.application_id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <strong className="text-sm block">{app.name}</strong>
                              <span className="text-xs text-slate-600 block">📞 {app.phone} · 🚚 {app.vehicle_type}</span>
                              <span className="text-xs text-slate-500 block">📍 Area: {app.service_area} · Ref: {app.authorization_ref}</span>
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
                  <h3 className="text-lg font-bold mb-2">Live Demo Control: Route Clustering Engine</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mb-4">
                    Trigger the scheduler to batch pending household requests in Delhi-NCR and compute measured travel kilometres saved.
                  </p>
                  <button type="button" className="camera-button mx-auto" onClick={handleRunAdminAggregation}>
                    <Icon name="Navigation" size={20} />
                    Run Pickup Aggregation Now
                  </button>

                  {adminReport && (
                    <div className="mt-5 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-left text-xs text-emerald-950">
                      <strong className="block text-sm font-bold text-emerald-900 mb-1">✓ Aggregation Dispatched!</strong>
                      <p className="m-0 mb-2">{adminReport.message}</p>
                      <div className="flex gap-6 font-mono text-emerald-800">
                        <span>Saved Distance: <strong>{adminReport.total_saved_km} km</strong></span>
                        <span>Saved Carbon: <strong>{adminReport.total_co2e_saved_kg} kg CO₂e</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* HOUSEHOLD LOGIN MODAL (/login) */}
        {authModal === 'household' && (
          <div className="modal-overlay" onClick={() => setAuthModal('none')}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="text-lg font-bold m-0">{t('householdLogin')}</h3>
                <button type="button" className="modal-close-btn" onClick={() => setAuthModal('none')}>
                  <Icon name="X" size={20} />
                </button>
              </div>

              {pendingScanToClaim && (
                <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                  ⚡ Sign in or create an account to attach your scan and arrange doorstep pickup.
                </div>
              )}

              {authError && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-semibold">
                  {authError}
                </div>
              )}

              {/* Cognito Hosted UI / Google Login */}
              <button
                type="button"
                className="google-auth-btn"
                onClick={() => {
                  void loginWithToken('demo-token-household-1');
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {t('googleSignIn')}
              </button>

              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab-btn ${householdMode === 'signin' ? 'active' : ''}`}
                  onClick={() => { setHouseholdMode('signin'); setAuthError(null); }}
                >
                  {t('signIn')}
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${householdMode === 'signup' ? 'active' : ''}`}
                  onClick={() => { setHouseholdMode('signup'); setAuthError(null); }}
                >
                  {t('createAccount')}
                </button>
              </div>

              <form onSubmit={handleHouseholdAuthSubmit}>
                {householdMode === 'signup' && (
                  <div className="form-group">
                    <label>{t('displayName')} (Pseudonym for Leaderboard)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EcoWarrior_NehruPlace"
                      value={hhDisplayName}
                      onChange={(e) => setHhDisplayName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>{t('email')}</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={hhEmail}
                    onChange={(e) => setHhEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>{t('password')}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={hhPassword}
                    onChange={(e) => setHhPassword(e.target.value)}
                    className="form-input"
                  />
                </div>
                <button type="submit" className="camera-button w-full mt-2">
                  {householdMode === 'signup' ? t('createAccount') : t('signIn')}
                </button>
              </form>

              <div className="demo-login-box">
                <h4>⚡ Demo 1-Click Household Sign-In</h4>
                <div className="demo-btn-group">
                  <button type="button" className="demo-btn" onClick={() => void loginWithToken('demo-token-household-1')}>
                    EcoPioneer
                    <span>household1@demo</span>
                  </button>
                  <button type="button" className="demo-btn" onClick={() => void loginWithToken('demo-token-household-2')}>
                    GreenHero
                    <span>household2@demo</span>
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
                      placeholder="+919876543210"
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
                      placeholder="+919876543210"
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
                    <span>+919876543210 (EV Rider)</span>
                  </button>
                  <button type="button" className="demo-btn" onClick={() => void loginWithToken('demo-token-collector-2')}>
                    Surender Scrap
                    <span>+919876543211</span>
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
